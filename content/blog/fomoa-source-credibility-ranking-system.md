---
title: "Understanding Source Credibility: How FOMOA Ranks AI Search Results"
description: "Most AI treats Wikipedia same as random blogs. FOMOA's 4-signal ranking system uses semantic relevance, source credibility, content freshness, and domain expertise."
date: "2026-01-13"
author: "Tushar Agrawal"
tags: ["AI Search Ranking", "Source Credibility", "Fact-Checking AI", "FOMOA", "Search Engine", "Information Retrieval", "Trust Scoring"]
image: "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=1200&h=630&fit=crop"
published: true
---

## The Credibility Problem in AI Search

Ask most AI assistants about the "current repo rate in India" and you might get answers citing:

- A 2-year-old finance blog post
- A Quora answer from an anonymous user
- A news article that was accurate when published but is now outdated
- Wikipedia (which might have a 3-month lag)

**The fundamental problem: Most AI search engines treat all sources equally.**

A random blogger's opinion carries the same weight as the Reserve Bank of India's official announcement. This isn't just inconvenient - it's dangerous for financial, medical, and legal queries.

## FOMOA's 4-Signal Ranking System

FOMOA addresses this with a **multi-signal ranking approach** that considers not just what a source says, but who is saying it and when.

```
FOMOA Search Ranking Formula
============================

Final Score = (Semantic Relevance × 0.50) +
              (Source Credibility × 0.25) +
              (Content Freshness × 0.20) +
              (Domain Expertise × 0.05)

Each signal is normalized to 0-1 scale
Final scores range from 0 to 1
```

Let's break down each signal:

### Signal 1: Semantic Relevance (50%)

This is what most search engines focus on exclusively. How well does the content match the query's meaning?

```python
# FOMOA's Semantic Relevance Scoring

from sentence_transformers import CrossEncoder

class SemanticScorer:
    def __init__(self):
        # Cross-encoder model for precise relevance scoring
        self.cross_encoder = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')

    def score(self, query: str, passage: str) -> float:
        """
        Score query-passage relevance using cross-encoder.
        Returns 0-1 score where 1 is perfect match.
        """
        score = self.cross_encoder.predict([(query, passage)])
        # Normalize sigmoid output to 0-1
        return float(score[0])

# Example scores:
# Query: "RBI repo rate January 2026"
# Passage: "RBI announced repo rate at 6.5%..." → 0.95
# Passage: "Interest rates affect loans..." → 0.45
# Passage: "Stock market trends..." → 0.15
```

### Signal 2: Source Credibility (25%)

This is where FOMOA differs fundamentally from competitors. Every source in our index has a **pre-calculated credibility score**.

```
India Source Credibility Database
=================================

Government Sources (Score: 1.0)
├── india.gov.in          → 1.00
├── rbi.org.in            → 1.00
├── sebi.gov.in           → 1.00
├── mca.gov.in            → 1.00
├── incometax.gov.in      → 1.00
├── uidai.gov.in          → 1.00
├── epfindia.gov.in       → 1.00
├── gst.gov.in            → 1.00
├── pib.gov.in            → 1.00
└── All *.gov.in domains  → 0.95-1.00

Premier Institutions (Score: 0.95)
├── IITs (iitb.ac.in, etc.) → 0.95
├── IIMs                     → 0.95
├── ISRO (isro.gov.in)       → 0.98
├── DRDO                     → 0.95
├── AIIMS                    → 0.97
└── NITs                     → 0.93

Quality News Sources (Score: 0.85-0.92)
├── thehindu.com          → 0.92
├── indianexpress.com     → 0.90
├── livemint.com          → 0.90
├── economictimes.com     → 0.88
├── business-standard.com → 0.87
└── ndtv.com              → 0.85

Finance Platforms (Score: 0.80-0.95)
├── nseindia.com          → 0.95
├── bseindia.com          → 0.95
├── moneycontrol.com      → 0.88
├── screener.in           → 0.87
├── valueresearchonline.com → 0.88
└── tickertape.in         → 0.85

Reference Sources (Score: 0.75-0.85)
├── wikipedia.org         → 0.80
├── britannica.com        → 0.85
└── encyclopedia.com      → 0.78

User-Generated Content (Score: 0.40-0.65)
├── Medium.com            → 0.60
├── Quora.com             → 0.50
├── Reddit.com            → 0.55
└── Random blogs          → 0.40-0.55
```

### Signal 3: Content Freshness (20%)

For queries about current events, rates, or policies, recency matters enormously.

```python
# FOMOA's Freshness Scoring Algorithm

from datetime import datetime, timedelta

class FreshnessScorer:
    def __init__(self):
        # Query types that require fresh content
        self.freshness_sensitive_patterns = [
            r'\b(current|latest|today|2024|2026|new|recent)\b',
            r'\b(rate|price|stock|weather|news|election)\b',
            r'\b(announcement|release|update|launched)\b'
        ]

    def calculate_decay(self, published_date: datetime,
                        query_type: str) -> float:
        """
        Calculate freshness score with exponential decay.
        Returns 0-1 where 1 is perfectly fresh.
        """
        age_days = (datetime.now() - published_date).days

        # Different decay rates for different content types
        decay_rates = {
            'news': 0.1,      # 50% decay in ~7 days
            'financial': 0.05, # 50% decay in ~14 days
            'educational': 0.01, # 50% decay in ~70 days
            'reference': 0.005   # 50% decay in ~140 days
        }

        decay_rate = decay_rates.get(query_type, 0.02)
        freshness = math.exp(-decay_rate * age_days)

        return max(0.1, freshness)  # Minimum score of 0.1

# Example freshness scores for "RBI repo rate 2026":
# Published today → 1.00
# Published 7 days ago → 0.70
# Published 30 days ago → 0.22
# Published 1 year ago → 0.10 (minimum)
```

### Signal 4: Domain Expertise (5%)

For specialized queries, we boost sources with domain expertise:

```
Domain Expertise Matching
=========================

Query Domain        Boosted Sources
------------        ---------------
Medical/Health      AIIMS, WHO, NIH, verified medical portals
Legal               india.gov.in/legal, Supreme Court, Bar Council
Finance             RBI, SEBI, NSE, BSE, certified financial sites
Education           UGC, AICTE, university domains
Technology          IEEE, ACM, tech documentation sites
Agriculture         ICAR, agriculture.gov.in, KVK portals
```

## Real-World Ranking Example

Let's trace how FOMOA ranks results for: **"What is the current repo rate in India?"**

```
Search Results Before Ranking
=============================

Result 1: "RBI keeps repo rate unchanged at 6.5% - PIB"
├── Source: pib.gov.in
├── Published: January 2026
└── Content: Official press release

Result 2: "Understanding Repo Rate and Its Impact"
├── Source: bankbazaar.com
├── Published: March 2024
└── Content: Educational article

Result 3: "Repo rate explained - Quora answer"
├── Source: quora.com
├── Published: August 2023
└── Content: User explanation

Result 4: "RBI monetary policy - Wikipedia"
├── Source: wikipedia.org
├── Published: Updated December 2024
└── Content: Encyclopedia entry

Result 5: "Interest rates in 2026 - Finance Blog"
├── Source: personalfinanceblog.xyz
├── Published: January 2026
└── Content: Opinion piece
```

```
FOMOA Ranking Calculation
=========================

Result 1 (PIB Official):
├── Semantic: 0.95 × 0.50 = 0.475
├── Credibility: 1.00 × 0.25 = 0.250
├── Freshness: 1.00 × 0.20 = 0.200
├── Domain: 0.90 × 0.05 = 0.045
└── TOTAL: 0.970 ★ (Ranked #1)

Result 4 (Wikipedia):
├── Semantic: 0.80 × 0.50 = 0.400
├── Credibility: 0.80 × 0.25 = 0.200
├── Freshness: 0.85 × 0.20 = 0.170
├── Domain: 0.70 × 0.05 = 0.035
└── TOTAL: 0.805 (Ranked #2)

Result 2 (BankBazaar):
├── Semantic: 0.75 × 0.50 = 0.375
├── Credibility: 0.75 × 0.25 = 0.187
├── Freshness: 0.40 × 0.20 = 0.080
├── Domain: 0.80 × 0.05 = 0.040
└── TOTAL: 0.682 (Ranked #3)

Result 5 (Random Blog):
├── Semantic: 0.70 × 0.50 = 0.350
├── Credibility: 0.45 × 0.25 = 0.112
├── Freshness: 1.00 × 0.20 = 0.200
├── Domain: 0.30 × 0.05 = 0.015
└── TOTAL: 0.677 (Ranked #4)

Result 3 (Quora):
├── Semantic: 0.60 × 0.50 = 0.300
├── Credibility: 0.50 × 0.25 = 0.125
├── Freshness: 0.25 × 0.20 = 0.050
├── Domain: 0.40 × 0.05 = 0.020
└── TOTAL: 0.495 (Ranked #5)
```

**Notice how the fresh but uncredible blog (Result 5) doesn't beat older but credible sources (Wikipedia, BankBazaar).**

## How We Build the Credibility Database

Our source credibility scores aren't arbitrary. They're based on:

```
Credibility Scoring Methodology
===============================

1. Institutional Authority (40%)
   - Government domain (.gov.in) → automatic 0.95+
   - Academic institutions (.ac.in, .edu) → 0.85-0.95
   - Registered news organizations → 0.80-0.92
   - Commercial entities → 0.60-0.85

2. Editorial Standards (25%)
   - Correction policy exists? (+0.05)
   - Named authors? (+0.03)
   - Source citations? (+0.05)
   - Fact-checking process? (+0.07)

3. Historical Accuracy (20%)
   - Track record on factual claims
   - Retraction frequency
   - Verification from other sources

4. Domain Registration & History (15%)
   - Domain age
   - WHOIS transparency
   - SSL certificate
   - Known affiliations
```

### Indian Government Domains: Automatic Trust

All `.gov.in` domains receive automatic high credibility:

```
Government Domain Hierarchy
===========================

Central Government: 1.00
├── *.gov.in (ministry sites)
├── rbi.org.in (special status)
└── sebi.gov.in (special status)

State Governments: 0.95
├── *.state.gov.in
└── *.gov.in (state variants)

Public Sector: 0.90-0.95
├── PSU websites
└── Government corporations

Semi-Government: 0.85-0.90
├── Autonomous bodies
└── Statutory organizations
```

## Query-Adaptive Weighting

For different query types, FOMOA adjusts signal weights:

```
Dynamic Weight Adjustment
=========================

Query Type          Semantic   Credibility   Freshness   Domain
----------          --------   -----------   ---------   ------
Breaking news        0.35        0.25          0.35       0.05
Financial data       0.40        0.30          0.25       0.05
Medical advice       0.35        0.35          0.15       0.15
Historical facts     0.55        0.25          0.10       0.10
Legal questions      0.35        0.35          0.15       0.15
Technical docs       0.50        0.20          0.20       0.10
Government schemes   0.40        0.35          0.20       0.05
Default              0.50        0.25          0.20       0.05
```

```python
# Query type detection for weight adjustment

def adjust_weights_for_query(query: str) -> dict:
    """
    Dynamically adjust ranking weights based on query type.
    """
    weights = {
        'semantic': 0.50,
        'credibility': 0.25,
        'freshness': 0.20,
        'domain': 0.05
    }

    # News queries need freshness
    if re.search(r'\b(latest|today|breaking|news|current)\b', query, re.I):
        weights['freshness'] = 0.35
        weights['semantic'] = 0.35

    # Medical queries need credibility
    if re.search(r'\b(symptom|treatment|medicine|doctor|health)\b', query, re.I):
        weights['credibility'] = 0.35
        weights['domain'] = 0.15
        weights['freshness'] = 0.15

    # Financial queries need both freshness and credibility
    if re.search(r'\b(rate|price|stock|mutual fund|tax)\b', query, re.I):
        weights['credibility'] = 0.30
        weights['freshness'] = 0.25

    return weights
```

## Transparency: See Why Results Are Ranked

FOMOA can show you exactly why each result is ranked where it is:

```json
{
  "query": "income tax slab 2026-26",
  "results": [
    {
      "title": "Income Tax Slabs FY 2026-26 - Income Tax Department",
      "url": "https://incometax.gov.in/slabs-2026-26",
      "rank": 1,
      "scores": {
        "semantic_relevance": 0.96,
        "source_credibility": 1.00,
        "content_freshness": 0.98,
        "domain_expertise": 0.95,
        "final_score": 0.972
      },
      "explanation": "Official government source with exact match query terms, published this month"
    },
    {
      "title": "New Tax Slabs 2026: Complete Guide",
      "url": "https://cleartax.in/tax-slabs-2026",
      "rank": 2,
      "scores": {
        "semantic_relevance": 0.92,
        "source_credibility": 0.85,
        "content_freshness": 0.95,
        "domain_expertise": 0.88,
        "final_score": 0.905
      },
      "explanation": "Trusted tax platform with comprehensive coverage, very recent"
    }
  ]
}
```

## Handling Conflicting Information

When sources conflict, FOMOA applies additional logic:

```
Conflict Resolution Strategy
============================

Scenario: Two sources give different repo rates

Source A (RBI.org.in): "Repo rate is 6.5%"
Source B (Blog): "Repo rate is 6.25%"

Resolution Steps:
1. Compare credibility scores → RBI wins (1.0 vs 0.45)
2. Check publication dates → Both recent
3. Cross-reference third source → PIB confirms 6.5%
4. Flag conflict in response

FOMOA Response:
"The repo rate is 6.5% as per RBI's latest announcement.
Note: Some sources may show outdated rates. Always verify
with rbi.org.in for current rates."
```

## API Access to Credibility Scores

Developers can access our credibility database:

```python
# Access FOMOA's credibility scoring API

import requests

def get_source_credibility(url: str) -> dict:
    """
    Get credibility score for any URL
    """
    response = requests.post(
        "https://fomoa.cloud/api/credibility",
        json={"url": url}
    )

    return response.json()

# Example response:
# {
#     "url": "https://rbi.org.in/...",
#     "domain": "rbi.org.in",
#     "credibility_score": 1.00,
#     "category": "government",
#     "factors": {
#         "institutional_authority": 1.00,
#         "editorial_standards": 0.95,
#         "historical_accuracy": 1.00,
#         "domain_trust": 1.00
#     },
#     "last_verified": "2026-01-22"
# }
```

## Why This Matters

In an age of misinformation, **source credibility is not optional** - it's essential.

FOMOA's ranking system ensures:
- Government sources are prioritized for policy queries
- Medical queries surface verified health information
- Financial data comes from authoritative institutions
- Educational content from recognized academic sources

**The goal isn't just finding relevant information - it's finding trustworthy information.**

---

Experience credibility-aware AI search at [fomoa.cloud](https://fomoa.cloud).

*Building applications that need trusted information sources? Let's discuss on [LinkedIn](https://www.linkedin.com/in/tushar-agrawal-91b67a28a).*

## Related Articles

- [Why Indian Users Need an India-First AI Search Engine](/blog/india-first-ai-search-engine-fomoa)
- [FOMOA vs Exa.ai: Free India-Optimized Alternative](/blog/fomoa-vs-exa-ai-comparison)
- [Deep Research Mode: Multi-Hop AI Research Explained](/blog/fomoa-deep-research-multi-hop-ai)
- [Building AI APIs: FOMOA's OpenAI-Compatible Endpoint](/blog/fomoa-openai-compatible-api-developers)
