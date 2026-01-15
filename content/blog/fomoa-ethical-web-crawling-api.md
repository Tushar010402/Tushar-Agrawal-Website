---
title: "Ethical Web Crawling: How FOMOA Extracts Website Content Responsibly"
description: "FOMOA's /api/crawl respects robots.txt, rate limits to 2 req/sec, and extracts clean text. Exa Crawl alternative with ethical principles built-in."
date: "2025-01-24"
author: "Tushar Agrawal"
tags: ["Web Crawler API", "Website Scraper", "Content Extraction", "FOMOA", "Ethical Scraping", "Data Collection", "API", "SEO Audit"]
image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&h=630&fit=crop"
published: true
---

## Web Crawling Done Right

Web crawling powers everything from search engines to competitive analysis tools. But irresponsible crawling can:

- Overload servers and cause outages
- Violate website terms of service
- Scrape content without attribution
- Ignore robots.txt directives

FOMOA's crawl API is built with **ethical principles first** - you get powerful content extraction while respecting website owners.

## Ethical Crawling Principles

```
FOMOA Crawl Ethics
==================

1. Respects robots.txt ✓
   └── Never crawls disallowed paths

2. Rate limited by default ✓
   └── 2 requests/second max (configurable lower)

3. Identifies itself clearly ✓
   └── User-Agent: "FOMOABot/1.0 (+https://fomoa.cloud/bot)"

4. Sitemap-first approach ✓
   └── Uses sitemap.xml for efficient discovery

5. No session hijacking ✓
   └── Doesn't bypass authentication

6. Respects noindex/nofollow ✓
   └── Honors meta robot directives
```

## API Overview

```python
import requests

response = requests.post(
    "https://fomoa.cloud/api/crawl",
    json={
        "url": "https://example.com",
        "max_pages": 10,
        "extract": ["text", "links", "meta"],
        "respect_robots": True,  # Default: True
        "rate_limit": 2          # Requests per second
    },
    headers={"Authorization": "Bearer your_key"}
)

result = response.json()
```

## What Gets Extracted

### Clean Text Content

```python
# Raw HTML → Clean text transformation

# Before (raw HTML):
"""
<div class="article">
  <script>analytics.track('pageview')</script>
  <h1>Understanding GST</h1>
  <p>GST, or Goods and Services Tax, was introduced in India on
  <span class="date">July 1, 2017</span>.</p>
  <style>.date { color: blue; }</style>
  <div class="ad">Buy our GST software!</div>
</div>
"""

# After (FOMOA extraction):
{
  "title": "Understanding GST",
  "content": "GST, or Goods and Services Tax, was introduced in India on July 1, 2017.",
  "word_count": 15,
  "reading_time_minutes": 1
}

# Removed:
# - Scripts
# - Styles
# - Ads
# - Navigation elements
# - Boilerplate text
```

### Link Extraction

```json
{
  "url": "https://example.com/gst-guide",
  "links": {
    "internal": [
      {"href": "/income-tax", "text": "Income Tax Guide"},
      {"href": "/tds-rules", "text": "TDS Rules 2025"}
    ],
    "external": [
      {"href": "https://gst.gov.in", "text": "Official GST Portal"},
      {"href": "https://cbic.gov.in", "text": "CBIC Website"}
    ]
  }
}
```

### Meta Information

```json
{
  "url": "https://example.com/article",
  "meta": {
    "title": "Complete Guide to Income Tax Filing 2025",
    "description": "Step-by-step guide to filing ITR for FY 2024-25",
    "og_title": "Income Tax Filing Guide | Example.com",
    "og_image": "https://example.com/images/itr-guide.jpg",
    "canonical": "https://example.com/article",
    "author": "Tax Expert",
    "published_date": "2025-01-15",
    "modified_date": "2025-01-20"
  }
}
```

## Crawl Configurations

### Single Page Extraction

```python
# Just extract one page
response = requests.post(
    "https://fomoa.cloud/api/crawl",
    json={
        "url": "https://example.com/specific-page",
        "max_pages": 1,
        "extract": ["text", "meta"]
    }
)
```

### Site-Wide Crawl

```python
# Crawl multiple pages from a domain
response = requests.post(
    "https://fomoa.cloud/api/crawl",
    json={
        "url": "https://example.com",
        "max_pages": 50,  # Limit: 50 pages per request
        "include_patterns": ["/blog/*", "/guides/*"],
        "exclude_patterns": ["/admin/*", "/login"],
        "extract": ["text", "links", "meta"]
    }
)
```

### Sitemap-Based Crawl

```python
# Use sitemap for efficient discovery
response = requests.post(
    "https://fomoa.cloud/api/crawl",
    json={
        "url": "https://example.com",
        "use_sitemap": True,
        "max_pages": 50,
        "sitemap_url": "https://example.com/sitemap.xml"  # Optional
    }
)

# Benefits:
# - Discovers all pages efficiently
# - Gets lastmod dates from sitemap
# - Fewer requests needed
# - Respects priority hints
```

## Response Structure

```json
{
  "crawl_id": "crawl_abc123",
  "status": "completed",
  "started_at": "2025-01-24T10:00:00Z",
  "completed_at": "2025-01-24T10:00:45Z",
  "duration_seconds": 45,

  "summary": {
    "pages_requested": 20,
    "pages_crawled": 18,
    "pages_blocked": 2,
    "total_content_chars": 125000
  },

  "robots_txt_status": "respected",
  "blocked_by_robots": [
    "/admin/settings",
    "/private/data"
  ],

  "pages": [
    {
      "url": "https://example.com/",
      "status": 200,
      "crawled_at": "2025-01-24T10:00:05Z",
      "title": "Example Company - Homepage",
      "meta": {
        "description": "Leading provider of...",
        "og_title": "Example Company"
      },
      "content": {
        "text": "Welcome to Example Company. We provide...",
        "word_count": 450,
        "reading_time": 2
      },
      "links": {
        "internal_count": 15,
        "external_count": 3
      }
    }
  ]
}
```

## Use Cases

### Content Aggregation for Research

```python
def aggregate_news_content(topic: str, sources: list) -> list:
    """
    Aggregate content about a topic from multiple news sources
    """
    articles = []

    for source in sources:
        response = requests.post(
            "https://fomoa.cloud/api/crawl",
            json={
                "url": source,
                "max_pages": 10,
                "include_patterns": [f"*{topic}*"],
                "extract": ["text", "meta"]
            },
            headers={"Authorization": "Bearer your_key"}
        )

        for page in response.json()["pages"]:
            articles.append({
                "source": source,
                "title": page["title"],
                "content": page["content"]["text"][:5000],
                "url": page["url"]
            })

    return articles

# Example usage
upi_articles = aggregate_news_content(
    topic="UPI",
    sources=[
        "https://economictimes.com",
        "https://livemint.com",
        "https://moneycontrol.com"
    ]
)
```

### Competitive Analysis

```python
def analyze_competitor(competitor_url: str) -> dict:
    """
    Extract competitor website structure and content themes
    """
    response = requests.post(
        "https://fomoa.cloud/api/crawl",
        json={
            "url": competitor_url,
            "max_pages": 50,
            "use_sitemap": True,
            "extract": ["text", "links", "meta"]
        },
        headers={"Authorization": "Bearer your_key"}
    )

    data = response.json()

    analysis = {
        "total_pages": len(data["pages"]),
        "content_themes": extract_themes(data["pages"]),
        "product_pages": find_product_pages(data["pages"]),
        "blog_frequency": analyze_blog_frequency(data["pages"]),
        "internal_linking": analyze_link_structure(data["pages"])
    }

    return analysis
```

### SEO Auditing

```python
def seo_audit(website_url: str) -> dict:
    """
    Perform basic SEO audit on a website
    """
    response = requests.post(
        "https://fomoa.cloud/api/crawl",
        json={
            "url": website_url,
            "max_pages": 50,
            "extract": ["text", "links", "meta"]
        },
        headers={"Authorization": "Bearer your_key"}
    )

    pages = response.json()["pages"]
    issues = []

    for page in pages:
        # Check title length
        if len(page.get("title", "")) < 30:
            issues.append({
                "url": page["url"],
                "issue": "Title too short",
                "severity": "warning"
            })

        # Check meta description
        if not page.get("meta", {}).get("description"):
            issues.append({
                "url": page["url"],
                "issue": "Missing meta description",
                "severity": "error"
            })

        # Check for thin content
        if page.get("content", {}).get("word_count", 0) < 300:
            issues.append({
                "url": page["url"],
                "issue": "Thin content (< 300 words)",
                "severity": "warning"
            })

    return {
        "pages_audited": len(pages),
        "issues_found": len(issues),
        "issues": issues
    }
```

### Data Collection for ML

```python
def collect_training_data(category: str, urls: list) -> list:
    """
    Collect content for ML training datasets
    """
    samples = []

    for url in urls:
        response = requests.post(
            "https://fomoa.cloud/api/crawl",
            json={
                "url": url,
                "max_pages": 30,
                "extract": ["text"]
            },
            headers={"Authorization": "Bearer your_key"}
        )

        for page in response.json()["pages"]:
            content = page.get("content", {}).get("text", "")
            if len(content) > 500:  # Quality filter
                samples.append({
                    "text": content,
                    "category": category,
                    "source": page["url"]
                })

    return samples
```

## Handling Edge Cases

### JavaScript-Rendered Content

```python
# For JavaScript-heavy sites, enable rendering
response = requests.post(
    "https://fomoa.cloud/api/crawl",
    json={
        "url": "https://spa-website.com",
        "render_js": True,  # Enables headless browser
        "wait_for": "networkidle",  # Wait for all requests
        "max_pages": 10
    }
)

# Note: JS rendering is slower and has lower limits
# Limit: 10 pages per request with render_js=True
```

### Handling Pagination

```python
# Automatically follow pagination
response = requests.post(
    "https://fomoa.cloud/api/crawl",
    json={
        "url": "https://blog.example.com",
        "follow_pagination": True,
        "pagination_patterns": [
            "/page/{n}",
            "?page={n}"
        ],
        "max_pages": 50
    }
)
```

### Respecting Rate Limits

```python
# Slower crawl for sensitive targets
response = requests.post(
    "https://fomoa.cloud/api/crawl",
    json={
        "url": "https://small-business-site.com",
        "rate_limit": 0.5,  # 1 request per 2 seconds
        "max_pages": 20
    }
)

# Default rate limit: 2 requests/second
# Minimum: 0.1 requests/second (1 per 10 seconds)
# Maximum: 5 requests/second (for robust sites)
```

## Limits and Fair Use

```
FOMOA Crawl Limits
==================

Per Request:
├── Max pages: 50 (default)
├── Max pages with JS: 10
├── Max content per page: 5,000 chars
├── Timeout: 5 minutes

Rate Limits:
├── Crawl requests: 30/minute
├── Pages per day: 5,000
├── Bandwidth: 100MB/day

Ethical Limits:
├── Always respects robots.txt
├── No bypass of authentication
├── No session cookie capture
├── Identifies as bot
```

## Comparison with Alternatives

```
Feature Comparison
==================

Feature              FOMOA    Exa Crawl    Scrapy     Puppeteer
-------              -----    ---------    ------     ---------
Cost                 Free     $5/1K        Free       Free
Managed service      Yes      Yes          No         No
JS rendering         Yes      Yes          Plugin     Yes
robots.txt respect   Auto     Auto         Manual     Manual
Rate limiting        Auto     Auto         Manual     Manual
Clean text extract   Yes      Yes          Manual     Manual
Indian sites tuned   Yes      No           No         No
API simplicity       High     High         Low        Medium
```

## Error Handling

```python
def safe_crawl(url: str) -> dict:
    """
    Crawl with comprehensive error handling
    """
    try:
        response = requests.post(
            "https://fomoa.cloud/api/crawl",
            json={"url": url, "max_pages": 10},
            headers={"Authorization": "Bearer your_key"},
            timeout=300
        )

        if response.status_code == 200:
            return response.json()

        elif response.status_code == 403:
            # Blocked by robots.txt or site policy
            return {"error": "Access denied", "blocked": True}

        elif response.status_code == 429:
            # Rate limited
            retry_after = response.headers.get("Retry-After", 60)
            return {"error": "Rate limited", "retry_after": retry_after}

        else:
            return {"error": f"HTTP {response.status_code}"}

    except requests.Timeout:
        return {"error": "Request timed out"}

    except requests.ConnectionError:
        return {"error": "Connection failed"}
```

---

Web crawling is powerful - but with power comes responsibility. FOMOA's crawl API gives you the extraction capabilities you need while ensuring you're a good citizen of the web.

Try FOMOA's ethical crawling at [fomoa.cloud](https://fomoa.cloud).

*Building a data pipeline or need custom crawling solutions? Connect on [LinkedIn](https://www.linkedin.com/in/tushar-agrawal-91b67a28a).*

## Related Articles

- [FOMOA vs Exa.ai: Free India-Optimized Alternative](/blog/fomoa-vs-exa-ai-comparison)
- [Building AI APIs: FOMOA's OpenAI-Compatible Endpoint](/blog/fomoa-openai-compatible-api-developers)
- [Deep Research Mode: Multi-Hop AI Research Explained](/blog/fomoa-deep-research-multi-hop-ai)
- [Understanding Source Credibility: How FOMOA Ranks Results](/blog/fomoa-source-credibility-ranking-system)
