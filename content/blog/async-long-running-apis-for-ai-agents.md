---
title: "Designing Async, Long-Running APIs for AI Agents"
description: "AI agents kick off tasks that run for minutes — synchronous request/response breaks down fast. A practical guide to the async job pattern: 202 + status URLs, polling vs webhooks vs streaming, durable queues, and idempotent resumption."
date: "2026-05-30"
author: "Tushar Agrawal"
tags: ["AI Agents", "Async API", "Backend Architecture", "Job Queue", "API Design", "Distributed Systems", "Webhooks", "Agentic AI"]
image: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&h=630&fit=crop"
published: true
---

The synchronous request/response model has one quiet assumption: the work finishes before the connection times out. AI agents break that assumption constantly. An agent asks your backend to "research this topic," "generate this report," or "run this multi-step workflow," and the honest answer takes 30 seconds, two minutes, sometimes more. Hold the HTTP connection open that long and you'll hit gateway timeouts, blocked worker threads, and lost work on every deploy.

The fix is an old pattern made newly essential: **the asynchronous job API**. This is the practical guide to building one for agent clients — it complements the reliability foundations in [building backends for AI agents](/blog/building-backends-for-ai-agents-idempotency-retries-state).

## Why synchronous breaks for agents

Three forces converge:

- **Long tasks.** Agent work (research, generation, orchestration) routinely exceeds typical 30–60s gateway timeouts.
- **Blocked resources.** A request held open for two minutes ties up a worker/connection the whole time. A burst of agent calls exhausts your pool — the same way a [cache stampede exhausts a connection pool](/blog/redis-cache-stampede-p99-latency-war-story).
- **Lost work on failure.** If the task lives only inside the request handler, a crash or deploy mid-request loses everything. Agents then retry, and now you're doing the expensive work twice.

The answer is to **decouple starting the work from getting the result.**

## The core pattern: 202 + a status resource

Instead of one blocking call, split it into three cheap, fast interactions:

1. **Start.** `POST /jobs` → returns `202 Accepted` immediately with a job ID and a status URL. The work is enqueued, not done.
2. **Check.** `GET /jobs/{id}` → returns `pending` / `running` / `succeeded` / `failed`, plus progress and (when done) the result or a result URL.
3. **Retrieve.** The result is in the status response or at a linked URL.

```http
POST /jobs
Idempotency-Key: 7b2c-...           # agent retries must not start duplicate jobs

202 Accepted
{ "id": "job_8a21", "status": "pending",
  "status_url": "/jobs/job_8a21" }
```

```http
GET /jobs/job_8a21

200 OK
{ "id": "job_8a21", "status": "running", "progress": 0.6 }
# ... later ...
{ "id": "job_8a21", "status": "succeeded",
  "result": { ... } }
```

Note the **idempotency key on start** — covered in [idempotency keys](/blog/idempotency-keys-preventing-double-charges). Agents retry the `POST`, and without it a flaky network spawns five identical two-minute jobs. With it, retries return the *same* job.

## How does the agent learn the result? Three options

### 1. Polling (start here)

The agent calls `GET /jobs/{id}` on an interval until it's done. Simple, firewall-friendly, and works for every client. The cost is wasted requests. Tame it with guidance and backoff:

- Return a `Retry-After` header so the client knows how long to wait.
- Suggest exponential backoff (1s, 2s, 4s…) rather than tight polling.

For most agent integrations, polling is the right default — it's the least that can go wrong, and agents are perfectly happy to poll.

### 2. Webhooks (push, for efficiency)

The caller registers a callback URL; you `POST` the result when the job finishes. No wasted polls, near-instant delivery. The costs are real, though: the receiver needs a public endpoint, and **you must treat your own webhook as an at-least-once delivery** — sign it, retry on failure with backoff, and make the receiver idempotent (it may arrive twice). Webhooks shine for server-to-server agents that run their own infrastructure.

### 3. Streaming (for incremental output)

When the agent benefits from partial results — tokens of a generation, steps of a research run — stream with SSE or a WebSocket. This is great UX for "show your work" tasks. The trade-off is that a held-open stream reintroduces some of the resource cost you were escaping, so use it for genuinely incremental output, not as a default. ([WebSocket patterns here](/blog/websocket-real-time-applications-guide).)

| Mechanism | Best for | Watch out for |
|-----------|----------|---------------|
| Polling | Default; any client | Wasted requests (mitigate with backoff) |
| Webhooks | Server-side agents | Needs public endpoint; at-least-once → idempotent receiver |
| Streaming | Incremental output | Held-open connection cost |

## Behind the API: durable queues, not background threads

The endpoint is the easy half. The hard requirement is that the work **survives a crash**. Do not run a two-minute task in a fire-and-forget thread inside your web process — a deploy kills it and the job is silently lost.

Instead, enqueue jobs to a **durable queue** (a real broker, or a jobs table polled by workers — the trade-offs are in [message queues: RabbitMQ vs Redis vs Kafka](/blog/message-queues-rabbitmq-redis-kafka-comparison)). Properties you want:

- **Durability.** A job persists until a worker acknowledges completion.
- **Retries with a dead-letter queue.** A failing job retries a bounded number of times, then parks in a DLQ for inspection — exactly the discipline that saved a partition in [the Kafka consumer-lag war story](/blog/kafka-consumer-lag-2-million-debugging-war-story).
- **Idempotent processing.** A redelivered job must not double its side effects — persist `status` transitions and guard the side effects with the action key.

```text
[POST /jobs] --enqueue--> [durable queue] --pull--> [worker pool]
     |                                                   |
   202 + id                                         updates status,
                                                    writes result,
[GET /jobs/{id}] <--read status/result-- [jobs store] <--+
```

Model the job's lifecycle as durable state — ideally an append-only log of `enqueued → running → succeeded/failed` — so you can resume, audit, and report progress. That's the same [event-driven](/blog/event-driven-architecture-kafka) backbone agent runs want anyway.

## Don't forget cancellation and TTLs

Agents change their minds and abandon tasks. Give them `DELETE /jobs/{id}` to cancel, have workers check a cancellation flag at safe points, and expire finished jobs after a TTL so your store doesn't grow forever. Small touches, but they're what separate a toy from something an agent can lean on.

## The takeaway

Long-running agent work needs the backend to say "I've got it, here's where to check" — not to hold a connection hostage for two minutes. The async job pattern (`202` + status resource), an idempotent start, a durable queue with retries and a DLQ, and a sane result-delivery mechanism is the whole recipe. It's not new — it's how robust systems have always handled slow work — but agents have made it table stakes. Build it once and every long tool your agents call gets reliable for free.

**Related reading:**
- [Building Backends for AI Agents: Idempotency, Retries & State](/blog/building-backends-for-ai-agents-idempotency-retries-state)
- [MCP vs Direct API Calls: The Token-Efficiency Debate (2026)](/blog/mcp-vs-direct-api-calls-token-efficiency-2026)
- [Message Queues: RabbitMQ vs Redis vs Kafka](/blog/message-queues-rabbitmq-redis-kafka-comparison)
- [Idempotency Keys: How We Stopped Double-Charging Customers](/blog/idempotency-keys-preventing-double-charges)
