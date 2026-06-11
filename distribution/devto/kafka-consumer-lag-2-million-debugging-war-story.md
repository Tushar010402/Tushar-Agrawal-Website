---
title: "When Our Kafka Consumer Lag Hit 2 Million: A Debugging War Story"
published: false
description: "Our order events fell 2 million messages behind and nobody noticed for hours. A practical walkthrough of diagnosing Kafka consumer lag — partitions, rebalances,"
tags: apachekafka, consumerlag, debugging, distributedsystems
cover_image: https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=630&fit=crop
canonical_url: https://www.tusharagrawal.in/blog/kafka-consumer-lag-2-million-debugging-war-story
---

The support ticket said: "Customers are seeing yesterday's order status." That is a strange sentence when your system is "real-time." It meant our event pipeline — the thing that propagates an order through payment, inventory, and notification — was running *hours* in the past. When I opened the Kafka dashboard, the consumer lag on our `orders` topic read **2,147,000** messages and climbing.

Here is how I found the cause and dug us out. If you are new to Kafka, my [event streaming deep-dive](https://www.tusharagrawal.in/blog/apache-kafka-event-streaming-deep-dive) and [event-driven architecture guide](https://www.tusharagrawal.in/blog/event-driven-architecture-kafka) cover the concepts I lean on here.

## First: what consumer lag actually means

Lag is simple but worth stating precisely. For each partition, Kafka tracks two offsets:

- **Log-end offset** — the offset of the latest message *produced*.
- **Committed offset** — the offset your consumer group has *processed*.

**Lag = log-end offset − committed offset.** Two million lag means two million messages were produced that we had not yet handled. The danger of lag is that it is silent: nothing errors, producers keep producing happily, and consumers keep consuming — just too slowly. The only symptom is staleness, which users feel long before any alert fires (unless you alert on lag directly, which we now do).

```bash
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --describe --group order-processor
```

```
TOPIC   PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG
orders  0          18443201        18891002        447801
orders  1          18002910        18550003        547093
orders  2          0               551200          551200   <-- not moving
orders  3          18120002        18661004        541002
```

That third line told the story before I read anything else.

## Symptom 1: one partition stuck at offset 0

Partition 2's `CURRENT-OFFSET` was `0` — it had never committed a single message — while the others were making progress. In Kafka, **a partition is consumed by exactly one consumer in the group**, and ordering is guaranteed only within a partition. If one partition is stuck, one consumer is stuck.

The cause: a **poison message**. Some upstream service had published an order event with a malformed JSON body to partition 2. Our consumer deserialized in a tight loop, threw on that message, did not commit, retried from the same offset, threw again — forever. It was wedged on a single bad record while a quarter of all traffic piled up behind it.

The lesson: **never let one bad message block a partition.** The fix is a dead-letter topic.

```python
async def handle(msg):
    try:
        event = parse_order(msg.value)
        await process(event)
        await consumer.commit(msg)            # commit only on success
    except (DeserializationError, ValidationError) as e:
        # Don't retry forever — route the poison message aside and move on.
        await producer.send("orders.dlq", msg.value,
                            headers={"error": str(e).encode(),
                                     "origin_offset": str(msg.offset).encode()})
        await consumer.commit(msg)            # commit so the partition advances
```

Now a malformed message is parked in `orders.dlq` for later inspection and the partition keeps flowing. The moment I deployed this, partition 2 started moving and a third of the lag drained within minutes.

## Symptom 2: constant rebalancing

The other three partitions were making progress but far too slowly. The broker logs were full of rebalance events — the consumer group was rebalancing every minute or so. During a rebalance, **all consumers in the group stop processing** while partitions are reassigned. Rebalance every minute, and you spend a big chunk of every minute frozen.

The trigger was `max.poll.interval.ms`. Our per-message processing had gotten slower (an added synchronous call to a downstream service), so occasionally a single `poll()` batch took longer than the configured interval. Kafka assumed the consumer was dead, kicked it out, and rebalanced. The evicted consumer rejoined, triggering another rebalance. A self-perpetuating churn.

Two fixes:

1. **Process less per poll, or faster.** I reduced `max.poll.records` so each batch was guaranteed to finish well within the interval.
2. **Make the slow downstream call asynchronous** instead of blocking the poll loop on it.

```python
# Smaller batches → each poll() finishes comfortably within max.poll.interval.ms
consumer = AIOKafkaConsumer(
    "orders",
    group_id="order-processor",
    max_poll_records=100,        # was 500
    max_poll_interval_ms=300000,
    enable_auto_commit=False,    # commit explicitly, only after success
)
```

Disabling auto-commit matters too: auto-commit can advance the offset *before* you have actually processed a message, so a crash silently drops data. Commit explicitly, after the work is done.

## Symptom 3: not enough parallelism

With poison messages dead-lettered and rebalances calmed, we were keeping up with *new* traffic but the 2M backlog was draining slowly. The constraint is structural: **the maximum parallelism of a consumer group equals the number of partitions.** Our `orders` topic had 4 partitions, so at most 4 consumers could work in parallel, no matter how many pods we ran.

For the drain, I temporarily scaled the consumer pods to 4 (one per partition) so every partition had a dedicated worker, and increased the topic's partition count for headroom going forward (new partitions only help new keys, but it raised the ceiling). The backlog of 2M drained in about 40 minutes once all four partitions had a healthy, dedicated consumer.

## What I changed permanently

- **Alert on lag, not just errors.** We now page when lag on any partition exceeds a threshold for more than a few minutes. Staleness is now a first-class alert.
- **Dead-letter topic for every consumer.** A single malformed message can never again wedge a partition.
- **Explicit commits, smaller poll batches.** Predictable processing time prevents the rebalance death-spiral.
- **Partition count sized for peak parallelism**, with consumers autoscaled toward (but not above) the partition count.

## The mental model

If you remember one thing: **Kafka lag is a queueing problem, and the queue is per-partition.** Almost every lag incident reduces to one of three things — a partition is *blocked* (poison message), the consumers are *frozen* (rebalancing), or you are *out of parallelism* (too few partitions). Check those three, in that order, and you will diagnose most lag incidents in minutes instead of hours.

For the broader patterns, see [Apache Kafka: Event Streaming Deep Dive](https://www.tusharagrawal.in/blog/apache-kafka-event-streaming-deep-dive), and for how Kafka compares to other brokers, [message queues: RabbitMQ vs Redis vs Kafka](https://www.tusharagrawal.in/blog/message-queues-rabbitmq-redis-kafka-comparison).

**Related reading:**
- [Apache Kafka: Event Streaming Deep Dive](https://www.tusharagrawal.in/blog/apache-kafka-event-streaming-deep-dive)
- [Event-Driven Architecture with Kafka](https://www.tusharagrawal.in/blog/event-driven-architecture-kafka)
- [Message Queues: RabbitMQ vs Redis vs Kafka](https://www.tusharagrawal.in/blog/message-queues-rabbitmq-redis-kafka-comparison)
- [Observability with Prometheus, Grafana & Jaeger](https://www.tusharagrawal.in/blog/observability-prometheus-grafana-jaeger-guide)

---

*Originally published at [tusharagrawal.in](https://www.tusharagrawal.in/blog/kafka-consumer-lag-2-million-debugging-war-story). I write about backend engineering, performance, and AI-era infrastructure — more at [tusharagrawal.in/blog](https://www.tusharagrawal.in/blog).*
