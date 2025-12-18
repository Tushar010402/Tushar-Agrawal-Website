---
title: "Python Async Programming with asyncio: Complete Developer Guide"
description: "Master asynchronous programming in Python with asyncio. Learn coroutines, tasks, event loops, async context managers, and build high-performance concurrent applications with practical examples."
date: "2024-12-15"
author: "Tushar Agrawal"
tags: ["Python", "Asyncio", "Async Programming", "Concurrency", "Backend", "Performance"]
image: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=1200&h=630&fit=crop"
published: true
---

## Introduction

Asynchronous programming is essential for building high-performance Python applications. At Dr. Dangs Lab, we use asyncio to handle thousands of concurrent API requests, database queries, and external service calls. This guide covers everything you need to master async Python.

## Understanding Async/Await

### Synchronous vs Asynchronous

```python
import time
import asyncio

# Synchronous - blocks execution
def sync_fetch_data():
    print("Fetching data...")
    time.sleep(2)  # Blocks the entire program
    return "Data received"

# Asynchronous - doesn't block
async def async_fetch_data():
    print("Fetching data...")
    await asyncio.sleep(2)  # Yields control to event loop
    return "Data received"

# Running async code
async def main():
    result = await async_fetch_data()
    print(result)

asyncio.run(main())
```

### How asyncio Works

```
┌─────────────────────────────────────────────────────┐
│                    Event Loop                        │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐             │
│  │ Task 1  │  │ Task 2  │  │ Task 3  │             │
│  │ (await) │  │ (ready) │  │ (await) │             │
│  └────┬────┘  └────┬────┘  └────┬────┘             │
│       │            │            │                   │
│       ▼            ▼            ▼                   │
│   I/O Wait    Execute     I/O Wait                 │
└─────────────────────────────────────────────────────┘

Key concept: When a coroutine awaits, the event loop
switches to another ready task.
```

## Coroutines, Tasks, and Futures

### Coroutines

```python
# A coroutine is defined with async def
async def fetch_user(user_id: int) -> dict:
    await asyncio.sleep(0.1)  # Simulate I/O
    return {"id": user_id, "name": f"User {user_id}"}

# Calling a coroutine returns a coroutine object
coro = fetch_user(1)  # This doesn't execute yet
print(type(coro))  # <class 'coroutine'>

# Must be awaited to execute
async def main():
    user = await fetch_user(1)  # Now it executes
    print(user)
```

### Tasks - Concurrent Execution

```python
async def fetch_all_users(user_ids: list[int]) -> list[dict]:
    # Create tasks for concurrent execution
    tasks = [asyncio.create_task(fetch_user(uid)) for uid in user_ids]

    # Wait for all tasks to complete
    results = await asyncio.gather(*tasks)
    return results

# Sequential: 10 users × 0.1s = 1 second
# Concurrent: 10 users run together ≈ 0.1 second

async def main():
    import time
    start = time.time()

    users = await fetch_all_users(range(10))

    print(f"Fetched {len(users)} users in {time.time() - start:.2f}s")
    # Output: Fetched 10 users in 0.10s

asyncio.run(main())
```

### Task Management

```python
async def task_with_timeout():
    task = asyncio.create_task(slow_operation())

    try:
        # Wait with timeout
        result = await asyncio.wait_for(task, timeout=5.0)
        return result
    except asyncio.TimeoutError:
        task.cancel()  # Cancel the task
        print("Operation timed out")
        return None

async def wait_for_first():
    """Return when first task completes"""
    tasks = [
        asyncio.create_task(fetch_from_cache()),
        asyncio.create_task(fetch_from_db()),
        asyncio.create_task(fetch_from_api()),
    ]

    # Return first completed, cancel others
    done, pending = await asyncio.wait(
        tasks,
        return_when=asyncio.FIRST_COMPLETED
    )

    # Cancel pending tasks
    for task in pending:
        task.cancel()

    # Get result from completed task
    return done.pop().result()
```

## Async Context Managers and Iterators

### Async Context Managers

```python
class AsyncDatabaseConnection:
    def __init__(self, connection_string: str):
        self.connection_string = connection_string
        self.connection = None

    async def __aenter__(self):
        print("Connecting to database...")
        await asyncio.sleep(0.1)  # Simulate connection
        self.connection = f"Connection to {self.connection_string}"
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        print("Closing connection...")
        await asyncio.sleep(0.05)  # Simulate cleanup
        self.connection = None
        return False  # Don't suppress exceptions

    async def query(self, sql: str):
        await asyncio.sleep(0.05)
        return f"Results for: {sql}"

# Usage
async def main():
    async with AsyncDatabaseConnection("postgres://localhost/db") as db:
        results = await db.query("SELECT * FROM users")
        print(results)
```

### Using contextlib for async context managers

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def managed_resource(name: str):
    print(f"Acquiring {name}")
    await asyncio.sleep(0.1)
    resource = {"name": name, "acquired": True}

    try:
        yield resource
    finally:
        print(f"Releasing {name}")
        await asyncio.sleep(0.05)

async def main():
    async with managed_resource("database") as db:
        print(f"Using {db['name']}")
```

### Async Iterators

```python
class AsyncPaginator:
    def __init__(self, total_items: int, page_size: int = 10):
        self.total_items = total_items
        self.page_size = page_size
        self.current_page = 0

    def __aiter__(self):
        return self

    async def __anext__(self):
        start = self.current_page * self.page_size
        if start >= self.total_items:
            raise StopAsyncIteration

        # Simulate async fetch
        await asyncio.sleep(0.1)

        end = min(start + self.page_size, self.total_items)
        items = list(range(start, end))
        self.current_page += 1

        return items

async def main():
    async for page in AsyncPaginator(35, page_size=10):
        print(f"Got page with items: {page}")

# Output:
# Got page with items: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
# Got page with items: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
# Got page with items: [20, 21, 22, 23, 24, 25, 26, 27, 28, 29]
# Got page with items: [30, 31, 32, 33, 34]
```

### Async Generators

```python
async def async_range(start: int, stop: int, delay: float = 0.1):
    """Async generator that yields numbers with delay"""
    for i in range(start, stop):
        await asyncio.sleep(delay)
        yield i

async def main():
    async for num in async_range(0, 5):
        print(f"Got: {num}")

# Async generator with database streaming
async def stream_large_query(query: str, batch_size: int = 100):
    """Stream large query results without loading all into memory"""
    offset = 0
    while True:
        batch = await db.execute(
            f"{query} LIMIT {batch_size} OFFSET {offset}"
        )
        if not batch:
            break

        for row in batch:
            yield row

        offset += batch_size
```

## Real-World Patterns

### HTTP Client with aiohttp

```python
import aiohttp

async def fetch_url(session: aiohttp.ClientSession, url: str) -> dict:
    async with session.get(url) as response:
        return await response.json()

async def fetch_multiple_urls(urls: list[str]) -> list[dict]:
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_url(session, url) for url in urls]
        return await asyncio.gather(*tasks, return_exceptions=True)

# With rate limiting
from asyncio import Semaphore

async def fetch_with_rate_limit(
    urls: list[str],
    max_concurrent: int = 10
) -> list[dict]:
    semaphore = Semaphore(max_concurrent)

    async def limited_fetch(session: aiohttp.ClientSession, url: str):
        async with semaphore:
            async with session.get(url) as response:
                return await response.json()

    async with aiohttp.ClientSession() as session:
        tasks = [limited_fetch(session, url) for url in urls]
        return await asyncio.gather(*tasks, return_exceptions=True)
```

### Database Operations with asyncpg

```python
import asyncpg

class AsyncDatabase:
    def __init__(self, dsn: str):
        self.dsn = dsn
        self.pool = None

    async def connect(self):
        self.pool = await asyncpg.create_pool(
            self.dsn,
            min_size=5,
            max_size=20
        )

    async def close(self):
        await self.pool.close()

    async def fetch_one(self, query: str, *args):
        async with self.pool.acquire() as conn:
            return await conn.fetchrow(query, *args)

    async def fetch_all(self, query: str, *args):
        async with self.pool.acquire() as conn:
            return await conn.fetch(query, *args)

    async def execute(self, query: str, *args):
        async with self.pool.acquire() as conn:
            return await conn.execute(query, *args)

    async def execute_many(self, query: str, args_list: list):
        async with self.pool.acquire() as conn:
            await conn.executemany(query, args_list)

# Usage
async def main():
    db = AsyncDatabase("postgresql://user:pass@localhost/db")
    await db.connect()

    try:
        users = await db.fetch_all("SELECT * FROM users WHERE active = $1", True)
        print(f"Found {len(users)} active users")
    finally:
        await db.close()
```

### Producer-Consumer Pattern

```python
import asyncio
from asyncio import Queue

async def producer(queue: Queue, items: list):
    """Produce items and put them in queue"""
    for item in items:
        await asyncio.sleep(0.1)  # Simulate work
        await queue.put(item)
        print(f"Produced: {item}")

    # Signal end of production
    await queue.put(None)

async def consumer(queue: Queue, name: str):
    """Consume items from queue"""
    while True:
        item = await queue.get()
        if item is None:
            queue.put_nowait(None)  # Pass signal to other consumers
            break

        await asyncio.sleep(0.2)  # Simulate processing
        print(f"Consumer {name} processed: {item}")
        queue.task_done()

async def main():
    queue = Queue(maxsize=10)

    # Start producer and multiple consumers
    await asyncio.gather(
        producer(queue, list(range(20))),
        consumer(queue, "A"),
        consumer(queue, "B"),
        consumer(queue, "C"),
    )
```

### Async Retry Pattern

```python
import random
from functools import wraps

def async_retry(
    max_attempts: int = 3,
    delay: float = 1.0,
    backoff: float = 2.0,
    exceptions: tuple = (Exception,)
):
    """Decorator for retrying async functions with exponential backoff"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            last_exception = None

            for attempt in range(max_attempts):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    if attempt < max_attempts - 1:
                        wait_time = delay * (backoff ** attempt)
                        # Add jitter
                        wait_time *= (0.5 + random.random())
                        print(f"Attempt {attempt + 1} failed, retrying in {wait_time:.2f}s")
                        await asyncio.sleep(wait_time)

            raise last_exception

        return wrapper
    return decorator

@async_retry(max_attempts=3, delay=1.0, exceptions=(aiohttp.ClientError,))
async def fetch_with_retry(url: str) -> dict:
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            response.raise_for_status()
            return await response.json()
```

## Error Handling

### Handling Multiple Task Errors

```python
async def safe_gather(*tasks, return_exceptions: bool = False):
    """Gather with better error handling"""
    results = await asyncio.gather(*tasks, return_exceptions=True)

    if not return_exceptions:
        # Raise first exception found
        for result in results:
            if isinstance(result, Exception):
                raise result

    return results

async def process_with_errors():
    async def task_ok():
        await asyncio.sleep(0.1)
        return "OK"

    async def task_fail():
        await asyncio.sleep(0.05)
        raise ValueError("Something went wrong")

    try:
        results = await safe_gather(
            task_ok(),
            task_fail(),
            task_ok(),
        )
    except ValueError as e:
        print(f"Task failed: {e}")
```

### Graceful Shutdown

```python
import signal

class GracefulShutdown:
    def __init__(self):
        self.shutdown_event = asyncio.Event()
        self.tasks = set()

    def register_task(self, task):
        self.tasks.add(task)
        task.add_done_callback(self.tasks.discard)

    async def shutdown(self):
        self.shutdown_event.set()

        # Cancel all registered tasks
        for task in self.tasks:
            task.cancel()

        # Wait for all tasks to complete
        if self.tasks:
            await asyncio.gather(*self.tasks, return_exceptions=True)

async def main():
    shutdown = GracefulShutdown()

    # Handle SIGTERM/SIGINT
    loop = asyncio.get_event_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(
            sig,
            lambda: asyncio.create_task(shutdown.shutdown())
        )

    # Run until shutdown
    while not shutdown.shutdown_event.is_set():
        task = asyncio.create_task(do_work())
        shutdown.register_task(task)
        await asyncio.sleep(1)
```

## Performance Tips

### Avoid Blocking Calls

```python
import asyncio
from concurrent.futures import ThreadPoolExecutor

# Bad: Blocking call in async function
async def bad_example():
    result = requests.get("http://example.com")  # BLOCKS!
    return result.json()

# Good: Run blocking code in thread pool
async def good_example():
    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor() as pool:
        result = await loop.run_in_executor(
            pool,
            requests.get,
            "http://example.com"
        )
    return result.json()

# Best: Use async library
async def best_example():
    async with aiohttp.ClientSession() as session:
        async with session.get("http://example.com") as response:
            return await response.json()
```

### Batching with asyncio.gather

```python
async def process_in_batches(items: list, batch_size: int = 100):
    """Process items in batches to avoid overwhelming resources"""
    results = []

    for i in range(0, len(items), batch_size):
        batch = items[i:i + batch_size]
        batch_results = await asyncio.gather(
            *[process_item(item) for item in batch]
        )
        results.extend(batch_results)

    return results
```

## Key Takeaways

1. **Use async for I/O-bound operations** - Network, database, file operations
2. **Never block the event loop** - Use run_in_executor for CPU-bound work
3. **Create tasks for concurrency** - asyncio.gather and create_task
4. **Implement proper cleanup** - Use async context managers
5. **Handle timeouts** - Use asyncio.wait_for
6. **Limit concurrency** - Use Semaphore to prevent resource exhaustion
7. **Stream large data** - Use async generators

## Conclusion

Async programming in Python unlocks massive performance improvements for I/O-bound applications. Start with simple coroutines, learn to use tasks for concurrency, and gradually adopt advanced patterns like producer-consumer queues. The investment in learning async pays dividends in application performance.

---

*Building async Python applications? Connect on [LinkedIn](https://www.linkedin.com/in/tushar-agrawal-91b67a28a) to discuss best practices.*
