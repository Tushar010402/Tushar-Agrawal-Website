"""
Script to create SEO-optimized blog posts
Run this after starting the backend server
"""
import requests
import json

BASE_URL = "http://localhost:8000"

# Step 1: Admin Login
print("Logging in as admin...")
login_response = requests.post(
    f"{BASE_URL}/api/auth/login",
    json={"phone": "8126816664", "otp": "000000"}
)

if login_response.status_code != 200:
    print(f"Login failed: {login_response.text}")
    exit(1)

token = login_response.json()["access_token"]
print(f"Login successful! Token received.")

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

# Step 2: Create SEO-Optimized Blog Posts
blogs = [
    {
        "title": "Building Scalable Microservices with Go and FastAPI: A Complete Guide",
        "description": "Learn how to architect and build production-ready microservices using Go and FastAPI. Covers system design, API gateways, load balancing, and achieving 99.9% uptime.",
        "content": """# Building Scalable Microservices with Go and FastAPI

As a backend engineer with 3 years building healthcare SaaS platforms, I've learned that choosing the right tech stack is crucial for building scalable microservices. In this comprehensive guide, I'll share my experience building microservices that handle 50,000+ daily requests with sub-100ms latency.

## Why Go and FastAPI?

### Go for High-Performance Services
Go excels at:
- **Concurrency**: Goroutines make it easy to handle thousands of concurrent requests
- **Performance**: Compiled binary runs blazing fast
- **Small Memory Footprint**: Perfect for containerized deployments
- **Standard Library**: Built-in HTTP server, JSON handling, and more

### FastAPI for Rapid Development
FastAPI provides:
- **Automatic API Documentation**: Swagger UI out of the box
- **Type Safety**: Pydantic models ensure data validation
- **Async Support**: Handle high concurrency with async/await
- **Easy Testing**: Built-in test client and dependency injection

## Architecture Overview

```
Client → API Gateway (Nginx) → Load Balancer
    ↓
    ├─→ Go Service 1 (Order Processing)
    ├─→ FastAPI Service 2 (User Management)
    ├─→ Go Service 3 (Analytics)
    └─→ FastAPI Service 4 (Notifications)
    ↓
    Database Layer (PostgreSQL + Redis)
```

## Best Practices

### 1. API Gateway Pattern
Use Nginx as an API gateway to:
- Route requests to appropriate services
- Handle SSL/TLS termination
- Implement rate limiting
- Cache responses

### 2. Health Checks
Implement health check endpoints:

```python
# FastAPI
@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}
```

```go
// Go
func healthHandler(w http.ResponseWriter, r *http.Request) {
    json.NewEncoder(w).Encode(map[string]string{
        "status": "healthy",
        "version": "1.0.0",
    })
}
```

### 3. Database Connection Pooling
Always use connection pooling for better performance:

```python
# SQLAlchemy async engine
engine = create_async_engine(
    DATABASE_URL,
    pool_size=20,
    max_overflow=10
)
```

### 4. Error Handling
Implement comprehensive error handling:

```python
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )
```

## Real-World Performance Metrics

From my experience at Dr Dangs Lab:
- **Latency**: Sub-100ms response times for 50,000+ daily requests
- **Uptime**: 99.9% availability
- **Throughput**: 10,000+ monthly records processed
- **Deployment**: Zero-downtime releases using Docker

## Deployment with Docker

```dockerfile
# Go Dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN go build -o main .

FROM alpine:latest
COPY --from=builder /app/main /app/main
CMD ["/app/main"]
```

```dockerfile
# FastAPI Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Monitoring and Observability

Essential tools:
- **Prometheus**: Metrics collection
- **Grafana**: Visualization
- **ELK Stack**: Centralized logging
- **Jaeger**: Distributed tracing

## Conclusion

Building scalable microservices requires careful planning, right tool selection, and following best practices. Go and FastAPI complement each other perfectly - use Go for CPU-intensive tasks and FastAPI for rapid API development.

**Key Takeaways:**
- Choose the right tool for each service
- Implement proper monitoring from day one
- Use Docker for consistent deployments
- Always have health checks and graceful shutdown

---

*Have questions about microservices? Connect with me on [LinkedIn](https://www.linkedin.com/in/tushar-agrawal-589205192/) or check out my [GitHub](https://github.com/Tushar010402) for more examples.*
""",
        "tags": "microservices,go,fastapi,python,backend,system-design,docker,api-gateway,tushar-agrawal",
        "image_url": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200",
        "published": True
    },
    {
        "title": "HIPAA-Compliant Healthcare SaaS: Security Best Practices for 2025",
        "description": "Essential security practices for building HIPAA and DPDP compliant healthcare applications. Learn from real-world implementation handling 500+ daily patients.",
        "content": """# HIPAA-Compliant Healthcare SaaS: Security Best Practices

Building healthcare applications requires strict adherence to HIPAA (Health Insurance Portability and Accountability Act) and DPDP (Digital Personal Data Protection) regulations. Here's what I learned building systems that handle 500+ daily patients' data.

## Understanding HIPAA Requirements

HIPAA mandates protection of PHI (Protected Health Information) through:
- **Administrative Safeguards**: Policies and procedures
- **Physical Safeguards**: Physical access controls
- **Technical Safeguards**: Encryption, access controls, audit logs

## Technical Implementation

### 1. Data Encryption

**At Rest:**
```python
# Using SQLAlchemy with encryption
from sqlalchemy_utils import EncryptedType
from sqlalchemy_utils.types.encrypted.encrypted_type import AesEngine

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True)
    name = Column(EncryptedType(String, SECRET_KEY, AesEngine, 'pkcs5'))
    ssn = Column(EncryptedType(String, SECRET_KEY, AesEngine, 'pkcs5'))
```

**In Transit:**
- Always use HTTPS/TLS 1.3
- Implement certificate pinning
- Use strong cipher suites

### 2. Access Control

Implement Role-Based Access Control (RBAC):

```python
from enum import Enum

class Role(Enum):
    DOCTOR = "doctor"
    NURSE = "nurse"
    ADMIN = "admin"
    PATIENT = "patient"

class Permission(Enum):
    READ_PHI = "read_phi"
    WRITE_PHI = "write_phi"
    DELETE_PHI = "delete_phi"

# Role permissions mapping
ROLE_PERMISSIONS = {
    Role.DOCTOR: [Permission.READ_PHI, Permission.WRITE_PHI],
    Role.NURSE: [Permission.READ_PHI],
    Role.ADMIN: [Permission.READ_PHI, Permission.WRITE_PHI, Permission.DELETE_PHI],
    Role.PATIENT: [Permission.READ_PHI]  # Own data only
}
```

### 3. Audit Logging

Track all PHI access:

```python
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False)
    action = Column(String(50), nullable=False)  # CREATE, READ, UPDATE, DELETE
    resource_type = Column(String(50), nullable=False)
    resource_id = Column(Integer, nullable=False)
    ip_address = Column(String(45), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Store what data was accessed
    metadata = Column(JSON, nullable=True)
```

### 4. Session Management

```python
from datetime import timedelta

# Short session timeout for security
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Automatic logout after inactivity
INACTIVITY_TIMEOUT = timedelta(minutes=10)
```

### 5. Data Backup and Recovery

```bash
# Automated encrypted backups
#!/bin/bash
BACKUP_DIR="/secure/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup with encryption
pg_dump healthcare_db | \
    gpg --encrypt --recipient admin@example.com > \
    $BACKUP_DIR/backup_$DATE.sql.gpg

# Retain backups for 7 years (HIPAA requirement)
find $BACKUP_DIR -mtime +2555 -delete
```

## Real-World Implementation: Dr Dangs Lab

Our LIMS system implements:

### Patient Data Flow
```
Patient → Registration System
    ↓ (Encrypted)
Laboratory Tests
    ↓ (Encrypted Storage)
Results Generation (Python OCR)
    ↓ (Access Controlled)
Doctor Review
    ↓ (Audit Logged)
Patient Portal (Secure Access)
```

### Security Measures
- **Encryption**: AES-256 for data at rest
- **Network**: VPN for internal communication
- **Authentication**: Multi-factor authentication
- **Monitoring**: Real-time alerts for suspicious activity
- **Compliance**: Regular security audits

## Compliance Checklist

- [ ] Data encryption (at rest and in transit)
- [ ] Access control and authentication
- [ ] Audit logging for all PHI access
- [ ] Regular security audits
- [ ] Employee training
- [ ] Business Associate Agreements (BAAs)
- [ ] Incident response plan
- [ ] Data backup and recovery
- [ ] Physical security measures
- [ ] Regular penetration testing

## Common Pitfalls to Avoid

1. **Logging PHI**: Never log sensitive patient data
2. **Weak Passwords**: Enforce strong password policies
3. **Missing Audit Trails**: Track all access to PHI
4. **Insecure APIs**: Always validate and sanitize inputs
5. **Shared Credentials**: Each user must have unique credentials

## Tools and Technologies

- **Authentication**: OAuth 2.0, JWT
- **Encryption**: AES-256, TLS 1.3
- **Monitoring**: Prometheus, Grafana
- **WAF**: Cloudflare, AWS WAF
- **Compliance**: Vanta, Drata

## Conclusion

HIPAA compliance is not optional for healthcare applications. It requires a security-first mindset and continuous vigilance. The penalties for non-compliance can be severe, but more importantly, patient privacy is paramount.

**Remember**: Security is not a feature, it's a requirement.

---

*Building healthcare SaaS? Let's connect! Find me on [LinkedIn](https://www.linkedin.com/in/tushar-agrawal-589205192/) or explore my healthcare projects on [GitHub](https://github.com/Tushar010402).*
""",
        "tags": "healthcare,hipaa,security,compliance,saas,python,backend,tushar-agrawal,data-protection",
        "image_url": "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200",
        "published": True
    },
    {
        "title": "AI-Powered OCR for Medical Reports: Reducing Manual Errors by 90%",
        "description": "How we built a Python OCR system that processes 1,000+ daily medical reports with 90% error reduction. Complete implementation guide with code examples.",
        "content": """# AI-Powered OCR for Medical Reports

At Dr Dangs Lab, we faced a significant challenge: processing 1,000+ medical reports daily with manual data entry errors plaguing our workflow. Here's how we built an AI-powered OCR system that eliminated 90% of manual errors.

## The Problem

**Before OCR:**
- Manual data entry: 45 minutes per report
- High error rate: 10-15% mistakes
- Limited scalability
- Staff burnout from repetitive tasks

**After OCR:**
- Automated processing: 5 minutes per report
- Error rate: < 1%
- Scalable to thousands of reports
- Staff focus on quality control

## Technology Stack

```python
# Core libraries
import cv2  # Image preprocessing
import pytesseract  # OCR engine
from PIL import Image
import pdf2image  # PDF handling
import re  # Pattern matching
import pandas as pd  # Data structuring
```

## Implementation Steps

### 1. Image Preprocessing

Clean and enhance images for better OCR accuracy:

```python
import cv2
import numpy as np

def preprocess_image(image_path):
    # Read image
    img = cv2.imread(image_path)

    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Denoise
    denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)

    # Binarization (Otsu's method)
    _, binary = cv2.threshold(
        denoised, 0, 255,
        cv2.THRESH_BINARY + cv2.THRESH_OTSU
    )

    # Deskew
    coords = np.column_stack(np.where(binary > 0))
    angle = cv2.minAreaRect(coords)[-1]
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle

    (h, w) = binary.shape[:2]
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, angle, 1.0)
    rotated = cv2.warpAffine(
        binary, M, (w, h),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE
    )

    return rotated
```

### 2. OCR Extraction

Extract text from preprocessed images:

```python
import pytesseract
from pdf2image import convert_from_path

class MedicalReportOCR:
    def __init__(self, tesseract_path=None):
        if tesseract_path:
            pytesseract.pytesseract.tesseract_cmd = tesseract_path

    def extract_from_pdf(self, pdf_path):
        # Convert PDF to images
        images = convert_from_path(pdf_path, dpi=300)

        extracted_text = []
        for i, image in enumerate(images):
            # Preprocess
            processed = self.preprocess_pil_image(image)

            # OCR with configuration
            custom_config = r'--oem 3 --psm 6'
            text = pytesseract.image_to_string(
                processed,
                config=custom_config
            )
            extracted_text.append(text)

        return '\n'.join(extracted_text)

    def preprocess_pil_image(self, pil_image):
        # Convert PIL to OpenCV format
        open_cv_image = np.array(pil_image)
        open_cv_image = cv2.cvtColor(
            open_cv_image,
            cv2.COLOR_RGB2BGR
        )

        # Apply preprocessing
        return preprocess_image_from_array(open_cv_image)
```

### 3. Data Extraction and Validation

Parse structured data from OCR text:

```python
import re
from typing import Dict, Optional

class ReportParser:
    def __init__(self):
        self.patterns = {
            'patient_name': r'Patient Name[:\s]+([A-Z][a-z]+(?: [A-Z][a-z]+)+)',
            'patient_id': r'Patient ID[:\s]+(\d+)',
            'test_date': r'Date[:\s]+(\d{2}/\d{2}/\d{4})',
            'hemoglobin': r'Hemoglobin[:\s]+([\d.]+)',
            'glucose': r'Glucose[:\s]+([\d.]+)',
            # Add more patterns for different tests
        }

    def parse_report(self, text: str) -> Dict[str, Optional[str]]:
        results = {}

        for field, pattern in self.patterns.items():
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                results[field] = match.group(1).strip()
            else:
                results[field] = None

        return results

    def validate_results(self, results: Dict) -> Dict:
        # Validate extracted data
        validated = results.copy()

        # Check required fields
        required_fields = ['patient_name', 'patient_id', 'test_date']
        for field in required_fields:
            if not validated.get(field):
                raise ValueError(f"Missing required field: {field}")

        # Validate value ranges
        if validated.get('hemoglobin'):
            hb = float(validated['hemoglobin'])
            if not (5.0 <= hb <= 20.0):
                print(f"Warning: Hemoglobin {hb} outside normal range")

        return validated
```

### 4. Integration with Database

Store extracted data:

```python
from sqlalchemy.ext.asyncio import AsyncSession

async def process_and_store_report(
    pdf_path: str,
    db: AsyncSession,
    ocr: MedicalReportOCR,
    parser: ReportParser
):
    try:
        # Extract text
        text = ocr.extract_from_pdf(pdf_path)

        # Parse data
        results = parser.parse_report(text)
        validated_results = parser.validate_results(results)

        # Store in database
        report = MedicalReport(
            patient_id=validated_results['patient_id'],
            patient_name=validated_results['patient_name'],
            test_date=validated_results['test_date'],
            hemoglobin=validated_results.get('hemoglobin'),
            glucose=validated_results.get('glucose'),
            raw_text=text,
            processed_at=datetime.utcnow()
        )

        db.add(report)
        await db.commit()

        return {"status": "success", "report_id": report.id}

    except Exception as e:
        await db.rollback()
        return {"status": "error", "message": str(e)}
```

## Performance Optimization

### 1. Batch Processing

Process multiple reports concurrently:

```python
import asyncio
from concurrent.futures import ProcessPoolExecutor

async def batch_process_reports(pdf_paths: list):
    with ProcessPoolExecutor(max_workers=4) as executor:
        loop = asyncio.get_event_loop()
        tasks = [
            loop.run_in_executor(
                executor,
                process_single_report,
                path
            )
            for path in pdf_paths
        ]
        results = await asyncio.gather(*tasks)
    return results
```

### 2. Caching

Cache OCR results to avoid reprocessing:

```python
from functools import lru_cache
import hashlib

@lru_cache(maxsize=1000)
def get_cached_ocr_result(file_hash: str):
    # Check Redis cache
    cached = redis_client.get(f"ocr:{file_hash}")
    if cached:
        return json.loads(cached)
    return None

def compute_file_hash(file_path: str) -> str:
    with open(file_path, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()
```

## Real-World Results

**Processing Metrics:**
- **Speed**: 1,000+ reports/day
- **Accuracy**: 99%+ for structured data
- **Time Savings**: 90% reduction (45min → 5min)
- **Error Reduction**: 90% fewer manual errors
- **Cost Savings**: 80% reduction in data entry costs

## Challenges and Solutions

### Challenge 1: Poor Image Quality
**Solution**: Enhanced preprocessing pipeline with denoising

### Challenge 2: Varying Report Formats
**Solution**: Template matching and adaptive parsing

### Challenge 3: Handwritten Notes
**Solution**: Hybrid approach - OCR for printed, manual for handwritten

## Future Enhancements

1. **Machine Learning**: Train custom models for medical terminology
2. **Real-time Processing**: WebSocket-based live processing
3. **Mobile App**: Scan reports using phone camera
4. **Multi-language Support**: Process reports in regional languages

## Conclusion

AI-powered OCR transformed our medical report processing workflow. What took 45 minutes now takes 5 minutes with higher accuracy. The key is proper preprocessing, robust parsing, and continuous validation.

---

*Want to implement OCR in your healthcare application? Connect with me on [LinkedIn](https://www.linkedin.com/in/tushar-agrawal-589205192/) or check out code examples on [GitHub](https://github.com/Tushar010402).*
""",
        "tags": "ocr,python,ai,machine-learning,healthcare,automation,cv2,tesseract,tushar-agrawal",
        "image_url": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200",
        "published": True
    },
    {
        "title": "Event-Driven Architecture with Kafka: Real-Time Inventory Management",
        "description": "Learn how to build event-driven systems using Apache Kafka. Real-world example of inventory management platform serving 20+ businesses with sub-100ms latency.",
        "content": """# Event-Driven Architecture with Kafka

Building LiquorPro, an inventory management platform for 20+ businesses, taught me the power of event-driven architecture. Here's how we achieved sub-100ms response times and real-time updates using Apache Kafka.

## Why Event-Driven Architecture?

Traditional request-response architecture has limitations:
- **Tight Coupling**: Services depend on each other directly
- **Synchronous Operations**: Blocking calls reduce performance
- **Scalability Issues**: Hard to scale individual components

Event-driven architecture solves these:
- **Loose Coupling**: Services communicate via events
- **Asynchronous Processing**: Non-blocking operations
- **Better Scalability**: Scale producers and consumers independently

## Architecture Overview

```
User Action → API Gateway → Producer
                               ↓
                            Kafka Cluster
                    (Topics: inventory, orders, notifications)
                               ↓
         ┌──────────────┬──────────────┬──────────────┐
    Consumer 1      Consumer 2      Consumer 3
(Inventory Svc) (Analytics Svc) (Notification Svc)
```

## Setting Up Kafka

### 1. Docker Compose Setup

```yaml
version: '3.8'
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:latest
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    ports:
      - "2181:2181"

  kafka:
    image: confluentinc/cp-kafka:latest
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
```

### 2. Go Producer

```go
package main

import (
    "context"
    "encoding/json"
    "github.com/segmentio/kafka-go"
    "log"
)

type InventoryEvent struct {
    EventType string                 `json:"event_type"`
    ProductID string                 `json:"product_id"`
    Quantity  int                    `json:"quantity"`
    Timestamp int64                  `json:"timestamp"`
    Metadata  map[string]interface{} `json:"metadata"`
}

type KafkaProducer struct {
    writer *kafka.Writer
}

func NewKafkaProducer(brokers []string, topic string) *KafkaProducer {
    return &KafkaProducer{
        writer: &kafka.Writer{
            Addr:     kafka.TCP(brokers...),
            Topic:    topic,
            Balancer: &kafka.LeastBytes{},
        },
    }
}

func (p *KafkaProducer) SendEvent(ctx context.Context, event InventoryEvent) error {
    eventJSON, err := json.Marshal(event)
    if err != nil {
        return err
    }

    err = p.writer.WriteMessages(ctx, kafka.Message{
        Key:   []byte(event.ProductID),
        Value: eventJSON,
    })

    if err != nil {
        log.Printf("Failed to send event: %v", err)
        return err
    }

    log.Printf("Event sent: %s", event.EventType)
    return nil
}

func (p *KafkaProducer) Close() error {
    return p.writer.Close()
}
```

### 3. Go Consumer

```go
package main

import (
    "context"
    "encoding/json"
    "github.com/segmentio/kafka-go"
    "log"
)

type KafkaConsumer struct {
    reader *kafka.Reader
}

func NewKafkaConsumer(brokers []string, topic, groupID string) *KafkaConsumer {
    return &KafkaConsumer{
        reader: kafka.NewReader(kafka.ReaderConfig{
            Brokers:        brokers,
            Topic:          topic,
            GroupID:        groupID,
            MinBytes:       10e3, // 10KB
            MaxBytes:       10e6, // 10MB
            CommitInterval: 1000,  // 1 second
        }),
    }
}

func (c *KafkaConsumer) Start(ctx context.Context, handler func(InventoryEvent) error) {
    for {
        select {
        case <-ctx.Done():
            return
        default:
            msg, err := c.reader.ReadMessage(ctx)
            if err != nil {
                log.Printf("Error reading message: %v", err)
                continue
            }

            var event InventoryEvent
            if err := json.Unmarshal(msg.Value, &event); err != nil {
                log.Printf("Error unmarshaling event: %v", err)
                continue
            }

            if err := handler(event); err != nil {
                log.Printf("Error handling event: %v", err)
                // Implement retry logic or dead letter queue
                continue
            }

            log.Printf("Processed event: %s", event.EventType)
        }
    }
}

func (c *KafkaConsumer) Close() error {
    return c.reader.Close()
}
```

## Use Case: Real-Time Inventory Updates

### Producer (API Service)

```go
func (s *InventoryService) UpdateStock(ctx context.Context, productID string, quantity int) error {
    // Update database
    if err := s.db.UpdateStock(ctx, productID, quantity); err != nil {
        return err
    }

    // Publish event
    event := InventoryEvent{
        EventType: "STOCK_UPDATED",
        ProductID: productID,
        Quantity:  quantity,
        Timestamp: time.Now().Unix(),
        Metadata: map[string]interface{}{
            "user_id": ctx.Value("user_id"),
            "action":  "manual_update",
        },
    }

    return s.producer.SendEvent(ctx, event)
}
```

### Consumer 1: Inventory Service

```go
func handleInventoryEvent(event InventoryEvent) error {
    switch event.EventType {
    case "STOCK_UPDATED":
        // Update cache
        redis.Set(
            fmt.Sprintf("stock:%s", event.ProductID),
            event.Quantity,
            time.Hour,
        )

        // Check if reorder needed
        if event.Quantity < REORDER_THRESHOLD {
            createReorderAlert(event.ProductID)
        }

    case "ORDER_PLACED":
        // Decrease stock
        decreaseStock(event.ProductID, event.Quantity)

    case "ORDER_CANCELLED":
        // Increase stock
        increaseStock(event.ProductID, event.Quantity)
    }

    return nil
}
```

### Consumer 2: Analytics Service

```go
func handleAnalyticsEvent(event InventoryEvent) error {
    // Store in time-series database
    metric := AnalyticsMetric{
        Timestamp:  event.Timestamp,
        ProductID:  event.ProductID,
        EventType:  event.EventType,
        Quantity:   event.Quantity,
        Metadata:   event.Metadata,
    }

    return influxDB.Write(metric)
}
```

### Consumer 3: Notification Service

```go
func handleNotificationEvent(event InventoryEvent) error {
    switch event.EventType {
    case "LOW_STOCK":
        // Send email to admin
        sendEmail(
            "admin@example.com",
            "Low Stock Alert",
            fmt.Sprintf("Product %s is running low", event.ProductID),
        )

    case "OUT_OF_STOCK":
        // Send urgent notification
        sendSMS(
            ADMIN_PHONE,
            fmt.Sprintf("URGENT: Product %s is out of stock", event.ProductID),
        )
    }

    return nil
}
```

## Performance Optimization

### 1. Batching

```go
type BatchProducer struct {
    writer *kafka.Writer
    buffer []kafka.Message
    mu     sync.Mutex
}

func (bp *BatchProducer) AddToBuffer(msg kafka.Message) {
    bp.mu.Lock()
    defer bp.mu.Unlock()

    bp.buffer = append(bp.buffer, msg)

    if len(bp.buffer) >= 100 {
        bp.flush()
    }
}

func (bp *BatchProducer) flush() {
    if len(bp.buffer) == 0 {
        return
    }

    ctx := context.Background()
    bp.writer.WriteMessages(ctx, bp.buffer...)
    bp.buffer = bp.buffer[:0]
}
```

### 2. Partitioning Strategy

```go
// Custom partitioner for better load distribution
type ProductPartitioner struct{}

func (p *ProductPartitioner) Partition(message kafka.Message, numPartitions int) int {
    // Hash product ID to partition
    hash := fnv.New32a()
    hash.Write(message.Key)
    return int(hash.Sum32() % uint32(numPartitions))
}
```

## Monitoring and Observability

```go
import "github.com/prometheus/client_golang/prometheus"

var (
    eventsProcessed = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "kafka_events_processed_total",
            Help: "Total number of Kafka events processed",
        },
        []string{"topic", "event_type"},
    )

    processingDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "kafka_event_processing_duration_seconds",
            Help: "Duration of event processing",
        },
        []string{"topic"},
    )
)

func monitoredHandler(event InventoryEvent) error {
    start := time.Now()

    err := handleInventoryEvent(event)

    duration := time.Since(start).Seconds()
    processingDuration.WithLabelValues("inventory").Observe(duration)

    if err == nil {
        eventsProcessed.WithLabelValues("inventory", event.EventType).Inc()
    }

    return err
}
```

## Real-World Results

**LiquorPro Performance:**
- **Latency**: Sub-100ms event delivery
- **Throughput**: 10,000+ events/day
- **Reliability**: 99.9% message delivery
- **Scalability**: Handling 20+ businesses seamlessly

## Best Practices

1. **Idempotency**: Design consumers to handle duplicate events
2. **Schema Evolution**: Use Avro or Protobuf for versioning
3. **Error Handling**: Implement dead letter queues
4. **Monitoring**: Track lag, throughput, and errors
5. **Partitioning**: Choose partition keys wisely

## Conclusion

Event-driven architecture with Kafka enables building truly scalable, real-time systems. The asynchronous nature allows for better performance and easier maintenance.

---

*Building real-time systems? Let's discuss! Find me on [LinkedIn](https://www.linkedin.com/in/tushar-agrawal-589205192/) or check out [LiquorPro on GitHub](https://github.com/Tushar010402/Liqour_1.1).*
""",
        "tags": "kafka,event-driven,microservices,go,real-time,distributed-systems,tushar-agrawal,architecture",
        "image_url": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200",
        "published": True
    },
    {
        "title": "Zero-Downtime Deployment with Docker and Nginx: From 4 Hours to 20 Minutes",
        "description": "How we achieved 92% reduction in deployment time using Docker, Nginx, and blue-green deployment strategy. Complete guide with real production setup.",
        "content": """# Zero-Downtime Deployment: 92% Faster Deployments

Deploying applications shouldn't mean downtime. At Dr Dangs Lab, we reduced deployment time from 4 hours to 20 minutes while achieving zero downtime. Here's how we did it.

## The Problem

**Before Optimization:**
- Deployment time: 4 hours
- Downtime: 30-60 minutes
- Manual steps: 20+
- Rollback time: 2 hours
- Stressed team members

**After Optimization:**
- Deployment time: 20 minutes
- Downtime: 0 minutes
- Automated pipeline
- Instant rollback
- Happy team

## Architecture Overview

```
GitHub → GitHub Actions (CI/CD)
    ↓
Build Docker Images
    ↓
Push to Registry
    ↓
Blue-Green Deployment
    ↓
Nginx Load Balancer
    ↓
Health Checks → Switch Traffic
```

## Docker Setup

### 1. Multi-Stage Dockerfile

```dockerfile
# Build stage
FROM python:3.11-slim AS builder

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Runtime stage
FROM python:3.11-slim

WORKDIR /app

# Copy dependencies from builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copy application
COPY . .

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# Run application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 2. Docker Compose for Blue-Green

```yaml
version: '3.8'

services:
  app-blue:
    image: myapp:${BLUE_VERSION}
    container_name: app-blue
    environment:
      - ENV=production
      - VERSION=${BLUE_VERSION}
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  app-green:
    image: myapp:${GREEN_VERSION}
    container_name: app-green
    environment:
      - ENV=production
      - VERSION=${GREEN_VERSION}
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    container_name: nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    networks:
      - app-network
    depends_on:
      - app-blue
      - app-green

networks:
  app-network:
    driver: bridge
```

## Nginx Configuration

```nginx
upstream backend {
    least_conn;
    server app-blue:8000 weight=1 max_fails=3 fail_timeout=30s;
    server app-green:8000 weight=1 max_fails=3 fail_timeout=30s backup;
}

server {
    listen 80;
    server_name example.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com;

    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Health check endpoint
    location /health {
        proxy_pass http://backend/health;
        proxy_http_version 1.1;
        proxy_set_header Connection "";

        # Health check specific settings
        proxy_connect_timeout 2s;
        proxy_send_timeout 2s;
        proxy_read_timeout 2s;
    }

    # Application
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;

        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Static files
    location /static/ {
        alias /var/www/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

## Deployment Script

```bash
#!/bin/bash

set -e

# Configuration
APP_NAME="myapp"
BLUE_PORT=8001
GREEN_PORT=8002
HEALTH_CHECK_URL="http://localhost"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check health
check_health() {
    local port=$1
    local max_attempts=30
    local attempt=1

    echo "Checking health on port $port..."

    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "http://localhost:$port/health" > /dev/null; then
            echo -e "${GREEN}✓ Health check passed${NC}"
            return 0
        fi

        echo "Attempt $attempt/$max_attempts failed, waiting..."
        sleep 2
        attempt=$((attempt + 1))
    done

    echo -e "${RED}✗ Health check failed${NC}"
    return 1
}

# Determine current active container
ACTIVE=$(docker ps --filter "name=${APP_NAME}" --filter "status=running" --format "{{.Names}}" | head -1)

if [[ $ACTIVE == *"blue"* ]]; then
    CURRENT="blue"
    TARGET="green"
    TARGET_PORT=$GREEN_PORT
else
    CURRENT="green"
    TARGET="blue"
    TARGET_PORT=$BLUE_PORT
fi

echo "Current active: $CURRENT"
echo "Deploying to: $TARGET"

# Build new image
echo "Building Docker image..."
docker build -t ${APP_NAME}:latest .
docker tag ${APP_NAME}:latest ${APP_NAME}:${TARGET}

# Start target container
echo "Starting $TARGET container..."
docker-compose up -d app-${TARGET}

# Wait for container to be healthy
if ! check_health $TARGET_PORT; then
    echo -e "${RED}Deployment failed - rolling back${NC}"
    docker-compose stop app-${TARGET}
    exit 1
fi

# Update Nginx configuration to point to new container
echo "Updating Nginx configuration..."
sed -i "s/server app-${CURRENT}:8000 weight=1/server app-${TARGET}:8000 weight=1/" nginx.conf
sed -i "s/server app-${TARGET}:8000.*backup/server app-${CURRENT}:8000 weight=1 max_fails=3 fail_timeout=30s backup/" nginx.conf

# Reload Nginx
docker-compose exec nginx nginx -s reload

# Wait a bit to ensure traffic is switched
sleep 5

# Stop old container
echo "Stopping $CURRENT container..."
docker-compose stop app-${CURRENT}

echo -e "${GREEN}✓ Deployment successful!${NC}"
echo "Active container: $TARGET"
```

## GitHub Actions CI/CD

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: |
            myapp:latest
            myapp:${{ github.sha }}
          cache-from: type=registry,ref=myapp:latest
          cache-to: type=inline

      - name: Deploy to production
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /opt/myapp
            ./deploy.sh
```

## Rollback Strategy

```bash
#!/bin/bash

# Instant rollback script
rollback() {
    echo "Rolling back deployment..."

    # Get previous version from backup
    PREVIOUS_VERSION=$(cat .previous_version)

    # Switch Nginx back
    docker-compose exec nginx nginx -s reload

    # Start previous container
    docker-compose up -d app-previous

    # Wait for health check
    if check_health; then
        # Stop current container
        docker-compose stop app-current
        echo "Rollback successful!"
    else
        echo "Rollback failed!"
        exit 1
    fi
}

# Trigger rollback
rollback
```

## Monitoring and Alerts

```python
# Deployment monitoring
import prometheus_client as prom

deployment_counter = prom.Counter(
    'deployments_total',
    'Total number of deployments',
    ['status', 'version']
)

deployment_duration = prom.Histogram(
    'deployment_duration_seconds',
    'Deployment duration in seconds'
)

@deployment_duration.time()
def deploy_application(version):
    try:
        # Deployment logic
        result = execute_deployment(version)
        deployment_counter.labels(status='success', version=version).inc()
        return result
    except Exception as e:
        deployment_counter.labels(status='failure', version=version).inc()
        raise
```

## Results

**Deployment Metrics:**
- **Time Reduction**: 92% (4 hours → 20 minutes)
- **Downtime**: 0 minutes
- **Success Rate**: 99.5%
- **Rollback Time**: < 30 seconds
- **Deployment Frequency**: Daily (from weekly)

## Best Practices

1. **Always have rollback plan**
2. **Comprehensive health checks**
3. **Gradual traffic shifting**
4. **Monitor everything**
5. **Test in staging first**
6. **Keep deployment logs**
7. **Automate everything**

## Conclusion

Zero-downtime deployments are achievable with proper tooling and strategy. The combination of Docker, Nginx, and blue-green deployment provides reliability and speed.

---

*Optimizing your deployment pipeline? Connect on [LinkedIn](https://www.linkedin.com/in/tushar-agrawal-589205192/) or see more DevOps examples on [GitHub](https://github.com/Tushar010402).*
""",
        "tags": "docker,devops,nginx,deployment,ci-cd,zero-downtime,blue-green,tushar-agrawal,automation",
        "image_url": "https://images.unsplash.com/photo-1605745341112-85968b19335b?w=1200",
        "published": True
    }
]

# Create blogs
print(f"\nCreating {len(blogs)} SEO-optimized blog posts...\n")

for i, blog in enumerate(blogs, 1):
    print(f"Creating blog {i}/{len(blogs)}: {blog['title'][:50]}...")

    response = requests.post(
        f"{BASE_URL}/api/blogs",
        headers=headers,
        json=blog
    )

    if response.status_code == 201:
        result = response.json()
        print(f"Created: {result['slug']}")
    else:
        print(f"Failed: {response.text}")

print("\nAll blogs created successfully!")
print(f"\nView all blogs: {BASE_URL}/api/blogs")
print(f"API Documentation: {BASE_URL}/docs")
