---
title: "Building Scalable Microservices with Go and FastAPI"
description: "A comprehensive guide to designing and implementing high-performance microservices using Go for compute-intensive tasks and FastAPI for rapid API development. Learn patterns for service communication, data consistency, and deployment strategies."
date: "2024-12-15"
author: "Tushar Agrawal"
tags: ["Microservices", "Go", "FastAPI", "Python", "System Design", "Backend"]
image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&h=630&fit=crop"
published: true
---

## Introduction

In the modern era of distributed systems, choosing the right technology stack for your microservices architecture can make or break your application's performance and maintainability. In this article, I'll share my experience building scalable microservices using a combination of Go and FastAPI at Dr. Dangs Lab, where we process millions of healthcare transactions daily.

## Why Go + FastAPI?

### Go for Compute-Intensive Services

Go excels in scenarios where you need:
- **High concurrency**: Go's goroutines make it trivial to handle thousands of concurrent operations
- **Low latency**: Compiled language with minimal runtime overhead
- **CPU-bound operations**: Image processing, data transformation, complex calculations

```go
package main

import (
    "sync"
    "github.com/gin-gonic/gin"
)

func processReports(reports []Report) []ProcessedReport {
    var wg sync.WaitGroup
    results := make([]ProcessedReport, len(reports))

    for i, report := range reports {
        wg.Add(1)
        go func(idx int, r Report) {
            defer wg.Done()
            results[idx] = processReport(r)
        }(i, report)
    }

    wg.Wait()
    return results
}
```

### FastAPI for Rapid Development

FastAPI shines when you need:
- **Quick iteration**: Python's expressiveness speeds up development
- **Auto-generated documentation**: OpenAPI specs out of the box
- **Async I/O**: Excellent for I/O-bound operations like database queries

```python
from fastapi import FastAPI, Depends
from sqlalchemy.ext.asyncio import AsyncSession

app = FastAPI()

@app.get("/patients/{patient_id}")
async def get_patient(
    patient_id: int,
    db: AsyncSession = Depends(get_db)
):
    patient = await db.get(Patient, patient_id)
    return patient
```

## Service Communication Patterns

### Synchronous Communication with gRPC

For real-time, low-latency communication between services:

```protobuf
service ReportService {
    rpc ProcessReport(ReportRequest) returns (ReportResponse);
    rpc StreamReports(stream ReportRequest) returns (stream ReportResponse);
}
```

### Asynchronous Communication with Apache Kafka

For event-driven architectures and data pipelines:

```python
from aiokafka import AIOKafkaProducer

async def publish_event(topic: str, event: dict):
    producer = AIOKafkaProducer(bootstrap_servers='kafka:9092')
    await producer.start()
    try:
        await producer.send_and_wait(
            topic,
            json.dumps(event).encode()
        )
    finally:
        await producer.stop()
```

## Data Consistency Strategies

### Saga Pattern for Distributed Transactions

When a single business operation spans multiple services:

1. **Choreography-based**: Each service publishes events that trigger the next step
2. **Orchestration-based**: A central coordinator manages the workflow

### Event Sourcing

Store the full history of changes as a sequence of events:

```python
class PatientEventStore:
    async def append(self, patient_id: str, event: Event):
        await self.db.execute(
            """
            INSERT INTO patient_events (patient_id, event_type, payload, timestamp)
            VALUES ($1, $2, $3, NOW())
            """,
            patient_id, event.type, event.payload
        )

    async def get_state(self, patient_id: str) -> Patient:
        events = await self.get_events(patient_id)
        return self.replay_events(events)
```

## Deployment with Docker and Kubernetes

### Multi-stage Docker Builds

```dockerfile
# Go service
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o main .

FROM alpine:latest
COPY --from=builder /app/main /main
EXPOSE 8080
CMD ["/main"]
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: report-processor
spec:
  replicas: 3
  selector:
    matchLabels:
      app: report-processor
  template:
    spec:
      containers:
      - name: report-processor
        image: report-processor:latest
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

## Monitoring and Observability

### Distributed Tracing with OpenTelemetry

```python
from opentelemetry import trace
from opentelemetry.exporter.jaeger.thrift import JaegerExporter

tracer = trace.get_tracer(__name__)

@app.get("/process")
async def process_request():
    with tracer.start_as_current_span("process_request"):
        # Your processing logic
        pass
```

## Key Takeaways

1. **Choose the right tool for the job**: Go for performance, Python for productivity
2. **Design for failure**: Implement circuit breakers, retries, and graceful degradation
3. **Embrace eventual consistency**: Not all operations need immediate consistency
4. **Invest in observability**: You can't fix what you can't see
5. **Start simple**: Begin with a monolith, extract services as needed

## Conclusion

Building scalable microservices is as much about organizational patterns as it is about technology choices. By combining Go's performance with FastAPI's developer experience, you can build systems that are both fast and maintainable.

In future posts, I'll dive deeper into specific patterns like CQRS, event sourcing, and handling distributed transactions in healthcare systems where data accuracy is critical.

---

*Have questions about microservices architecture? Feel free to reach out on [LinkedIn](https://www.linkedin.com/in/tushar-agrawal-91b67a28a) or check out my projects on [GitHub](https://github.com/Tushar010402).*
