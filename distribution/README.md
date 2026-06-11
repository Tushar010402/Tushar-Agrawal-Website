# Backlink / distribution kit

The single biggest lever for getting your 45 "discovered – not indexed" pages
crawled and ranked is **backlinks** — other sites linking to yours. Google crawls
deeper on domains that earn links. This kit makes that easy and safe.

## Why this is safe (no duplicate-content penalty)

Every cross-post in `devto/` carries a `canonical_url` pointing back to
`tusharagrawal.in`. That tag tells Google **your site is the original** — the
cross-post won't outrank you or get you penalised. You keep the SEO credit *and*
gain the backlink + referral traffic. This is exactly how engineers at big
companies syndicate to dev.to/Medium/Hashnode.

## How to publish (≈10 min each)

### dev.to
1. Sign in at [dev.to](https://dev.to) → **Create Post** → click the **⚙ settings**
   and enable the front-matter editor (or just paste — dev.to reads the `---`
   front matter directly).
2. Open a file in `distribution/devto/`, copy the **entire** contents, paste.
3. The `canonical_url` is already set — **do not remove it.** Leave
   `published: false` to preview, then flip to publish (or hit Publish in the UI).
4. Publish. dev.to gives you a `dofollow`-friendly link back to your post.

### Hashnode
1. New article → paste the body (everything below the `---` block).
2. In article **Settings → SEO → Original/Canonical URL**, paste the
   `canonical_url` value from the file.
3. Add the same tags, set the cover image URL, publish.

### Medium (optional)
Medium has an official "Import a story" tool (Stories → Import) that sets the
canonical automatically — paste your live post URL and it imports with canonical
back to you.

## Suggested cadence

Don't dump all five at once. **One post every 3–4 days** looks organic and keeps
you in each platform's feed longer. Order by pull:
1. `redis-cache-stampede…` — war stories perform best on dev.to
2. `kafka-consumer-lag…` — same
3. `llms-txt-generative-engine-optimization…` — timely, GEO is hot right now
4. `building-backends-for-ai-agents…` — trending topic
5. `technical-seo-nextjs…` — broad, practical

## LinkedIn

`linkedin-posts.md` has ready-to-paste posts. LinkedIn links are the fastest
referral traffic and the engagement signal helps. Post one when you publish each
dev.to article (link to *your* site, not dev.to).

## Also do (5 min, in Google Search Console)

- **URL Inspection → Request Indexing** on your 8–10 best posts (≈10/day limit).
- Re-submit `sitemap.xml`.
- These + the incoming backlinks are what move "discovered – not indexed" into
  the index.

## Regenerate / add more

```
node scripts/make-crosspost.mjs <slug> <slug> ...   # specific posts
node scripts/make-crosspost.mjs                      # the default flagship set
```
