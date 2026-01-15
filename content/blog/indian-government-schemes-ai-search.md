---
title: "Finding Indian Government Schemes with AI: Complete Guide to FOMOA Yojana Search"
description: "India has 100+ central and 1000+ state schemes. FOMOA's entity search finds PM-KISAN, Ayushman Bharat, and more with eligibility, benefits, and official links."
date: "2026-01-14"
author: "Tushar Agrawal"
tags: ["Government Schemes India", "PM Schemes Search", "Yojana Finder", "FOMOA", "Sarkari Yojana", "Welfare Schemes", "Digital India"]
image: "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=1200&h=630&fit=crop"
published: true
---

## The Government Scheme Discovery Problem

India runs one of the world's largest welfare programs. But finding the right scheme for your situation is overwhelming:

- **100+ Central Government schemes** across 50+ ministries
- **1000+ State-level schemes** varying by region
- Different eligibility criteria for each
- Scattered across dozens of websites
- Information often in bureaucratic language
- Frequent updates and modifications

**FOMOA's entity search solves this** by indexing all major government schemes and making them searchable by beneficiary type, ministry, state, and eligibility criteria.

## Pre-Indexed Government Sources

FOMOA maintains a continuously updated database of official scheme portals:

```
Central Government Scheme Portals
=================================

Multi-Scheme Portals:
├── india.gov.in/schemes
├── myscheme.gov.in (National Portal)
├── pib.gov.in (Press Information Bureau)
└── mygov.in

Financial Assistance:
├── pmjdy.gov.in (Jan Dhan)
├── pmjjby.gov.in (Jeevan Jyoti Insurance)
├── pmsby.gov.in (Suraksha Bima)
└── pmmy.gov.in (Mudra Loans)

Agriculture:
├── pmkisan.gov.in (PM-KISAN)
├── pmfby.gov.in (Fasal Bima)
├── agricoop.nic.in (Agriculture Ministry)
└── mkisan.gov.in (mKisan)

Healthcare:
├── pmjay.gov.in (Ayushman Bharat)
├── esic.gov.in (ESI Corporation)
└── cghs.nic.in (CGHS)

Employment & Skills:
├── pmkvy.gov.in (Skill Development)
├── ncs.gov.in (Career Services)
└── epfindia.gov.in (Provident Fund)

Housing:
├── pmaymis.gov.in (Awas Yojana - Urban)
├── pmayg.nic.in (Awas Yojana - Gramin)
└── ddugjy.gov.in (Rural Electrification)

Women & Child:
├── wcd.nic.in (Women & Child Development)
├── byvp.org.in (Beti Bachao Beti Padhao)
└── wcdpmru.gov.in (Ujjwala Yojana)

Education:
├── scholarships.gov.in (National Scholarship Portal)
├── pmfme.mofpi.gov.in (Food Processing)
└── aishe.gov.in (Higher Education)
```

## Entity Search for Government Schemes

### Basic Scheme Search

```python
import requests

def search_schemes(beneficiary: str = None,
                   ministry: str = None,
                   state: str = None) -> dict:
    """
    Search government schemes by criteria
    """
    response = requests.post(
        "https://fomoa.cloud/api/entities",
        json={
            "entity_type": "govt_scheme",
            "filters": {
                "beneficiary": beneficiary,
                "ministry": ministry,
                "state": state
            },
            "include_details": True
        },
        headers={"Authorization": "Bearer your_key"}
    )
    return response.json()

# Find schemes for farmers
farmer_schemes = search_schemes(beneficiary="farmers")

# Find health schemes in Tamil Nadu
health_schemes = search_schemes(
    ministry="Health",
    state="Tamil Nadu"
)
```

### Response Structure

```json
{
  "query_type": "govt_scheme",
  "filters_applied": {
    "beneficiary": "farmers",
    "state": "Maharashtra"
  },
  "schemes_found": 12,
  "schemes": [
    {
      "name": "PM-KISAN",
      "full_name": "Pradhan Mantri Kisan Samman Nidhi",
      "hindi_name": "प्रधानमंत्री किसान सम्मान निधि",
      "ministry": "Agriculture & Farmers Welfare",
      "launch_date": "2019-02-24",
      "scheme_type": "Central",

      "benefits": {
        "summary": "₹6,000 per year in three installments",
        "amount": 6000,
        "frequency": "4 months",
        "mode": "Direct Bank Transfer (DBT)"
      },

      "eligibility": {
        "target": "Small and marginal farmers",
        "criteria": [
          "Must own cultivable land",
          "Land should be in farmer's name",
          "Not an income tax payer",
          "No family member in government service"
        ],
        "exclusions": [
          "Institutional land holders",
          "Income tax payers",
          "Government employees",
          "Pensioners drawing ₹10,000+/month"
        ]
      },

      "documents_required": [
        "Aadhaar Card",
        "Bank account linked to Aadhaar",
        "Land ownership documents (Khatauni/7/12)",
        "Mobile number linked to Aadhaar"
      ],

      "application_process": {
        "online": "pmkisan.gov.in → New Farmer Registration",
        "offline": "Common Service Center (CSC)",
        "helpline": "155261, 011-24300606"
      },

      "official_links": {
        "main_portal": "https://pmkisan.gov.in",
        "status_check": "https://pmkisan.gov.in/beneficiarystatus",
        "helpline": "https://pmkisan.gov.in/helpline"
      },

      "state_specific_info": {
        "Maharashtra": {
          "nodal_agency": "Agriculture Department, GoM",
          "additional_benefits": "Namo Shetkari Mahasanman Nidhi (₹6,000 extra)",
          "state_portal": "mahadbtmahait.gov.in"
        }
      },

      "last_updated": "2026-01-15",
      "source_credibility": 1.0
    }
  ]
}
```

## Common Search Queries

### By Beneficiary Type

```
FOMOA Beneficiary Categories
============================

"farmers"      → PM-KISAN, Fasal Bima, KCC, PM-KUSUM
"women"        → Ujjwala, Beti Bachao, Mahila Samman
"students"     → Scholarships, PM-YASASVI, INSPIRE
"senior_citizens" → PMVVY, APY, Old Age Pension
"BPL_families" → Ayushman Bharat, Ration Card, Awas
"MSMEs"        → Mudra, Stand-Up India, PMEGP
"SC_ST"        → Post-Matric Scholarship, Venture Capital
"entrepreneurs" → Startup India, PMEGP, Mudra
"disabled"     → UDID, Disability Pension schemes
```

### Real Query Examples

**Query 1: Schemes for farmers in Maharashtra**

```python
result = search_schemes(
    beneficiary="farmers",
    state="Maharashtra"
)

# Returns:
# 1. PM-KISAN (Central) + Namo Shetkari (State top-up)
# 2. PM Fasal Bima Yojana
# 3. Kisan Credit Card
# 4. PM-KUSUM (Solar pumps)
# 5. Mahatma Jyotirao Phule Shetkari Karj Mukti
# 6. Chief Minister's Agricultural Solar Feeder
```

**Query 2: Education scholarships for SC/ST students**

```python
result = requests.post(
    "https://fomoa.cloud/api/entities",
    json={
        "entity_type": "govt_scheme",
        "filters": {
            "category": "education",
            "beneficiary": "SC_ST",
            "scheme_type": "scholarship"
        }
    }
)

# Returns:
# 1. Post-Matric Scholarship (Central Sector)
# 2. Pre-Matric Scholarship for SC Students
# 3. National Fellowship for SC Students
# 4. Top Class Education Scheme
# 5. State-specific scholarships
```

**Query 3: Health insurance schemes for BPL families**

```python
result = requests.post(
    "https://fomoa.cloud/api/entities",
    json={
        "entity_type": "govt_scheme",
        "filters": {
            "ministry": "Health",
            "beneficiary": "BPL_families",
            "benefit_type": "insurance"
        }
    }
)

# Returns:
# 1. Ayushman Bharat PM-JAY (Central)
# 2. State-specific health schemes (CMCHIS - TN, etc.)
# 3. ESIC for informal workers
```

## Natural Language Queries

FOMOA also supports natural language queries in Hindi and Hinglish:

```
Query (Hinglish): "Mere papa ke liye pension scheme chahiye,
                   unki umar 65 hai aur income kam hai"

FOMOA Response:
===============

आपके पिताजी (65 वर्ष, कम आय) के लिए उपलब्ध योजनाएं:

1. राष्ट्रीय वृद्धावस्था पेंशन योजना (IGNOAPS)
   ├── पात्रता: 60+ वर्ष, BPL परिवार
   ├── लाभ: ₹200-500/माह (राज्य अनुसार अलग)
   ├── आवेदन: समाज कल्याण कार्यालय
   └── दस्तावेज: आयु प्रमाण, BPL कार्ड, आधार

2. प्रधानमंत्री वय वंदना योजना (PMVVY)
   ├── पात्रता: 60+ वर्ष, एकमुश्त निवेश
   ├── लाभ: 8% गारंटीड पेंशन
   ├── आवेदन: LIC शाखा
   └── निवेश: ₹1.5 लाख - ₹15 लाख

3. अटल पेंशन योजना (APY)
   ├── पात्रता: 18-40 वर्ष (enrollment age)
   ├── नोट: 65 वर्ष में late, लेकिन बच्चों के लिए उपयोगी

राज्य-विशेष योजनाएं भी देखें (आपका राज्य?)
```

## Use Cases

### For Citizens

```
Scenario: Finding all applicable schemes

User Profile:
- Farmer in UP
- Family of 4
- Income: ₹2 lakh/year
- Owns 2 hectares

FOMOA finds:
├── PM-KISAN (₹6,000/year)
├── UP Kisan Anudan (state)
├── Fasal Bima Yojana
├── Kisan Credit Card
├── Ayushman Bharat (family)
├── PM Awas Yojana Gramin
├── Free LPG Connection (Ujjwala)
├── Free Electricity (PM Surya Ghar)
└── Education scholarships (children)

Total potential benefits: ₹50,000+/year
```

### For NGOs and CSR Teams

```python
# Find schemes to guide beneficiaries

def get_schemes_for_beneficiary(profile: dict) -> list:
    """
    Get all applicable schemes for a beneficiary profile
    """
    schemes = []

    # Base characteristics
    response = requests.post(
        "https://fomoa.cloud/api/entities",
        json={
            "entity_type": "govt_scheme",
            "filters": {
                "state": profile.get("state"),
                "income_limit": profile.get("annual_income"),
                "occupation": profile.get("occupation"),
                "category": profile.get("category")  # SC/ST/OBC/General
            },
            "include_eligibility_check": True
        }
    )

    for scheme in response.json()["schemes"]:
        if check_eligibility(scheme, profile):
            schemes.append({
                "name": scheme["name"],
                "benefit": scheme["benefits"]["summary"],
                "apply_at": scheme["application_process"]["online"]
            })

    return schemes
```

### For Government Employees

```
Scenario: Citizen helpdesk assistant

Query: "Sir, mujhe ghar banana hai, sarkar se madad milegi?"

FOMOA provides instant response:
================================

Pradhan Mantri Awas Yojana (PMAY) के बारे में:

शहरी क्षेत्र (PMAY-Urban):
├── लाभ: ₹2.67 लाख तक सब्सिडी
├── आय सीमा: EWS/LIG/MIG categories
├── आवेदन: pmaymis.gov.in

ग्रामीण क्षेत्र (PMAY-Gramin):
├── लाभ: ₹1.20-1.30 लाख
├── पात्रता: SECC-2011 डेटा आधारित
├── आवेदन: ग्राम पंचायत/ब्लॉक

दस्तावेज: आधार, आय प्रमाण, जमीन दस्तावेज

Helpdesk can provide complete guidance instantly
```

## Scheme Update Tracking

FOMOA tracks scheme modifications:

```json
{
  "scheme": "PM-KISAN",
  "recent_updates": [
    {
      "date": "2024-06-15",
      "update": "18th installment released",
      "details": "₹2,000 credited to 9.3 crore beneficiaries"
    },
    {
      "date": "2024-02-01",
      "update": "Budget allocation increased",
      "details": "₹60,000 crore allocated for FY 2024-25"
    }
  ],
  "upcoming_changes": [
    {
      "expected": "2026-02",
      "change": "Possible increase in amount (Budget 2026)"
    }
  ]
}
```

## Integration Example: Scheme Eligibility Chatbot

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://fomoa.cloud/v1",
    api_key="your_key"
)

def scheme_eligibility_chat(user_message: str, context: dict = None):
    """
    Interactive chatbot for scheme eligibility
    """
    system_prompt = """
    You are a government scheme eligibility assistant for India.
    Help users find schemes they qualify for.
    Ask relevant questions to determine eligibility.
    Provide official portal links for applications.
    Respond in the user's language (Hindi/English/Hinglish).
    """

    response = client.chat.completions.create(
        model="fomoa",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ],
        tools=[{
            "type": "function",
            "function": {
                "name": "search_schemes",
                "description": "Search government schemes",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "beneficiary": {"type": "string"},
                        "state": {"type": "string"},
                        "category": {"type": "string"}
                    }
                }
            }
        }]
    )

    return response.choices[0].message.content

# Usage
print(scheme_eligibility_chat(
    "Main ek kisan hoon Bihar se, mere liye kya schemes hain?"
))
```

## State-Wise Scheme Coverage

```
FOMOA State Scheme Coverage
===========================

State               Central Schemes    State Schemes    Total
-----               ---------------    -------------    -----
Maharashtra         100+               150+             250+
Uttar Pradesh       100+               180+             280+
Tamil Nadu          100+               200+             300+
Karnataka           100+               120+             220+
Gujarat             100+               130+             230+
Rajasthan           100+               140+             240+
West Bengal         100+               160+             260+
Bihar               100+               100+             200+
...

All 28 states + 8 UTs covered
```

---

Stop missing government benefits. Let AI navigate India's welfare system for you.

Try FOMOA's scheme search at [fomoa.cloud](https://fomoa.cloud).

*Building a citizen service portal or scheme discovery app? Let's collaborate - [LinkedIn](https://www.linkedin.com/in/tushar-agrawal-91b67a28a).*

## Related Articles

- [Why Indian Users Need an India-First AI Search Engine](/blog/india-first-ai-search-engine-fomoa)
- [How FOMOA Handles Hindi and Hinglish Queries](/blog/fomoa-hindi-hinglish-ai-assistant)
- [Deep Research Mode: Multi-Hop AI Research Explained](/blog/fomoa-deep-research-multi-hop-ai)
- [FOMOA vs Exa.ai: Free India-Optimized Alternative](/blog/fomoa-vs-exa-ai-comparison)
