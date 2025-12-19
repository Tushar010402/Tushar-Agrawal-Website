---
title: "Rate Limiting & API Gateway Patterns: Production Implementation Guide"
description: "Master API rate limiting with token bucket, sliding window, and distributed algorithms. Implement Kong, Nginx, and custom rate limiters with Redis for high-traffic production systems."
date: "2025-12-19"
author: "Tushar Agrawal"
tags: ["Rate Limiting", "API Gateway", "Kong", "Nginx", "Redis", "Backend Architecture", "Security", "Performance", "Microservices"]
image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&h=630&fit=crop"
published: true
---

## Introduction

When your API goes viral or faces a DDoS attack, rate limiting is your first line of defense. It protects backend services from overload, ensures fair usage, and maintains system stability under pressure.

Having built rate limiting systems for healthcare APIs handling millions of requests, I've learned that the algorithm choice and implementation details matter enormously. This guide covers everything from basic concepts to distributed rate limiting at scale.

## Rate Limiting Algorithms

### 1. Token Bucket Algorithm

The token bucket is the most versatile algorithm, allowing bursts while maintaining average rate limits.

```
┌─────────────────────────────────────────────────────┐
│                   TOKEN BUCKET                       │
├─────────────────────────────────────────────────────┤
│                                                      │
│    Tokens added at fixed rate (e.g., 10/second)     │
│                    ↓                                 │
│              ┌─────────────┐                        │
│              │  ○ ○ ○ ○ ○  │  Bucket (capacity: 100)│
│              │  ○ ○ ○ ○ ○  │                        │
│              └─────────────┘                        │
│                    ↓                                 │
│         Request consumes 1 token                     │
│                    ↓                                 │
│    ┌─────────────────────────────────┐              │
│    │ Tokens available? → Allow       │              │
│    │ No tokens? → Reject (429)       │              │
│    └─────────────────────────────────┘              │
│                                                      │
└─────────────────────────────────────────────────────┘
```

```python
import time
from dataclasses import dataclass
from typing import Tuple
import asyncio
import aioredis

@dataclass
class TokenBucketConfig:
    capacity: int  # Maximum tokens in bucket
    refill_rate: float  # Tokens added per second
    initial_tokens: int = None

    def __post_init__(self):
        if self.initial_tokens is None:
            self.initial_tokens = self.capacity


class TokenBucket:
    """In-memory token bucket rate limiter."""

    def __init__(self, config: TokenBucketConfig):
        self.config = config
        self.tokens = config.initial_tokens
        self.last_refill = time.monotonic()
        self._lock = asyncio.Lock()

    async def acquire(self, tokens: int = 1) -> Tuple[bool, dict]:
        async with self._lock:
            now = time.monotonic()
            elapsed = now - self.last_refill

            # Refill tokens
            self.tokens = min(
                self.config.capacity,
                self.tokens + elapsed * self.config.refill_rate
            )
            self.last_refill = now

            # Check if we have enough tokens
            if self.tokens >= tokens:
                self.tokens -= tokens
                return True, {
                    'remaining': int(self.tokens),
                    'reset_at': now + (self.config.capacity - self.tokens) / self.config.refill_rate
                }
            else:
                wait_time = (tokens - self.tokens) / self.config.refill_rate
                return False, {
                    'remaining': 0,
                    'retry_after': wait_time
                }


class DistributedTokenBucket:
    """Redis-based distributed token bucket."""

    def __init__(self, redis: aioredis.Redis, config: TokenBucketConfig):
        self.redis = redis
        self.config = config

    async def acquire(self, key: str, tokens: int = 1) -> Tuple[bool, dict]:
        lua_script = """
        local key = KEYS[1]
        local capacity = tonumber(ARGV[1])
        local refill_rate = tonumber(ARGV[2])
        local requested = tonumber(ARGV[3])
        local now = tonumber(ARGV[4])

        local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
        local current_tokens = tonumber(bucket[1]) or capacity
        local last_refill = tonumber(bucket[2]) or now

        -- Calculate tokens to add
        local elapsed = now - last_refill
        local new_tokens = math.min(capacity, current_tokens + (elapsed * refill_rate))

        -- Check if request can be fulfilled
        if new_tokens >= requested then
            new_tokens = new_tokens - requested
            redis.call('HMSET', key, 'tokens', new_tokens, 'last_refill', now)
            redis.call('EXPIRE', key, math.ceil(capacity / refill_rate) + 1)
            return {1, new_tokens}
        else
            redis.call('HMSET', key, 'tokens', new_tokens, 'last_refill', now)
            redis.call('EXPIRE', key, math.ceil(capacity / refill_rate) + 1)
            return {0, new_tokens}
        end
        """

        result = await self.redis.eval(
            lua_script,
            1,
            key,
            self.config.capacity,
            self.config.refill_rate,
            tokens,
            time.time()
        )

        allowed = bool(result[0])
        remaining = int(result[1])

        if allowed:
            return True, {'remaining': remaining}
        else:
            wait_time = (tokens - remaining) / self.config.refill_rate
            return False, {'remaining': 0, 'retry_after': wait_time}
```

### 2. Sliding Window Algorithm

More accurate than fixed windows, prevents the "boundary problem."

```python
class SlidingWindowRateLimiter:
    """Sliding window rate limiter using Redis sorted sets."""

    def __init__(
        self,
        redis: aioredis.Redis,
        limit: int,
        window_seconds: int
    ):
        self.redis = redis
        self.limit = limit
        self.window = window_seconds

    async def is_allowed(self, key: str) -> Tuple[bool, dict]:
        now = time.time()
        window_start = now - self.window

        pipe = self.redis.pipeline()

        # Remove old entries
        pipe.zremrangebyscore(key, 0, window_start)

        # Count current entries
        pipe.zcard(key)

        # Add new entry if allowed (optimistic)
        pipe.zadd(key, {str(now): now})

        # Set expiry
        pipe.expire(key, self.window + 1)

        results = await pipe.execute()
        current_count = results[1]

        if current_count < self.limit:
            return True, {
                'remaining': self.limit - current_count - 1,
                'reset_at': now + self.window
            }
        else:
            # Remove the optimistically added entry
            await self.redis.zrem(key, str(now))
            return False, {
                'remaining': 0,
                'retry_after': self.window
            }


class SlidingWindowCounter:
    """
    Sliding window counter - memory efficient approximation.
    Uses weighted average of current and previous window.
    """

    def __init__(
        self,
        redis: aioredis.Redis,
        limit: int,
        window_seconds: int
    ):
        self.redis = redis
        self.limit = limit
        self.window = window_seconds

    async def is_allowed(self, key: str) -> Tuple[bool, dict]:
        now = time.time()
        current_window = int(now // self.window)
        previous_window = current_window - 1
        window_elapsed = (now % self.window) / self.window

        # Get counts for current and previous windows
        current_key = f"{key}:{current_window}"
        previous_key = f"{key}:{previous_window}"

        pipe = self.redis.pipeline()
        pipe.get(current_key)
        pipe.get(previous_key)
        results = await pipe.execute()

        current_count = int(results[0] or 0)
        previous_count = int(results[1] or 0)

        # Weighted count
        weighted_count = (previous_count * (1 - window_elapsed)) + current_count

        if weighted_count < self.limit:
            # Increment current window
            await self.redis.incr(current_key)
            await self.redis.expire(current_key, self.window * 2)

            return True, {
                'remaining': int(self.limit - weighted_count - 1),
                'reset_at': (current_window + 1) * self.window
            }
        else:
            return False, {
                'remaining': 0,
                'retry_after': self.window - (now % self.window)
            }
```

### 3. Leaky Bucket Algorithm

Smooths out bursty traffic for consistent throughput.

```python
import asyncio
from collections import deque
from dataclasses import dataclass

@dataclass
class LeakyBucketConfig:
    capacity: int  # Queue size
    leak_rate: float  # Requests processed per second


class LeakyBucket:
    """Leaky bucket for traffic shaping."""

    def __init__(self, config: LeakyBucketConfig):
        self.config = config
        self.queue = deque(maxlen=config.capacity)
        self._processing = False

    async def submit(self, request_id: str) -> bool:
        """Submit request to the bucket."""
        if len(self.queue) >= self.config.capacity:
            return False  # Bucket full, reject

        self.queue.append(request_id)

        if not self._processing:
            asyncio.create_task(self._process_queue())

        return True

    async def _process_queue(self):
        """Process requests at a fixed rate (leak)."""
        self._processing = True
        interval = 1.0 / self.config.leak_rate

        while self.queue:
            request_id = self.queue.popleft()
            await self._handle_request(request_id)
            await asyncio.sleep(interval)

        self._processing = False

    async def _handle_request(self, request_id: str):
        """Override to process request."""
        pass
```

## FastAPI Rate Limiting Middleware

```python
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import aioredis

app = FastAPI()

# Redis connection
redis_pool = None

async def get_redis():
    global redis_pool
    if redis_pool is None:
        redis_pool = await aioredis.from_url(
            "redis://localhost:6379",
            encoding="utf-8",
            decode_responses=True
        )
    return redis_pool


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Multi-tier rate limiting middleware."""

    def __init__(self, app, tiers: dict):
        super().__init__(app)
        self.tiers = tiers  # {tier_name: (limit, window)}

    async def dispatch(self, request: Request, call_next):
        redis = await get_redis()

        # Identify client and tier
        client_id = self._get_client_id(request)
        tier = self._get_tier(request)
        limit, window = self.tiers.get(tier, (100, 60))

        # Check rate limit
        limiter = SlidingWindowCounter(redis, limit, window)
        key = f"ratelimit:{tier}:{client_id}"

        allowed, info = await limiter.is_allowed(key)

        if not allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Rate limit exceeded",
                    "retry_after": info['retry_after']
                },
                headers={
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(info.get('reset_at', 0))),
                    "Retry-After": str(int(info['retry_after']))
                }
            )

        response = await call_next(request)

        # Add rate limit headers
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(info['remaining'])

        return response

    def _get_client_id(self, request: Request) -> str:
        # Priority: API key > User ID > IP
        api_key = request.headers.get("X-API-Key")
        if api_key:
            return f"key:{api_key}"

        user = getattr(request.state, "user", None)
        if user:
            return f"user:{user.id}"

        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return f"ip:{forwarded.split(',')[0].strip()}"

        return f"ip:{request.client.host}"

    def _get_tier(self, request: Request) -> str:
        # Determine tier from API key or user
        api_key = request.headers.get("X-API-Key")
        if api_key:
            # Look up tier from database/cache
            return "premium"  # Example

        return "free"


# Configure tiers
rate_limit_tiers = {
    "free": (100, 60),      # 100 requests per minute
    "basic": (1000, 60),    # 1000 requests per minute
    "premium": (10000, 60), # 10000 requests per minute
    "enterprise": (100000, 60)
}

app.add_middleware(RateLimitMiddleware, tiers=rate_limit_tiers)


# Per-endpoint rate limiting
def rate_limit(limit: int, window: int = 60):
    """Decorator for endpoint-specific rate limits."""

    async def dependency(request: Request):
        redis = await get_redis()
        client_id = request.headers.get("X-API-Key") or request.client.host
        endpoint = request.url.path

        key = f"ratelimit:endpoint:{endpoint}:{client_id}"
        limiter = SlidingWindowCounter(redis, limit, window)

        allowed, info = await limiter.is_allowed(key)
        if not allowed:
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "Rate limit exceeded",
                    "retry_after": info['retry_after']
                }
            )

        return info

    return Depends(dependency)


@app.get("/api/expensive-operation")
async def expensive_operation(rate_info: dict = rate_limit(10, 60)):
    """This endpoint has a stricter rate limit."""
    return {"status": "success", "rate_limit_remaining": rate_info['remaining']}
```

## API Gateway Configuration

### Kong Rate Limiting

```yaml
# kong.yml
_format_version: "3.0"

services:
  - name: user-service
    url: http://user-service:8000
    routes:
      - name: user-routes
        paths:
          - /api/users
        strip_path: false

plugins:
  # Global rate limiting
  - name: rate-limiting
    config:
      minute: 1000
      policy: redis
      redis_host: redis
      redis_port: 6379
      redis_database: 0
      hide_client_headers: false
      fault_tolerant: true

  # Per-consumer rate limiting
  - name: rate-limiting-advanced
    service: user-service
    config:
      identifier: consumer
      sync_rate: 10
      strategy: sliding
      limits:
        - 100 # per second
        - 5000 # per minute
      window_size:
        - 1
        - 60
      redis:
        host: redis
        port: 6379
        database: 1

consumers:
  - username: free-tier
    plugins:
      - name: rate-limiting
        config:
          minute: 100
          policy: local

  - username: premium-tier
    plugins:
      - name: rate-limiting
        config:
          minute: 10000
          policy: redis
          redis_host: redis

  - username: enterprise-tier
    plugins:
      - name: rate-limiting
        config:
          minute: 100000
          policy: redis
          redis_host: redis
          redis_timeout: 2000
```

### Nginx Rate Limiting

```nginx
# nginx.conf
http {
    # Define rate limit zones
    limit_req_zone $binary_remote_addr zone=ip_limit:10m rate=10r/s;
    limit_req_zone $http_x_api_key zone=api_key_limit:10m rate=100r/s;
    limit_req_zone $server_name zone=global_limit:10m rate=10000r/s;

    # Connection limits
    limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

    # Rate limit status codes
    limit_req_status 429;
    limit_conn_status 429;

    upstream api_backend {
        server api1:8000 weight=5;
        server api2:8000 weight=5;
        keepalive 100;
    }

    server {
        listen 80;
        server_name api.example.com;

        # Global connection limit
        limit_conn conn_limit 100;

        # Default rate limiting by IP
        location /api/ {
            limit_req zone=ip_limit burst=20 nodelay;
            limit_req zone=global_limit burst=1000;

            proxy_pass http://api_backend;
            proxy_http_version 1.1;
            proxy_set_header Connection "";

            # Rate limit headers
            add_header X-RateLimit-Limit 10;
            add_header X-RateLimit-Burst 20;
        }

        # Premium endpoints with higher limits
        location /api/premium/ {
            # Check API key tier
            set $rate_limit_zone "ip_limit";

            if ($http_x_api_key) {
                set $rate_limit_zone "api_key_limit";
            }

            limit_req zone=$rate_limit_zone burst=50 nodelay;

            proxy_pass http://api_backend;
        }

        # Strict limit for auth endpoints
        location /api/auth/ {
            limit_req zone=ip_limit burst=5 nodelay;

            proxy_pass http://api_backend;
        }

        # Error page for rate limiting
        error_page 429 @rate_limited;

        location @rate_limited {
            default_type application/json;
            return 429 '{"error": "Rate limit exceeded", "retry_after": 1}';
        }
    }
}
```

## Distributed Rate Limiting Patterns

### Cluster-Wide Rate Limiting

```python
import hashlib
from typing import List

class ConsistentHashRing:
    """Distribute rate limiting across Redis cluster."""

    def __init__(self, nodes: List[str], replicas: int = 100):
        self.replicas = replicas
        self.ring = {}
        self.sorted_keys = []

        for node in nodes:
            self.add_node(node)

    def add_node(self, node: str):
        for i in range(self.replicas):
            key = self._hash(f"{node}:{i}")
            self.ring[key] = node
            self.sorted_keys.append(key)
        self.sorted_keys.sort()

    def get_node(self, key: str) -> str:
        if not self.ring:
            return None

        hash_key = self._hash(key)
        for ring_key in self.sorted_keys:
            if ring_key >= hash_key:
                return self.ring[ring_key]
        return self.ring[self.sorted_keys[0]]

    def _hash(self, key: str) -> int:
        return int(hashlib.md5(key.encode()).hexdigest(), 16)


class ClusterRateLimiter:
    """Rate limiter for Redis cluster."""

    def __init__(self, redis_nodes: List[aioredis.Redis]):
        self.nodes = redis_nodes
        self.ring = ConsistentHashRing([str(i) for i in range(len(redis_nodes))])

    def _get_redis(self, key: str) -> aioredis.Redis:
        node_idx = int(self.ring.get_node(key))
        return self.nodes[node_idx]

    async def is_allowed(
        self,
        key: str,
        limit: int,
        window: int
    ) -> Tuple[bool, dict]:
        redis = self._get_redis(key)
        limiter = SlidingWindowCounter(redis, limit, window)
        return await limiter.is_allowed(key)
```

### Circuit Breaker with Rate Limiting

```python
from enum import Enum
from dataclasses import dataclass
import time

class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


@dataclass
class CircuitConfig:
    failure_threshold: int = 5
    success_threshold: int = 3
    timeout: float = 30.0
    rate_limit: int = 100
    rate_window: int = 60


class CircuitBreaker:
    """Circuit breaker with integrated rate limiting."""

    def __init__(self, redis: aioredis.Redis, config: CircuitConfig):
        self.redis = redis
        self.config = config
        self.rate_limiter = SlidingWindowCounter(
            redis,
            config.rate_limit,
            config.rate_window
        )

    async def execute(self, key: str, func, *args, **kwargs):
        # Check circuit state
        state = await self._get_state(key)

        if state == CircuitState.OPEN:
            if await self._should_attempt(key):
                await self._set_state(key, CircuitState.HALF_OPEN)
            else:
                raise CircuitOpenError("Circuit is open")

        # Check rate limit
        allowed, info = await self.rate_limiter.is_allowed(f"rate:{key}")
        if not allowed:
            raise RateLimitError(f"Rate limit exceeded, retry after {info['retry_after']}s")

        try:
            result = await func(*args, **kwargs)
            await self._record_success(key)
            return result
        except Exception as e:
            await self._record_failure(key)
            raise

    async def _get_state(self, key: str) -> CircuitState:
        state = await self.redis.get(f"circuit:{key}:state")
        return CircuitState(state) if state else CircuitState.CLOSED

    async def _set_state(self, key: str, state: CircuitState):
        await self.redis.set(f"circuit:{key}:state", state.value)

    async def _record_success(self, key: str):
        state = await self._get_state(key)

        if state == CircuitState.HALF_OPEN:
            successes = await self.redis.incr(f"circuit:{key}:successes")
            if successes >= self.config.success_threshold:
                await self._set_state(key, CircuitState.CLOSED)
                await self.redis.delete(f"circuit:{key}:successes")

    async def _record_failure(self, key: str):
        failures = await self.redis.incr(f"circuit:{key}:failures")
        await self.redis.expire(f"circuit:{key}:failures", self.config.timeout)

        if failures >= self.config.failure_threshold:
            await self._set_state(key, CircuitState.OPEN)
            await self.redis.set(
                f"circuit:{key}:open_until",
                time.time() + self.config.timeout
            )

    async def _should_attempt(self, key: str) -> bool:
        open_until = await self.redis.get(f"circuit:{key}:open_until")
        if open_until and float(open_until) > time.time():
            return False
        return True
```

## Monitoring Rate Limits

```python
from prometheus_client import Counter, Histogram, Gauge

# Metrics
RATE_LIMIT_REQUESTS = Counter(
    'rate_limit_requests_total',
    'Total rate limit checks',
    ['tier', 'endpoint', 'result']
)

RATE_LIMIT_LATENCY = Histogram(
    'rate_limit_check_seconds',
    'Rate limit check latency',
    ['tier'],
    buckets=[.001, .005, .01, .025, .05, .1]
)

RATE_LIMIT_REMAINING = Gauge(
    'rate_limit_remaining',
    'Remaining requests in current window',
    ['client_id', 'tier']
)


class InstrumentedRateLimiter:
    """Rate limiter with Prometheus metrics."""

    def __init__(self, limiter: SlidingWindowCounter, tier: str):
        self.limiter = limiter
        self.tier = tier

    async def is_allowed(self, key: str, endpoint: str = "") -> Tuple[bool, dict]:
        with RATE_LIMIT_LATENCY.labels(tier=self.tier).time():
            allowed, info = await self.limiter.is_allowed(key)

        result = "allowed" if allowed else "rejected"
        RATE_LIMIT_REQUESTS.labels(
            tier=self.tier,
            endpoint=endpoint,
            result=result
        ).inc()

        if 'remaining' in info:
            RATE_LIMIT_REMAINING.labels(
                client_id=key,
                tier=self.tier
            ).set(info['remaining'])

        return allowed, info
```

## Conclusion

Effective rate limiting protects your APIs from abuse while ensuring fair resource allocation:

- **Token Bucket** for APIs needing burst tolerance
- **Sliding Window** for accurate counting without boundary issues
- **Leaky Bucket** for traffic shaping and smoothing
- **Distributed implementations** with Redis for multi-instance deployments
- **Tiered limits** for different customer segments

Remember to:
- Always return proper 429 responses with Retry-After headers
- Monitor rate limit metrics to tune thresholds
- Implement graceful degradation with circuit breakers
- Use consistent hashing for distributed rate limiting

## Related Articles

- [Nginx Reverse Proxy Load Balancing Guide](/blog/nginx-reverse-proxy-load-balancing-guide) - Traffic management
- [Redis Caching Strategies](/blog/redis-caching-strategies-complete-guide) - Redis patterns
- [Building Scalable Microservices](/blog/building-scalable-microservices-with-go-and-fastapi) - Service architecture
- [REST API Design Best Practices](/blog/rest-api-design-best-practices) - API design
- [System Design Interview Guide](/blog/system-design-interview-guide) - Architecture patterns
