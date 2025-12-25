---
title: "Building Healthcare Technology at Dr. Dangs Lab: What They Don't Teach You"
description: "3 years of building lab management systems taught me that healthcare software is nothing like regular SaaS. Here's what actually matters when patient care depends on your code."
date: "2024-12-17"
author: "Tushar Agrawal"
tags: ["Healthcare", "Dr Dangs Lab", "Pathology", "LIMS", "SaaS", "Backend", "HIPAA"]
image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=1200&h=630&fit=crop"
published: true
---

## My First Week Was a Reality Check

I joined Dr. Dangs Lab thinking I knew how to build software. I'd worked on e-commerce, fintech, the usual stuff. Healthcare would be just another domain, right?

Wrong.

On my third day, a doctor called our support line furious. A patient's critical test result was delayed by 4 hours because our notification system silently failed. The patient had a serious condition that needed immediate attention.

Nobody was hurt, thankfully. But I went home that night and couldn't sleep. In my previous jobs, a bug meant someone's shopping cart didn't work. Here, it could mean something much worse.

That's when I understood: healthcare software isn't about features. It's about reliability, accuracy, and the weight of responsibility that comes with every line of code.

## What We Were Dealing With

Dr. Dangs Lab is one of India's leading pathology centers. When I arrived, the situation was:

- **15+ collection centers** across Delhi NCR sending samples to central labs
- **Thousands of patients daily** expecting accurate, timely reports
- **80+ doctors and lab technicians** depending on our systems
- **Legacy software** that crashed during peak hours
- **Paper-based workflows** causing 2-3 hour delays in report delivery
- **No real-time tracking** - patients calling repeatedly asking "where's my report?"

The previous system was a PHP monolith from 2010. It worked... mostly. But as patient volume grew, it started buckling. Reports got delayed. Data got lost. Staff were frustrated.

My job: rebuild it without breaking anything.

## The Architecture We Built (After 3 Rewrites)

I'm not going to pretend we got it right the first time. The current system is version 3, and each previous version taught us something painful.

```
What Actually Runs in Production
================================

┌─────────────────────────────────────────────────────────┐
│                   PATIENT TOUCHPOINTS                    │
│  Web Portal │ Mobile App │ WhatsApp Bot │ SMS Gateway   │
└──────────────────────────┬──────────────────────────────┘
                           │
                     [API Gateway]
                     Rate limiting, auth, logging
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Patient Service │ │   Lab Service   │ │ Report Service  │
│ (FastAPI)       │ │  (FastAPI)      │ │ (Go + Python)   │
│                 │ │                 │ │                 │
│ - Registration  │ │ - Sample track  │ │ - PDF generate  │
│ - Appointments  │ │ - Test queue    │ │ - Delivery      │
│ - History       │ │ - Results entry │ │ - Analytics     │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
         ┌───────────────────┴───────────────────┐
         ▼                                       ▼
┌─────────────────┐                   ┌─────────────────┐
│   PostgreSQL    │                   │     Redis       │
│   (Primary)     │                   │ Cache + Queues  │
│                 │                   │                 │
│ - Patient data  │                   │ - Session mgmt  │
│ - Test results  │                   │ - Real-time     │
│ - Audit logs    │                   │ - Rate limiting │
└─────────────────┘                   └─────────────────┘
```

### Why These Specific Choices

**FastAPI for most services:**
- Our team knew Python well
- Healthcare has complex business logic that changes frequently
- We needed to move fast on new features
- The auto-generated API docs saved hours of documentation work

**Go for report processing:**
- Generating 500 PDFs simultaneously in Python? Forget it
- Memory usage was unpredictable with Python's PDF libraries
- Go gave us 15x performance improvement (I wrote about this in my [microservices article](/blog/building-scalable-microservices-with-go-and-fastapi))

**PostgreSQL, not MySQL or MongoDB:**
- ACID compliance isn't optional when dealing with medical data
- The JSONB columns let us handle semi-structured lab results without schema migrations every week
- Row-level security for multi-tenant data isolation

**Redis for more than just caching:**
- Real-time sample tracking (pub/sub)
- Rate limiting (patients refreshing "where's my report?" 50 times)
- Session management with automatic expiry
- Task queues for async processing

## The Hardest Problems We Solved

### Problem 1: Sample Tracking Without Losing Anything

A sample travels through multiple hands:
1. Collected at a center
2. Transported to lab (could take hours)
3. Received at lab
4. Processed
5. Results entered
6. Report generated
7. Delivered to patient

If ANY step fails silently, someone's diagnosis gets delayed.

```python
# What we built after losing a sample once
# (It was found 2 days later in a transport cooler)

from enum import Enum
from datetime import datetime

class SampleStatus(Enum):
    COLLECTED = "collected"
    IN_TRANSIT = "in_transit"
    RECEIVED_AT_LAB = "received_at_lab"
    PROCESSING = "processing"
    COMPLETED = "completed"
    REPORTED = "reported"

class SampleTracker:
    """
    Every status change is logged with who, when, where.
    We can reconstruct the entire journey of any sample.
    This has saved us multiple times during audits.
    """

    async def update_status(
        self,
        sample_id: str,
        new_status: SampleStatus,
        location: str,
        updated_by: str
    ):
        sample = await self.db.get_sample(sample_id)
        if not sample:
            # This should never happen, but it did once.
            # A barcode was misprinted. Now we have alerts.
            raise SampleNotFoundError(f"Sample {sample_id} not in system")

        # Validate state machine
        if not self._is_valid_transition(sample.status, new_status):
            # Caught a lab tech trying to mark a sample as "completed"
            # before it was even received. Turned out to be a UI bug.
            raise InvalidTransitionError(
                f"Cannot go from {sample.status} to {new_status}"
            )

        # Atomic update with audit log
        async with self.db.transaction():
            await self.db.update_sample(sample_id, {
                "status": new_status.value,
                "current_location": location,
                "updated_at": datetime.utcnow(),
                "updated_by": updated_by
            })

            # Immutable audit log - never delete, never update
            await self.db.create_audit_log({
                "sample_id": sample_id,
                "from_status": sample.status,
                "to_status": new_status.value,
                "location": location,
                "updated_by": updated_by,
                "timestamp": datetime.utcnow()
            })

        # Real-time notification if report is ready
        if new_status == SampleStatus.REPORTED:
            await self.notify_patient(sample.patient_id, sample_id)

        # Update Redis for real-time tracking dashboard
        await self.redis.publish(
            f"sample:{sample_id}",
            json.dumps({
                "status": new_status.value,
                "location": location,
                "timestamp": datetime.utcnow().isoformat()
            })
        )
```

### Problem 2: Report Generation at Scale

On busy days, we generate 3,000+ reports. Each report is a multi-page PDF with:
- Patient demographics
- Test results with reference ranges
- Interpretation notes
- Doctor's signature (digital)
- QR code for verification

Our first approach (synchronous, one-by-one) took 6 hours on peak days. Patients were furious.

```python
# The Celery task that saved us
from celery import Celery
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate
import boto3

celery = Celery('reports', broker='redis://localhost:6379/0')

@celery.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    autoretry_for=(ConnectionError, TimeoutError)
)
def generate_report(self, sample_id: str):
    """
    Generates PDF report and uploads to S3.

    We learned to make this idempotent the hard way.
    A network glitch caused some reports to generate twice,
    and patients received duplicate SMS notifications.
    """
    try:
        # Check if already generated (idempotency)
        existing = db.get_report(sample_id)
        if existing and existing.status == "completed":
            return {"status": "already_exists", "url": existing.url}

        # Fetch all data in one go
        # (We used to make 5 separate DB calls. 5x slower.)
        report_data = db.get_report_data(sample_id)

        # Generate PDF
        pdf_buffer = create_report_pdf(report_data)

        # Upload to S3 with server-side encryption
        s3_key = f"reports/{report_data['patient_id']}/{sample_id}.pdf"
        s3_client.upload_fileobj(
            pdf_buffer,
            BUCKET_NAME,
            s3_key,
            ExtraArgs={
                'ServerSideEncryption': 'AES256',
                'ContentType': 'application/pdf'
            }
        )

        # Generate signed URL (expires in 7 days)
        download_url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': BUCKET_NAME, 'Key': s3_key},
            ExpiresIn=604800
        )

        # Update database
        db.update_report(sample_id, {
            "status": "completed",
            "url": download_url,
            "generated_at": datetime.utcnow()
        })

        # Notify patient (SMS + WhatsApp if opted in)
        notify_patient_report_ready(
            patient_id=report_data['patient_id'],
            patient_phone=report_data['phone'],
            report_url=download_url
        )

        return {"status": "success", "url": download_url}

    except Exception as e:
        # Log with full context for debugging
        logger.error(
            f"Report generation failed for {sample_id}",
            extra={
                "sample_id": sample_id,
                "error": str(e),
                "attempt": self.request.retries + 1
            }
        )
        raise self.retry(exc=e)
```

### Problem 3: The "Where's My Report?" Problem

Patients would call 10-20 times asking for their report status. Our support team was overwhelmed. We built real-time tracking:

```python
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Set

class PatientConnectionManager:
    """
    Real-time updates for patients waiting for reports.
    Reduced support calls by 70%.

    We debated between WebSocket and Server-Sent Events.
    WebSocket won because we needed bidirectional comms
    for the acknowledgment flow.
    """

    def __init__(self):
        # patient_id -> set of active connections
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, patient_id: str, websocket: WebSocket):
        await websocket.accept()
        if patient_id not in self.active_connections:
            self.active_connections[patient_id] = set()
        self.active_connections[patient_id].add(websocket)

        # Send current status immediately on connect
        current_status = await self.get_patient_samples_status(patient_id)
        await websocket.send_json({
            "type": "initial_status",
            "samples": current_status
        })

    async def broadcast_update(self, patient_id: str, update: dict):
        """Called when any sample status changes"""
        if patient_id in self.active_connections:
            dead_connections = set()
            for ws in self.active_connections[patient_id]:
                try:
                    await ws.send_json(update)
                except:
                    dead_connections.add(ws)

            # Clean up dead connections
            self.active_connections[patient_id] -= dead_connections

# The endpoint patients connect to
@app.websocket("/ws/patient/{patient_id}/status")
async def patient_status_stream(websocket: WebSocket, patient_id: str):
    # Verify patient owns this ID (auth check)
    token = websocket.query_params.get("token")
    if not verify_patient_token(token, patient_id):
        await websocket.close(code=4001)
        return

    await connection_manager.connect(patient_id, websocket)
    try:
        while True:
            # Heartbeat to keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        connection_manager.disconnect(patient_id, websocket)
```

## Healthcare-Specific Lessons (The Hard Way)

### 1. Audit Everything. No, Really, Everything.

```python
# We log every single data access
# This has saved us during:
# - Insurance disputes
# - Legal inquiries
# - Internal investigations
# - Debugging production issues

@app.middleware("http")
async def audit_middleware(request: Request, call_next):
    response = await call_next(request)

    # Log all patient data access
    if "/patients" in request.url.path or "/reports" in request.url.path:
        await audit_logger.log({
            "timestamp": datetime.utcnow(),
            "user_id": request.state.user_id,
            "user_role": request.state.user_role,
            "action": request.method,
            "resource": request.url.path,
            "ip_address": request.client.host,
            "user_agent": request.headers.get("user-agent"),
            "response_status": response.status_code
        })

    return response
```

### 2. Lab Equipment Integration is a Nightmare

Modern analyzers speak HL7 (a healthcare data format from the 1980s). Parsing it is... an experience.

```python
# Real HL7 message from an analyzer
# Yes, it really looks like this

"""
MSH|^~\&|ANALYZER|LAB|LIS|HOSPITAL|20240115120000||ORU^R01|MSG00001|P|2.3
PID|||123456||DOE^JOHN||19800101|M
OBR|1|12345|67890|CBC^Complete Blood Count||20240115
OBX|1|NM|WBC^White Blood Cell Count||7.5|10*3/uL|4.5-11.0|N
OBX|2|NM|RBC^Red Blood Cell Count||4.8|10*6/uL|4.5-5.5|N
OBX|3|NM|HGB^Hemoglobin||14.2|g/dL|13.5-17.5|N
"""

class HL7Parser:
    """
    I spent 3 weeks understanding HL7.
    Every analyzer vendor has their own "interpretation" of the standard.
    Some don't even follow the basic spec.
    """

    def parse_result(self, raw_message: str) -> dict:
        segments = raw_message.strip().split('\r')
        result = {
            "message_type": None,
            "patient_id": None,
            "results": []
        }

        for segment in segments:
            fields = segment.split('|')
            segment_type = fields[0]

            if segment_type == 'MSH':
                result['message_type'] = fields[8] if len(fields) > 8 else None

            elif segment_type == 'PID':
                # Patient ID can be in different positions depending on vendor
                # We've seen it in fields[2], fields[3], and fields[4]
                result['patient_id'] = self._extract_patient_id(fields)

            elif segment_type == 'OBX':
                # Result values
                # Some analyzers put units in field[6], some in field[7]
                result['results'].append({
                    'test_code': self._extract_test_code(fields[3]),
                    'value': fields[5],
                    'unit': fields[6] if len(fields) > 6 else None,
                    'reference_range': fields[7] if len(fields) > 7 else None,
                    'flag': fields[8] if len(fields) > 8 else 'N'
                })

        return result
```

### 3. Downtime is Not an Option

```yaml
# Our high-availability setup
# After one 3-hour outage, we never wanted to experience that again

services:
  api:
    deploy:
      replicas: 3
      update_config:
        parallelism: 1          # Rolling updates, one at a time
        delay: 30s              # Wait between updates
        failure_action: rollback
      restart_policy:
        condition: on-failure
        max_attempts: 3
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 30s

  postgres:
    # We run a primary + 2 replicas
    # Automatic failover with Patroni
    environment:
      - PATRONI_NAME=postgres
      - PATRONI_POSTGRESQL_DATA_DIR=/data/postgres
      - PATRONI_REPLICATION_USERNAME=replicator
```

## The Results After 2 Years

| What Changed | Before | After |
|--------------|--------|-------|
| Report delivery time | 24-48 hours | 4-6 hours (90% under 2 hrs) |
| Daily support calls | 200+ | ~30 |
| System downtime/month | 4-5 hours | <5 minutes |
| Data entry errors | ~5% | <0.5% |
| Patient satisfaction score | No data | 4.6/5 |

But the number I'm most proud of: **zero data breaches, zero lost samples, zero incorrect reports** in production.

## What I Wish Someone Had Told Me

1. **Healthcare moves slowly for good reasons.** Doctors and lab techs have workflows burned into muscle memory. Change needs to be gradual.

2. **Regulations aren't obstacles, they're guardrails.** HIPAA-like requirements forced us to build better systems than we would have otherwise.

3. **Paper isn't going away.** Many doctors still want printed reports. Design for hybrid workflows.

4. **Every error message might be read by a panicking patient.** "Report generation failed" causes anxiety. "Your report is being prepared and will be ready in 30 minutes" is better.

5. **The people using your software are exhausted.** Lab techs work 10-hour shifts. Make the UI obvious. Reduce clicks. Don't make them think.

---

Building healthcare software changed how I think about engineering. Speed matters, but accuracy matters more. Features are nice, but reliability is essential. And at the end of the day, there's a patient waiting for results that might change their life.

If you're considering healthcare tech, know that it's harder than regular SaaS - but also more meaningful. Every optimization you make helps real people get better care.

---

*Working on healthcare systems? I'd love to hear about your experiences. Connect on [LinkedIn](https://www.linkedin.com/in/tushar-agrawal-91b67a28a) or check out my other technical articles.*

## Related Articles

- [Building Scalable Microservices](/blog/building-scalable-microservices-with-go-and-fastapi) - The technical deep-dive
- [PostgreSQL Performance Optimization](/blog/postgresql-performance-optimization) - How we handle millions of records
- [WebSocket Real-time Applications](/blog/websocket-real-time-applications-guide) - The patient tracking system
- [Event-Driven Architecture with Kafka](/blog/event-driven-architecture-kafka) - Decoupling our services
