---
title: "Deep Research Mode: Multi-Hop AI Research Explained with FOMOA"
description: "FOMOA's deep research follows leads across 3 hops, detects conflicts between sources, and synthesizes comprehensive reports. Perfect for journalists and researchers."
date: "2026-01-23"
author: "Tushar Agrawal"
tags: ["AI Research Tool", "Automated Research", "Deep Research AI", "FOMOA", "Multi-Hop Search", "Research Automation", "Information Synthesis"]
image: "https://images.unsplash.com/photo-1456324504439-367cee3b3c32?w=1200&h=630&fit=crop"
published: true
---

## What is Multi-Hop Research?

Traditional search gives you a list of links. You read them, find mentions of other sources, search for those, read more, and eventually piece together a complete picture.

**Multi-hop research automates this entire process.**

FOMOA's Deep Research mode doesn't just search once - it follows leads from initial results, extracts key entities, searches for more information about those entities, and synthesizes everything into a comprehensive answer.

## How Multi-Hop Research Works

```
Traditional Search (Single Hop)
================================

Query: "Impact of UPI on Indian economy"
       ↓
   Single search
       ↓
   10 results
       ↓
   Manual reading required
       ↓
   User follows links manually
       ↓
   Hours of work


FOMOA Deep Research (Multi-Hop)
================================

Query: "Impact of UPI on Indian economy"
       ↓
   Query Expansion (5 related queries)
       ↓
   Parallel Search (all 5 queries)
       ↓
   Entity Extraction (NPCI, RBI, PhonePe...)
       ↓
   Follow-up Search (deep dive on entities)
       ↓
   Conflict Detection (flag contradictions)
       ↓
   Synthesis (structured report)
       ↓
   60 seconds total
```

## Three Research Depths

FOMOA offers three research intensities:

### 1. Quick Mode (5 seconds)

```
Configuration:
- Queries: 2
- Hops: 1
- Sources: ~10

Best for:
- Factual lookups
- Quick verifications
- Simple questions

Example: "What is NPCI?"
```

### 2. Normal Mode (15 seconds)

```
Configuration:
- Queries: 4
- Hops: 2
- Sources: ~25

Best for:
- Background research
- Topic overviews
- Comparison queries

Example: "Compare UPI with international payment systems"
```

### 3. Deep Mode (60 seconds)

```
Configuration:
- Queries: 6
- Hops: 3
- Sources: ~50

Best for:
- Comprehensive research
- Investigative journalism
- Academic papers
- Complex policy analysis

Example: "Impact of UPI on Indian economy including
          rural adoption, merchant digitization,
          and international expansion plans"
```

## The Research Process: Step by Step

Let's trace a real research query through FOMOA's system:

### Query: "Impact of UPI on Indian economy 2024"

```
STEP 1: Query Expansion
=======================
Original: "Impact of UPI on Indian economy 2024"

Generated queries:
├── "UPI transaction volume growth 2024 statistics"
├── "UPI impact on cash transactions India RBI data"
├── "UPI merchant adoption rate small businesses"
├── "UPI international expansion NPCI plans"
├── "Digital payments GDP contribution India"
└── "UPI vs cash economy percentage 2024"
```

```
STEP 2: Parallel Search
=======================
All 6 queries searched simultaneously

Sources found:
├── rbi.org.in/digitalpaymentsstatistics
├── npci.org.in/statistics
├── pib.gov.in/PressRelease
├── economictimes.com/tech/UPI
├── livemint.com/fintech
├── moneycontrol.com/digital-payments
├── businesstoday.in/UPI
├── thehindu.com/business/Economy
├── worldbank.org/india/digitalpayments
└── imf.org/india/fintech
```

```
STEP 3: Entity Extraction
=========================
Key entities identified:

Organizations:
├── NPCI (National Payments Corporation of India)
├── RBI (Reserve Bank of India)
├── PhonePe, Google Pay, Paytm (UPI apps)
└── SEBI (market impact)

Metrics:
├── Transaction volume: 14 billion/month
├── Transaction value: ₹20 lakh crore/month
├── Active users: 350 million
└── Merchant QR codes: 320 million

Policies:
├── UPI Lite
├── UPI 123PAY (feature phones)
└── UPI Global (international)
```

```
STEP 4: Follow-up Search (Hop 2)
================================
Deep dive on extracted entities:

Search: "NPCI UPI international expansion 2024"
→ Found: Singapore, UAE, France, UK partnerships

Search: "UPI merchant digitization rural India"
→ Found: 67% growth in tier-3/4 cities

Search: "RBI digital payment statistics 2024"
→ Found: Official transaction data

Search: "UPI impact on cash economy"
→ Found: Cash-to-GDP ratio declining
```

```
STEP 5: Hop 3 (Deep Mode Only)
==============================
Third-level exploration:

From NPCI international data:
├── Search: "UPI Singapore launch statistics"
├── Search: "UPI UAE remittance impact"
└── Search: "NPCI France partnership details"

From rural digitization data:
├── Search: "PM SVANidhi UPI adoption"
├── Search: "Kirana store digital payment growth"
└── Search: "Rural internet penetration UPI"
```

```
STEP 6: Conflict Detection
==========================
Checking for contradictions:

Source A (News): "UPI transactions: 12 billion/month"
Source B (NPCI): "UPI transactions: 14.05 billion/month"
→ FLAG: Possible outdated data in Source A

Source C (Blog): "UPI market share: 85%"
Source D (RBI): "UPI market share: 67% by volume"
→ FLAG: Different metrics (volume vs value)

Resolution: Prioritize official sources (RBI, NPCI)
Note: Flag discrepancies in output
```

```
STEP 7: Synthesis
=================
Structured output generation:

{
  "summary": "UPI has transformed India's payment landscape...",
  "key_findings": [
    {
      "finding": "Transaction volume reached 14 billion/month",
      "source": "npci.org.in",
      "confidence": "high"
    },
    ...
  ],
  "statistics": {...},
  "conflicting_data": [...],
  "sources_used": [...],
  "further_reading": [...]
}
```

## API Usage

```python
import requests

def deep_research(query: str, depth: str = "normal") -> dict:
    """
    Perform multi-hop research with FOMOA

    Args:
        query: Research topic
        depth: "quick" (5s), "normal" (15s), or "deep" (60s)

    Returns:
        Structured research report
    """
    response = requests.post(
        "https://fomoa.cloud/api/research",
        json={
            "query": query,
            "depth": depth,
            "include_sources": True,
            "detect_conflicts": True,
            "language": "auto"  # Auto-detect Hindi/English
        },
        headers={"Authorization": "Bearer your_api_key"}
    )

    return response.json()

# Example usage
result = deep_research(
    "Impact of UPI on Indian economy 2024",
    depth="deep"
)

print(f"Summary: {result['summary']}")
print(f"Sources consulted: {len(result['sources'])}")
print(f"Conflicts detected: {len(result['conflicts'])}")
```

## Response Structure

```json
{
  "query": "Impact of UPI on Indian economy 2024",
  "depth": "deep",
  "processing_time_seconds": 58.3,

  "summary": "UPI has fundamentally transformed India's payment ecosystem, processing over 14 billion transactions monthly valued at ₹20+ lakh crore. Key impacts include...",

  "key_findings": [
    {
      "finding": "Monthly UPI transactions exceeded 14 billion in December 2024",
      "source": {
        "url": "https://npci.org.in/statistics",
        "credibility_score": 0.98
      },
      "confidence": "high"
    },
    {
      "finding": "Rural UPI adoption grew 67% YoY in tier-3/4 cities",
      "source": {
        "url": "https://rbi.org.in/digitalreport",
        "credibility_score": 1.0
      },
      "confidence": "high"
    }
  ],

  "statistics": {
    "transaction_volume": "14.05 billion/month",
    "transaction_value": "₹20.64 lakh crore/month",
    "active_users": "350 million",
    "merchant_qr_codes": "320 million",
    "source": "NPCI December 2024"
  },

  "entities_found": [
    {
      "name": "NPCI",
      "type": "organization",
      "relevance_score": 0.95,
      "brief": "National Payments Corporation of India, operates UPI"
    },
    {
      "name": "UPI Lite",
      "type": "product",
      "relevance_score": 0.82,
      "brief": "Offline-capable small-value UPI transactions"
    }
  ],

  "conflicts_detected": [
    {
      "topic": "UPI market share percentage",
      "source_a": {
        "claim": "85% of digital payments",
        "url": "finance-blog.com",
        "credibility": 0.55
      },
      "source_b": {
        "claim": "67% by volume, 45% by value",
        "url": "rbi.org.in",
        "credibility": 1.0
      },
      "resolution": "RBI data more reliable; blog may use different metric"
    }
  ],

  "timeline": [
    {
      "date": "2016",
      "event": "UPI launched by NPCI"
    },
    {
      "date": "2024",
      "event": "14 billion monthly transactions milestone"
    }
  ],

  "sources_used": [
    {
      "url": "https://npci.org.in/statistics",
      "title": "NPCI UPI Statistics",
      "credibility_score": 0.98,
      "used_for": ["transaction_volume", "merchant_data"]
    }
  ],

  "further_reading": [
    {
      "topic": "UPI International Expansion",
      "suggested_query": "UPI global NPCI international partnerships 2024"
    }
  ],

  "language_detected": "english",
  "total_sources_analyzed": 47,
  "hops_completed": 3
}
```

## Real-World Use Cases

### For Journalists

```
Query: "Adani group controversy timeline 2023-2024"

FOMOA Deep Research provides:
- Chronological timeline with dates
- Multiple source perspectives
- Stock price impact data
- Official company responses
- SEBI investigation updates
- Conflict flags where reports differ
```

### For Researchers

```
Query: "Climate change impact on Indian agriculture"

Output includes:
- ICAR research citations
- Government policy responses
- Crop yield statistics by region
- Farmer adaptation strategies
- International comparison data
- Academic paper summaries
```

### For Students

```
Query: "Indian Independence Movement key events"

Structured output:
- Timeline from 1857-1947
- Key figures with brief bios
- Important dates and events
- Multiple perspectives (Indian/British)
- Source citations for papers
```

### For Policy Analysts

```
Query: "Comparison of healthcare schemes - Ayushman Bharat vs state schemes"

Comprehensive analysis:
- Coverage comparison table
- Beneficiary statistics
- Implementation challenges
- Budget allocations
- Success metrics by state
- Expert opinions
```

## Comparison with Single-Search AI

```
Query: "EV policy India 2026"

Single Search (ChatGPT/Perplexity):
==================================
- Generic overview
- May miss recent updates
- No conflict detection
- Single perspective
- Limited source diversity
- 2-3 second response


FOMOA Deep Research:
====================
- Central + State policy breakdown
- FAME II subsidy details
- PLI scheme for batteries
- State-wise incentive comparison
- Industry response data
- Recent policy amendments
- Conflicting projections flagged
- 47 sources consulted
- 60 second response
```

## Best Practices for Deep Research

### 1. Frame Specific Queries

```
Poor query: "Tell me about startups"
→ Too broad, unfocused results

Good query: "Indian AI startups funding trends 2024 Bangalore"
→ Specific, actionable research output
```

### 2. Use Appropriate Depth

```
Quick (5s): Factual questions
- "What is SEBI's role?"
- "When was RBI founded?"

Normal (15s): Topic overviews
- "Compare UPI and IMPS"
- "Overview of PLI schemes"

Deep (60s): Comprehensive research
- "Analysis of India's renewable energy policy"
- "Impact of GST on small businesses"
```

### 3. Review Conflicts

```python
# Always check for conflicting information
result = deep_research("GST collection growth 2024")

if result['conflicts_detected']:
    print("⚠️ Conflicting data found:")
    for conflict in result['conflicts_detected']:
        print(f"  Topic: {conflict['topic']}")
        print(f"  Resolution: {conflict['resolution']}")
```

## Rate Limits for Research API

```
Research Depth     Rate Limit     Typical Response Time
--------------     ----------     --------------------
Quick              60/minute      3-5 seconds
Normal             30/minute      12-18 seconds
Deep               10/minute      45-75 seconds

Note: Deep research consumes more resources
      and has stricter rate limits
```

---

Transform hours of manual research into 60-second comprehensive reports.

Try FOMOA's Deep Research at [fomoa.cloud](https://fomoa.cloud).

*Building research tools or need custom depth configurations? Connect on [LinkedIn](https://www.linkedin.com/in/tushar-agrawal-91b67a28a).*

## Related Articles

- [Understanding Source Credibility: How FOMOA Ranks Results](/blog/fomoa-source-credibility-ranking-system)
- [FOMOA vs Exa.ai: Free India-Optimized Alternative](/blog/fomoa-vs-exa-ai-comparison)
- [Building AI APIs: FOMOA's OpenAI-Compatible Endpoint](/blog/fomoa-openai-compatible-api-developers)
- [Finding Indian Government Schemes with AI](/blog/indian-government-schemes-ai-search)
