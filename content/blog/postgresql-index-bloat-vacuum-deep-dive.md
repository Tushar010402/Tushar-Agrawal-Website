---
title: "Postgres Index Bloat Nearly Took Down Production: A VACUUM Deep-Dive"
description: "A table that was 2 GB of data carried 14 GB of dead tuples and bloated indexes. How MVCC creates bloat, how to measure it, and how autovacuum tuning, HOT updates, and a careful REINDEX brought query times back from 3s to 40ms."
date: "2026-03-05"
author: "Tushar Agrawal"
tags: ["PostgreSQL", "Database", "VACUUM", "Index Bloat", "MVCC", "Performance", "Autovacuum", "Optimization"]
image: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=1200&h=630&fit=crop"
published: true
---

Our `lab_results` table held about 2 GB of actual data. On disk, it and its indexes occupied **31 GB**. Queries that used to return in 40ms were creeping past 3 seconds. Nothing in the schema had changed; the row count had barely grown. The disk was just... filling up, and the database was getting slower in lockstep.

The culprit was **bloat** — and understanding it means understanding how PostgreSQL handles updates under the hood. This is the deep-dive I wish I'd read before the incident. For the broader scaling picture, pair it with [database sharding & partitioning](/blog/database-sharding-partitioning-advanced-guide) and [PostgreSQL performance optimization](/blog/postgresql-performance-optimization).

## Why Postgres creates dead rows: MVCC

PostgreSQL uses **MVCC** (Multi-Version Concurrency Control) so that readers never block writers. The trick: when you `UPDATE` a row, Postgres does **not** overwrite it. It writes a *new* version of the row and marks the old version as dead (a "dead tuple"). Transactions that started before the update still see the old version; new ones see the new version. A `DELETE` similarly just marks the row dead.

This is brilliant for concurrency and terrible if you ignore it, because those dead tuples don't disappear on their own. Every update to a row leaves a corpse behind. Our `lab_results` table got a status update several times per result — each one creating a new live tuple and a dead one. Multiply by millions of results and you get 14 GB of dead tuples sitting in a 2 GB table.

The mechanism that reclaims this space is `VACUUM`.

## Measuring the damage

Before touching anything, measure. This query shows dead-tuple counts and the last (auto)vacuum time per table:

```sql
SELECT relname,
       n_live_tup,
       n_dead_tup,
       round(n_dead_tup::numeric / nullif(n_live_tup, 0), 2) AS dead_ratio,
       last_autovacuum
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC
LIMIT 10;
```

Ours showed `lab_results` with a `dead_ratio` near 7 — seven dead tuples for every live one — and a `last_autovacuum` of *three weeks ago*. Autovacuum, the background process that is supposed to clean this up, had effectively stopped keeping up.

For index bloat specifically, `pgstattuple` gives the truth:

```sql
CREATE EXTENSION IF NOT EXISTS pgstattuple;
SELECT * FROM pgstatindex('idx_lab_results_patient');
-- leaf_fragmentation and a low avg_leaf_density => a bloated index
```

Our primary index was at ~22% leaf density — meaning ~78% of the index pages were wasted space. That is why query times had quadrupled: every index scan was reading four times more pages than it needed to.

## Why autovacuum fell behind

Autovacuum is triggered per-table when dead tuples exceed a threshold:

```
threshold = autovacuum_vacuum_threshold
          + autovacuum_vacuum_scale_factor * number_of_rows
```

The default `scale_factor` is `0.2` — autovacuum only kicks in after **20% of the table** is dead. On a large, update-heavy table, 20% is a *lot* of dead tuples, and by the time autovacuum runs it has a huge amount to clean. Worse, our autovacuum was being throttled by conservative cost-delay settings and was getting cancelled by an `ALTER`/lock from a nightly job before it finished.

Two configuration changes fixed the ongoing problem. I tuned them **per-table** rather than globally, because only a few hot tables needed it:

```sql
ALTER TABLE lab_results SET (
  autovacuum_vacuum_scale_factor = 0.02,   -- vacuum at 2% dead, not 20%
  autovacuum_vacuum_cost_delay   = 2,      -- let it work faster
  autovacuum_vacuum_cost_limit   = 2000
);
```

Vacuuming little and often is far cheaper than vacuuming rarely and enormously.

## Reducing bloat at the source: HOT updates

The best bloat is the kind you never create. PostgreSQL has an optimization called **HOT** (Heap-Only Tuple) updates: if an update does **not** change any *indexed* column, and there's room on the same page, Postgres can update the row in place without touching every index. HOT updates dramatically reduce both table and index bloat.

We were defeating it. Our status-update query touched an indexed `updated_at` column on every write, so no update qualified as HOT. Two changes helped:

1. **Don't index columns that change on every write** unless you truly query by them. We dropped an index on a high-churn column.
2. **Lower the table's `fillfactor`** so each page leaves room for in-place updates:

```sql
ALTER TABLE lab_results SET (fillfactor = 85);
```

A `fillfactor` of 85 leaves 15% of each page free for HOT updates to land in place. After a rewrite, the ratio of HOT updates (`n_tup_hot_upd / n_tup_upd` in `pg_stat_user_tables`) jumped from near-zero to over 90%, and bloat accumulation slowed to a crawl.

## Reclaiming the space already lost

Tuning stops *new* bloat; it does not shrink the 31 GB you already have. `VACUUM` marks dead space reusable but rarely returns it to the OS. To actually reclaim disk, you have two options:

- **`VACUUM FULL`** — fully rewrites the table compactly, but takes an `ACCESS EXCLUSIVE` lock (the table is unavailable for the duration). Fine at 3 AM on a small table; unacceptable on a hot one.
- **`pg_repack`** — rebuilds the table and indexes with only brief locking, online. This is what I used.

```bash
pg_repack --table lab_results --no-order -d production
```

For the indexes specifically, `REINDEX INDEX CONCURRENTLY` (Postgres 12+) rebuilds a bloated index without blocking writes:

```sql
REINDEX INDEX CONCURRENTLY idx_lab_results_patient;
```

After repack + concurrent reindex, the table-plus-indexes footprint dropped from 31 GB to **2.4 GB**, and the patient-lookup query went from ~3s back to ~40ms.

## Results

| Metric | Before | After |
|--------|--------|-------|
| On-disk size (table + indexes) | 31 GB | 2.4 GB |
| Dead-tuple ratio | ~7.0 | ~0.1 |
| Index leaf density | ~22% | ~91% |
| Patient-lookup query | ~3,000ms | ~40ms |
| HOT update ratio | ~3% | ~92% |

## The checklist I now run on every write-heavy table

1. **Monitor `n_dead_tup` and `last_autovacuum`** in `pg_stat_user_tables`. Silent autovacuum failure is the root of most bloat incidents.
2. **Tune `autovacuum_vacuum_scale_factor` per hot table** (0.01–0.05), not globally.
3. **Protect HOT updates**: don't index high-churn columns; set a `fillfactor` around 85 on update-heavy tables.
4. **Reclaim space online** with `pg_repack` and `REINDEX ... CONCURRENTLY`, not `VACUUM FULL`, on anything user-facing.
5. **Watch long-running transactions** — they hold back the "oldest visible" horizon and can prevent vacuum from removing dead tuples at all.

Bloat is not a bug in Postgres; it is the cost of MVCC, and MVCC is why Postgres handles concurrency so gracefully. The job is to keep the cleanup keeping pace. For where to go when a single node is no longer enough, see [database sharding & partitioning](/blog/database-sharding-partitioning-advanced-guide).

**Related reading:**
- [PostgreSQL Performance Optimization](/blog/postgresql-performance-optimization)
- [Database Sharding & Partitioning: An Advanced Guide](/blog/database-sharding-partitioning-advanced-guide)
- [Database Connection Pooling: The Performance Fix That Saved Our Production](/blog/database-connection-pooling-performance-guide)
- [MongoDB vs PostgreSQL: A Database Comparison](/blog/mongodb-vs-postgresql-database-comparison)
