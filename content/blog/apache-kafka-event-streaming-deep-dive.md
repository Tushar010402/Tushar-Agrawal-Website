---
title: "Apache Kafka Deep Dive: Event Streaming at Scale"
description: "Comprehensive guide to Apache Kafka covering architecture, producers, consumers, Kafka Streams, and production best practices for building event-driven systems."
date: "2024-12-18"
author: "Tushar Agrawal"
tags: ["Kafka", "Event Streaming", "Message Queue", "Distributed Systems", "Microservices", "Real-time", "Event-Driven"]
image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&h=630&fit=crop"
published: true
---

## Introduction

Apache Kafka has become the backbone of modern event-driven architectures, processing trillions of messages daily at companies like LinkedIn, Netflix, and Uber. Unlike traditional message queues, Kafka is designed as a distributed commit log that provides durability, scalability, and real-time data streaming capabilities.

In this guide, we'll explore:
- Kafka architecture and core concepts
- Producer and consumer patterns
- Kafka Streams for stream processing
- Production deployment and monitoring
- Common patterns and best practices

## Kafka Architecture

```
Kafka Cluster Architecture
==========================

                    ┌─────────────────────────────────────────┐
                    │            Kafka Cluster                │
                    │  ┌─────────┐ ┌─────────┐ ┌─────────┐   │
   Producers ───────┼──│Broker 1 │ │Broker 2 │ │Broker 3 │   │
                    │  │(Leader) │ │(Replica)│ │(Replica)│   │
                    │  └────┬────┘ └────┬────┘ └────┬────┘   │
                    │       │           │           │        │
   Consumers ◄──────┼───────┴───────────┴───────────┘        │
                    │                                         │
                    │  ┌─────────────────────────────────┐   │
                    │  │         ZooKeeper/KRaft         │   │
                    │  │    (Cluster Coordination)       │   │
                    │  └─────────────────────────────────┘   │
                    └─────────────────────────────────────────┘

Topic: orders
├── Partition 0 [Leader: Broker 1, Replicas: 2,3]
├── Partition 1 [Leader: Broker 2, Replicas: 1,3]
└── Partition 2 [Leader: Broker 3, Replicas: 1,2]
```

### Core Concepts

```
Kafka Terminology
=================

Topic       - Named feed/category of records
Partition   - Ordered, immutable sequence of records
Offset      - Unique ID for each record in a partition
Producer    - Publishes records to topics
Consumer    - Reads records from topics
Consumer Group - Set of consumers sharing workload
Broker      - Kafka server that stores data
Replica     - Copy of partition for fault tolerance
Leader      - Partition replica that handles all reads/writes
```

## Producer Patterns

### Basic Producer (Python)

```python
from confluent_kafka import Producer
import json

# Producer configuration
config = {
    'bootstrap.servers': 'localhost:9092',
    'client.id': 'order-service',
    'acks': 'all',  # Wait for all replicas
    'retries': 3,
    'retry.backoff.ms': 1000,
    'enable.idempotence': True,  # Exactly-once semantics
    'compression.type': 'snappy',
    'batch.size': 16384,
    'linger.ms': 10,  # Batch for 10ms
}

producer = Producer(config)

def delivery_callback(err, msg):
    if err:
        print(f'Message delivery failed: {err}')
    else:
        print(f'Message delivered to {msg.topic()} [{msg.partition()}] @ {msg.offset()}')

def send_order(order: dict):
    """Send order event to Kafka."""
    producer.produce(
        topic='orders',
        key=str(order['order_id']).encode('utf-8'),
        value=json.dumps(order).encode('utf-8'),
        callback=delivery_callback,
        headers={
            'event_type': 'order_created',
            'source': 'order-service',
        }
    )
    producer.poll(0)  # Trigger delivery callbacks

# Send orders
for i in range(100):
    order = {
        'order_id': f'ORD-{i}',
        'customer_id': f'CUST-{i % 10}',
        'amount': 99.99,
        'items': ['item1', 'item2'],
    }
    send_order(order)

producer.flush()  # Wait for all messages to be delivered
```

### Producer (Go)

```go
package main

import (
    "encoding/json"
    "fmt"
    "github.com/confluentinc/confluent-kafka-go/v2/kafka"
)

type Order struct {
    OrderID    string   `json:"order_id"`
    CustomerID string   `json:"customer_id"`
    Amount     float64  `json:"amount"`
    Items      []string `json:"items"`
}

func main() {
    producer, err := kafka.NewProducer(&kafka.ConfigMap{
        "bootstrap.servers":   "localhost:9092",
        "client.id":           "order-service",
        "acks":                "all",
        "retries":             3,
        "enable.idempotence":  true,
        "compression.type":    "snappy",
    })
    if err != nil {
        panic(err)
    }
    defer producer.Close()

    // Delivery report handler
    go func() {
        for e := range producer.Events() {
            switch ev := e.(type) {
            case *kafka.Message:
                if ev.TopicPartition.Error != nil {
                    fmt.Printf("Delivery failed: %v\n", ev.TopicPartition)
                } else {
                    fmt.Printf("Delivered to %v\n", ev.TopicPartition)
                }
            }
        }
    }()

    // Send orders
    topic := "orders"
    for i := 0; i < 100; i++ {
        order := Order{
            OrderID:    fmt.Sprintf("ORD-%d", i),
            CustomerID: fmt.Sprintf("CUST-%d", i%10),
            Amount:     99.99,
            Items:      []string{"item1", "item2"},
        }

        value, _ := json.Marshal(order)

        producer.Produce(&kafka.Message{
            TopicPartition: kafka.TopicPartition{Topic: &topic, Partition: kafka.PartitionAny},
            Key:            []byte(order.OrderID),
            Value:          value,
            Headers: []kafka.Header{
                {Key: "event_type", Value: []byte("order_created")},
            },
        }, nil)
    }

    producer.Flush(15 * 1000)
}
```

## Consumer Patterns

### Consumer Group (Python)

```python
from confluent_kafka import Consumer, KafkaError, KafkaException
import json

config = {
    'bootstrap.servers': 'localhost:9092',
    'group.id': 'order-processor',
    'auto.offset.reset': 'earliest',
    'enable.auto.commit': False,  # Manual commit for reliability
    'max.poll.interval.ms': 300000,
    'session.timeout.ms': 45000,
}

consumer = Consumer(config)
consumer.subscribe(['orders'])

def process_order(order: dict):
    """Process an order - implement your business logic."""
    print(f"Processing order: {order['order_id']}")
    # Validate, save to DB, trigger downstream events, etc.

try:
    while True:
        msg = consumer.poll(timeout=1.0)

        if msg is None:
            continue

        if msg.error():
            if msg.error().code() == KafkaError._PARTITION_EOF:
                continue
            raise KafkaException(msg.error())

        # Process message
        order = json.loads(msg.value().decode('utf-8'))
        process_order(order)

        # Commit offset after successful processing
        consumer.commit(asynchronous=False)

except KeyboardInterrupt:
    pass
finally:
    consumer.close()
```

### Batch Consumer with Error Handling

```python
from confluent_kafka import Consumer
import json
from typing import List

class BatchOrderConsumer:
    def __init__(self, config: dict, batch_size: int = 100):
        self.consumer = Consumer(config)
        self.batch_size = batch_size
        self.failed_messages = []

    def consume_batch(self) -> List[dict]:
        """Consume a batch of messages."""
        messages = []
        while len(messages) < self.batch_size:
            msg = self.consumer.poll(timeout=1.0)
            if msg is None:
                break
            if msg.error():
                continue
            messages.append({
                'value': json.loads(msg.value().decode('utf-8')),
                'partition': msg.partition(),
                'offset': msg.offset(),
            })
        return messages

    def process_with_retry(self, batch: List[dict], max_retries: int = 3):
        """Process batch with retry logic."""
        for msg in batch:
            retries = 0
            while retries < max_retries:
                try:
                    self.process_order(msg['value'])
                    break
                except Exception as e:
                    retries += 1
                    if retries >= max_retries:
                        self.send_to_dlq(msg)

    def send_to_dlq(self, msg: dict):
        """Send failed message to Dead Letter Queue."""
        # Produce to orders-dlq topic
        pass

    def run(self):
        """Main consumer loop."""
        self.consumer.subscribe(['orders'])
        try:
            while True:
                batch = self.consume_batch()
                if batch:
                    self.process_with_retry(batch)
                    self.consumer.commit()
        finally:
            self.consumer.close()
```

## Kafka Streams

```java
// Kafka Streams application (Java)
import org.apache.kafka.streams.*;
import org.apache.kafka.streams.kstream.*;
import java.util.Properties;

public class OrderStreamProcessor {
    public static void main(String[] args) {
        Properties props = new Properties();
        props.put(StreamsConfig.APPLICATION_ID_CONFIG, "order-stream-processor");
        props.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");

        StreamsBuilder builder = new StreamsBuilder();

        // Read from orders topic
        KStream<String, Order> orders = builder.stream("orders");

        // Filter high-value orders
        KStream<String, Order> highValueOrders = orders
            .filter((key, order) -> order.getAmount() > 1000);

        // Group by customer and count
        KTable<String, Long> ordersByCustomer = orders
            .groupBy((key, order) -> order.getCustomerId())
            .count();

        // Join with customer data
        KTable<String, Customer> customers = builder.table("customers");

        KStream<String, EnrichedOrder> enrichedOrders = orders
            .join(customers,
                (order, customer) -> new EnrichedOrder(order, customer));

        // Windowed aggregation - orders per hour
        KTable<Windowed<String>, Long> ordersPerHour = orders
            .groupByKey()
            .windowedBy(TimeWindows.ofSizeWithNoGrace(Duration.ofHours(1)))
            .count();

        // Write results
        highValueOrders.to("high-value-orders");
        enrichedOrders.to("enriched-orders");

        KafkaStreams streams = new KafkaStreams(builder.build(), props);
        streams.start();

        Runtime.getRuntime().addShutdownHook(new Thread(streams::close));
    }
}
```

## Schema Registry and Avro

```python
# Using Avro with Schema Registry
from confluent_kafka import Producer
from confluent_kafka.schema_registry import SchemaRegistryClient
from confluent_kafka.schema_registry.avro import AvroSerializer

# Schema Registry configuration
schema_registry_client = SchemaRegistryClient({
    'url': 'http://localhost:8081'
})

# Define Avro schema
order_schema = """
{
    "type": "record",
    "name": "Order",
    "namespace": "com.example.orders",
    "fields": [
        {"name": "order_id", "type": "string"},
        {"name": "customer_id", "type": "string"},
        {"name": "amount", "type": "double"},
        {"name": "items", "type": {"type": "array", "items": "string"}},
        {"name": "created_at", "type": "long", "logicalType": "timestamp-millis"}
    ]
}
"""

avro_serializer = AvroSerializer(
    schema_registry_client,
    order_schema,
)

producer = Producer({'bootstrap.servers': 'localhost:9092'})

def send_order_avro(order: dict):
    producer.produce(
        topic='orders-avro',
        key=order['order_id'].encode('utf-8'),
        value=avro_serializer(order, SerializationContext('orders-avro', MessageField.VALUE)),
    )
```

## Exactly-Once Semantics

```python
# Transactional producer for exactly-once
from confluent_kafka import Producer

producer = Producer({
    'bootstrap.servers': 'localhost:9092',
    'transactional.id': 'order-processor-1',
    'enable.idempotence': True,
})

producer.init_transactions()

try:
    producer.begin_transaction()

    # Produce multiple messages atomically
    for order in orders:
        producer.produce('orders', value=json.dumps(order).encode())

    producer.commit_transaction()
except Exception as e:
    producer.abort_transaction()
    raise
```

## Production Configuration

```yaml
# docker-compose.yml for Kafka cluster
version: '3.8'
services:
  kafka-1:
    image: confluentinc/cp-kafka:7.5.0
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka-1:9092
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka-1:9093,2@kafka-2:9093,3@kafka-3:9093
      KAFKA_NUM_PARTITIONS: 12
      KAFKA_DEFAULT_REPLICATION_FACTOR: 3
      KAFKA_MIN_INSYNC_REPLICAS: 2
      KAFKA_LOG_RETENTION_HOURS: 168
      KAFKA_LOG_RETENTION_BYTES: 1073741824
      CLUSTER_ID: MkU3OEVBNTcwNTJENDM2Qk

  kafka-2:
    image: confluentinc/cp-kafka:7.5.0
    environment:
      KAFKA_NODE_ID: 2
      # ... similar config

  kafka-3:
    image: confluentinc/cp-kafka:7.5.0
    environment:
      KAFKA_NODE_ID: 3
      # ... similar config
```

## Monitoring with Prometheus

```yaml
# JMX Exporter configuration
rules:
  - pattern: kafka.server<type=(.+), name=(.+)><>Value
    name: kafka_server_$1_$2
    type: GAUGE

  - pattern: kafka.server<type=BrokerTopicMetrics, name=(.+), topic=(.+)><>Count
    name: kafka_server_brokertopicmetrics_$1_total
    type: COUNTER
    labels:
      topic: "$2"

  - pattern: kafka.consumer<type=consumer-fetch-manager-metrics, client-id=(.+), topic=(.+), partition=(.+)><>records-lag-max
    name: kafka_consumer_lag_max
    type: GAUGE
    labels:
      client_id: "$1"
      topic: "$2"
      partition: "$3"
```

## Kafka vs Alternatives

```
Message Queue Comparison
========================

Feature             Kafka         RabbitMQ      Pulsar        NATS
─────────────────────────────────────────────────────────────────────
Throughput          1M+ msg/s     50K msg/s     1M+ msg/s     10M+ msg/s
Latency             ~5ms          ~1ms          ~5ms          ~0.1ms
Message Retention   Configurable  Until ACK     Configurable  None
Ordering            Per partition Per queue     Per topic     None
Replay              Yes           No            Yes           No
Consumer Groups     Yes           Limited       Yes           Yes
Exactly-once        Yes           No            Yes           No
Geo-replication     Manual        Plugin        Built-in      Built-in
Learning Curve      Medium        Low           Medium        Low
```

## Best Practices

1. **Partitioning Strategy**: Choose keys that distribute load evenly
2. **Replication**: Use replication factor of 3 for production
3. **Monitoring**: Track consumer lag, throughput, and broker health
4. **Schema Evolution**: Use Avro/Protobuf with Schema Registry
5. **Idempotency**: Enable idempotent producers to prevent duplicates
6. **Error Handling**: Implement Dead Letter Queues for failed messages

## Conclusion

Apache Kafka is essential for building scalable event-driven architectures. Key takeaways:

- Use partitions for parallelism and ordering
- Implement exactly-once semantics for critical workflows
- Monitor consumer lag to ensure timely processing
- Design schemas with evolution in mind
- Consider Kafka Streams for real-time processing

## Related Articles

- [Event-Driven Architecture with Apache Kafka](/blog/event-driven-architecture-kafka) - Design patterns
- [Microservices with Go and FastAPI](/blog/microservices-go-fastapi-guide) - Build Kafka-powered services
- [System Design Interview Guide](/blog/system-design-interview-guide) - Design scalable systems
- [Docker & Kubernetes Deployment Guide](/blog/docker-kubernetes-deployment-guide) - Deploy Kafka on K8s
