---
title: "The Cache Stampede That Took Down Our API: A Redis p99 War Story"
published: false
description: "A single expiring Redis key sent 4,000 requests to PostgreSQL at once and spiked our p99 latency to 9 seconds. Here's how cache stampedes happen, how we debugge"
tags: redis, caching, performance, p99latency
cover_image: https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&h=630&fit=crop
canonical_url: https://www.tusharagrawal.in/blog/redis-cache-stampede-p99-latency-war-story
---

At 9:00 AM sharp, our patient-portal API would fall over for about thirty seconds. Every single morning. Dashboards green at 8:59, p99 latency at 9 seconds at 9:00, back to normal by 9:01. No deploy, no traffic spike that explained it, no error in the application logs. Just a daily, punctual brownout.

It took me two days to understand that the cause was a *caching* feature we had added to make things faster. This is the story of a cache stampede — what it is, why it is so easy to cause by accident, and the three fixes that finally killed it.

If you want the foundational patterns first, my [Redis caching strategies guide](https://www.tusharagrawal.in/blog/redis-caching-strategies-complete-guide) covers the basics this post assumes.

## The setup: a "fast" dashboard endpoint

The endpoint was `/api/dashboard/summary`. It ran a heavy aggregation across several tables — roughly 400ms of PostgreSQL work — so we cached the result in Redis:

```python
async def get_summary(org_id: int):
    key = f"summary:{org_id}"
    cached = await redis.get(key)
    if cached:
        return json.loads(cached)

    data = await run_expensive_aggregation(org_id)   # ~400ms in Postgres
    await redis.set(key, json.dumps(data), ex=3600)   # cache for 1 hour
    return data
```

Textbook cache-aside. It worked beautifully. p50 dropped from 400ms to 4ms. We shipped it and moved on.

The bug is hiding in plain sight, and it only shows itself under concurrency.

## What actually happened at 9:00 AM

Our largest customer's staff all log in at 9:00 AM. The first dashboard load of the day populated the cache with `ex=3600` — a one-hour TTL. One hour later, at 10:00... no, wait. The cache had been *seeded by a cron job at 8:00 AM during a warmup*. So it expired at exactly 9:00 AM, right as 4,000 users hit the portal.

Here is the failure, step by step:

1. At 9:00:00, the key `summary:42` expires.
2. Request A arrives, misses the cache, starts the 400ms aggregation.
3. While A is still running, requests B through D (thousands of them) also arrive, *also* miss the cache, and *also* start their own 400ms aggregations.
4. PostgreSQL now has thousands of identical, expensive queries running at once. Connection pool exhausted. Queries queue. Each one now takes 8–9 seconds instead of 400ms.
5. Eventually one finishes and repopulates the cache; the stampede subsides.

This is a **cache stampede** (also called a "thundering herd" or "dog-piling"): when a hot key expires, every concurrent request misses simultaneously and stampedes the origin. The cache, the thing meant to *protect* the database, becomes a synchronized trigger that hammers it.

The reason it was invisible in application logs: nothing errored. Every request eventually succeeded. The only symptom was latency, which is exactly why you need percentile latency metrics, not just error rates and averages. An average hides a stampede; p99 screams about it.

## Confirming the diagnosis

Two signals made it certain:

- **PostgreSQL `pg_stat_activity`** at 9:00 AM showed dozens of identical `SELECT ... GROUP BY` queries all in `active` state — the smoking gun. (This is also how I diagnosed an unrelated outage in [the connection-pooling war story](https://www.tusharagrawal.in/blog/database-connection-pooling-performance-guide).)
- **Redis `MONITOR`** (briefly, never in prod for long) showed a burst of `GET summary:42` returning nil, followed much later by a single `SET`.

The fix is not "cache harder." It is to make sure that when a hot key is cold, exactly **one** request rebuilds it while everyone else waits or serves stale.

## Fix 1: A rebuild lock (single-flight)

The core idea: the first request to miss acquires a short-lived lock and does the rebuild. Concurrent requests that fail to get the lock wait briefly and then read the freshly-set value.

```python
async def get_summary(org_id: int):
    key = f"summary:{org_id}"
    lock_key = f"lock:{key}"

    cached = await redis.get(key)
    if cached:
        return json.loads(cached)

    # Try to become the single rebuilder. NX = only if not exists.
    got_lock = await redis.set(lock_key, "1", nx=True, ex=10)
    if got_lock:
        try:
            data = await run_expensive_aggregation(org_id)
            await redis.set(key, json.dumps(data), ex=3600)
            return data
        finally:
            await redis.delete(lock_key)

    # Someone else is rebuilding — wait for them, then read.
    for _ in range(50):                     # up to ~1s
        await asyncio.sleep(0.02)
        cached = await redis.get(key)
        if cached:
            return json.loads(cached)

    # Fallback: rebuild ourselves rather than fail.
    return await run_expensive_aggregation(org_id)
```

Now, instead of 4,000 queries, the stampede produces exactly one. That alone took p99 from 9s back under 1s.

## Fix 2: Serve stale while revalidating

Making thousands of users *wait* for a rebuild is better than crashing, but it is still a latency hit. The better pattern is **stale-while-revalidate**: store the value with a logical "fresh until" timestamp and a longer physical TTL. Serve the slightly-stale value instantly while one background task refreshes it.

```python
async def get_summary(org_id: int):
    key = f"summary:{org_id}"
    raw = await redis.get(key)
    if raw:
        entry = json.loads(raw)
        if entry["fresh_until"] < time.time():
            # Stale but usable: trigger async refresh, return stale now.
            asyncio.create_task(refresh_summary(org_id))
        return entry["data"]
    return await refresh_summary(org_id)     # cold start only
```

With this, a TTL boundary is no longer a cliff. Users always get an instant response; the data is at most a few seconds old, which for a dashboard is completely fine. The expensive rebuild happens off the request path.

## Fix 3: TTL jitter (stop synchronizing expirations)

The root trigger was that one warmup job set thousands of keys with the *same* TTL, so they all expired at the same instant. Even with locking, synchronized expiry concentrates load. The fix is one line — add randomness to every TTL:

```python
import random

def ttl_with_jitter(base: int, pct: float = 0.2) -> int:
    # e.g. base=3600 -> a value in [2880, 4320]
    return int(base * (1 + random.uniform(-pct, pct)))
```

Spreading expirations across a window turns a synchronized spike into a smooth trickle of background refreshes. This is the cheapest, highest-leverage fix of the three, and I now apply it to *every* cache `set` by default.

## The results

| Metric | Before | After |
|--------|--------|-------|
| p50 latency (9 AM) | 400ms | 4ms |
| p99 latency (9 AM) | 9,000ms | ~1,200ms → with SWR, ~180ms |
| Concurrent DB queries at TTL boundary | thousands | 1 |
| Morning brownouts | daily | gone |

The combination — single-flight locking, serve-stale-while-revalidate, and TTL jitter — cut p99 by roughly 80% and ended the daily 9 AM outage permanently.

## Lessons I took away

- **A cache is a load amplifier at its boundaries.** It smooths traffic until a hot key expires, and then it concentrates it. Design for the miss, not the hit.
- **Measure percentiles.** Averages and error rates both said "fine." Only p99 revealed the stampede. Wire up p95/p99 before you need them.
- **Jitter everything with a TTL.** Synchronized expirations are a self-inflicted thundering herd.
- **Prefer stale to slow.** For most read-heavy endpoints, a 3-second-old answer served in 4ms beats a fresh answer served in 9 seconds.

If you are building on Redis, pair this with the fundamentals in [Redis caching strategies](https://www.tusharagrawal.in/blog/redis-caching-strategies-complete-guide), and watch your database the way I describe in [database connection pooling](https://www.tusharagrawal.in/blog/database-connection-pooling-performance-guide) — stampedes and pool exhaustion are two faces of the same problem.

**Related reading:**
- [Redis Caching Strategies: A Complete Guide](https://www.tusharagrawal.in/blog/redis-caching-strategies-complete-guide)
- [Database Connection Pooling: The Performance Fix That Saved Our Production](https://www.tusharagrawal.in/blog/database-connection-pooling-performance-guide)
- [PostgreSQL Performance Optimization](https://www.tusharagrawal.in/blog/postgresql-performance-optimization)
- [Rate Limiting & API Gateway Patterns](https://www.tusharagrawal.in/blog/rate-limiting-api-gateway-patterns)

---

*Originally published at [tusharagrawal.in](https://www.tusharagrawal.in/blog/redis-cache-stampede-p99-latency-war-story). I write about backend engineering, performance, and AI-era infrastructure — more at [tusharagrawal.in/blog](https://www.tusharagrawal.in/blog).*
