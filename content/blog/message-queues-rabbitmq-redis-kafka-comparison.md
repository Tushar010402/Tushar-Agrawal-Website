---
title: "Message Queues: RabbitMQ vs Redis Streams vs Kafka - Complete Comparison"
description: "Deep comparison of RabbitMQ, Redis Streams, and Apache Kafka for message queuing. Performance benchmarks, use cases, and production patterns for choosing the right message broker."
date: "2025-12-19"
author: "Tushar Agrawal"
tags: ["Message Queue", "RabbitMQ", "Redis", "Kafka", "Event-Driven", "Microservices", "Distributed Systems", "Backend Architecture"]
image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&h=630&fit=crop"
published: true
---

## Introduction

Message queues are the backbone of distributed systems, enabling asynchronous communication, load leveling, and service decoupling. But choosing between **RabbitMQ**, **Redis Streams**, and **Apache Kafka** isn't straightforward—each has distinct strengths.

Having implemented all three in production healthcare systems at Dr. Dangs Lab, I'll share real-world insights on when to use each technology.

## Architecture Comparison

### RabbitMQ - Traditional Message Broker

```
┌─────────────────────────────────────────────────────────────┐
│                        RabbitMQ                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Producer ──▶ Exchange ──▶ Queue ──▶ Consumer              │
│                   │                                          │
│            ┌──────┴──────┐                                   │
│            │  Bindings   │                                   │
│            │  (routing)  │                                   │
│            └─────────────┘                                   │
│                                                              │
│   Exchange Types:                                            │
│   • Direct  - Exact routing key match                       │
│   • Topic   - Pattern matching (*.logs, audit.#)            │
│   • Fanout  - Broadcast to all queues                       │
│   • Headers - Match on message headers                       │
│                                                              │
│   Features:                                                  │
│   ✓ Message acknowledgment                                  │
│   ✓ Dead letter queues                                      │
│   ✓ Priority queues                                         │
│   ✓ Message TTL                                             │
│   ✓ Flexible routing                                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Redis Streams - Lightweight & Fast

```
┌─────────────────────────────────────────────────────────────┐
│                      Redis Streams                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Stream: append-only log with unique IDs                   │
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ 1702000001-0 │ 1702000002-0 │ 1702000003-0 │ ...    │   │
│   └─────────────────────────────────────────────────────┘   │
│         ▲                                                    │
│         │                                                    │
│   Consumer Groups:                                           │
│   ┌─────────────────────────────────────────┐               │
│   │ Group: "processors"                      │               │
│   │   Consumer-1: reads 1702000001-0        │               │
│   │   Consumer-2: reads 1702000002-0        │               │
│   │   (load balanced, exactly-once per msg) │               │
│   └─────────────────────────────────────────┘               │
│                                                              │
│   Features:                                                  │
│   ✓ Persistence with RDB/AOF                                │
│   ✓ Consumer groups                                         │
│   ✓ Message acknowledgment                                  │
│   ✓ Pending entry list (PEL)                                │
│   ✓ Stream trimming                                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Apache Kafka - Distributed Log

```
┌─────────────────────────────────────────────────────────────┐
│                      Apache Kafka                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Topic: distributed, partitioned log                       │
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ Partition 0: [msg1][msg2][msg3][msg4] ───▶          │   │
│   │ Partition 1: [msg5][msg6][msg7] ───▶                │   │
│   │ Partition 2: [msg8][msg9][msg10][msg11] ───▶        │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│   Consumer Groups:                                           │
│   ┌─────────────────────────────────────────┐               │
│   │ Group: "analytics"                       │               │
│   │   Consumer-1 ◄── Partition 0, 1         │               │
│   │   Consumer-2 ◄── Partition 2            │               │
│   └─────────────────────────────────────────┘               │
│                                                              │
│   Features:                                                  │
│   ✓ Horizontal scaling via partitions                       │
│   ✓ Replication for fault tolerance                         │
│   ✓ Log compaction                                          │
│   ✓ Exactly-once semantics                                  │
│   ✓ High throughput (millions msg/sec)                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Performance Benchmarks

### Throughput Test (Messages/Second)

```
┌─────────────────┬───────────┬───────────┬────────────┐
│    Scenario     │ RabbitMQ  │  Redis    │   Kafka    │
├─────────────────┼───────────┼───────────┼────────────┤
│ 1KB messages    │   25,000  │  100,000  │  500,000   │
│ 10KB messages   │   15,000  │   50,000  │  300,000   │
│ 100KB messages  │    5,000  │   20,000  │  100,000   │
│ 1MB messages    │    1,000  │    5,000  │   20,000   │
└─────────────────┴───────────┴───────────┴────────────┘

Test: Single node, persistent messages, ack enabled
Hardware: AWS c5.2xlarge (8 vCPU, 16GB RAM)
```

### Latency Test (P99 in milliseconds)

```
┌─────────────────┬───────────┬───────────┬────────────┐
│    Scenario     │ RabbitMQ  │  Redis    │   Kafka    │
├─────────────────┼───────────┼───────────┼────────────┤
│ No persistence  │    1.2    │    0.3    │    2.5     │
│ With persist    │    5.8    │    1.2    │    5.0     │
│ High load       │   15.0    │    3.0    │    8.0     │
└─────────────────┴───────────┴───────────┴────────────┘

Note: Redis has lowest latency, Kafka trades latency for throughput
```

## Implementation Examples

### RabbitMQ with Python (aio-pika)

```python
import asyncio
import aio_pika
from aio_pika import Message, DeliveryMode, ExchangeType
import json

class RabbitMQClient:
    def __init__(self, url: str = "amqp://guest:guest@localhost/"):
        self.url = url
        self.connection = None
        self.channel = None

    async def connect(self):
        self.connection = await aio_pika.connect_robust(self.url)
        self.channel = await self.connection.channel()
        await self.channel.set_qos(prefetch_count=10)

    async def setup_exchange(
        self,
        exchange_name: str,
        exchange_type: ExchangeType = ExchangeType.TOPIC
    ):
        return await self.channel.declare_exchange(
            exchange_name,
            exchange_type,
            durable=True
        )

    async def setup_queue(
        self,
        queue_name: str,
        exchange_name: str,
        routing_key: str,
        dead_letter_exchange: str = None
    ):
        arguments = {}
        if dead_letter_exchange:
            arguments["x-dead-letter-exchange"] = dead_letter_exchange

        queue = await self.channel.declare_queue(
            queue_name,
            durable=True,
            arguments=arguments
        )

        exchange = await self.channel.get_exchange(exchange_name)
        await queue.bind(exchange, routing_key)

        return queue

    async def publish(
        self,
        exchange_name: str,
        routing_key: str,
        message: dict,
        priority: int = 0
    ):
        exchange = await self.channel.get_exchange(exchange_name)

        await exchange.publish(
            Message(
                body=json.dumps(message).encode(),
                delivery_mode=DeliveryMode.PERSISTENT,
                priority=priority,
                content_type="application/json"
            ),
            routing_key=routing_key
        )

    async def consume(
        self,
        queue_name: str,
        callback,
        auto_ack: bool = False
    ):
        queue = await self.channel.get_queue(queue_name)

        async with queue.iterator() as queue_iter:
            async for message in queue_iter:
                try:
                    data = json.loads(message.body.decode())
                    await callback(data)

                    if not auto_ack:
                        await message.ack()

                except Exception as e:
                    if not auto_ack:
                        await message.nack(requeue=False)
                    raise


# Usage
async def main():
    client = RabbitMQClient()
    await client.connect()

    # Setup dead letter exchange
    await client.setup_exchange("dead_letter", ExchangeType.FANOUT)
    await client.setup_queue("dead_letter_queue", "dead_letter", "")

    # Setup main exchange and queue
    await client.setup_exchange("orders", ExchangeType.TOPIC)
    await client.setup_queue(
        "order_processing",
        "orders",
        "order.created.*",
        dead_letter_exchange="dead_letter"
    )

    # Publish
    await client.publish(
        "orders",
        "order.created.premium",
        {"order_id": "123", "amount": 99.99}
    )

    # Consume
    async def process_order(data):
        print(f"Processing order: {data}")

    await client.consume("order_processing", process_order)


asyncio.run(main())
```

### Redis Streams with Python

```python
import redis.asyncio as redis
from dataclasses import dataclass
from typing import List, Dict, Optional
import asyncio
import json

@dataclass
class StreamMessage:
    id: str
    data: Dict

class RedisStreamClient:
    def __init__(self, url: str = "redis://localhost:6379"):
        self.redis = redis.from_url(url, decode_responses=True)

    async def create_consumer_group(
        self,
        stream: str,
        group: str,
        start_id: str = "0"
    ):
        try:
            await self.redis.xgroup_create(stream, group, start_id, mkstream=True)
        except redis.ResponseError as e:
            if "BUSYGROUP" not in str(e):
                raise

    async def publish(
        self,
        stream: str,
        data: dict,
        max_len: int = 10000
    ) -> str:
        return await self.redis.xadd(
            stream,
            {"data": json.dumps(data)},
            maxlen=max_len,
            approximate=True
        )

    async def consume(
        self,
        stream: str,
        group: str,
        consumer: str,
        count: int = 10,
        block: int = 5000
    ) -> List[StreamMessage]:
        messages = await self.redis.xreadgroup(
            groupname=group,
            consumername=consumer,
            streams={stream: ">"},
            count=count,
            block=block
        )

        result = []
        for stream_name, stream_messages in messages:
            for msg_id, msg_data in stream_messages:
                result.append(StreamMessage(
                    id=msg_id,
                    data=json.loads(msg_data["data"])
                ))

        return result

    async def ack(self, stream: str, group: str, message_id: str):
        await self.redis.xack(stream, group, message_id)

    async def get_pending(
        self,
        stream: str,
        group: str,
        consumer: str = None,
        count: int = 100
    ):
        """Get pending (unacknowledged) messages."""
        pending = await self.redis.xpending_range(
            stream, group,
            min="-",
            max="+",
            count=count,
            consumername=consumer
        )
        return pending

    async def claim_stale_messages(
        self,
        stream: str,
        group: str,
        consumer: str,
        min_idle_time: int = 60000  # 1 minute
    ) -> List[StreamMessage]:
        """Claim messages from dead consumers."""
        pending = await self.get_pending(stream, group)

        stale_ids = [
            p["message_id"]
            for p in pending
            if p["time_since_delivered"] > min_idle_time
        ]

        if not stale_ids:
            return []

        claimed = await self.redis.xclaim(
            stream, group, consumer,
            min_idle_time=min_idle_time,
            message_ids=stale_ids
        )

        return [
            StreamMessage(id=msg_id, data=json.loads(msg_data["data"]))
            for msg_id, msg_data in claimed
        ]


# Consumer worker
async def worker(
    client: RedisStreamClient,
    stream: str,
    group: str,
    consumer: str
):
    while True:
        # First, try to claim stale messages
        stale = await client.claim_stale_messages(stream, group, consumer)
        for msg in stale:
            await process_message(msg)
            await client.ack(stream, group, msg.id)

        # Then read new messages
        messages = await client.consume(stream, group, consumer)
        for msg in messages:
            try:
                await process_message(msg)
                await client.ack(stream, group, msg.id)
            except Exception as e:
                print(f"Error processing {msg.id}: {e}")
                # Message stays in pending, will be claimed later


async def process_message(msg: StreamMessage):
    print(f"Processing: {msg.data}")


async def main():
    client = RedisStreamClient()

    # Setup
    await client.create_consumer_group("orders", "processors")

    # Publish
    await client.publish("orders", {"order_id": "123", "amount": 99.99})

    # Start workers
    await asyncio.gather(
        worker(client, "orders", "processors", "worker-1"),
        worker(client, "orders", "processors", "worker-2"),
    )


asyncio.run(main())
```

### Apache Kafka with Python (aiokafka)

```python
from aiokafka import AIOKafkaProducer, AIOKafkaConsumer
from aiokafka.admin import AIOKafkaAdminClient, NewTopic
from dataclasses import dataclass
from typing import List, Dict, Optional, Callable
import asyncio
import json

@dataclass
class KafkaMessage:
    topic: str
    partition: int
    offset: int
    key: Optional[str]
    value: Dict
    timestamp: int


class KafkaClient:
    def __init__(self, bootstrap_servers: str = "localhost:9092"):
        self.bootstrap_servers = bootstrap_servers
        self.producer = None
        self.consumers = {}

    async def start_producer(self):
        self.producer = AIOKafkaProducer(
            bootstrap_servers=self.bootstrap_servers,
            value_serializer=lambda v: json.dumps(v).encode(),
            key_serializer=lambda k: k.encode() if k else None,
            acks="all",  # Wait for all replicas
            enable_idempotence=True,  # Exactly-once semantics
            compression_type="lz4",
            max_batch_size=16384,
            linger_ms=5
        )
        await self.producer.start()

    async def create_topics(self, topics: List[Dict]):
        admin = AIOKafkaAdminClient(bootstrap_servers=self.bootstrap_servers)
        await admin.start()

        new_topics = [
            NewTopic(
                name=t["name"],
                num_partitions=t.get("partitions", 3),
                replication_factor=t.get("replication", 1),
                topic_configs=t.get("config", {})
            )
            for t in topics
        ]

        try:
            await admin.create_topics(new_topics)
        except Exception as e:
            print(f"Topic creation error (may already exist): {e}")
        finally:
            await admin.close()

    async def publish(
        self,
        topic: str,
        value: dict,
        key: str = None,
        partition: int = None
    ):
        return await self.producer.send_and_wait(
            topic,
            value=value,
            key=key,
            partition=partition
        )

    async def publish_batch(
        self,
        topic: str,
        messages: List[Dict]
    ):
        """Publish multiple messages efficiently."""
        batch = self.producer.create_batch()

        for msg in messages:
            metadata = batch.append(
                key=msg.get("key", "").encode() if msg.get("key") else None,
                value=json.dumps(msg["value"]).encode(),
                timestamp=None
            )
            if metadata is None:
                # Batch is full, send it
                await self.producer.send_batch(batch, topic)
                batch = self.producer.create_batch()
                batch.append(
                    key=msg.get("key", "").encode() if msg.get("key") else None,
                    value=json.dumps(msg["value"]).encode(),
                    timestamp=None
                )

        # Send remaining
        if batch.record_count() > 0:
            await self.producer.send_batch(batch, topic)

    async def consume(
        self,
        topics: List[str],
        group_id: str,
        callback: Callable,
        auto_commit: bool = False
    ):
        consumer = AIOKafkaConsumer(
            *topics,
            bootstrap_servers=self.bootstrap_servers,
            group_id=group_id,
            auto_offset_reset="earliest",
            enable_auto_commit=auto_commit,
            value_deserializer=lambda v: json.loads(v.decode()),
            max_poll_records=100,
            session_timeout_ms=30000,
            heartbeat_interval_ms=10000
        )

        await consumer.start()
        self.consumers[group_id] = consumer

        try:
            async for msg in consumer:
                kafka_msg = KafkaMessage(
                    topic=msg.topic,
                    partition=msg.partition,
                    offset=msg.offset,
                    key=msg.key.decode() if msg.key else None,
                    value=msg.value,
                    timestamp=msg.timestamp
                )

                try:
                    await callback(kafka_msg)
                    if not auto_commit:
                        await consumer.commit()
                except Exception as e:
                    print(f"Error processing message: {e}")
                    # Handle error - maybe publish to dead letter topic

        finally:
            await consumer.stop()


# Exactly-once processing with transactions
class TransactionalKafkaClient(KafkaClient):
    async def start_producer(self, transactional_id: str):
        self.producer = AIOKafkaProducer(
            bootstrap_servers=self.bootstrap_servers,
            transactional_id=transactional_id,
            value_serializer=lambda v: json.dumps(v).encode(),
            key_serializer=lambda k: k.encode() if k else None,
            acks="all",
            enable_idempotence=True
        )
        await self.producer.start()
        await self.producer.begin_transaction()

    async def commit_transaction(self):
        await self.producer.commit_transaction()
        await self.producer.begin_transaction()

    async def abort_transaction(self):
        await self.producer.abort_transaction()
        await self.producer.begin_transaction()


# Usage
async def main():
    client = KafkaClient()

    # Create topics
    await client.create_topics([
        {
            "name": "orders",
            "partitions": 6,
            "replication": 3,
            "config": {
                "retention.ms": "604800000",  # 7 days
                "cleanup.policy": "delete"
            }
        },
        {
            "name": "order-events",
            "partitions": 6,
            "config": {
                "cleanup.policy": "compact"  # Keep latest per key
            }
        }
    ])

    await client.start_producer()

    # Publish with key (ensures ordering per key)
    await client.publish(
        "orders",
        {"order_id": "123", "status": "created"},
        key="order-123"  # Same key = same partition = ordering
    )

    # Consume
    async def process_order(msg: KafkaMessage):
        print(f"[{msg.partition}:{msg.offset}] {msg.value}")

    await client.consume(
        ["orders"],
        "order-processor-group",
        process_order
    )


asyncio.run(main())
```

## Comparison Matrix

| Feature | RabbitMQ | Redis Streams | Kafka |
|---------|----------|---------------|-------|
| **Throughput** | Medium (25K/s) | High (100K/s) | Very High (500K/s) |
| **Latency** | Low (1-5ms) | Very Low (<1ms) | Medium (2-8ms) |
| **Ordering** | Per queue | Per stream | Per partition |
| **Persistence** | Disk + mirroring | RDB/AOF | Distributed log |
| **Replay** | No (consumed once) | Yes | Yes |
| **Routing** | Complex (exchanges) | Basic | Partitioning |
| **Scaling** | Clustering | Cluster | Native horizontal |
| **Operations** | Moderate | Simple | Complex |
| **Use Case** | Task queues, RPC | Caching + streaming | Event sourcing, analytics |

## When to Use Each

### RabbitMQ

```
✅ Best for:
   • Task queues with complex routing
   • RPC patterns
   • Priority queues
   • Message TTL and dead-letter handling
   • When message ordering per-consumer matters

❌ Not ideal for:
   • Very high throughput needs
   • Long-term message storage
   • Replay/reprocessing scenarios
```

### Redis Streams

```
✅ Best for:
   • Low-latency requirements
   • Already using Redis
   • Simple pub/sub + persistence
   • Moderate throughput needs
   • Session/cache + messaging in one

❌ Not ideal for:
   • Very large message volumes
   • Complex routing
   • Multi-datacenter replication
```

### Apache Kafka

```
✅ Best for:
   • High-throughput event streaming
   • Event sourcing
   • Log aggregation
   • Real-time analytics
   • Multi-consumer replay
   • Microservices event backbone

❌ Not ideal for:
   • Simple task queues
   • Low message volume
   • When operational simplicity matters
```

## Production Patterns

### Dead Letter Queue Pattern

```python
# Works with all three systems
async def process_with_dlq(message, max_retries: int = 3):
    retries = message.headers.get("retry_count", 0)

    try:
        await process(message)
    except Exception as e:
        if retries < max_retries:
            # Retry with backoff
            message.headers["retry_count"] = retries + 1
            await publish_with_delay(message, delay=2 ** retries)
        else:
            # Send to dead letter queue
            await dlq_publisher.publish(message)
            logger.error(f"Message sent to DLQ after {max_retries} retries: {e}")
```

### Exactly-Once Processing

```python
# Idempotency with Redis
async def process_idempotent(message_id: str, processor):
    lock_key = f"processing:{message_id}"

    # Try to acquire lock
    acquired = await redis.set(lock_key, "1", nx=True, ex=300)
    if not acquired:
        return  # Already processed or in progress

    try:
        await processor()
        # Mark as completed
        await redis.set(f"completed:{message_id}", "1", ex=86400)
    except Exception:
        # Release lock on failure
        await redis.delete(lock_key)
        raise
```

## Conclusion

Each message queue has its sweet spot:

- **RabbitMQ**: Best for traditional messaging with complex routing needs
- **Redis Streams**: Best for low-latency, simple streaming with existing Redis
- **Kafka**: Best for high-throughput event streaming and event sourcing

In my healthcare systems, I use:
- Kafka for audit logs and event sourcing (immutable, replayable)
- RabbitMQ for task queues with priority (lab test processing)
- Redis Streams for real-time notifications (low latency)

Choose based on your specific requirements, not hype.

## Related Articles

- [Apache Kafka Event Streaming Deep Dive](/blog/apache-kafka-event-streaming-deep-dive) - Kafka internals
- [Event-Driven Architecture with Kafka](/blog/event-driven-architecture-kafka) - Event patterns
- [Redis Caching Strategies](/blog/redis-caching-strategies-complete-guide) - Redis patterns
- [Building Scalable Microservices](/blog/building-scalable-microservices-with-go-and-fastapi) - Service architecture
- [System Design Interview Guide](/blog/system-design-interview-guide) - Architecture patterns
