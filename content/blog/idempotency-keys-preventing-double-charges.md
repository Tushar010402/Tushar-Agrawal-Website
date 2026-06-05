---
title: "Idempotency Keys: How We Stopped Double-Charging Customers"
description: "A retry on a slow payment request charged a customer twice. A practical guide to idempotency keys — how to design the key, store it atomically, handle in-flight duplicates, and make any unsafe POST safe to retry."
date: "2026-03-18"
author: "Tushar Agrawal"
tags: ["API Design", "Idempotency", "Payments", "REST API", "Distributed Systems", "Backend Architecture", "Reliability", "Concurrency"]
image: "https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=1200&h=630&fit=crop"
published: true
---

The email I never want to receive: "I was charged twice for one order." We looked, and it was true — two identical payments, eight seconds apart, same amount, same customer. No bug in our charging logic. No double-click. The customer pressed "Pay" exactly once.

The cause was a retry — and it is one of the most common, most expensive bugs in distributed systems. The fix is **idempotency keys**. This post is the practical version: how the double-charge happens, and how to make any unsafe operation safe to repeat. It builds on ideas in [REST API design best practices](/blog/rest-api-design-best-practices) and [rate limiting & API gateway patterns](/blog/rate-limiting-api-gateway-patterns).

## How one click becomes two charges

Here is the timeline of our incident:

1. The client `POST`s `/payments` to charge ₹2,000.
2. Our server receives it, calls the payment gateway, the charge **succeeds**.
3. While we are writing the success response, the request takes longer than the client's 10-second timeout.
4. The client gives up, sees a timeout, and — being a well-behaved client — **retries** the same request.
5. Our server receives the retry as a brand-new request, calls the gateway again, charges ₹2,000 **a second time**.

Nobody did anything wrong. The network was slow once. The deadly combination is **a non-idempotent operation + an automatic retry**. And retries are everywhere: client libraries retry, load balancers retry, mobile apps retry on flaky connections. If your "create payment" endpoint isn't safe to call twice, it is only a matter of time.

## What "idempotent" means

An operation is **idempotent** if performing it multiple times has the same effect as performing it once. `GET`, `PUT`, and `DELETE` are idempotent by definition in HTTP. `POST` is not — and "charge a card" is the canonical non-idempotent operation.

You cannot change the semantics of "charge a card." But you *can* attach a token that lets the server recognize a retry and refuse to do the work twice. That token is the **idempotency key**.

## The design: a client-generated key

The client generates a unique key (a UUID) for each logical operation and sends it with the request. Crucially, **a retry reuses the same key.** The server stores the key and the result; if it sees the key again, it returns the stored result instead of re-executing.

```http
POST /payments HTTP/1.1
Idempotency-Key: 7b2c1f9e-3a44-4c2e-9b8a-2f1d6e0a5c33
Content-Type: application/json

{ "amount": 2000, "currency": "INR", "order_id": "ord_8841" }
```

This is exactly how Stripe, PayPal, and every serious payments API work. The key belongs to the *operation*, not the *attempt* — so the first try and every retry carry the same key.

## The naive implementation (and its race condition)

The obvious version:

```python
async def create_payment(key: str, body: dict):
    existing = await db.idempotency.find(key)
    if existing:
        return existing.response          # replay the stored result
    result = await charge_card(body)       # do the work
    await db.idempotency.insert(key, result)
    return result
```

This is better, but it has a race. Two requests with the same key can both pass the `find(key)` check before either inserts — and you are back to double-charging. The "check, then act" gap is the bug. You must make claiming the key **atomic**.

## The correct implementation

Use a unique constraint and let the database arbitrate. Insert the key *first*, in a `PENDING` state, before doing any work. The unique constraint guarantees exactly one winner.

```sql
CREATE TABLE idempotency_keys (
  key           text PRIMARY KEY,
  status        text NOT NULL,        -- 'pending' | 'completed'
  response      jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);
```

```python
async def create_payment(key: str, body: dict):
    try:
        # Atomically claim the key. If it already exists, this raises.
        await db.execute(
            "INSERT INTO idempotency_keys (key, status) VALUES ($1, 'pending')",
            key,
        )
    except UniqueViolation:
        # Someone already claimed this key — this is a duplicate.
        row = await db.fetchrow("SELECT status, response FROM idempotency_keys WHERE key=$1", key)
        if row["status"] == "completed":
            return row["response"]          # replay the original result
        # Still pending => the original is in flight. Tell the client to retry shortly.
        raise Conflict409("A request with this key is still being processed.")

    # We won the race — do the work exactly once.
    result = await charge_card(body)
    await db.execute(
        "UPDATE idempotency_keys SET status='completed', response=$2 WHERE key=$1",
        key, json.dumps(result),
    )
    return result
```

Three cases are now handled correctly:

- **First request:** claims the key, charges once, stores the result.
- **Retry after completion:** unique-violation → finds `completed` → replays the stored response. No second charge.
- **Concurrent duplicate (original still running):** unique-violation → finds `pending` → returns `409`, so the client backs off and retries, eventually getting the replayed result.

That in-flight case is the one the naive version misses, and it is exactly the 8-seconds-apart scenario that bit us.

## Details that matter in production

**Scope the key to the request.** Store a hash of the request body alongside the key. If the same key arrives with a *different* body, that is a client bug — reject it (`422`) rather than silently replaying an unrelated result.

**Set a TTL.** Idempotency keys don't need to live forever. We expire them after 24 hours, which comfortably covers any realistic retry window. A periodic job (or a Redis TTL, if you store keys there) handles cleanup.

**Pick the right storage.** Redis with `SET key value NX EX 86400` is a great fit for the atomic claim and the TTL — the same `NX` single-flight trick I used to stop a [cache stampede](/blog/redis-cache-stampede-p99-latency-war-story). A relational table with a unique constraint is just as correct and gives you durability for free. Either works; the non-negotiable property is **atomic claim**.

**Return the key boundary clearly.** Document that clients must generate one key per operation and reuse it on retry. An idempotency system only works if clients hold up their half of the contract.

## Where else to apply this

Once you have the pattern, you start seeing non-idempotent endpoints everywhere: "send invitation email," "create order," "submit insurance claim," "publish event." Any `POST` that has a side effect and might be retried should accept an idempotency key. It is cheap insurance against the most embarrassing class of bug — doing something irreversible twice.

## The takeaway

Retries are not a failure of your clients; they are a feature of resilient systems, and they are not going away. The server's job is to make repetition harmless. An idempotency key + an atomic claim + a stored result turns "charge the card" — the scariest operation in the system — into something you can safely call as many times as the network demands.

We shipped this, replayed the failure in staging (slow response + client retry), and watched it charge exactly once. The double-charge emails stopped.

**Related reading:**
- [REST API Design Best Practices](/blog/rest-api-design-best-practices)
- [Rate Limiting & API Gateway Patterns](/blog/rate-limiting-api-gateway-patterns)
- [The Cache Stampede That Took Down Our API: A Redis p99 War Story](/blog/redis-cache-stampede-p99-latency-war-story)
- [Event-Driven Architecture with Kafka](/blog/event-driven-architecture-kafka)
