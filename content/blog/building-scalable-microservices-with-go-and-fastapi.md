---
title: "Building Scalable Microservices with Go and FastAPI"
description: "How I learned to combine Go and Python microservices the hard way - after our monolith crashed during peak hours at Dr. Dangs Lab. Real patterns from processing millions of healthcare transactions."
date: "2024-12-15"
author: "Tushar Agrawal"
tags: ["Microservices", "Go", "FastAPI", "Python", "System Design", "Backend"]
image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&h=630&fit=crop"
published: true
---

## The Day Our Monolith Died

It was 9:47 AM on a Monday. Our lab management system at Dr. Dangs Lab had just crashed. 200+ patients were waiting for their reports, 80 doctors couldn't access test results, and my phone wouldn't stop buzzing.

The culprit? Our Python monolith was trying to process 500 lab reports simultaneously while handling API requests. CPU hit 100%, memory exhausted, and the whole thing came down.

That day taught me why microservices exist - not as a trendy architecture choice, but as a survival mechanism.

## Why I Ended Up Using Both Go and FastAPI

After the crash, I spent two weeks analyzing our workloads. Here's what I found:

**CPU-bound work (report processing, PDF generation):**
- Python was spending 80% of time waiting for GIL locks
- Processing 100 reports took 45 seconds
- Memory usage spiked unpredictably

**I/O-bound work (API requests, database queries):**
- Most requests were waiting on database/network
- Python's async was actually fine here
- Developer velocity mattered more than raw speed

The answer became obvious: **Go for the heavy lifting, Python for everything else.**

### The Performance Difference Was Shocking

I rewrote our report processor in Go as an experiment:

```go
// This replaced 200 lines of Python that kept timing out
func processReports(reports []Report) []ProcessedReport {
    var wg sync.WaitGroup
    results := make([]ProcessedReport, len(reports))

    for i, report := range reports {
        wg.Add(1)
        go func(idx int, r Report) {
            defer wg.Done()
            // Each goroutine processes independently
            results[idx] = processReport(r)
        }(i, report)
    }

    wg.Wait()
    return results
}
```

**Results:**
- 100 reports: 45 seconds → 3 seconds
- Memory: 2GB spikes → stable 200MB
- CPU: 100% single core → distributed across 8 cores

I was sold. But I wasn't about to rewrite our entire API layer in Go - that would take months and our team knew Python inside out.

## Our Hybrid Architecture

Here's what we actually built:

```
Patient Request → FastAPI Gateway → ???
                                    ↓
              ┌─────────────────────┴─────────────────────┐
              ↓                                           ↓
    [I/O Heavy - Python]                      [CPU Heavy - Go]
    ├── Patient registration                  ├── Report processing
    ├── Appointment booking                   ├── PDF generation
    ├── Database CRUD                         ├── Image analysis
    └── Third-party integrations              └── Bulk data transforms
```

### FastAPI Handles the API Layer

I kept all patient-facing APIs in FastAPI. Why? Because I could ship features in hours, not days:

```python
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

app = FastAPI()

@app.get("/patients/{patient_id}")
async def get_patient(
    patient_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    This endpoint gets hit 10,000+ times/day.
    It's I/O bound (database query), so Python async is perfect.

    Fun fact: I tried rewriting this in Go once.
    It was 2ms faster but took 3x longer to add new features.
    Not worth it.
    """
    patient = await db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(404, "Patient not found")
    return patient
```

### Go Handles the Heavy Processing

When a batch of lab results comes in, FastAPI hands it off to our Go service:

```go
// report-processor/main.go
// This service saved us from that Monday morning disaster

package main

import (
    "context"
    "sync"
    "time"

    "github.com/gin-gonic/gin"
)

type ProcessingResult struct {
    ReportID    string        `json:"report_id"`
    Status      string        `json:"status"`
    ProcessedAt time.Time     `json:"processed_at"`
    PDFUrl      string        `json:"pdf_url,omitempty"`
    Error       string        `json:"error,omitempty"`
}

func processBatch(c *gin.Context) {
    var reports []Report
    if err := c.BindJSON(&reports); err != nil {
        c.JSON(400, gin.H{"error": "invalid request"})
        return
    }

    // Process up to 100 reports concurrently
    // I learned the hard way not to make this unlimited -
    // once set it to 1000 and OOM killed the container
    semaphore := make(chan struct{}, 100)
    var wg sync.WaitGroup
    results := make([]ProcessingResult, len(reports))

    for i, report := range reports {
        wg.Add(1)
        semaphore <- struct{}{} // acquire

        go func(idx int, r Report) {
            defer wg.Done()
            defer func() { <-semaphore }() // release

            result, err := processReport(r)
            if err != nil {
                results[idx] = ProcessingResult{
                    ReportID: r.ID,
                    Status:   "failed",
                    Error:    err.Error(),
                }
                return
            }
            results[idx] = result
        }(i, report)
    }

    wg.Wait()
    c.JSON(200, results)
}
```

## The Communication Problem (And How I Almost Got It Wrong)

My first attempt at connecting the services was... embarrassing.

```python
# DON'T DO THIS - my first naive attempt
async def process_reports(report_ids: list[str]):
    async with httpx.AsyncClient() as client:
        results = []
        for report_id in report_ids:
            # Making 500 HTTP calls sequentially?
            # This took 2 minutes for a batch.
            resp = await client.post(f"{GO_SERVICE}/process/{report_id}")
            results.append(resp.json())
    return results
```

### What Actually Works: Batch + Async

```python
# Much better - batch it up, let Go handle parallelism
async def process_reports(report_ids: list[str]):
    async with httpx.AsyncClient(timeout=120.0) as client:
        # Send all reports in one request
        resp = await client.post(
            f"{GO_SERVICE}/process/batch",
            json={"report_ids": report_ids}
        )
        return resp.json()
```

### For Real-Time Stuff: gRPC

When we needed real-time status updates (doctors waiting for urgent results), HTTP polling was too slow. gRPC streaming solved it:

```protobuf
// report_service.proto
service ReportService {
    // Single report - simple request/response
    rpc ProcessReport(ReportRequest) returns (ReportResponse);

    // Batch with streaming - client sends batch,
    // server streams results as they complete
    rpc ProcessBatchStream(BatchRequest) returns (stream ReportResponse);
}
```

The streaming version meant doctors saw results appearing in real-time instead of waiting for the whole batch.

### For Decoupled Work: Kafka

Some things don't need immediate responses. When a report is finalized, multiple systems need to know:

```python
# When a report is ready, publish and forget
async def on_report_finalized(report_id: str):
    await kafka_producer.send(
        "reports.finalized",
        {
            "report_id": report_id,
            "timestamp": datetime.utcnow().isoformat(),
            "patient_id": report.patient_id
        }
    )
    # These services pick it up independently:
    # - Notification service sends SMS to patient
    # - Billing service generates invoice
    # - Analytics service updates dashboards
    # - Archival service backs up to cold storage
```

## The Distributed Transaction Nightmare

Here's a scenario that kept me up at night:

1. Patient pays for a test
2. Sample is collected
3. Payment fails (card declined after initial auth)
4. Sample is already in the lab
5. ???

In a monolith, you'd wrap it in a database transaction. With microservices, that's not possible.

### The Saga Pattern Saved Us

```python
# Orchestrator-based saga for test booking
class BookTestSaga:
    """
    I tried choreography-based first (events triggering events).
    It became impossible to debug when something failed in the middle.
    Orchestration is more code but WAY easier to understand.
    """

    async def execute(self, booking: TestBooking):
        # Step 1: Reserve the payment
        payment_hold = await self.payment_service.hold(
            amount=booking.amount,
            patient_id=booking.patient_id
        )

        try:
            # Step 2: Book the slot
            slot = await self.scheduling_service.book(
                test_type=booking.test_type,
                patient_id=booking.patient_id
            )

            try:
                # Step 3: Create the order
                order = await self.order_service.create(
                    payment_id=payment_hold.id,
                    slot_id=slot.id
                )

                # Step 4: Capture payment (actually charge)
                await self.payment_service.capture(payment_hold.id)

                return order

            except Exception as e:
                # Order failed - release slot
                await self.scheduling_service.release(slot.id)
                raise

        except Exception as e:
            # Anything failed - release payment hold
            await self.payment_service.release(payment_hold.id)
            raise
```

## Deployment: What Actually Runs in Production

After getting burned by "it works on my machine" too many times:

```dockerfile
# Go service - multi-stage build
# Final image is 12MB instead of 1.2GB
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

FROM alpine:3.18
# I spent 4 hours debugging why this didn't work once.
# Turns out the Go binary needed CA certificates for HTTPS calls.
RUN apk --no-cache add ca-certificates
COPY --from=builder /app/main /main
EXPOSE 8080
CMD ["/main"]
```

```yaml
# Kubernetes deployment with lessons learned
apiVersion: apps/v1
kind: Deployment
metadata:
  name: report-processor
spec:
  replicas: 3  # Started with 1, increased after first traffic spike
  selector:
    matchLabels:
      app: report-processor
  template:
    spec:
      containers:
      - name: report-processor
        image: report-processor:v2.3.1  # Always use specific versions!
        resources:
          requests:
            memory: "256Mi"  # Minimum guaranteed
            cpu: "250m"
          limits:
            memory: "512Mi"  # OOM killer activates above this
            cpu: "1000m"     # Learned: don't set CPU limits too tight
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 15
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
```

## Monitoring: Because You Can't Fix What You Can't See

After our third "silent failure" incident, I made observability non-negotiable:

```python
from opentelemetry import trace
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

tracer = trace.get_tracer(__name__)

# Instrument FastAPI automatically
FastAPIInstrumentor.instrument_app(app)

@app.get("/reports/{report_id}")
async def get_report(report_id: str):
    with tracer.start_as_current_span("get_report") as span:
        span.set_attribute("report.id", report_id)

        # Now I can trace a request across Python → Go → Database
        # and see exactly where the 2 second latency is coming from
        report = await fetch_report(report_id)

        span.set_attribute("report.status", report.status)
        return report
```

## What I'd Do Differently

Looking back after 2 years of running this in production:

1. **Start with a monolith** - We extracted services too early. Should have waited for clear pain points.

2. **Shared database was fine initially** - The "each service owns its data" rule caused more problems than it solved for our team size.

3. **gRPC from day one** - HTTP was easier to start but we eventually rewrote all internal communication to gRPC anyway.

4. **Invest in local dev environment** - Running 5 services locally was painful until we set up docker-compose properly.

5. **Contract testing** - Integration tests were flaky. Consumer-driven contract tests (Pact) would have saved hours of debugging.

## The Results

After 18 months:

| Metric | Monolith | Microservices |
|--------|----------|---------------|
| Report processing | 45s/batch | 3s/batch |
| API latency p99 | 2.1s | 180ms |
| Deployment frequency | Weekly | Daily |
| Incidents/month | 4-5 | 0-1 |
| Time to add new feature | 2-3 days | 4-6 hours |

Was it worth it? Absolutely. But I wouldn't recommend it for every project. We needed it because our scale demanded it.

## Wrapping Up

The combination of Go for performance-critical paths and FastAPI for rapid API development has worked incredibly well for us. But the real lesson isn't about languages - it's about:

- Understanding your actual bottlenecks before optimizing
- Keeping services focused and small
- Investing heavily in observability
- Accepting that distributed systems are inherently complex

If you're considering microservices, ask yourself: do you actually need them, or is your monolith just poorly structured? Often, a well-organized monolith is the right answer.

---

*Got questions about this architecture? I've made plenty of mistakes not covered here - feel free to reach out on [LinkedIn](https://www.linkedin.com/in/tushar-agrawal-91b67a28a) or check out more of my work on [GitHub](https://github.com/Tushar010402).*
