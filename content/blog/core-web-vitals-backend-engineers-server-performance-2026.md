---
title: "Core Web Vitals for Backend Engineers: TTFB, Caching & Server-Side Wins (2026)"
description: "Most Core Web Vitals advice targets frontend developers, but LCP and INP problems usually start at the server. This guide covers the backend half: TTFB budgets, connection pooling, cache strategy, streaming SSR, CDN headers, and compression — with the production numbers behind each fix."
date: "2026-06-10"
author: "Tushar Agrawal"
tags: ["Core Web Vitals", "Performance", "Backend", "Web Performance", "Caching", "SEO", "TTFB", "Next.js", "Optimization"]
image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=630&fit=crop"
published: true
---

Core Web Vitals are usually framed as a frontend problem — optimize images, defer scripts, reserve layout space. But look at where the time actually goes on a slow page load and the story changes: **Largest Contentful Paint (LCP) cannot be faster than your Time to First Byte (TTFB)**, and TTFB is pure backend. Google's 2026 core updates lean harder on technical performance than ever, which means the server side of Web Vitals is now an SEO ranking input, not just an infrastructure metric.

This is the backend engineer's guide to Web Vitals — the layer below the framework, where the biggest wins usually live.

## Which Core Web Vitals does the backend control?

The three Core Web Vitals in 2026 are LCP (loading), INP (interactivity), and CLS (visual stability). The backend's fingerprints are on two of them:

| Metric | Good threshold | Backend's share |
|--------|----------------|-----------------|
| LCP | ≤ 2.5s | TTFB + HTML generation + asset delivery — often 60%+ of the budget |
| INP | ≤ 200ms | JS bundle size you force on the client; API latency behind interactions |
| CLS | ≤ 0.1 | Mostly frontend, but late-arriving server data causes shifts too |

The brutal math: if your TTFB is 1.8 seconds, your LCP is over 2.5 seconds before a single byte of CSS arrives. No amount of image optimization rescues a slow server. Google's own guidance puts a good TTFB at **under 800ms**; for server-rendered pages I budget 200–400ms at p75.

## What actually makes TTFB slow?

In every production system I've profiled, TTFB problems come from the same short list, in roughly this order:

**1. Database queries on the request path.** The classic: a page that runs 4 sequential queries at 80ms each has spent 320ms before rendering starts. Fixes are well known — indexes, batching, denormalized read models — but the highest-leverage one is usually [connection pooling](/blog/database-connection-pooling-performance-guide). A request that waits 150ms to *acquire* a connection has lost 150ms of LCP budget doing nothing.

**2. Cache misses, and worse, cache stampedes.** A cached page at 20ms that occasionally takes 2s on a miss has a fine median and a terrible p75 — and Core Web Vitals are measured at p75. When a hot key expires and 4,000 requests hit the database at once, your "fast" site fails Web Vitals for everyone in that window. I wrote up exactly that failure in my [Redis cache stampede war story](/blog/redis-cache-stampede-p99-latency-war-story); the fixes (lock-and-recompute, TTL jitter, stale-while-revalidate) are all server-side.

**3. Render-blocking external calls.** CMS APIs, auth checks, feature-flag services on the critical path. Each one adds its own p99 to yours. Move them off-path, cache them, or accept stale values.

**4. Cold starts and slow runtimes.** Serverless cold starts of 500ms–2s land directly in TTFB. Provisioned concurrency, edge runtimes, or just a boring always-warm container all fix it — pick by cost profile.

## How does static generation change the equation?

The cheapest TTFB is the one where no code runs. For content that's known at build time — blog posts, docs, marketing pages — static generation turns every request into a CDN file read:

```typescript
// Next.js App Router: prerender every post at build time
export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}
```

This site prerenders 190+ pages (every post plus every tag hub) at build time. TTFB from the CDN edge is consistently double-digit milliseconds — there is no server to be slow.

Two backend caveats that bite people at scale:

> **Tip:** Memoize your data layer during builds. A static export that prerenders hundreds of pages will call your "get all posts" function hundreds of times. Mine reads and parses 80+ markdown files; without a module-level cache the tag-page export timed out. One memoized read per worker fixed it.

For pages that can't be fully static, **streaming SSR** is the middle ground: flush the shell immediately (fast first byte, fast LCP for above-the-fold content) and stream the slow parts as they resolve. React Suspense boundaries in App Router give you this almost for free — the key design decision is *which* data is allowed to block the shell. The answer should be: almost none of it.

## What HTTP caching headers should your responses send?

CDN-friendly cache headers are the highest ROI lines of config in web performance. The pattern that covers most cases is `stale-while-revalidate`:

```text
Cache-Control: public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400
```

This tells the CDN: serve from cache for an hour, and for up to a day after that, **serve the stale copy instantly while refreshing in the background**. Users never wait on regeneration; your origin sees a trickle of revalidation requests instead of traffic spikes. I use exactly this header on my RSS feed and generated text routes.

The companion rule: immutable assets (hashed JS/CSS/fonts) get `max-age=31536000, immutable`, and HTML gets short or no client caching with CDN-level caching behind it. Mixing those up — long-caching HTML, short-caching assets — is one of the most common Web Vitals own-goals.

Compression is the other free win: Brotli at the CDN edge typically cuts HTML/JSON transfer 15–25% over gzip. You set it once and it pays on every request forever.

## How does backend discipline improve INP?

INP (Interaction to Next Paint) replaced FID in 2024 and measures *all* interactions, making it much harder to game. Two backend-adjacent decisions dominate it:

**Ship less JavaScript by doing work on the server.** Every kilobyte of client JS is parse/compile/execute time on a mid-range phone. The pattern I keep returning to: move rendering work server-side and ship finished HTML. When I moved this blog's markdown rendering (including syntax highlighting) from a client component to the server, the client lost ~95 lines of parsing logic and an entire highlighting library it never needed — readers' devices now do zero markdown work.

**Make the APIs behind interactions fast.** A search box that calls an endpoint with a 600ms p75 will feel broken regardless of frontend polish. Interaction-path endpoints deserve the same latency budgets as page loads: p75 under 200ms, p99 under 500ms, measured per endpoint, alerted like an SLO. The async patterns in my [long-running APIs guide](/blog/async-long-running-apis-for-ai-agents) apply directly: anything slower than the budget becomes a job, not a blocking call.

## How do you measure Web Vitals like a backend engineer?

Lab tools (Lighthouse) are for debugging; **field data is what Google ranks you on**. The pipeline that works:

- **CrUX / Search Console** — the ground truth Google sees, at p75, per origin and per URL group. Check it monthly.
- **RUM beacons** — the `web-vitals` JS library posts LCP/INP/CLS to a collection endpoint. Store them like any other metric; graph p75 by route.
- **Server-side TTFB histograms** — you already have these in your APM. Correlate spikes against deploys, cache hit rates, and DB pool saturation. (The instrumentation stack is in my [observability guide](/blog/observability-prometheus-grafana-jaeger-guide).)

The habit that matters: treat a Web Vitals regression like an API latency regression — bisect by layer (CDN → origin → app → DB) instead of reaching for frontend tweaks first. The waterfall doesn't lie about where the time went.

## The backend Web Vitals checklist

- TTFB p75 under 400ms for SSR routes; static-generate everything that can be
- Connection pools sized and monitored; no pool-wait time on the request path
- Cache stampede protection on every hot key (locks + jitter + stale-while-revalidate)
- `stale-while-revalidate` CDN headers on dynamic-ish content; `immutable` on hashed assets
- Brotli compression at the edge
- Streaming SSR with nothing non-essential blocking the shell
- Server-side rendering of expensive transforms (markdown, highlighting, charts) — ship HTML, not libraries
- Interaction-path API budgets: p75 < 200ms, alerted
- Field data (CrUX + RUM) reviewed monthly, regressions bisected by layer

Core Web Vitals being "a frontend metric" is the most expensive misconception in web performance. The frontend spends the latency budget — but the backend decides how big the budget is.
