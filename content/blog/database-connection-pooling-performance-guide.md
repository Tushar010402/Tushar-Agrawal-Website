---
title: "Database Connection Pooling: The Performance Fix That Saved Our Production"
description: "How I learned about connection pooling after our PostgreSQL database crashed under load. Practical guide with real configurations from handling millions of healthcare queries."
date: "2025-12-19"
author: "Tushar Agrawal"
tags: ["Database", "Connection Pooling", "PostgreSQL", "PgBouncer", "Performance", "asyncpg", "Backend Architecture", "Optimization"]
image: "https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=1200&h=630&fit=crop"
published: true
---

## The Monday Morning That Changed Everything

It was 9:15 AM. Our busiest time - patients arriving for their morning appointments, doctors pulling up test results, lab techs entering data from overnight samples.

Then everything stopped.

PostgreSQL had hit `max_connections`. Our app had 3 instances, each opening 50 connections, but PostgreSQL was configured for 100 max. We were at 150 attempted connections and the database was refusing new ones.

Error logs filled with:
```
FATAL: too many connections for role "app_user"
FATAL: remaining connection slots are reserved for superuser connections
```

Patients couldn't see their reports. Doctors couldn't access histories. Sample tracking went dark.

We scrambled to restart services, but they'd immediately exhaust connections again. The only fix was killing application instances one by one until we got back under the limit.

That day cost us 47 minutes of downtime and a lot of angry phone calls. It also taught me everything I now know about connection pooling.

## Why This Happens (And Why I Didn't See It Coming)

I'd always thought "just add more connections" was the answer. More connections = more queries = better performance, right?

Completely wrong.

```
The Reality of Database Connections
===================================

Each PostgreSQL connection:
├── Spawns a new process (not thread)
├── Consumes ~10MB of memory
├── Requires CPU for process scheduling
├── Takes 20-100ms to establish
└── Holds locks and transaction state

100 connections = 1GB RAM just for connection overhead
500 connections = Database spending more time switching
                  between processes than running queries
```

Here's what was happening in our system:

```
Before: Connection Explosion
============================

App Instance 1 ──┐
App Instance 2 ──┼──► PostgreSQL (max_connections: 100)
App Instance 3 ──┘

Each instance: 50 connections
Total attempted: 150
Result: 💥 Connection refused

The problem wasn't PostgreSQL's limit.
The problem was us opening way more connections than we needed.
```

## The Fix: Connection Pooling

After that incident, I spent a week understanding connection pooling. The concept is simple:

```
After: With Connection Pooling
==============================

App Instance 1 ──┐     ┌──────────────┐
App Instance 2 ──┼──►  │   Pool       │ ──► PostgreSQL
App Instance 3 ──┘     │   (20 conn)  │    (20 connections)
                       └──────────────┘

10,000 concurrent requests → 20 database connections
Connections reused, not created per request
```

Instead of each request opening a new connection, requests borrow from a pool and return when done. The pool maintains a fixed number of actual database connections.

## What I Actually Implemented

### Application-Level Pooling with asyncpg

For our FastAPI services, I used asyncpg with a properly configured pool:

```python
import asyncpg
from contextlib import asynccontextmanager

class DatabasePool:
    """
    This class exists because I got burned by connection leaks
    three times before getting it right.

    Key lessons:
    1. Always use context managers
    2. Set sensible limits
    3. Monitor everything
    """

    def __init__(self, dsn: str):
        self.dsn = dsn
        self._pool = None

    async def initialize(self):
        self._pool = await asyncpg.create_pool(
            self.dsn,
            min_size=5,          # Always keep 5 connections warm
            max_size=20,         # Never exceed 20, even under load
            max_queries=50000,   # Recycle connection after 50k queries
                                 # (prevents memory leaks in long-running conns)
            max_inactive_connection_lifetime=300.0,  # Close idle after 5 min
            command_timeout=60.0,  # Kill queries running > 60 seconds
            setup=self._setup_connection
        )

    async def _setup_connection(self, conn):
        """Called when a new connection is created."""
        # Set timezone to avoid confusion
        await conn.execute("SET timezone = 'UTC'")

        # Statement timeout prevents runaway queries
        # This saved us when someone wrote a query that would run forever
        await conn.execute("SET statement_timeout = '30s'")

    @asynccontextmanager
    async def acquire(self):
        """
        ALWAYS use this context manager.
        I once forgot to release a connection in an error path.
        Pool slowly leaked until it was exhausted.
        """
        async with self._pool.acquire() as conn:
            yield conn
        # Connection automatically returned to pool here

    async def execute(self, query: str, *args):
        async with self.acquire() as conn:
            return await conn.execute(query, *args)

    async def fetch(self, query: str, *args):
        async with self.acquire() as conn:
            return await conn.fetch(query, *args)

    def get_stats(self) -> dict:
        """Expose pool statistics for monitoring."""
        return {
            'pool_size': self._pool.get_size(),
            'pool_free': self._pool.get_idle_size(),
            'pool_used': self._pool.get_size() - self._pool.get_idle_size()
        }
```

### The Pool Sizing Formula That Actually Works

I spent way too long trying different pool sizes. Here's the formula I settled on:

```
Optimal Pool Size = (CPU cores × 2) + 1

For our 8-core database server:
Pool size = (8 × 2) + 1 = 17 connections

Why this works:
- Each core can handle ~2 concurrent I/O operations efficiently
- The +1 accounts for the occasional slow query
- More connections = context switching overhead
```

I tried 50 connections once thinking "more is better." The database got slower, not faster. Too many connections means PostgreSQL spends more time scheduling processes than running queries.

### FastAPI Integration

Here's how we wire it up in FastAPI:

```python
from fastapi import FastAPI, Depends, HTTPException
from typing import Optional

app = FastAPI()
db_pool: Optional[DatabasePool] = None

@app.on_event("startup")
async def startup():
    global db_pool
    db_pool = DatabasePool(
        dsn="postgresql://user:pass@localhost/healthcaredb"
    )
    await db_pool.initialize()
    print(f"Database pool initialized: {db_pool.get_stats()}")

@app.on_event("shutdown")
async def shutdown():
    if db_pool:
        await db_pool.close()

async def get_db():
    """Dependency that provides a database connection."""
    async with db_pool.acquire() as conn:
        yield conn

@app.get("/patients/{patient_id}")
async def get_patient(patient_id: int, conn = Depends(get_db)):
    row = await conn.fetchrow(
        "SELECT * FROM patients WHERE id = $1",
        patient_id
    )
    if not row:
        raise HTTPException(404, "Patient not found")
    return dict(row)
```

## PgBouncer: When Application Pooling Isn't Enough

After a few months, we hit another problem. We had 5 application instances, each with a pool of 20 connections. That's 100 connections to PostgreSQL - right at our limit again.

Enter PgBouncer - a connection pooler that sits between your applications and PostgreSQL.

```
With PgBouncer
==============

App 1 (pool: 20) ──┐
App 2 (pool: 20) ──┤     ┌───────────┐
App 3 (pool: 20) ──┼──►  │ PgBouncer │ ──► PostgreSQL
App 4 (pool: 20) ──┤     │  (pool:   │    (30 connections)
App 5 (pool: 20) ──┘     │   30)     │
                         └───────────┘

100 app connections → 30 database connections
PgBouncer multiplexes and reuses connections
```

### My PgBouncer Configuration

```ini
; /etc/pgbouncer/pgbouncer.ini
; This took many iterations to get right

[databases]
healthcaredb = host=10.0.1.50 port=5432 dbname=healthcare

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432

; Authentication
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

; Pool mode - this is the critical setting
; transaction = connection returned after each transaction
; We use transaction mode because our queries are short
pool_mode = transaction

; Pool sizing
default_pool_size = 20      ; Connections per database/user
min_pool_size = 5           ; Keep warm
reserve_pool_size = 5       ; Emergency overflow
reserve_pool_timeout = 3    ; Seconds to wait before using reserve

; Connection limits
max_client_conn = 500       ; Total clients we can accept
max_db_connections = 30     ; Total connections to PostgreSQL

; Timeouts
server_connect_timeout = 15
server_idle_timeout = 600   ; Close idle server connections after 10 min
server_lifetime = 3600      ; Recycle connections after 1 hour
query_timeout = 30          ; Kill queries over 30 seconds
query_wait_timeout = 60     ; Max time waiting for a connection

; Health checks
server_check_query = SELECT 1
server_check_delay = 30
```

The `pool_mode = transaction` setting is crucial. It means connections are returned to the pool after each transaction completes, not when the client disconnects. This dramatically improves connection reuse.

### Running PgBouncer in Docker

```yaml
# docker-compose.yml
services:
  pgbouncer:
    image: edoburu/pgbouncer:1.21.0
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/healthcare
      - POOL_MODE=transaction
      - DEFAULT_POOL_SIZE=20
      - MAX_CLIENT_CONN=500
      - MAX_DB_CONNECTIONS=30
    ports:
      - "6432:6432"
    healthcheck:
      test: ["CMD", "pg_isready", "-h", "localhost", "-p", "6432"]
      interval: 10s
      timeout: 5s
      retries: 3
    depends_on:
      - postgres
```

## Monitoring: How I Catch Problems Before They Crash Production

After the Monday incident, I added monitoring for everything pool-related:

```python
from prometheus_client import Gauge, Histogram, Counter

# Metrics I watch
POOL_CONNECTIONS_TOTAL = Gauge(
    'db_pool_connections_total',
    'Total connections in pool'
)
POOL_CONNECTIONS_AVAILABLE = Gauge(
    'db_pool_connections_available',
    'Connections available in pool'
)
CONNECTION_ACQUIRE_TIME = Histogram(
    'db_connection_acquire_seconds',
    'Time to acquire a connection from pool',
    buckets=[.001, .005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5]
)
CONNECTION_WAIT_COUNT = Counter(
    'db_connection_wait_total',
    'Number of times we had to wait for a connection'
)


class MonitoredPool(DatabasePool):
    """Pool wrapper that exports Prometheus metrics."""

    @asynccontextmanager
    async def acquire(self):
        start = time.perf_counter()
        initial_available = self._pool.get_idle_size()

        # If no connections available, we're about to wait
        if initial_available == 0:
            CONNECTION_WAIT_COUNT.inc()

        async with self._pool.acquire() as conn:
            acquire_time = time.perf_counter() - start
            CONNECTION_ACQUIRE_TIME.observe(acquire_time)

            # Update gauges
            POOL_CONNECTIONS_TOTAL.set(self._pool.get_size())
            POOL_CONNECTIONS_AVAILABLE.set(self._pool.get_idle_size())

            yield conn
```

### Alerts I Have Set Up

```yaml
# Prometheus alerting rules
groups:
  - name: database_pool
    rules:
      # Alert if pool is nearly exhausted
      - alert: DatabasePoolNearlyExhausted
        expr: db_pool_connections_available / db_pool_connections_total < 0.2
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Database pool running low on connections"

      # Alert if we're consistently waiting for connections
      - alert: DatabasePoolContention
        expr: rate(db_connection_wait_total[5m]) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Requests frequently waiting for DB connections"

      # Alert if connection acquisition is slow
      - alert: SlowConnectionAcquisition
        expr: histogram_quantile(0.95, rate(db_connection_acquire_seconds_bucket[5m])) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "p95 connection acquisition time exceeds 100ms"
```

## Common Mistakes I Made (So You Don't Have To)

### Mistake 1: Pool Too Large

```python
# What I tried first (wrong)
pool = create_pool(min_size=50, max_size=200)

# What actually works
pool = create_pool(min_size=5, max_size=20)
```

Bigger isn't better. 200 connections to PostgreSQL means 200 processes competing for resources.

### Mistake 2: Forgetting to Release Connections

```python
# This caused a slow leak
async def get_patient(patient_id: int):
    conn = await pool.acquire()
    try:
        result = await conn.fetch("SELECT * FROM patients WHERE id = $1", patient_id)
        return result
    except Exception as e:
        # Connection never released if exception happens!
        raise e

# Correct approach - always use context manager
async def get_patient(patient_id: int):
    async with pool.acquire() as conn:
        result = await conn.fetch("SELECT * FROM patients WHERE id = $1", patient_id)
        return result
    # Connection ALWAYS returned, even if exception occurs
```

### Mistake 3: Holding Connections During Slow Operations

```python
# Bad: Connection held while waiting for external API
async with pool.acquire() as conn:
    user = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
    external_data = await slow_external_api_call(user['email'])  # 2 second call!
    await conn.execute("UPDATE users SET data = $1 WHERE id = $2", external_data, user_id)

# Good: Release connection during slow operation
async with pool.acquire() as conn:
    user = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user_id)

external_data = await slow_external_api_call(user['email'])  # Connection returned to pool

async with pool.acquire() as conn:
    await conn.execute("UPDATE users SET data = $1 WHERE id = $2", external_data, user_id)
```

The first version holds a connection for 2+ seconds. The second version holds it for milliseconds.

## The Results

After implementing proper connection pooling:

| Metric | Before | After |
|--------|--------|-------|
| Max PostgreSQL connections | 100 → always hitting limit | 30 → plenty of headroom |
| Connection errors | 50-100/day | 0 |
| Query latency p99 | 800ms | 45ms |
| App instances supported | 2 | 10+ |

The 47-minute outage never happened again. And when traffic spikes, instead of crashing, we just queue requests briefly while waiting for connections.

## My Checklist for New Projects

```
Connection Pooling Checklist
============================

□ Pool size = (CPU cores × 2) + 1
□ min_size set for warm connections
□ max_size limits total connections
□ command_timeout prevents runaway queries
□ Connection recycling configured (max_queries or lifetime)
□ All connection usage through context managers
□ Metrics exported for pool size and wait times
□ Alerts for pool exhaustion and contention
□ Load tested under realistic traffic
□ PgBouncer considered for multiple app instances
```

---

Connection pooling isn't glamorous, but it's the difference between a system that scales and one that falls over under load. I learned this the hard way so you don't have to.

The patterns here have handled millions of queries per day in production. They'll probably handle yours too.

---

*Questions about database performance? I've debugged more connection issues than I'd like to admit. Reach out on [LinkedIn](https://www.linkedin.com/in/tushar-agrawal-91b67a28a).*

## Related Articles

- [PostgreSQL Performance Optimization](/blog/postgresql-performance-optimization) - Query tuning and indexes
- [Database Sharding Guide](/blog/database-sharding-partitioning-advanced-guide) - Horizontal scaling
- [Building Scalable Microservices](/blog/building-scalable-microservices-with-go-and-fastapi) - Service architecture
- [Redis Caching Strategies](/blog/redis-caching-strategies-complete-guide) - Reducing database load
