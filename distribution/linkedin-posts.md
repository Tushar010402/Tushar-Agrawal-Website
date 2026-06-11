# LinkedIn post drafts

Paste, tweak the voice to yours, and link to the post on **tusharagrawal.in**
(not dev.to). Post one per article as you publish. First two lines matter most —
LinkedIn truncates after ~3 lines, so the hook has to land before "…see more".

---

## 1. Redis cache stampede war story

> Our patient-portal API fell over for 30 seconds. Every single morning. 9:00 AM sharp.
>
> Dashboards green at 8:59. p99 latency at 9 seconds at 9:00. Back to normal by 9:01.
>
> No deploy. No traffic spike. No error in the logs. Just a daily, punctual brownout.
>
> The culprit was one Redis key expiring — and 4,000 requests stampeding PostgreSQL the instant it did. Here's how cache stampedes happen, how we found ours, and the lock + jitter fix that cut p99 by 80%.
>
> Full write-up 👇
> https://www.tusharagrawal.in/blog/redis-cache-stampede-p99-latency-war-story
>
> #backend #redis #performance #systemdesign

---

## 2. llms.txt / GEO

> Ranking #1 on Google no longer means ChatGPT, Perplexity, or Google's AI Mode will cite you. The overlap between "top-10 ranked" and "cited by AI" has dropped to ~17–38%.
>
> AI search is now a separate game — and for developers, most of it is infrastructure you can ship in an afternoon: llms.txt, an AI-crawler policy, IndexNow, answer-first content.
>
> I wrote the complete developer playbook — with the working Next.js code I run in production:
> https://www.tusharagrawal.in/blog/llms-txt-generative-engine-optimization-developers-2026
>
> #SEO #AI #webdev #nextjs

---

## 3. Building backends for AI agents

> An AI agent will retry your endpoint. Then retry again. Then call it twice in parallel because the first response was slow.
>
> If your backend isn't built for that, you get double charges, corrupted state, and duplicate side effects.
>
> Designing agent-safe backends — idempotency keys, retry semantics, and state machines — is becoming core backend work. Here's how I approach it:
> https://www.tusharagrawal.in/blog/building-backends-for-ai-agents-idempotency-retries-state
>
> #backend #AIagents #systemdesign #api

---

## 4. Technical SEO for Next.js (for the dev audience)

> Technical SEO in 2026 isn't a marketing checklist — it's an engineering problem. Entity schema, honest sitemaps, AI-crawler policy, Core Web Vitals. All things you control in code.
>
> I documented the exact Next.js App Router setup running on my site — view-source it and you'll see every pattern live:
> https://www.tusharagrawal.in/blog/technical-seo-nextjs-developers-complete-guide-2026
>
> #nextjs #SEO #webdev #react

---

## Tips

- Reply to your own post with the link if you'd rather keep the main post link-free
  (LinkedIn's algorithm is kinder to posts without outbound links in the body —
  test both).
- Post Tue–Thu mornings IST for a developer audience.
- Engage with every comment in the first hour; it compounds reach.
