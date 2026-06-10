---
title: "llms.txt, GEO and AI Search: How Developers Get Cited by ChatGPT, Perplexity & Google AI Mode (2026)"
description: "Generative Engine Optimization (GEO) is how your content gets cited inside ChatGPT, Perplexity, Claude, and Google AI Overviews. This developer-focused guide covers llms.txt and llms-full.txt, AI crawler policies, IndexNow, answer-first content structure, and the entity signals that drive AI citations in 2026 — with working code."
date: "2026-06-10"
author: "Tushar Agrawal"
tags: ["GEO", "SEO", "LLM", "AI Search", "llms.txt", "ChatGPT", "Perplexity", "Next.js", "AI Agents", "Technical SEO"]
image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=630&fit=crop"
published: true
---

Generative Engine Optimization (GEO) is the practice of making your content **retrievable, quotable, and attributable** by AI search systems — ChatGPT search, Perplexity, Claude, Bing Copilot, and Google's AI Overviews/AI Mode. In 2026 this matters because the click economics changed: AI Overviews alone cut traditional CTR dramatically, but pages that get *cited inside* AI answers earn measurably more clicks than pages that merely rank. The overlap between "ranks in the top 10" and "gets cited by AI" has dropped to roughly 17–38% — meaning AI citation is now a **separate game** you have to play deliberately.

The good news for developers: most of GEO is infrastructure, and you can ship it in an afternoon. Here's the complete stack I run in production, with code.

## What is llms.txt and do you need one?

`llms.txt` is a proposed standard (llmstxt.org): a markdown file at your site root that gives LLMs a curated, token-efficient map of your site. Think of it as a sitemap written for a language model instead of a crawler:

```text
# Tushar Agrawal

> Full-Stack/Backend Engineer in New Delhi, India. Creator of QAuth
> (post-quantum authentication) and QuantumShield (PQC library).

## Products
- [QAuth](https://www.tusharagrawal.in/qauth): Post-quantum auth protocol
- [QuantumShield](https://www.tusharagrawal.in/quantum-shield): NIST FIPS 203/204/205 library

## Blog
- [Blog index](https://www.tusharagrawal.in/blog): 80+ engineering articles
- [Redis Cache Stampede War Story](https://www.tusharagrawal.in/blog/redis-cache-stampede-p99-latency-war-story): Production debugging
```

The format is strict on purpose: an H1 with your name, a blockquote summary, then H2 sections of links with one-line descriptions. The blockquote is the part most LLMs quote verbatim when describing you — write it like the answer you want repeated.

> **Note:** Google has said llms.txt is not required for AI Overviews, and that's true — Google uses its regular index. But ChatGPT, Claude, Perplexity, and dozens of agent frameworks *do* fetch it when reasoning about a domain. It costs one static file. Ship it.

## What is llms-full.txt and how do you generate it?

`llms-full.txt` is the companion file: the **full text** of your content in one plain-text document, so an LLM can ingest everything without crawling page by page. Don't maintain it by hand — generate it at build time. In Next.js App Router, that's a route handler:

```typescript
// app/llms-full.txt/route.ts
import { getAllPosts, getPostBySlug } from "@/lib/blog";

export const dynamic = "force-static"; // regenerated every build

export async function GET() {
  const posts = getAllPosts();
  const sections = posts.map((meta) => {
    const post = getPostBySlug(meta.slug);
    return [
      "---",
      `# ${post.title}`,
      `URL: ${siteUrl}/blog/${post.slug}`,
      `Published: ${post.date.slice(0, 10)}`,
      post.content.trim(),
    ].join("\n");
  });
  return new Response(header + sections.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
```

Mine compiles 80+ posts into a ~2 MB file on every deploy and never goes stale. The `force-static` export means it costs nothing at request time.

## Which AI crawlers should you allow in robots.txt?

This is the highest-leverage five minutes in GEO. Each AI product uses distinct user agents, and several are blocked by default in popular robots.txt templates. The ones that matter in 2026:

| User agent | Powers | If you block it |
|------------|--------|-----------------|
| OAI-SearchBot | ChatGPT search citations | Invisible in ChatGPT web answers |
| GPTBot | OpenAI training | Not in future model knowledge |
| ClaudeBot / Claude-SearchBot | Anthropic indexing & search | Invisible to Claude users |
| PerplexityBot / Perplexity-User | Perplexity answers | No Perplexity citations |
| Google-Extended | Gemini grounding | Reduced Gemini visibility |
| Bingbot | Bing + Copilot | Invisible to Copilot |
| Amazonbot | Alexa / Rufus | No Alexa answers |
| Meta-ExternalAgent | Meta AI | No Meta AI citations |

The distinction worth knowing: `GPTBot` is the *training* crawler, `OAI-SearchBot` is the *search* crawler, and `ChatGPT-User` is the *live browsing* agent acting for a user. You can allow search and browsing while blocking training if that's your policy — they're independent rules. For a personal brand or product site, I allow all of them: maximum surface area is the point.

## How does IndexNow get you into Bing and Copilot faster?

Bing powers ChatGPT's underlying web index and Microsoft Copilot, which makes Bing indexing an AI-visibility play, not just a search one. IndexNow is Bing/Yandex's push protocol — instead of waiting for a crawl, you POST your URLs the moment they change:

```typescript
// app/api/indexnow/route.ts (simplified)
export async function POST() {
  const urls = [...staticPages, ...allPostUrls, ...tagHubUrls];
  const body = { host, key: INDEXNOW_KEY, keyLocation, urlList: urls };

  const endpoints = [
    "https://api.indexnow.org/indexnow",
    "https://www.bing.com/indexnow",
    "https://yandex.com/indexnow",
  ];
  const results = await Promise.all(
    endpoints.map((e) => fetch(e, { method: "POST", body: JSON.stringify(body) }))
  );
  return Response.json({ urlsSubmitted: urls.length });
}
```

You verify ownership with a key file in `public/`, then `curl -X POST https://yoursite.com/api/indexnow` after each deploy (or wire it into CI). My last submission pushed 194 URLs and all three endpoints returned success in under a second. Google does not use IndexNow — for Google you still rely on sitemaps and Search Console.

## How do you structure content so AI engines quote it?

The 2026 citation data is unusually specific, and it converges on a few mechanical rules:

**Answer first, then expand.** AI extraction favors pages where the H1 or first paragraph contains a complete answer. Mirror the question in your heading, answer it in 1–2 sentences, *then* go deep. (Notice every H2 in this post is a question with the answer in the first sentence below it. That's not a style choice.)

**Write self-contained passages of 100–300 words.** Extracted AI Overview passages cluster at 134–167 words. A passage that depends on context three paragraphs up doesn't get quoted — every section should survive being read alone. This is what the GEO literature calls *semantic completeness*, and it's the strongest single predictor of citation.

**Put a labeled TL;DR at the top.** An explicit summary block adjacent to the H1 is the easiest possible extraction target. I render every post's description as a visible TL;DR card for exactly this reason.

**Use tables and lists for comparable facts.** Structured comparisons get lifted into AI answers far more often than the same facts buried in prose — pages combining text, structured data, and media see dramatically higher selection rates.

**Be a named entity.** Citations skew heavily toward sources with strong E-E-A-T: a Person schema with an `@id`, a visible author bio, consistent facts about you across pages, and `sameAs` links to GitHub/LinkedIn. AI systems resolve *who is saying this* before deciding whether to repeat it. The structured-data half of this is covered in my [technical SEO guide for Next.js](/blog/technical-seo-nextjs-developers-complete-guide-2026).

## What does a complete GEO stack look like?

The full checklist, all shippable in code:

- `public/llms.txt` — curated index, hand-written
- `/llms-full.txt` — full content, generated each build
- robots.txt allowing OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended, Bingbot and friends
- IndexNow endpoint + post-deploy ping (Bing/Yandex/Copilot)
- JSON-LD entity graph: Person with `@id`, BlogPosting, BreadcrumbList
- Answer-first headings, TL;DR blocks, self-contained sections
- Visible author identity and honest updated dates
- RSS feed (several AI crawlers use it for freshness discovery)

None of this replaces traditional SEO — Google's AI Overviews still draw from the regular index, so [Core Web Vitals and rendering performance](/blog/core-web-vitals-backend-engineers-server-performance-2026) still gate everything. GEO is a layer on top: same content, made legible to a new class of reader.

The sites winning AI citations in 2026 aren't doing anything mystical. They made themselves easy to retrieve, easy to quote, and easy to attribute — and they did it before their competitors thought of AI search as a channel at all.
