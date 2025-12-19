---
title: "Database Sharding & Partitioning: Complete Advanced Guide for Scale"
description: "Master horizontal scaling with database sharding and partitioning strategies. Learn consistent hashing, shard key selection, rebalancing, and PostgreSQL partitioning for billion-row tables."
date: "2025-12-19"
author: "Tushar Agrawal"
tags: ["Database Sharding", "Partitioning", "PostgreSQL", "Horizontal Scaling", "Distributed Systems", "System Design", "Performance", "Backend Architecture"]
image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&h=630&fit=crop"
published: true
---

## Introduction

When your PostgreSQL database hits 100 million rows and queries start timing out, you've reached the scaling wall that every successful application eventually faces. This is where **database sharding and partitioning** become not just optimizations, but survival strategies.

Having scaled healthcare SaaS platforms processing millions of patient records at Dr. Dangs Lab, I've implemented these patterns in production. This guide covers everything from theory to battle-tested implementation.

## Partitioning vs Sharding: Understanding the Difference

Before diving deep, let's clarify these often-confused concepts:

### Partitioning (Vertical Scaling Within One Database)

```
┌─────────────────────────────────────────────────────┐
│                 SINGLE DATABASE                      │
├─────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │ Partition 1 │ │ Partition 2 │ │ Partition 3 │   │
│  │ (Jan-Mar)   │ │ (Apr-Jun)   │ │ (Jul-Sep)   │   │
│  └─────────────┘ └─────────────┘ └─────────────┘   │
│                                                      │
│  - Same server                                       │
│  - Transparent to application                        │
│  - PostgreSQL native feature                         │
└─────────────────────────────────────────────────────┘
```

### Sharding (Horizontal Scaling Across Multiple Databases)

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   SHARD 1    │  │   SHARD 2    │  │   SHARD 3    │
│  (Users A-H) │  │  (Users I-P) │  │  (Users Q-Z) │
│              │  │              │  │              │
│  Server 1    │  │  Server 2    │  │  Server 3    │
└──────────────┘  └──────────────┘  └──────────────┘
        │                │                │
        └────────────────┼────────────────┘
                         │
              ┌──────────────────┐
              │  Shard Router    │
              │  (Application)   │
              └──────────────────┘
```

## PostgreSQL Native Partitioning

PostgreSQL 10+ offers powerful native partitioning. Here's how to implement it:

### Range Partitioning (Time-Series Data)

```sql
-- Create partitioned table
CREATE TABLE patient_records (
    id BIGSERIAL,
    patient_id UUID NOT NULL,
    record_type VARCHAR(50) NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create partitions for each quarter
CREATE TABLE patient_records_2025_q1
    PARTITION OF patient_records
    FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');

CREATE TABLE patient_records_2025_q2
    PARTITION OF patient_records
    FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');

CREATE TABLE patient_records_2025_q3
    PARTITION OF patient_records
    FOR VALUES FROM ('2025-07-01') TO ('2025-10-01');

CREATE TABLE patient_records_2025_q4
    PARTITION OF patient_records
    FOR VALUES FROM ('2025-10-01') TO ('2026-01-01');

-- Create indexes on each partition
CREATE INDEX idx_patient_records_2025_q1_patient
    ON patient_records_2025_q1 (patient_id);
CREATE INDEX idx_patient_records_2025_q1_type
    ON patient_records_2025_q1 (record_type);
```

### Hash Partitioning (Even Distribution)

```sql
-- Hash partitioning for even data distribution
CREATE TABLE orders (
    id BIGSERIAL,
    customer_id UUID NOT NULL,
    order_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (id, customer_id)
) PARTITION BY HASH (customer_id);

-- Create 8 hash partitions
CREATE TABLE orders_p0 PARTITION OF orders FOR VALUES WITH (MODULUS 8, REMAINDER 0);
CREATE TABLE orders_p1 PARTITION OF orders FOR VALUES WITH (MODULUS 8, REMAINDER 1);
CREATE TABLE orders_p2 PARTITION OF orders FOR VALUES WITH (MODULUS 8, REMAINDER 2);
CREATE TABLE orders_p3 PARTITION OF orders FOR VALUES WITH (MODULUS 8, REMAINDER 3);
CREATE TABLE orders_p4 PARTITION OF orders FOR VALUES WITH (MODULUS 8, REMAINDER 4);
CREATE TABLE orders_p5 PARTITION OF orders FOR VALUES WITH (MODULUS 8, REMAINDER 5);
CREATE TABLE orders_p6 PARTITION OF orders FOR VALUES WITH (MODULUS 8, REMAINDER 6);
CREATE TABLE orders_p7 PARTITION OF orders FOR VALUES WITH (MODULUS 8, REMAINDER 7);
```

### List Partitioning (Category-Based)

```sql
-- List partitioning for categorical data
CREATE TABLE lab_results (
    id BIGSERIAL,
    test_category VARCHAR(50) NOT NULL,
    patient_id UUID NOT NULL,
    results JSONB NOT NULL,
    PRIMARY KEY (id, test_category)
) PARTITION BY LIST (test_category);

CREATE TABLE lab_results_hematology
    PARTITION OF lab_results
    FOR VALUES IN ('CBC', 'HEMOGLOBIN', 'PLATELET', 'WBC');

CREATE TABLE lab_results_biochemistry
    PARTITION OF lab_results
    FOR VALUES IN ('GLUCOSE', 'LIPID', 'LIVER', 'KIDNEY');

CREATE TABLE lab_results_microbiology
    PARTITION OF lab_results
    FOR VALUES IN ('CULTURE', 'SENSITIVITY', 'GRAM_STAIN');

-- Default partition for unknown categories
CREATE TABLE lab_results_other
    PARTITION OF lab_results DEFAULT;
```

## Application-Level Sharding with Python

For true horizontal scaling across servers, implement application-level sharding:

### Consistent Hashing Implementation

```python
import hashlib
from typing import Dict, List, Optional
from dataclasses import dataclass
import bisect

@dataclass
class ShardConfig:
    shard_id: str
    host: str
    port: int
    database: str
    weight: int = 1

class ConsistentHashRing:
    """
    Consistent hashing for database sharding.
    Minimizes data movement when adding/removing shards.
    """

    def __init__(self, virtual_nodes: int = 150):
        self.virtual_nodes = virtual_nodes
        self.ring: Dict[int, str] = {}
        self.sorted_keys: List[int] = []
        self.shards: Dict[str, ShardConfig] = {}

    def _hash(self, key: str) -> int:
        """Generate consistent hash for a key."""
        return int(hashlib.md5(key.encode()).hexdigest(), 16)

    def add_shard(self, config: ShardConfig) -> None:
        """Add a shard to the hash ring."""
        self.shards[config.shard_id] = config

        # Add virtual nodes based on weight
        for i in range(self.virtual_nodes * config.weight):
            virtual_key = f"{config.shard_id}:{i}"
            hash_val = self._hash(virtual_key)
            self.ring[hash_val] = config.shard_id
            bisect.insort(self.sorted_keys, hash_val)

    def remove_shard(self, shard_id: str) -> None:
        """Remove a shard from the hash ring."""
        if shard_id not in self.shards:
            return

        config = self.shards[shard_id]
        for i in range(self.virtual_nodes * config.weight):
            virtual_key = f"{shard_id}:{i}"
            hash_val = self._hash(virtual_key)
            if hash_val in self.ring:
                del self.ring[hash_val]
                self.sorted_keys.remove(hash_val)

        del self.shards[shard_id]

    def get_shard(self, key: str) -> Optional[ShardConfig]:
        """Get the shard for a given key."""
        if not self.ring:
            return None

        hash_val = self._hash(key)

        # Find the first shard with hash >= key hash
        idx = bisect.bisect_right(self.sorted_keys, hash_val)
        if idx >= len(self.sorted_keys):
            idx = 0

        shard_id = self.ring[self.sorted_keys[idx]]
        return self.shards[shard_id]

    def get_distribution(self) -> Dict[str, int]:
        """Get key distribution across shards (for monitoring)."""
        distribution = {shard_id: 0 for shard_id in self.shards}

        for i in range(10000):
            shard = self.get_shard(f"test_key_{i}")
            if shard:
                distribution[shard.shard_id] += 1

        return distribution


# Usage Example
ring = ConsistentHashRing(virtual_nodes=150)

# Add shards
ring.add_shard(ShardConfig("shard_1", "db1.example.com", 5432, "users_1", weight=1))
ring.add_shard(ShardConfig("shard_2", "db2.example.com", 5432, "users_2", weight=1))
ring.add_shard(ShardConfig("shard_3", "db3.example.com", 5432, "users_3", weight=2))  # Double capacity

# Get shard for a user
user_id = "user_12345"
shard = ring.get_shard(user_id)
print(f"User {user_id} -> Shard: {shard.shard_id} at {shard.host}")
```

### Shard-Aware Database Connection Pool

```python
import asyncpg
from typing import Dict, Any
import asyncio

class ShardedConnectionPool:
    """
    Connection pool manager for sharded databases.
    """

    def __init__(self, hash_ring: ConsistentHashRing):
        self.hash_ring = hash_ring
        self.pools: Dict[str, asyncpg.Pool] = {}
        self._lock = asyncio.Lock()

    async def initialize(self) -> None:
        """Initialize connection pools for all shards."""
        for shard_id, config in self.hash_ring.shards.items():
            pool = await asyncpg.create_pool(
                host=config.host,
                port=config.port,
                database=config.database,
                user="app_user",
                password="secure_password",
                min_size=5,
                max_size=20,
                command_timeout=30,
            )
            self.pools[shard_id] = pool

    async def get_connection(self, shard_key: str):
        """Get connection for the appropriate shard."""
        shard = self.hash_ring.get_shard(shard_key)
        if not shard:
            raise ValueError(f"No shard found for key: {shard_key}")

        return self.pools[shard.shard_id].acquire()

    async def execute_on_shard(
        self,
        shard_key: str,
        query: str,
        *args
    ) -> Any:
        """Execute query on the appropriate shard."""
        async with await self.get_connection(shard_key) as conn:
            return await conn.fetch(query, *args)

    async def execute_on_all_shards(
        self,
        query: str,
        *args
    ) -> Dict[str, Any]:
        """Execute query on all shards (scatter-gather)."""
        tasks = []
        for shard_id, pool in self.pools.items():
            async def execute_shard(sid, p):
                async with p.acquire() as conn:
                    return sid, await conn.fetch(query, *args)
            tasks.append(execute_shard(shard_id, pool))

        results = await asyncio.gather(*tasks)
        return dict(results)

    async def close(self) -> None:
        """Close all connection pools."""
        for pool in self.pools.values():
            await pool.close()


# Repository pattern with sharding
class UserRepository:
    def __init__(self, pool: ShardedConnectionPool):
        self.pool = pool

    async def create_user(self, user_id: str, data: dict) -> dict:
        """Create user on appropriate shard."""
        query = """
            INSERT INTO users (id, email, name, created_at)
            VALUES ($1, $2, $3, NOW())
            RETURNING *
        """
        result = await self.pool.execute_on_shard(
            user_id, query, user_id, data['email'], data['name']
        )
        return dict(result[0])

    async def get_user(self, user_id: str) -> Optional[dict]:
        """Get user from appropriate shard."""
        query = "SELECT * FROM users WHERE id = $1"
        result = await self.pool.execute_on_shard(user_id, query, user_id)
        return dict(result[0]) if result else None

    async def search_users(self, email_pattern: str) -> List[dict]:
        """Search across all shards (expensive operation)."""
        query = "SELECT * FROM users WHERE email LIKE $1 LIMIT 100"
        results = await self.pool.execute_on_all_shards(query, f"%{email_pattern}%")

        # Merge results from all shards
        all_users = []
        for shard_id, shard_results in results.items():
            all_users.extend([dict(r) for r in shard_results])

        return all_users
```

## Choosing the Right Shard Key

The shard key is the most critical decision in your sharding strategy:

### Good Shard Keys

| Use Case | Shard Key | Why |
|----------|-----------|-----|
| Multi-tenant SaaS | `tenant_id` | All tenant data on same shard |
| Social Network | `user_id` | User's data always together |
| E-commerce | `customer_id` | Order history co-located |
| IoT Platform | `device_id` | Device telemetry on same shard |
| Healthcare | `patient_id` | Patient records together |

### Bad Shard Keys

| Shard Key | Problem |
|-----------|---------|
| `created_at` | Hot spot on latest shard |
| `status` | Uneven distribution |
| `auto_increment_id` | Sequential, no locality |
| `country` | Some countries huge |

### Compound Shard Keys

```python
def generate_shard_key(tenant_id: str, entity_type: str) -> str:
    """
    Compound shard key for multi-tenant with entity isolation.
    """
    return f"{tenant_id}:{entity_type}"

# Usage
shard_key = generate_shard_key("tenant_123", "orders")
# Result: "tenant_123:orders"
```

## Handling Cross-Shard Queries

Cross-shard queries are expensive. Here are strategies to minimize them:

### Scatter-Gather Pattern

```python
async def aggregate_across_shards(
    pool: ShardedConnectionPool,
    metric: str,
    date_range: tuple
) -> dict:
    """
    Aggregate data across all shards.
    """
    query = """
        SELECT
            COUNT(*) as count,
            SUM(amount) as total,
            AVG(amount) as average
        FROM orders
        WHERE created_at BETWEEN $1 AND $2
    """

    shard_results = await pool.execute_on_all_shards(
        query, date_range[0], date_range[1]
    )

    # Aggregate results
    total_count = sum(r[0]['count'] for r in shard_results.values())
    total_sum = sum(r[0]['total'] or 0 for r in shard_results.values())

    return {
        'count': total_count,
        'total': total_sum,
        'average': total_sum / total_count if total_count > 0 else 0
    }
```

### Denormalization Strategy

```python
# Instead of cross-shard JOINs, denormalize data

# Before (requires cross-shard query):
# SELECT o.*, c.name FROM orders o JOIN customers c ON o.customer_id = c.id

# After (denormalized):
class Order:
    id: str
    customer_id: str
    customer_name: str  # Denormalized
    customer_email: str  # Denormalized
    items: List[dict]
    total: Decimal
```

## Rebalancing Shards

When shards become unbalanced, you need to rebalance:

```python
class ShardRebalancer:
    """
    Handles shard rebalancing with minimal downtime.
    """

    def __init__(
        self,
        source_pool: asyncpg.Pool,
        target_pool: asyncpg.Pool,
        batch_size: int = 1000
    ):
        self.source = source_pool
        self.target = target_pool
        self.batch_size = batch_size

    async def migrate_data(
        self,
        table: str,
        condition: str,
        on_progress: callable = None
    ) -> int:
        """
        Migrate data matching condition from source to target.
        """
        migrated = 0
        offset = 0

        while True:
            # Fetch batch from source
            async with self.source.acquire() as conn:
                rows = await conn.fetch(f"""
                    SELECT * FROM {table}
                    WHERE {condition}
                    ORDER BY id
                    LIMIT {self.batch_size} OFFSET {offset}
                """)

            if not rows:
                break

            # Insert into target
            async with self.target.acquire() as conn:
                async with conn.transaction():
                    for row in rows:
                        await conn.execute(f"""
                            INSERT INTO {table}
                            VALUES ({','.join(f'${i+1}' for i in range(len(row)))})
                            ON CONFLICT (id) DO UPDATE SET
                            updated_at = EXCLUDED.updated_at
                        """, *row.values())

            migrated += len(rows)
            offset += self.batch_size

            if on_progress:
                on_progress(migrated)

        return migrated

    async def verify_migration(
        self,
        table: str,
        condition: str
    ) -> bool:
        """Verify data consistency after migration."""
        async with self.source.acquire() as src_conn:
            source_count = await src_conn.fetchval(
                f"SELECT COUNT(*) FROM {table} WHERE {condition}"
            )

        async with self.target.acquire() as tgt_conn:
            target_count = await tgt_conn.fetchval(
                f"SELECT COUNT(*) FROM {table} WHERE {condition}"
            )

        return source_count == target_count
```

## Monitoring Sharded Systems

```python
from prometheus_client import Gauge, Histogram, Counter

# Metrics
shard_size = Gauge(
    'db_shard_size_bytes',
    'Size of each shard in bytes',
    ['shard_id']
)

shard_row_count = Gauge(
    'db_shard_row_count',
    'Number of rows in each shard',
    ['shard_id', 'table']
)

query_latency = Histogram(
    'db_query_latency_seconds',
    'Query latency by shard',
    ['shard_id', 'operation'],
    buckets=[.005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 10]
)

cross_shard_queries = Counter(
    'db_cross_shard_queries_total',
    'Number of cross-shard queries',
    ['operation']
)

async def collect_shard_metrics(pool: ShardedConnectionPool):
    """Collect metrics from all shards."""
    for shard_id, shard_pool in pool.pools.items():
        async with shard_pool.acquire() as conn:
            # Get database size
            size = await conn.fetchval(
                "SELECT pg_database_size(current_database())"
            )
            shard_size.labels(shard_id=shard_id).set(size)

            # Get row counts per table
            tables = await conn.fetch("""
                SELECT tablename FROM pg_tables
                WHERE schemaname = 'public'
            """)

            for table in tables:
                count = await conn.fetchval(
                    f"SELECT COUNT(*) FROM {table['tablename']}"
                )
                shard_row_count.labels(
                    shard_id=shard_id,
                    table=table['tablename']
                ).set(count)
```

## Performance Optimization Tips

### 1. Partition Pruning

```sql
-- PostgreSQL automatically prunes partitions
EXPLAIN ANALYZE
SELECT * FROM patient_records
WHERE created_at BETWEEN '2025-01-01' AND '2025-03-31';

-- Output shows only Q1 partition scanned
```

### 2. Parallel Query Execution

```sql
-- Enable parallel queries
SET max_parallel_workers_per_gather = 4;
SET parallel_tuple_cost = 0.001;
SET parallel_setup_cost = 100;
```

### 3. Partition-wise Aggregation

```sql
-- Enable partition-wise operations
SET enable_partitionwise_aggregate = on;
SET enable_partitionwise_join = on;
```

## Conclusion

Database sharding and partitioning are essential tools for scaling beyond single-server limits. Key takeaways:

- **Start with partitioning** - Native PostgreSQL partitioning handles most scaling needs
- **Shard when necessary** - Only shard when partitioning isn't enough
- **Choose shard keys carefully** - This decision is hard to change later
- **Plan for cross-shard queries** - Denormalize and use scatter-gather patterns
- **Monitor continuously** - Watch for hot spots and imbalance
- **Automate rebalancing** - Build tools for zero-downtime migrations

The patterns shown here have helped scale healthcare systems to millions of records. Apply them thoughtfully based on your specific requirements.

## Related Articles

- [PostgreSQL Performance Optimization](/blog/postgresql-performance-optimization) - Query tuning and indexing
- [System Design Interview Guide](/blog/system-design-interview-guide) - Scaling patterns
- [Building Scalable Microservices](/blog/building-scalable-microservices-with-go-and-fastapi) - Service architecture
- [Redis Caching Strategies](/blog/redis-caching-strategies-complete-guide) - Reducing database load
- [Event-Driven Architecture with Kafka](/blog/event-driven-architecture-kafka) - Decoupling data flows
