---
title: "Building AI APIs: FOMOA's OpenAI-Compatible Endpoint for Developers"
description: "Drop-in replacement for OpenAI API with India-optimized search. Change base_url, keep your code. Works with LangChain, LlamaIndex, and streaming responses."
date: "2026-01-15"
author: "Tushar Agrawal"
tags: ["OpenAI API Alternative", "AI API Developers", "Chat Completion API", "FOMOA", "LangChain", "LlamaIndex", "Python API", "Developer Tools"]
image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&h=630&fit=crop"
published: true
---

## Drop-In OpenAI Replacement

If you're building AI applications, you're probably using OpenAI's API. FOMOA offers an **OpenAI-compatible endpoint** - just change the base URL and your existing code works with India-optimized AI search.

```python
# Before: OpenAI
from openai import OpenAI
client = OpenAI(api_key="sk-xxx")

# After: FOMOA (just change base_url)
from openai import OpenAI
client = OpenAI(
    base_url="https://fomoa.cloud/v1",
    api_key="your_fomoa_key"
)

# Same code, India-optimized results
response = client.chat.completions.create(
    model="fomoa",
    messages=[{"role": "user", "content": "Best UPI apps India 2026"}]
)
```

## Why OpenAI Compatibility Matters

```
Benefits of OpenAI-Compatible API
=================================

1. Zero Code Changes
   └── Existing integrations work immediately

2. Ecosystem Compatibility
   ├── LangChain ✓
   ├── LlamaIndex ✓
   ├── Semantic Kernel ✓
   ├── AutoGen ✓
   └── Any OpenAI SDK ✓

3. Streaming Support
   └── Real-time responses for chat UIs

4. Familiar Developer Experience
   └── Same patterns, same documentation approach
```

## Quick Start Guide

### Step 1: Get Your API Key

```bash
# Sign up at fomoa.cloud
# Navigate to Dashboard → API Keys
# Copy your API key
```

### Step 2: Install OpenAI SDK

```bash
pip install openai
```

### Step 3: Initialize Client

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://fomoa.cloud/v1",
    api_key="fomoa_your_api_key_here"
)
```

### Step 4: Make Your First Request

```python
response = client.chat.completions.create(
    model="fomoa",
    messages=[
        {
            "role": "system",
            "content": "You are a helpful assistant focused on Indian context."
        },
        {
            "role": "user",
            "content": "What are the latest income tax slabs for FY 2024-25?"
        }
    ],
    temperature=0.7,
    max_tokens=1000
)

print(response.choices[0].message.content)
```

## Streaming Responses

For chat interfaces, enable streaming for real-time output:

```python
# Streaming enabled
stream = client.chat.completions.create(
    model="fomoa",
    messages=[{"role": "user", "content": "Explain GST in simple terms"}],
    stream=True  # Enable streaming
)

for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)
```

### Streaming with Async

```python
import asyncio
from openai import AsyncOpenAI

async def stream_response():
    client = AsyncOpenAI(
        base_url="https://fomoa.cloud/v1",
        api_key="your_key"
    )

    stream = await client.chat.completions.create(
        model="fomoa",
        messages=[{"role": "user", "content": "PM-KISAN eligibility criteria"}],
        stream=True
    )

    async for chunk in stream:
        if chunk.choices[0].delta.content:
            print(chunk.choices[0].delta.content, end="")

asyncio.run(stream_response())
```

## FOMOA-Specific Endpoints

Beyond the OpenAI-compatible chat endpoint, FOMOA provides specialized APIs:

### /api/answer - Direct Answers

```python
import requests

response = requests.post(
    "https://fomoa.cloud/api/answer",
    json={
        "query": "Current repo rate India",
        "include_sources": True,
        "language": "auto"  # Detects Hindi/English
    },
    headers={"Authorization": "Bearer your_key"}
)

result = response.json()
print(f"Answer: {result['answer']}")
print(f"Sources: {result['sources']}")
```

### /api/research - Deep Research

```python
response = requests.post(
    "https://fomoa.cloud/api/research",
    json={
        "query": "Impact of PLI scheme on manufacturing",
        "depth": "deep",  # quick, normal, deep
        "include_analysis": True
    },
    headers={"Authorization": "Bearer your_key"}
)

result = response.json()
print(f"Summary: {result['summary']}")
print(f"Key findings: {result['key_findings']}")
print(f"Sources analyzed: {result['total_sources']}")
```

### /api/crawl - Web Crawling

```python
response = requests.post(
    "https://fomoa.cloud/api/crawl",
    json={
        "url": "https://example.gov.in/schemes",
        "extract": ["text", "links", "meta"],
        "max_pages": 10
    },
    headers={"Authorization": "Bearer your_key"}
)

result = response.json()
for page in result['pages']:
    print(f"Title: {page['title']}")
    print(f"Content: {page['content'][:500]}...")
```

### /api/entities - Entity Search

```python
response = requests.post(
    "https://fomoa.cloud/api/entities",
    json={
        "entity_type": "company",
        "filters": {
            "industry": "Fintech",
            "location": "Bangalore",
            "founded_after": 2020
        }
    },
    headers={"Authorization": "Bearer your_key"}
)

result = response.json()
for company in result['entities']:
    print(f"{company['name']} - {company['description']}")
```

## LangChain Integration

```python
from langchain.chat_models import ChatOpenAI
from langchain.schema import HumanMessage, SystemMessage

# Initialize with FOMOA
chat = ChatOpenAI(
    openai_api_base="https://fomoa.cloud/v1",
    openai_api_key="your_fomoa_key",
    model_name="fomoa"
)

messages = [
    SystemMessage(content="You are an expert on Indian government policies."),
    HumanMessage(content="What is the Startup India scheme?")
]

response = chat(messages)
print(response.content)
```

### LangChain with Tools

```python
from langchain.agents import initialize_agent, Tool
from langchain.chat_models import ChatOpenAI
import requests

def fomoa_search(query: str) -> str:
    """Search using FOMOA API"""
    response = requests.post(
        "https://fomoa.cloud/api/answer",
        json={"query": query},
        headers={"Authorization": "Bearer your_key"}
    )
    return response.json()["answer"]

tools = [
    Tool(
        name="IndiaSearch",
        func=fomoa_search,
        description="Search for India-specific information including government schemes, policies, and current affairs"
    )
]

llm = ChatOpenAI(
    openai_api_base="https://fomoa.cloud/v1",
    openai_api_key="your_key",
    model_name="fomoa"
)

agent = initialize_agent(
    tools,
    llm,
    agent="zero-shot-react-description",
    verbose=True
)

agent.run("Find me the best mutual funds for tax saving in India 2026")
```

## LlamaIndex Integration

```python
from llama_index import VectorStoreIndex, Document, ServiceContext
from llama_index.llms import OpenAILike

# Configure FOMOA as LLM
llm = OpenAILike(
    api_base="https://fomoa.cloud/v1",
    api_key="your_fomoa_key",
    model="fomoa",
    is_chat_model=True
)

service_context = ServiceContext.from_defaults(llm=llm)

# Create index and query
documents = [Document(text="Your document content here")]
index = VectorStoreIndex.from_documents(
    documents,
    service_context=service_context
)

query_engine = index.as_query_engine()
response = query_engine.query("Summarize the key points about Indian tax laws")
print(response)
```

## Error Handling

```python
from openai import OpenAI, APIError, RateLimitError, APIConnectionError

client = OpenAI(
    base_url="https://fomoa.cloud/v1",
    api_key="your_key"
)

def safe_query(prompt: str) -> str:
    try:
        response = client.chat.completions.create(
            model="fomoa",
            messages=[{"role": "user", "content": prompt}],
            timeout=30
        )
        return response.choices[0].message.content

    except RateLimitError:
        # Wait and retry
        print("Rate limited, waiting...")
        time.sleep(60)
        return safe_query(prompt)

    except APIConnectionError:
        # Network issue
        print("Connection error, retrying...")
        time.sleep(5)
        return safe_query(prompt)

    except APIError as e:
        # API error
        print(f"API error: {e}")
        return None
```

## Rate Limits

```
FOMOA API Rate Limits
=====================

Endpoint              Rate Limit      Burst
--------              ----------      -----
/v1/chat/completions  60/minute       100
/api/answer           60/minute       100
/api/research         20/minute       30
/api/crawl            30/minute       50
/api/entities         60/minute       100

Headers returned:
- X-RateLimit-Limit: Your limit
- X-RateLimit-Remaining: Remaining requests
- X-RateLimit-Reset: Reset timestamp
```

### Handling Rate Limits

```python
import time

def rate_limited_query(client, messages, max_retries=3):
    for attempt in range(max_retries):
        try:
            return client.chat.completions.create(
                model="fomoa",
                messages=messages
            )
        except RateLimitError as e:
            if attempt < max_retries - 1:
                # Exponential backoff
                wait_time = 2 ** attempt * 10
                print(f"Rate limited. Waiting {wait_time}s...")
                time.sleep(wait_time)
            else:
                raise e
```

## Authentication

```python
# Option 1: API Key in client initialization
client = OpenAI(
    base_url="https://fomoa.cloud/v1",
    api_key="fomoa_your_key"
)

# Option 2: Environment variable
import os
os.environ["OPENAI_API_KEY"] = "fomoa_your_key"
os.environ["OPENAI_API_BASE"] = "https://fomoa.cloud/v1"

client = OpenAI()  # Picks up from environment

# Option 3: Header (for direct API calls)
headers = {
    "Authorization": "Bearer fomoa_your_key",
    "Content-Type": "application/json"
}
```

## Complete Example: India-Aware Chatbot

```python
from openai import OpenAI
from typing import List, Dict
import json

class IndiaAwareChatbot:
    def __init__(self, api_key: str):
        self.client = OpenAI(
            base_url="https://fomoa.cloud/v1",
            api_key=api_key
        )
        self.conversation_history: List[Dict] = []
        self.system_prompt = """
        You are an AI assistant specialized in Indian context.
        - Understand lakhs/crores number format
        - Know Indian government schemes
        - Support Hindi/Hinglish queries
        - Cite Indian authoritative sources
        - Use IST for time references
        """

    def chat(self, user_message: str, stream: bool = False):
        self.conversation_history.append({
            "role": "user",
            "content": user_message
        })

        messages = [
            {"role": "system", "content": self.system_prompt}
        ] + self.conversation_history

        if stream:
            return self._stream_response(messages)
        else:
            return self._get_response(messages)

    def _get_response(self, messages):
        response = self.client.chat.completions.create(
            model="fomoa",
            messages=messages,
            temperature=0.7
        )

        assistant_message = response.choices[0].message.content
        self.conversation_history.append({
            "role": "assistant",
            "content": assistant_message
        })

        return assistant_message

    def _stream_response(self, messages):
        stream = self.client.chat.completions.create(
            model="fomoa",
            messages=messages,
            temperature=0.7,
            stream=True
        )

        full_response = ""
        for chunk in stream:
            if chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                full_response += content
                yield content

        self.conversation_history.append({
            "role": "assistant",
            "content": full_response
        })

    def clear_history(self):
        self.conversation_history = []

# Usage
chatbot = IndiaAwareChatbot(api_key="your_key")

# Regular chat
print(chatbot.chat("What is the current GST rate for electronics?"))

# Streaming chat
for chunk in chatbot.chat("Explain PM-KISAN scheme in Hindi", stream=True):
    print(chunk, end="", flush=True)
```

## SDKs and Libraries

```
Language Support
================

Python:  openai>=1.0.0   ✓ Full support
Node.js: openai@4.x      ✓ Full support
Go:      sashabaranov/go-openai ✓ Compatible
Ruby:    ruby-openai     ✓ Compatible
Java:    openai-java     ✓ Compatible
.NET:    Azure.AI.OpenAI ✓ With custom endpoint
```

---

Build India-first AI applications with familiar tools.

Get your API key at [fomoa.cloud](https://fomoa.cloud).

*Need help with integration or custom use cases? Connect on [LinkedIn](https://www.linkedin.com/in/tushar-agrawal-91b67a28a).*

## Related Articles

- [FOMOA vs Exa.ai: Free India-Optimized Alternative](/blog/fomoa-vs-exa-ai-comparison)
- [Deep Research Mode: Multi-Hop AI Research Explained](/blog/fomoa-deep-research-multi-hop-ai)
- [How FOMOA Handles Hindi and Hinglish Queries](/blog/fomoa-hindi-hinglish-ai-assistant)
- [Understanding Source Credibility: How FOMOA Ranks Results](/blog/fomoa-source-credibility-ranking-system)
