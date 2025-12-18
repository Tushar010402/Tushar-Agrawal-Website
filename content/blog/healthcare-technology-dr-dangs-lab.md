---
title: "Building Healthcare Technology at Dr. Dangs Lab: A Technical Deep Dive"
description: "Discover how we built scalable healthcare SaaS platforms at Dr. Dangs Lab serving 80+ healthcare professionals. Learn about HIPAA compliance, pathology lab management systems, and modern healthcare technology architecture."
date: "2024-12-17"
author: "Tushar Agrawal"
tags: ["Healthcare", "Dr Dangs Lab", "Pathology", "LIMS", "SaaS", "Backend", "HIPAA"]
image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&h=630&fit=crop"
published: true
---

## Introduction

Healthcare technology presents unique challenges that most software engineers never encounter. At Dr. Dangs Lab, one of India's leading pathology and diagnostic centers, I've had the privilege of building systems that directly impact patient care. This article shares our technical journey and the lessons learned.

## The Challenge

Dr. Dangs Lab serves thousands of patients daily across multiple locations. When I joined, the challenge was clear:

- **Legacy systems** struggling to scale
- **Paper-based workflows** causing delays
- **No real-time reporting** for patients
- **Manual coordination** between collection centers and labs
- **Compliance requirements** for healthcare data

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Patient Interface                             │
│  (Web Portal, Mobile App, WhatsApp Integration)                     │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API Gateway                                  │
│  (Authentication, Rate Limiting, Request Routing)                   │
└─────────────────────────────────────────────────────────────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
         ▼                         ▼                         ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Patient Service│    │   Lab Service   │    │ Report Service  │
│  - Registration │    │  - Sample Track │    │  - Generation   │
│  - Appointments │    │  - Test Queue   │    │  - Delivery     │
│  - History      │    │  - Results      │    │  - Analytics    │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                      │                      │
         └──────────────────────┼──────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
              ┌─────▼─────┐          ┌──────▼─────┐
              │ PostgreSQL│          │   Redis    │
              │ (Primary) │          │  (Cache)   │
              └───────────┘          └────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React, Next.js | Patient portal, admin dashboards |
| Backend | Python, FastAPI | Core API services |
| Database | PostgreSQL | Primary data store |
| Cache | Redis | Session management, caching |
| Queue | Celery + Redis | Async task processing |
| Search | Elasticsearch | Test catalog, patient search |
| Storage | AWS S3 | Report PDFs, images |
| Monitoring | Prometheus + Grafana | System health |

## Core Features We Built

### 1. Patient Registration System

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, validator
import re

class PatientRegistration(BaseModel):
    name: str
    phone: str
    email: str | None = None
    date_of_birth: str
    gender: str
    address: str

    @validator('phone')
    def validate_phone(cls, v):
        # Indian phone number validation
        if not re.match(r'^[6-9]\d{9}$', v):
            raise ValueError('Invalid phone number')
        return v

    @validator('gender')
    def validate_gender(cls, v):
        if v.lower() not in ['male', 'female', 'other']:
            raise ValueError('Invalid gender')
        return v.lower()

@app.post("/api/patients/register")
async def register_patient(patient: PatientRegistration):
    # Check for duplicate registration
    existing = await db.get_patient_by_phone(patient.phone)
    if existing:
        raise HTTPException(400, "Patient already registered")

    # Generate unique patient ID
    patient_id = generate_patient_id()

    # Create patient record
    new_patient = await db.create_patient({
        "id": patient_id,
        **patient.dict(),
        "registered_at": datetime.utcnow()
    })

    # Send welcome SMS
    await send_sms(
        patient.phone,
        f"Welcome to Dr. Dangs Lab! Your Patient ID is {patient_id}"
    )

    return {"patient_id": patient_id, "status": "registered"}
```

### 2. Sample Collection Tracking

```python
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
    def __init__(self, db, redis, notification_service):
        self.db = db
        self.redis = redis
        self.notifications = notification_service

    async def update_status(
        self,
        sample_id: str,
        new_status: SampleStatus,
        location: str,
        updated_by: str
    ):
        # Get current sample
        sample = await self.db.get_sample(sample_id)
        if not sample:
            raise ValueError("Sample not found")

        # Validate status transition
        if not self._is_valid_transition(sample.status, new_status):
            raise ValueError(f"Invalid status transition: {sample.status} -> {new_status}")

        # Update status
        await self.db.update_sample(sample_id, {
            "status": new_status.value,
            "current_location": location,
            "updated_at": datetime.utcnow(),
            "updated_by": updated_by
        })

        # Log status change
        await self.db.create_status_log({
            "sample_id": sample_id,
            "from_status": sample.status,
            "to_status": new_status.value,
            "location": location,
            "timestamp": datetime.utcnow()
        })

        # Notify patient
        if new_status == SampleStatus.REPORTED:
            await self.notifications.send_report_ready(sample.patient_id)

        # Update real-time cache
        await self.redis.set(
            f"sample:{sample_id}:status",
            new_status.value,
            ex=86400  # 24 hour expiry
        )

    def _is_valid_transition(self, current: str, new: SampleStatus) -> bool:
        valid_transitions = {
            "collected": ["in_transit"],
            "in_transit": ["received_at_lab"],
            "received_at_lab": ["processing"],
            "processing": ["completed"],
            "completed": ["reported"]
        }
        return new.value in valid_transitions.get(current, [])
```

### 3. Report Generation Pipeline

```python
from celery import Celery
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
import boto3

celery = Celery('reports', broker='redis://localhost:6379/0')

@celery.task(bind=True, max_retries=3)
def generate_report(self, sample_id: str):
    try:
        # Fetch all required data
        sample = db.get_sample(sample_id)
        patient = db.get_patient(sample.patient_id)
        test_results = db.get_test_results(sample_id)
        reference_ranges = db.get_reference_ranges(sample.test_ids)

        # Generate PDF
        pdf_path = create_report_pdf(
            patient=patient,
            sample=sample,
            results=test_results,
            references=reference_ranges
        )

        # Upload to S3
        s3_key = f"reports/{patient.id}/{sample_id}.pdf"
        s3_client.upload_file(pdf_path, BUCKET_NAME, s3_key)

        # Generate signed URL (valid for 7 days)
        download_url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': BUCKET_NAME, 'Key': s3_key},
            ExpiresIn=604800
        )

        # Update database
        db.update_sample(sample_id, {
            "report_url": download_url,
            "report_generated_at": datetime.utcnow(),
            "status": "reported"
        })

        # Notify patient
        send_report_notification(patient, download_url)

        return {"status": "success", "url": download_url}

    except Exception as e:
        # Retry with exponential backoff
        self.retry(exc=e, countdown=60 * (2 ** self.request.retries))
```

### 4. Real-time Status Updates

```python
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Set

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, patient_id: str, websocket: WebSocket):
        await websocket.accept()
        if patient_id not in self.active_connections:
            self.active_connections[patient_id] = set()
        self.active_connections[patient_id].add(websocket)

    def disconnect(self, patient_id: str, websocket: WebSocket):
        if patient_id in self.active_connections:
            self.active_connections[patient_id].discard(websocket)

    async def send_update(self, patient_id: str, message: dict):
        if patient_id in self.active_connections:
            for connection in self.active_connections[patient_id]:
                await connection.send_json(message)

manager = ConnectionManager()

@app.websocket("/ws/patient/{patient_id}")
async def patient_updates(websocket: WebSocket, patient_id: str):
    await manager.connect(patient_id, websocket)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(patient_id, websocket)

# Called when sample status changes
async def notify_patient_update(patient_id: str, sample_id: str, status: str):
    await manager.send_update(patient_id, {
        "type": "sample_update",
        "sample_id": sample_id,
        "status": status,
        "timestamp": datetime.utcnow().isoformat()
    })
```

## Healthcare-Specific Challenges

### 1. Data Privacy and Compliance

```python
# Audit logging for all data access
class AuditLogger:
    async def log_access(
        self,
        user_id: str,
        action: str,
        resource_type: str,
        resource_id: str,
        ip_address: str
    ):
        await self.db.create_audit_log({
            "user_id": user_id,
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "ip_address": ip_address,
            "timestamp": datetime.utcnow(),
            "user_agent": request.headers.get("user-agent")
        })

# Middleware to log all API access
@app.middleware("http")
async def audit_middleware(request: Request, call_next):
    response = await call_next(request)

    if request.url.path.startswith("/api/patients"):
        await audit_logger.log_access(
            user_id=request.state.user_id,
            action=request.method,
            resource_type="patient_data",
            resource_id=extract_resource_id(request.url.path),
            ip_address=request.client.host
        )

    return response
```

### 2. High Availability

```yaml
# Docker Compose for high availability
version: '3.8'

services:
  api:
    image: drdangs-api:latest
    deploy:
      replicas: 3
      restart_policy:
        condition: on-failure
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:15
    environment:
      POSTGRES_REPLICATION_MODE: master
    volumes:
      - postgres_data:/var/lib/postgresql/data

  postgres-replica:
    image: postgres:15
    environment:
      POSTGRES_REPLICATION_MODE: slave
      POSTGRES_MASTER_HOST: postgres
    depends_on:
      - postgres
```

### 3. Integration with Lab Equipment

```python
# HL7 message parser for lab equipment integration
class HL7Parser:
    def parse_result(self, hl7_message: str) -> dict:
        """Parse HL7 2.x message from lab analyzer"""
        segments = hl7_message.split('\r')
        result = {}

        for segment in segments:
            fields = segment.split('|')
            segment_type = fields[0]

            if segment_type == 'MSH':
                result['message_type'] = fields[8]
                result['timestamp'] = self._parse_timestamp(fields[6])

            elif segment_type == 'PID':
                result['patient_id'] = fields[3]
                result['patient_name'] = fields[5]

            elif segment_type == 'OBX':
                if 'results' not in result:
                    result['results'] = []
                result['results'].append({
                    'test_code': fields[3],
                    'value': fields[5],
                    'unit': fields[6],
                    'reference_range': fields[7],
                    'flag': fields[8]  # H=High, L=Low, N=Normal
                })

        return result
```

## Results and Impact

After implementing these systems:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Report Turnaround | 24-48 hrs | 4-6 hrs | 80% faster |
| Patient Queries | 500/day (calls) | Automated | 90% reduction |
| Data Entry Errors | ~5% | <0.5% | 90% reduction |
| System Uptime | 95% | 99.9% | Critical improvement |

## Key Lessons Learned

1. **Healthcare is Different**: Regulations, patient safety, and data sensitivity require extra care
2. **Legacy Integration is Hard**: Lab equipment often uses old protocols (HL7, ASTM)
3. **Uptime is Critical**: Healthcare systems cannot afford downtime
4. **User Training Matters**: The best system fails without proper training
5. **Start Simple**: Begin with core workflows, add complexity gradually

## Conclusion

Building healthcare technology is challenging but incredibly rewarding. Every improvement directly impacts patient care and healthcare workers' efficiency. At Dr. Dangs Lab, we've transformed operations while maintaining the highest standards of data security and reliability.

---

*Interested in healthcare technology? Connect on [LinkedIn](https://www.linkedin.com/in/tushar-agrawal-91b67a28a) to discuss building healthcare systems.*
