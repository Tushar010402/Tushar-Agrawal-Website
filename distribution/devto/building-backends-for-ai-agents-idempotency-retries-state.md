---
title: "Building Backends for AI Agents: Idempotency, Retries & State (2026)"
published: false
description: "AI agents retry, run for minutes, and call your APIs in unpredictable loops. The backend is where agent reliability lives. A practical guide to idempotency, saf"
tags: aiagents, agenticai, backendarchitecture, idempotency
cover_image: https://images.unsplash.com/photo-1488229297570-58520851e868?w=1200&h=630&fit=crop
canonical_url: https://www.tusharagrawal.in/blog/building-backends-for-ai-agents-idempotency-retries-state
---

There's a line going around in 2026 that I think is exactly right: **the backend is where agent reliability lives.** All the attention goes to the model and the prompts, but when an AI agent does something wrong — charges twice, corrupts state, loops forever — the failure is almost always in the *backend* it was calling, not the model. Agents are just a new, unusually chaotic kind of API client, and most backends were not built for a client that retries aggressively, runs for minutes, and calls your endpoints in loops it decides at runtime.

This is a practical guide to building backends that stay correct when an agent is driving. It pulls together patterns I've written about individually — [idempotency keys](https://www.tusharagrawal.in/blog/idempotency-keys-preventing-double-charges), [event-driven design](https://www.tusharagrawal.in/blog/event-driven-architecture-kafka), [rate limiting](https://www.tusharagrawal.in/blog/rate-limiting-api-gateway-patterns) — into one mental model for agent-facing systems.

## Why agents break backends that humans don't

A human client is predictable: one click, one request, a sensible pause, a retry only when they're frustrated. An agent is the opposite:

- **It retries reflexively.** When a tool call times out or returns an error, the agent's loop often just calls it again — sometimes many times, fast.
- **It runs long.** A single agent task can span minutes of tool calls, far past a normal HTTP timeout.
- **It calls tools in runtime-decided loops.** You can't predict the sequence or the volume; the agent composes it on the fly.
- **It acts on stale beliefs.** An agent may decide to "create the order" based on context that's already changed.

Each of these maps to a backend property you must now guarantee: **idempotency**, **durable long-running execution**, **rate limiting and loop-breaking**, and **consistent state**. Get those four right and agents become a manageable client. Skip them and you get the 2026 version of the double-charge bug — except the agent does it ten times in four seconds.

## 1. Idempotency is non-negotiable now

For human-facing APIs, idempotency is good hygiene. For agent-facing APIs, it is mandatory, because the agent *will* retry, and you have no control over when. Every state-changing tool an agent can call must be safe to call repeatedly.

The pattern is the same one I detailed in [idempotency keys](https://www.tusharagrawal.in/blog/idempotency-keys-preventing-double-charges): the caller supplies a key, you claim it atomically, and you replay the stored result on duplicates.

```python
async def tool_create_order(idempotency_key: str, args: dict):
    try:
        await db.execute(
            "INSERT INTO agent_actions (key, status) VALUES ($1, 'pending')",
            idempotency_key,
        )
    except UniqueViolation:
        row = await db.fetchrow("SELECT status, result FROM agent_actions WHERE key=$1", idempotency_key)
        if row["status"] == "completed":
            return row["result"]          # replay — no second order
        raise Conflict409("Action in progress; retry shortly.")

    result = await create_order(args)
    await db.execute("UPDATE agent_actions SET status='completed', result=$2 WHERE key=$1",
                     idempotency_key, json.dumps(result))
    return result
```

The practical twist for agents: **you often have to generate the key for them.** Many agent frameworks don't supply one. A robust approach is to derive a deterministic key from `(agent_run_id, tool_name, canonical_args_hash)` — so the same logical action within a run collapses to one key even if the agent doesn't think to send one.

## 2. Make destructive tools hard to fire by accident

Idempotency stops *duplicate* harm. You also want to limit *first-time* harm from an agent that misunderstands its task. Two cheap guards:

- **Confirmation tokens for irreversible actions.** A "delete customer" tool returns a preview + a token; the action only executes when called again with that token. This forces a two-step the agent must consciously complete.
- **Dry-run by default for high-blast-radius tools.** Return what *would* happen; require an explicit `commit: true`. Agents tend to do the safe thing when the safe thing is the default.

These aren't agent-specific inventions — they're the same defensive instincts behind good [REST API design](https://www.tusharagrawal.in/blog/rest-api-design-best-practices) — but agents raise the stakes enough that they're worth making mandatory for anything destructive.

## 3. Rate limit per agent run, and break loops

A buggy agent can hammer a tool in a tight loop. Standard per-user rate limiting helps, but the more useful unit for agents is the **agent run**. Track calls per `agent_run_id` and:

- **Cap total tool calls per run.** A hard ceiling ("this run may call tools 200 times") turns an infinite loop into a bounded, debuggable failure.
- **Detect repetition.** If the same `(tool, args_hash)` is called N times in a run with no state change, that's a loop — return an error that tells the agent to stop, not the same result that keeps it spinning.

The token-bucket and gateway patterns in [rate limiting & API gateway patterns](https://www.tusharagrawal.in/blog/rate-limiting-api-gateway-patterns) apply directly; you're just keying them on the run instead of the user.

## 4. State: agents need durable, inspectable execution

Because agent tasks are long and multi-step, you cannot hold their progress in a request handler's memory — a deploy, crash, or timeout would lose it. Agent backends need **durable state**: the run, its steps, and its tool results persisted so the work can resume and so *you* can inspect what happened.

This is where event-driven thinking pays off. Model an agent run as an **append-only event log** — `run_started`, `tool_called`, `tool_result`, `step_completed` — exactly the [event-driven architecture](https://www.tusharagrawal.in/blog/event-driven-architecture-kafka) pattern. Benefits:

- **Recoverability.** Rebuild run state by replaying its events after a crash.
- **Auditability.** When an agent does something surprising, the event log is the trace of *why*.
- **Idempotent resume.** Combined with the action keys above, you can re-drive a run without repeating completed side effects.

```text
agent_run_events
  run_id | seq | type          | payload                         | ts
  r_91   | 1   | run_started   | {goal: "..."}                   | ...
  r_91   | 2   | tool_called   | {tool: "search", args: {...}}   | ...
  r_91   | 3   | tool_result   | {tool: "search", result: {...}} | ...
  r_91   | 4   | tool_called   | {tool: "create_order", key:...} | ...
```

For long-running execution specifically, don't block the HTTP request for minutes — kick the work to a durable queue and let the agent poll or subscribe. I cover that pattern in depth in [designing async, long-running APIs for AI agents](https://www.tusharagrawal.in/blog/async-long-running-apis-for-ai-agents).

## 5. Observability: you cannot debug what you cannot see

Agent failures are weird and intermittent. Without tracing, "the agent did something bad yesterday" is unfixable. Instrument every tool call with the `agent_run_id` as a trace/correlation ID, and emit the same percentile metrics you'd use anywhere — the [Prometheus/Grafana/Jaeger stack](https://www.tusharagrawal.in/blog/observability-prometheus-grafana-jaeger-guide) works unchanged. The one addition for agents: log the **arguments and decision**, not just latency, because the interesting failure is usually "why did it call this tool with these args," not "how slow was it."

## The checklist for an agent-ready backend

1. **Every state-changing tool is idempotent** — caller key or server-derived `(run, tool, args)` key.
2. **Destructive tools are two-step** — confirmation tokens or dry-run-by-default.
3. **Rate limits and loop detection are keyed on the agent run**, with a hard call ceiling.
4. **Runs are durable, append-only event logs** — recoverable, auditable, resumable.
5. **Long work is async**, off the request path ([details here](https://www.tusharagrawal.in/blog/async-long-running-apis-for-ai-agents)).
6. **Every tool call is traced** by run ID, with arguments captured.

## The takeaway

The agent era doesn't require exotic new backend theory — it requires you to *actually apply* the reliability patterns we already knew, because the new client punishes every shortcut. Idempotency, durable state, run-scoped rate limits, and tracing were "nice to have" for human traffic. For agents they're the difference between a tool an agent can safely use and a footgun it fires on your behalf. Build the backend as if a fast, slightly confused client is in control of it — because in 2026, one is.

**Related reading:**
- [Idempotency Keys: How We Stopped Double-Charging Customers](https://www.tusharagrawal.in/blog/idempotency-keys-preventing-double-charges)
- [Designing Async, Long-Running APIs for AI Agents](https://www.tusharagrawal.in/blog/async-long-running-apis-for-ai-agents)
- [MCP vs Direct API Calls: The Token-Efficiency Debate (2026)](https://www.tusharagrawal.in/blog/mcp-vs-direct-api-calls-token-efficiency-2026)
- [Event-Driven Architecture with Kafka](https://www.tusharagrawal.in/blog/event-driven-architecture-kafka)
- [AI-Native Backend Architecture for 2026](https://www.tusharagrawal.in/blog/ai-native-backend-architecture-2026)

---

*Originally published at [tusharagrawal.in](https://www.tusharagrawal.in/blog/building-backends-for-ai-agents-idempotency-retries-state). I write about backend engineering, performance, and AI-era infrastructure — more at [tusharagrawal.in/blog](https://www.tusharagrawal.in/blog).*
