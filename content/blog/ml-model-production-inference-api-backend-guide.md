---
title: "Putting an ML Model in Production: A Backend Engineer's Guide to Inference APIs"
description: "Serving a model is a backend problem, not a data-science one. A practical guide to production inference APIs — latency vs throughput, batching, GPU concurrency, caching, autoscaling cold starts, and the failure modes that don't exist in a notebook."
date: "2026-05-24"
author: "Tushar Agrawal"
tags: ["Machine Learning", "ML Inference", "Backend Architecture", "MLOps", "API Design", "Performance", "Model Serving", "AI"]
image: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200&h=630&fit=crop"
published: true
---

There's a moment every team hits: the data scientist's model works beautifully in a notebook, and now someone has to make it answer 500 requests a second without falling over. That someone is a backend engineer, and the skills involved are 80% backend engineering and 20% ML. In 2026 this is one of the highest-paid intersections in the field — production ML integration commands a real salary premium precisely because the talent is scarce.

This is the backend engineer's guide to serving a model: the concerns that don't exist in a notebook and the patterns that handle them. It leans on the same fundamentals as the rest of my backend writing — [caching](/blog/redis-caching-strategies-complete-guide), [rate limiting](/blog/rate-limiting-api-gateway-patterns), and [async APIs](/blog/async-long-running-apis-for-ai-agents).

## A model is just a very expensive function

Strip away the mystique and an inference endpoint is a function call that happens to be slow, memory-hungry, and often GPU-bound. That reframing is useful, because it tells you the problems are the ones you already know — latency, throughput, concurrency, caching, failure handling — just with sharper constraints.

```python
@app.post("/predict")
async def predict(req: PredictRequest):
    features = preprocess(req.input)      # CPU
    result = model.infer(features)         # the expensive part (often GPU)
    return postprocess(result)
```

Everything interesting is in making that middle line survive production traffic.

## Latency vs throughput: pick your master

The first decision shapes everything else. Are you optimizing for **latency** (one user waiting on one prediction — fraud check, autocomplete) or **throughput** (maximizing predictions per second — batch scoring, recommendations)? They pull in opposite directions:

- **Latency-first:** process each request immediately, keep the model warm, accept lower GPU utilization.
- **Throughput-first:** **batch** requests together, because GPUs are dramatically more efficient processing 32 inputs at once than 32 inputs one at a time.

### Dynamic batching: the highest-leverage trick

The single biggest throughput win is **dynamic batching** — hold incoming requests for a few milliseconds, group them, run one batched inference, then fan the results back out. You trade a tiny, bounded latency increase for a multiple-X throughput gain because the GPU stops sitting idle between single requests.

```text
req A ┐
req B ┼─ wait up to 5ms ─> [batch of 3] -> model.infer(batch) -> split results
req C ┘
```

This is conceptually the same move as [request coalescing in a cache stampede](/blog/redis-cache-stampede-p99-latency-war-story): collapse many concurrent calls into one expensive operation. Most serving frameworks give you dynamic batching as a config knob — use it.

## Concurrency: the GPU is a single, precious resource

In a normal web service you scale by adding threads/workers. With a GPU model, **the GPU is the bottleneck and it doesn't parallelize like CPU**. Fire 50 concurrent requests at one model instance and you don't get 50× — you get contention, memory pressure, and possibly an out-of-memory crash.

The pattern: put a **concurrency limit / queue in front of the GPU**. Accept requests, queue them, and feed the model at the rate it can actually sustain. Past a threshold, shed load with a `429` (the [rate-limiting patterns](/blog/rate-limiting-api-gateway-patterns) apply directly) rather than letting everything degrade. A bounded queue with backpressure beats an unbounded one that OOMs.

## Cache aggressively — many inputs repeat

Inference is expensive; identical inputs are common. Cache predictions keyed by a hash of the (normalized) input, with a TTL appropriate to how often the model or data changes. For a recommendation or classification endpoint, a cache hit turns a 200ms GPU call into a 2ms Redis lookup. The [Redis caching strategies](/blog/redis-caching-strategies-complete-guide) — including jittered TTLs to avoid synchronized expiry — apply unchanged. Just be careful to include the **model version** in the cache key, so a model update doesn't serve stale predictions.

## Autoscaling and the cold-start tax

Model servers don't scale like stateless web pods. A new replica must **load the model into GPU memory** — often several seconds to tens of seconds. That cold start has consequences:

- **Scale on the right signal.** Queue depth or GPU utilization predicts saturation better than CPU.
- **Keep a warm floor.** Don't scale to zero if latency matters; the cold start will hit a real user.
- **Scale ahead of demand.** Because spin-up is slow, react early — reactive scaling arrives after the spike has already caused timeouts.

## Long or huge jobs: go async

Some inference is genuinely slow — large generative models, video, big batch scoring. Don't hold an HTTP connection for it. Use the **async job pattern**: accept the request, return `202` with a job ID, process on a worker, let the client poll or get a webhook. This is exactly the design in [async, long-running APIs for AI agents](/blog/async-long-running-apis-for-ai-agents), and it's how you keep a slow model from exhausting your web tier.

## Failure modes a notebook never shows you

Production surfaces problems that don't exist offline. Budget for them:

- **GPU OOM** under concurrency — fix with the queue/concurrency limit above.
- **Model/version skew** — preprocessing in serving must exactly match training, or predictions silently degrade. Pin and test it.
- **Input drift** — real inputs diverge from training data over time; monitor input distributions, not just latency.
- **Silent quality decay** — the endpoint returns 200s with worse answers. Log predictions and sample them; latency dashboards won't catch this.

Instrument it like any service — the [Prometheus/Grafana/Jaeger stack](/blog/observability-prometheus-grafana-jaeger-guide) — plus model-specific signals (prediction distribution, confidence, cache hit rate).

## The takeaway

Serving an ML model in production is a backend discipline wearing an ML hat. The model is an expensive function; your job is to make it fast (batching, warm instances), safe under load (concurrency limits, backpressure, caching), and observable (drift and quality, not just latency). Master that and you sit at one of 2026's scarcest, best-paid intersections — which, for Indian engineers especially, is exactly the [skill that moves you up a salary band](/blog/ai-ml-skills-backend-salary-premium-india-2026).

**Related reading:**
- [Vector Databases for Backend Engineers: RAG Without the Hype](/blog/vector-databases-for-backend-engineers-rag)
- [The AI/ML Skills That Add 25% to a Backend Salary in India (2026)](/blog/ai-ml-skills-backend-salary-premium-india-2026)
- [Designing Async, Long-Running APIs for AI Agents](/blog/async-long-running-apis-for-ai-agents)
- [Redis Caching Strategies: A Complete Guide](/blog/redis-caching-strategies-complete-guide)
