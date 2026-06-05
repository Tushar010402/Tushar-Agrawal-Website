# SEO & Indexing Checklist

Living checklist for getting more of the site indexed and keeping Search Console clean.
Background: as of early 2026, GSC reported ~20 indexed / ~85 not-indexed pages. The code
changes below remove the technical blockers; the rest is manual work in Search Console
plus time.

## What the code changes already did

- ✅ **Tag/category hub pages** (`/blog/tag/<slug>`) — dense internal linking so crawlers can
  reach every post through topic hubs, not just the listing page.
- ✅ **Sitemap completed** — added `/about`, `/qauth`, `/qauth/docs`, `/qauth/demo`, and all
  tag hubs; replaced per-build `new Date()` lastmod with honest, stable dates.
- ✅ **FAQ schema scoped to the homepage** — was injected on every blog post (invalid FAQ items).
- ✅ **Removed `Offer`/`Product` markup** from `/qauth` and `/quantum-shield` (fixed the invalid
  merchant listing).
- ✅ **FOMOA cluster consolidated** 13 → 3 pillars with 301 redirects (less thin/duplicate content).
- ✅ **9 new original posts** with internal links into existing clusters.
- ✅ **IndexNow** expanded to all URLs + a GitHub Action that pings Bing/Yandex on content changes.

## Manual steps in Google Search Console (do these after deploy)

> Google ignores IndexNow, so Google indexing is driven entirely by the steps below.

1. **Resubmit the sitemap.** Sitemaps → enter `sitemap.xml` → Submit. Confirm the discovered
   URL count jumped (static pages + tag hubs are new).
2. **Request indexing for the strongest pages first.** URL Inspection → paste URL → Request
   Indexing. Prioritise (≈10–15/day, GSC rate-limits this):
   - Homepage, `/blog`, `/about`
   - The 9 new posts (see `git log`/`content/blog` for the latest slugs)
   - The 3 FOMOA pillars
   - Top existing posts: database-connection-pooling, apache-vs-nginx, quantum-computing guides
3. **Validate the redirects.** Spot-check a couple of retired FOMOA URLs (e.g.
   `/blog/india-first-ai-search-engine-fomoa`) — they must 301 to a pillar, not 404.
4. **Fix the enhancement reports.** Once the new build is live:
   - FAQ report → **Validate Fix** (FAQ now only on the homepage).
   - Merchant listings report → **Validate Fix** (Product/Offer markup removed).
5. **Check the Pages report weekly.** Watch "Crawled – currently not indexed" and
   "Discovered – currently not indexed" trend down as internal linking takes effect.

## Validate structured data

Run these through the [Rich Results Test](https://search.google.com/test/rich-results):

- `https://www.tusharagrawal.in/` → FAQ valid, Person/Profile valid.
- Any blog post → BlogPosting + Breadcrumb valid, **no FAQ** present.
- `https://www.tusharagrawal.in/qauth` → SoftwareSourceCode valid, **no merchant-listing error**.

## Realistic expectations

- New-site indexing is gradual — Google indexes large content sets over **weeks**, not days,
  and weighs site authority heavily. Internal linking + steady fresh content is the long game.
- IndexNow benefits **Bing/Yandex** quickly; it does nothing for Google.
- Don't mass-request indexing for thin/near-duplicate pages — quality over quantity. The FOMOA
  consolidation was specifically to raise the average page quality.

## Ongoing hygiene (each new post)

- [ ] Unique title (<60 chars effective) + meta description (~150 chars).
- [ ] 3–5 internal links to related existing posts, and at least one link *back* from an older post.
- [ ] Tags that map to existing tag hubs where possible (keeps the graph dense).
- [ ] Real `date` (and `updated` when materially revised).
- [ ] After deploy: Request Indexing in GSC for the new URL.
