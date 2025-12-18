---
title: "Event-Driven Architecture with Apache Kafka: A Practical Guide"
description: "Learn how to design and implement event-driven systems using Apache Kafka. Covers event schemas, consumer patterns, exactly-once semantics, and real-world patterns from healthcare data pipelines."
date: "2024-12-05"
author: "Tushar Agrawal"
tags: ["Kafka", "Event-Driven Architecture", "Python", "Distributed Systems", "Backend"]
image: "https://images.unsplash.com/photo-1518432031352-d6fc5c10da5a?w=1200&h=630&fit=crop"
published: true
---

## Introduction

At Dr. Dangs Lab, we process over 100,000 lab reports daily, each triggering a cascade of events—notifications to patients, updates to medical records, billing operations, and analytics pipelines. Traditional request-response architectures couldn't handle this scale efficiently. Enter Apache Kafka and event-driven architecture.

## Why Event-Driven?

### Traditional vs Event-Driven

**Traditional (Request-Response):**
```
Patient App → API Gateway → Lab Service → Notification Service → Billing Service
                    ↓                              ↓
              [Synchronous Calls - Tightly Coupled]
```

**Event-Driven:**
```
Lab Service → [Kafka: lab-results] → Notification Service
                                   → Billing Service
                                   → Analytics Service
                                   → Medical Records Service
```

### Benefits

- **Loose coupling**: Services don't need to know about each other
- **Scalability**: Add consumers without modifying producers
- **Resilience**: Services can fail independently
- **Replay ability**: Events can be replayed for debugging or recovery

## Setting Up Kafka

### Docker Compose Configuration

```yaml
version: '3.8'
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.4.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  kafka:
    image: confluentinc/cp-kafka:7.4.0
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "false"
```

### Creating Topics

```python
from confluent_kafka.admin import AdminClient, NewTopic

def create_topics():
    admin = AdminClient({'bootstrap.servers': 'localhost:9092'})

    topics = [
        NewTopic('lab-results', num_partitions=6, replication_factor=1),
        NewTopic('notifications', num_partitions=3, replication_factor=1),
        NewTopic('billing-events', num_partitions=3, replication_factor=1),
        NewTopic('dead-letter', num_partitions=1, replication_factor=1),
    ]

    futures = admin.create_topics(topics)
    for topic, future in futures.items():
        try:
            future.result()
            print(f"Created topic: {topic}")
        except Exception as e:
            print(f"Failed to create topic {topic}: {e}")
```

## Event Schema Design

### Using Avro for Schema Evolution

```python
from dataclasses import dataclass
from typing import Optional
import json

# Define event schemas
LAB_RESULT_SCHEMA = {
    "type": "record",
    "name": "LabResult",
    "namespace": "com.drdangslab.events",
    "fields": [
        {"name": "event_id", "type": "string"},
        {"name": "event_type", "type": "string"},
        {"name": "timestamp", "type": "long"},
        {"name": "version", "type": "int", "default": 1},
        {"name": "patient_id", "type": "string"},
        {"name": "test_id", "type": "string"},
        {"name": "test_name", "type": "string"},
        {"name": "result_value", "type": "string"},
        {"name": "unit", "type": ["null", "string"], "default": None},
        {"name": "reference_range", "type": ["null", "string"], "default": None},
        {"name": "status", "type": {"type": "enum", "name": "Status", "symbols": ["PENDING", "COMPLETED", "VERIFIED"]}},
        {"name": "metadata", "type": {"type": "map", "values": "string"}, "default": {}}
    ]
}


@dataclass
class LabResultEvent:
    event_id: str
    patient_id: str
    test_id: str
    test_name: str
    result_value: str
    status: str
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    metadata: dict = None

    def to_dict(self) -> dict:
        import time
        import uuid
        return {
            "event_id": self.event_id or str(uuid.uuid4()),
            "event_type": "LAB_RESULT_CREATED",
            "timestamp": int(time.time() * 1000),
            "version": 1,
            "patient_id": self.patient_id,
            "test_id": self.test_id,
            "test_name": self.test_name,
            "result_value": self.result_value,
            "unit": self.unit,
            "reference_range": self.reference_range,
            "status": self.status,
            "metadata": self.metadata or {}
        }
```

## Producer Implementation

### Async Producer with Retries

```python
from aiokafka import AIOKafkaProducer
import json
import asyncio
from typing import Optional

class EventProducer:
    def __init__(self, bootstrap_servers: str):
        self.bootstrap_servers = bootstrap_servers
        self.producer: Optional[AIOKafkaProducer] = None

    async def start(self):
        self.producer = AIOKafkaProducer(
            bootstrap_servers=self.bootstrap_servers,
            value_serializer=lambda v: json.dumps(v).encode('utf-8'),
            key_serializer=lambda k: k.encode('utf-8') if k else None,
            acks='all',  # Wait for all replicas
            retries=3,
            retry_backoff_ms=100,
            enable_idempotence=True  # Exactly-once semantics
        )
        await self.producer.start()

    async def stop(self):
        if self.producer:
            await self.producer.stop()

    async def publish(self, topic: str, event: dict, key: str = None):
        try:
            # Use patient_id as key for ordering guarantees
            await self.producer.send_and_wait(
                topic,
                value=event,
                key=key
            )
            print(f"Published event to {topic}: {event['event_id']}")
        except Exception as e:
            print(f"Failed to publish event: {e}")
            # Send to dead letter queue
            await self.publish_to_dlq(topic, event, str(e))

    async def publish_to_dlq(self, original_topic: str, event: dict, error: str):
        dlq_event = {
            "original_topic": original_topic,
            "original_event": event,
            "error": error,
            "timestamp": int(time.time() * 1000)
        }
        await self.producer.send_and_wait('dead-letter', dlq_event)


# Usage in FastAPI
producer = EventProducer('localhost:9092')

@app.on_event("startup")
async def startup():
    await producer.start()

@app.on_event("shutdown")
async def shutdown():
    await producer.stop()

@app.post("/lab-results")
async def create_lab_result(result: LabResultCreate):
    # Save to database
    saved_result = await save_to_db(result)

    # Publish event
    event = LabResultEvent(
        event_id=str(uuid.uuid4()),
        patient_id=result.patient_id,
        test_id=saved_result.id,
        test_name=result.test_name,
        result_value=result.result_value,
        status="PENDING"
    )
    await producer.publish(
        'lab-results',
        event.to_dict(),
        key=result.patient_id  # Partition by patient
    )

    return saved_result
```

## Consumer Implementation

### Resilient Consumer with Error Handling

```python
from aiokafka import AIOKafkaConsumer
import json
import asyncio

class EventConsumer:
    def __init__(
        self,
        topic: str,
        group_id: str,
        bootstrap_servers: str,
        handler
    ):
        self.topic = topic
        self.group_id = group_id
        self.bootstrap_servers = bootstrap_servers
        self.handler = handler
        self.consumer: Optional[AIOKafkaConsumer] = None

    async def start(self):
        self.consumer = AIOKafkaConsumer(
            self.topic,
            bootstrap_servers=self.bootstrap_servers,
            group_id=self.group_id,
            value_deserializer=lambda m: json.loads(m.decode('utf-8')),
            auto_offset_reset='earliest',
            enable_auto_commit=False,  # Manual commit for reliability
            max_poll_records=100
        )
        await self.consumer.start()

    async def consume(self):
        try:
            async for message in self.consumer:
                try:
                    await self.handler(message.value)
                    # Commit only after successful processing
                    await self.consumer.commit()
                except Exception as e:
                    print(f"Error processing message: {e}")
                    # Handle error (retry, DLQ, etc.)
                    await self.handle_error(message, e)
        finally:
            await self.consumer.stop()

    async def handle_error(self, message, error):
        # Implement retry logic or send to DLQ
        pass


# Notification Service Consumer
async def handle_lab_result(event: dict):
    patient_id = event['patient_id']
    test_name = event['test_name']

    # Send notification
    await notification_service.send(
        patient_id=patient_id,
        message=f"Your {test_name} results are ready!"
    )

consumer = EventConsumer(
    topic='lab-results',
    group_id='notification-service',
    bootstrap_servers='localhost:9092',
    handler=handle_lab_result
)
```

## Advanced Patterns

### Saga Pattern for Distributed Transactions

```python
class LabResultSaga:
    def __init__(self, producer: EventProducer):
        self.producer = producer

    async def execute(self, lab_result: LabResult):
        saga_id = str(uuid.uuid4())

        try:
            # Step 1: Save result
            await self.save_result(lab_result, saga_id)

            # Step 2: Update patient record
            await self.update_patient_record(lab_result, saga_id)

            # Step 3: Create billing entry
            await self.create_billing(lab_result, saga_id)

            # Publish success event
            await self.producer.publish('saga-completed', {
                'saga_id': saga_id,
                'status': 'COMPLETED'
            })

        except Exception as e:
            # Publish compensation events
            await self.compensate(saga_id, str(e))

    async def compensate(self, saga_id: str, error: str):
        await self.producer.publish('saga-compensation', {
            'saga_id': saga_id,
            'error': error,
            'action': 'ROLLBACK'
        })
```

### Consumer Groups for Scaling

```python
# Multiple instances of the same service share the workload
# Each partition is consumed by exactly one consumer in the group

# Instance 1
consumer1 = EventConsumer(
    topic='lab-results',
    group_id='notification-service',  # Same group
    bootstrap_servers='localhost:9092',
    handler=handle_lab_result
)

# Instance 2 (different machine)
consumer2 = EventConsumer(
    topic='lab-results',
    group_id='notification-service',  # Same group
    bootstrap_servers='localhost:9092',
    handler=handle_lab_result
)

# Partitions are automatically distributed between consumers
```

## Monitoring and Observability

### Key Metrics to Track

```python
from prometheus_client import Counter, Histogram, Gauge

# Producer metrics
events_published = Counter(
    'kafka_events_published_total',
    'Total events published',
    ['topic']
)

publish_latency = Histogram(
    'kafka_publish_latency_seconds',
    'Event publish latency',
    ['topic']
)

# Consumer metrics
events_consumed = Counter(
    'kafka_events_consumed_total',
    'Total events consumed',
    ['topic', 'consumer_group']
)

consumer_lag = Gauge(
    'kafka_consumer_lag',
    'Consumer lag',
    ['topic', 'partition', 'consumer_group']
)
```

## Key Takeaways

1. **Design events, not APIs**: Think about what happened, not what to do
2. **Use schemas**: Avro or Protobuf for type safety and evolution
3. **Partition wisely**: Choose partition keys that ensure ordering where needed
4. **Handle failures**: Implement DLQs and retry mechanisms
5. **Monitor everything**: Consumer lag is your early warning system

## Conclusion

Event-driven architecture with Kafka has transformed how we handle data at scale. The decoupling it provides allows us to add new features without touching existing services, and the replay capability has saved us countless times during incident recovery.

---

*Building event-driven systems? Let's connect on [LinkedIn](https://www.linkedin.com/in/tushar-agrawal-91b67a28a) to discuss patterns and best practices.*
