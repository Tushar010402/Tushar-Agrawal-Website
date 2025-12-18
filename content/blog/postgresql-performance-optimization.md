---
title: "PostgreSQL Performance Optimization: Complete Guide for Production"
description: "Master PostgreSQL performance tuning with indexing strategies, query optimization, configuration tuning, and monitoring. Learn techniques that helped us handle 10M+ daily transactions in healthcare systems."
date: "2024-12-14"
author: "Tushar Agrawal"
tags: ["PostgreSQL", "Database", "Performance", "SQL", "Backend", "Optimization"]
image: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=1200&h=630&fit=crop"
published: true
---

## Introduction

PostgreSQL is the database of choice for many production systems, but poor configuration and unoptimized queries can cripple performance. At Dr. Dangs Lab, we process over 10 million healthcare transactions daily with PostgreSQL. Here's everything I've learned about making it fast.

## Understanding PostgreSQL Performance

### The Query Execution Pipeline

```
SQL Query → Parser → Planner/Optimizer → Executor → Results
                          ↓
                    Statistics
                    (pg_stats)
```

### Key Performance Metrics

```sql
-- Check current connections and activity
SELECT
    state,
    COUNT(*) as connections,
    MAX(EXTRACT(EPOCH FROM (NOW() - query_start))) as max_duration_seconds
FROM pg_stat_activity
WHERE pid != pg_backend_pid()
GROUP BY state;

-- Database size and bloat
SELECT
    schemaname,
    relname,
    n_live_tup,
    n_dead_tup,
    ROUND(n_dead_tup::numeric / NULLIF(n_live_tup, 0) * 100, 2) as dead_ratio
FROM pg_stat_user_tables
WHERE n_live_tup > 1000
ORDER BY n_dead_tup DESC
LIMIT 20;
```

## Indexing Strategies

### B-Tree Indexes (Default)

```sql
-- Simple index for equality and range queries
CREATE INDEX idx_users_email ON users(email);

-- Composite index - column order matters!
-- Good for: WHERE status = 'active' AND created_at > '2024-01-01'
CREATE INDEX idx_orders_status_date ON orders(status, created_at DESC);

-- Partial index - smaller and faster
CREATE INDEX idx_active_users ON users(email)
WHERE status = 'active';

-- Covering index - includes all needed columns
CREATE INDEX idx_orders_covering ON orders(user_id, status)
INCLUDE (total_amount, created_at);
```

### Specialized Index Types

```sql
-- GIN index for full-text search
CREATE INDEX idx_products_search ON products
USING GIN(to_tsvector('english', name || ' ' || description));

-- Usage
SELECT * FROM products
WHERE to_tsvector('english', name || ' ' || description)
      @@ to_tsquery('english', 'laptop & gaming');

-- GiST index for geometric/range data
CREATE INDEX idx_locations_point ON locations USING GIST(coordinates);

-- BRIN index for naturally ordered data (time-series)
CREATE INDEX idx_events_date ON events USING BRIN(created_at);

-- Hash index for equality-only lookups
CREATE INDEX idx_sessions_token ON sessions USING HASH(session_token);
```

### Index Analysis

```sql
-- Find unused indexes
SELECT
    schemaname,
    relname as table_name,
    indexrelname as index_name,
    idx_scan as index_scans,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Find missing indexes (slow sequential scans)
SELECT
    schemaname,
    relname,
    seq_scan,
    seq_tup_read,
    idx_scan,
    ROUND(seq_tup_read::numeric / NULLIF(seq_scan, 0), 0) as avg_seq_tup_read
FROM pg_stat_user_tables
WHERE seq_scan > 100
ORDER BY seq_tup_read DESC
LIMIT 20;
```

## Query Optimization

### Using EXPLAIN ANALYZE

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT u.name, COUNT(o.id) as order_count, SUM(o.total) as total_spent
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2024-01-01'
GROUP BY u.id, u.name
HAVING COUNT(o.id) > 5
ORDER BY total_spent DESC
LIMIT 100;

-- Understanding the output:
-- Seq Scan: Full table scan (usually bad for large tables)
-- Index Scan: Using index (good)
-- Index Only Scan: All data from index (best)
-- Bitmap Index Scan: Multiple index conditions
-- Hash Join: Building hash table for join
-- Nested Loop: Row-by-row join (watch out for large tables)
```

### Common Query Optimizations

```sql
-- BAD: Function on indexed column prevents index use
SELECT * FROM users WHERE LOWER(email) = 'john@example.com';

-- GOOD: Expression index or proper data storage
CREATE INDEX idx_users_email_lower ON users(LOWER(email));
-- Or store email as lowercase

-- BAD: OR conditions can prevent index use
SELECT * FROM orders WHERE status = 'pending' OR status = 'processing';

-- GOOD: Use IN clause
SELECT * FROM orders WHERE status IN ('pending', 'processing');

-- BAD: Leading wildcard prevents index use
SELECT * FROM products WHERE name LIKE '%laptop%';

-- GOOD: Use full-text search or trigram index
CREATE EXTENSION pg_trgm;
CREATE INDEX idx_products_name_trgm ON products USING GIN(name gin_trgm_ops);
SELECT * FROM products WHERE name ILIKE '%laptop%';

-- BAD: SELECT * fetches unnecessary columns
SELECT * FROM large_table WHERE id = 1;

-- GOOD: Select only needed columns
SELECT id, name, status FROM large_table WHERE id = 1;
```

### CTEs vs Subqueries

```sql
-- CTE (Common Table Expression) - materialized in PostgreSQL 11-
-- Can be slower if result is large but used only once
WITH active_users AS (
    SELECT id, name FROM users WHERE status = 'active'
)
SELECT * FROM active_users WHERE name LIKE 'A%';

-- PostgreSQL 12+ can inline CTEs (NOT MATERIALIZED)
WITH active_users AS NOT MATERIALIZED (
    SELECT id, name FROM users WHERE status = 'active'
)
SELECT * FROM active_users WHERE name LIKE 'A%';

-- Subquery - usually better optimized
SELECT * FROM (
    SELECT id, name FROM users WHERE status = 'active'
) active_users WHERE name LIKE 'A%';
```

## Configuration Tuning

### Memory Settings

```ini
# postgresql.conf

# Shared buffer - 25% of RAM (max ~8GB for most workloads)
shared_buffers = 4GB

# Work memory - per-operation memory for sorts, joins
# Be careful: this is per-operation, not per-connection
work_mem = 256MB

# Maintenance work memory - for VACUUM, CREATE INDEX
maintenance_work_mem = 1GB

# Effective cache size - estimate of OS cache (50-75% of RAM)
effective_cache_size = 12GB

# WAL settings for write-heavy workloads
wal_buffers = 64MB
checkpoint_completion_target = 0.9
```

### Connection Pooling with PgBouncer

```ini
# pgbouncer.ini
[databases]
mydb = host=localhost port=5432 dbname=mydb

[pgbouncer]
listen_port = 6432
listen_addr = *
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

# Pool mode: transaction is best for web apps
pool_mode = transaction

# Connection limits
max_client_conn = 1000
default_pool_size = 25
min_pool_size = 5
reserve_pool_size = 5

# Timeouts
server_idle_timeout = 600
query_timeout = 300
```

### Application-Side Connection Management

```python
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

engine = create_engine(
    "postgresql://user:pass@localhost:6432/mydb",
    poolclass=QueuePool,
    pool_size=10,          # Connections to keep open
    max_overflow=20,       # Extra connections when pool is exhausted
    pool_timeout=30,       # Wait time for available connection
    pool_recycle=1800,     # Recycle connections every 30 min
    pool_pre_ping=True,    # Verify connection before use
)
```

## Partitioning for Large Tables

```sql
-- Create partitioned table
CREATE TABLE events (
    id BIGSERIAL,
    event_type VARCHAR(50),
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create partitions
CREATE TABLE events_2024_01 PARTITION OF events
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE events_2024_02 PARTITION OF events
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Automatic partition creation (pg_partman extension)
CREATE EXTENSION pg_partman;

SELECT partman.create_parent(
    p_parent_table => 'public.events',
    p_control => 'created_at',
    p_type => 'native',
    p_interval => '1 month',
    p_premake => 3
);
```

## Maintenance and Monitoring

### Automated Maintenance

```sql
-- Auto-vacuum settings (in postgresql.conf)
autovacuum = on
autovacuum_max_workers = 4
autovacuum_naptime = 30s
autovacuum_vacuum_threshold = 50
autovacuum_vacuum_scale_factor = 0.1
autovacuum_analyze_threshold = 50
autovacuum_analyze_scale_factor = 0.05

-- Manual VACUUM for specific tables
VACUUM (VERBOSE, ANALYZE) large_table;

-- Reindex to reduce bloat
REINDEX INDEX CONCURRENTLY idx_users_email;
```

### Monitoring Queries

```sql
-- Slow query log analysis
-- Enable in postgresql.conf:
-- log_min_duration_statement = 1000  # Log queries > 1 second

-- Find long-running queries
SELECT
    pid,
    NOW() - query_start as duration,
    state,
    LEFT(query, 100) as query_preview
FROM pg_stat_activity
WHERE state != 'idle'
AND query_start < NOW() - INTERVAL '5 minutes'
ORDER BY query_start;

-- Table bloat estimation
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname || '.' || tablename)) as table_size,
    pg_size_pretty(pg_indexes_size(schemaname || '.' || tablename)) as index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC
LIMIT 20;

-- Cache hit ratio (should be > 99%)
SELECT
    SUM(heap_blks_hit) / NULLIF(SUM(heap_blks_hit) + SUM(heap_blks_read), 0) * 100
    as cache_hit_ratio
FROM pg_statio_user_tables;
```

## Key Takeaways

1. **Index strategically** - Not all columns need indexes, but missing indexes kill performance
2. **Use EXPLAIN ANALYZE** - Always understand what your queries are doing
3. **Configure memory properly** - shared_buffers and work_mem have huge impact
4. **Use connection pooling** - PgBouncer is essential for high-concurrency apps
5. **Partition large tables** - Time-series data benefits greatly from partitioning
6. **Monitor constantly** - pg_stat_statements and slow query logs are your friends
7. **Maintain regularly** - VACUUM and ANALYZE keep the database healthy

## Conclusion

PostgreSQL performance optimization is a continuous process. Start with proper indexing and query optimization, then tune configuration, and finally implement advanced features like partitioning as your data grows. The key is to measure, optimize, and measure again.

---

*Need help optimizing your PostgreSQL database? Connect on [LinkedIn](https://www.linkedin.com/in/tushar-agrawal-91b67a28a).*
