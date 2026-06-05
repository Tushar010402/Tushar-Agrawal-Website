---
title: "FOMOA for Developers: OpenAI-Compatible API, Deep Research & Ethical Crawling"
description: "The complete FOMOA developer guide — a drop-in OpenAI-compatible endpoint, multi-hop deep research, an ethical web-crawl API that respects robots.txt, and entity search over 50,000+ Indian companies and schemes."
date: "2026-01-15"
updated: "2026-06-06"
author: "Tushar Agrawal"
tags: ["OpenAI API Alternative", "AI API Developers", "Chat Completion API", "FOMOA", "LangChain", "Web Crawler API", "Deep Research AI", "Developer Tools"]
image: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=1200&h=630&fit=crop"
published: true
---

If you have ever wired an app to the OpenAI API, you already know how to use FOMOA. That is the whole point: FOMOA exposes an **OpenAI-compatible endpoint**, so you change one line — the `base_url` — and keep the rest of your code. On top of that drop-in chat API, it adds India-optimised search plus four purpose-built endpoints for research, crawling, and entity lookup.

This guide consolidates the developer story: the compatible chat API, deep research, ethical crawling, and entity/company search. For the product overview and how the model was trained, start with [the complete FOMOA guide](/blog/fomoa-ai-complete-guide-features-2026).

## Drop-In OpenAI Replacement

The migration is deliberately boring — which is exactly what you want:

```python
from openai import OpenAI

client = OpenAI(
    api_key="YOUR_FOMOA_KEY",
    base_url="https://api.fomoa.in/v1",  # the only change
)

resp = client.chat.completions.create(
    model="fomoa-search",
    messages=[{"role": "user", "content": "Latest UPI transaction limits in India"}],
)
print(resp.choices[0].message.content)
```

Because it speaks the OpenAI wire format, it works with anything built on that format — the official SDK, LangChain, LlamaIndex, and your existing streaming code.

### Streaming

```python
stream = client.chat.completions.create(
    model="fomoa-search",
    messages=[{"role": "user", "content": "Explain the new tax regime slabs"}],
    stream=True,
)
for chunk in stream:
    delta = chunk.choices[0].delta.content
    if delta:
        print(delta, end="", flush=True)
```

If you are designing the API layer around this, the usual rules apply — sensible status codes, idempotency, and backpressure. I wrote those up in [REST API design best practices](/blog/rest-api-design-best-practices) and [rate limiting & API gateway patterns](/blog/rate-limiting-api-gateway-patterns).

## The India-Specific Endpoints

Beyond `/v1/chat/completions`, FOMOA exposes four endpoints that a generic chat model does not give you:

| Endpoint | Purpose |
|----------|---------|
| `/api/answer` | A direct, cited answer to a single question |
| `/api/research` | Multi-hop deep research with conflict detection |
| `/api/crawl` | Ethical web-content extraction |
| `/api/entities` | Structured search over Indian companies & schemes |

### `/api/answer` — direct cited answers

When you want a single grounded answer rather than a chat turn, `/api/answer` returns the response *with its citations*, so you can show users where each claim came from.

## Deep Research: Multi-Hop, Conflict-Aware

A normal search does one query and returns links. **Multi-hop research** uses the results of the first search to decide what to search next — following leads the way a human researcher would — then synthesises a cited report and flags where sources disagree.

FOMOA offers three depths so you can trade latency for thoroughness:

- **Quick (~5s)** — a fast single-pass answer.
- **Normal (~15s)** — a couple of hops, good for most questions.
- **Deep (~60s)** — up to three hops, conflict detection, and a structured report.

```python
import requests

r = requests.post(
    "https://api.fomoa.in/api/research",
    headers={"Authorization": "Bearer YOUR_FOMOA_KEY"},
    json={"query": "Impact of UPI on Indian economy 2024", "depth": "deep"},
)
report = r.json()
# report -> { summary, sections[], sources[], conflicts[] }
```

The `conflicts[]` array is the interesting part: instead of silently picking one number when two sources disagree, it returns both and tells you which source is more authoritative — the same credibility ranking described in [the complete FOMOA guide](/blog/fomoa-ai-complete-guide-features-2026). This is what makes it usable for journalists, analysts, and anyone who has to defend an answer.

## Ethical Web Crawling

`/api/crawl` extracts clean, readable content from a URL — but with guardrails that a naive scraper skips:

- **Respects `robots.txt`.** If a site disallows crawling, FOMOA does not crawl it.
- **Rate-limited to ~2 requests/second per site** so you do not hammer anyone's server.
- **Returns clean text, links, and metadata** rather than raw HTML soup.

```python
r = requests.post(
    "https://api.fomoa.in/api/crawl",
    headers={"Authorization": "Bearer YOUR_FOMOA_KEY"},
    json={"url": "https://example.gov.in/scheme", "mode": "single"},
)
# -> { text, links[], meta: { title, description, published } }
```

It supports single-page, site-wide, and sitemap-based modes, handles pagination, and degrades gracefully on JavaScript-heavy pages. The ethical defaults matter: building data pipelines on top of a crawler that ignores `robots.txt` is how you get your IPs blocked and your project shut down.

## Entity Search: Indian Companies & Schemes

`/api/entities` is structured search over India-specific entities — most usefully, **50,000+ Indian startups and companies** and the catalogue of government schemes.

```python
r = requests.post(
    "https://api.fomoa.in/api/entities",
    headers={"Authorization": "Bearer YOUR_FOMOA_KEY"},
    json={
        "type": "company",
        "filters": {"industry": "fintech", "location": "Bengaluru", "funding_stage": "Series A"},
    },
)
companies = r.json()["results"]
```

You can filter by industry, location, and funding stage (and combine them), or pass a natural-language query. For the scheme side — eligibility, documents, official links — see the use-case walkthroughs in [FOMOA vs Exa.ai + India Use-Cases](/blog/fomoa-vs-exa-ai-comparison).

## Framework Integrations

Because the chat endpoint is OpenAI-compatible, framework integration is trivial:

```python
# LangChain
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    model="fomoa-search",
    api_key="YOUR_FOMOA_KEY",
    base_url="https://api.fomoa.in/v1",
)
```

LlamaIndex works the same way — point its OpenAI-compatible LLM wrapper at FOMOA's `base_url`.

## Error Handling and Rate Limits

Treat it like any production dependency:

- **Handle 429s with backoff.** Respect the documented per-key limits and retry with exponential backoff and jitter.
- **Set timeouts**, especially for deep research (which can legitimately take ~60s).
- **Cache** repeated answers where freshness allows — the same caching discipline I cover in [Redis caching strategies](/blog/redis-caching-strategies-complete-guide).

## Why This Matters

The combination is what is rare: an OpenAI-compatible chat API you can adopt in five minutes, *plus* research, crawl, and entity endpoints tuned for Indian data — at zero cost. For a paid-vs-free breakdown against the main commercial alternative, read [FOMOA vs Exa.ai](/blog/fomoa-vs-exa-ai-comparison).

**Keep reading:**
- [FOMOA AI: The Complete Guide (2026)](/blog/fomoa-ai-complete-guide-features-2026)
- [FOMOA vs Exa.ai + India Use-Cases](/blog/fomoa-vs-exa-ai-comparison)
- [REST API Design Best Practices](/blog/rest-api-design-best-practices)
- [Rate Limiting & API Gateway Patterns](/blog/rate-limiting-api-gateway-patterns)
