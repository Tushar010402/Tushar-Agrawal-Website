---
title: "Top 15 System Design Interview Questions for Indian Tech Companies (2026)"
description: "Prepare for system design interviews at Flipkart, Razorpay, Google, Amazon, and Indian startups. Complete guide with solutions for URL shortener, payment systems, chat apps, and more."
date: "2026-01-21"
author: "Tushar Agrawal"
tags: ["System Design", "Interview Questions", "Software Interview", "Tech Interview India", "Flipkart Interview", "Amazon Interview", "System Design 2026", "Backend Interview"]
image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&h=630&fit=crop"
published: true
---

## System Design Interviews in India (2026)

System design interviews are now mandatory at most product companies in India. Whether you're interviewing at Flipkart, Razorpay, Google, or a well-funded startup, you'll face at least one system design round.

```
System Design Interview Landscape (India 2026)
==============================================

Company Type         SD Rounds    Difficulty    Focus
------------         ---------    ----------    -----
FAANG (Google, etc)  2-3          Very Hard     Scale + Trade-offs
Unicorns (Flipkart)  1-2          Hard          India-specific scale
Fintech (Razorpay)   1-2          Hard          Payments + Consistency
Startups (Series B+) 1            Medium-Hard   Practical design
Service Companies    0-1          Medium        Basic concepts
```

## How to Approach System Design Questions

### The RESHADED Framework

```
R - Requirements (5 min)
    ├── Functional requirements (what it does)
    ├── Non-functional requirements (scale, latency)
    └── Clarifying questions

E - Estimation (5 min)
    ├── Users (DAU, MAU)
    ├── Traffic (requests/second)
    ├── Storage (data size)
    └── Bandwidth

S - Storage Schema (5 min)
    ├── Data models
    ├── Database choice
    └── Relationships

H - High-Level Design (10 min)
    ├── Components
    ├── Data flow
    └── APIs

A - APIs (5 min)
    ├── Endpoints
    ├── Request/Response
    └── Authentication

D - Detailed Design (10 min)
    ├── Deep dive into components
    ├── Algorithms
    └── Data structures

E - Edge Cases (5 min)
    ├── Failure scenarios
    ├── Race conditions
    └── Security

D - Discussion (5 min)
    ├── Trade-offs
    ├── Alternatives
    └── Future improvements
```

## Top 15 System Design Questions

### 1. Design a URL Shortener (like Bit.ly)

```
Difficulty: Easy | Asked at: Most companies | Time: 35 min

Requirements:
├── Shorten long URLs to short codes
├── Redirect short URLs to original
├── Track click analytics
├── Handle 100M URLs, 1B clicks/month

Estimation:
├── Write: 100M URLs/month = 40 URLs/sec
├── Read: 1B clicks/month = 400 reads/sec
├── Storage: 100M × 500 bytes = 50GB/month
└── Read-heavy system (10:1 ratio)

High-Level Design:
┌─────────┐    ┌─────────────┐    ┌──────────┐
│ Client  │───▶│ API Gateway │───▶│ URL Svc  │
└─────────┘    └─────────────┘    └──────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                  ▼
              ┌──────────┐      ┌──────────┐      ┌──────────┐
              │  Cache   │      │ Database │      │ Analytics│
              │ (Redis)  │      │(Postgres)│      │ (Kafka)  │
              └──────────┘      └──────────┘      └──────────┘

Key Decisions:
├── Short code generation: Base62 encoding of counter
├── Database: PostgreSQL (ACID for uniqueness)
├── Cache: Redis for hot URLs (90% cache hit)
├── Analytics: Async via Kafka
└── Short code length: 7 chars = 62^7 = 3.5 trillion URLs
```

### 2. Design WhatsApp/Messaging System

```
Difficulty: Hard | Asked at: Flipkart, Google, Meta | Time: 45 min

Requirements:
├── 1-1 and group messaging
├── Message delivery status (sent, delivered, read)
├── Online/offline status
├── Media sharing
├── Scale: 500M DAU, 50B messages/day

High-Level Design:
┌─────────┐    ┌─────────────┐    ┌──────────────┐
│ Client  │◀──▶│ WebSocket   │◀──▶│ Chat Service │
│  App    │    │   Gateway   │    │              │
└─────────┘    └─────────────┘    └──────────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
              ┌──────────┐        ┌──────────┐        ┌──────────┐
              │ Message  │        │   User   │        │  Media   │
              │   DB     │        │ Presence │        │  Service │
              │(Cassandra)│        │ (Redis)  │        │   (S3)   │
              └──────────┘        └──────────┘        └──────────┘

Key Components:
├── WebSocket Gateway: Persistent connections
├── Message Queue: Kafka for async delivery
├── Message DB: Cassandra (write-heavy, partitioned by chat_id)
├── Presence: Redis with TTL
├── Media: S3 + CDN
└── Notification: FCM/APNs for offline users

Message Flow:
1. User A sends message via WebSocket
2. Gateway routes to Chat Service
3. Message stored in Cassandra
4. If User B online → push via WebSocket
5. If User B offline → queue + push notification
6. Delivery receipt sent back to A
```

### 3. Design Razorpay/Payment System

```
Difficulty: Hard | Asked at: Razorpay, Paytm, PhonePe | Time: 45 min

Requirements:
├── Process payments (UPI, cards, netbanking)
├── Handle refunds
├── Ensure exactly-once processing
├── PCI-DSS compliance
├── Scale: 10M transactions/day

Critical Properties:
├── Consistency: Money must never be lost/duplicated
├── Idempotency: Retry-safe operations
├── Audit: Complete transaction trail
└── Security: Encryption, tokenization

High-Level Design:
┌─────────┐    ┌─────────────┐    ┌──────────────┐
│Merchant │───▶│ API Gateway │───▶│   Payment    │
│ Server  │    │   + Auth    │    │ Orchestrator │
└─────────┘    └─────────────┘    └──────────────┘
                                         │
           ┌─────────────────────────────┼─────────────────────────────┐
           ▼                             ▼                             ▼
    ┌──────────────┐            ┌──────────────┐            ┌──────────────┐
    │  UPI Gateway │            │ Card Gateway │            │   Netbanking │
    │   (NPCI)     │            │  (Visa/MC)   │            │   Gateway    │
    └──────────────┘            └──────────────┘            └──────────────┘

Payment Flow:
1. Merchant initiates payment request
2. Idempotency key generated
3. Payment record created (PENDING)
4. Route to appropriate gateway
5. Gateway processes payment
6. Webhook received from gateway
7. Update status (SUCCESS/FAILED)
8. Notify merchant via webhook
9. If failed → automatic retry with backoff

Idempotency Implementation:
├── Unique idempotency_key per request
├── Store in Redis (TTL: 24 hours)
├── Check before processing
├── Return cached result if exists
└── Prevents duplicate charges
```

### 4. Design Swiggy/Food Delivery System

```
Difficulty: Hard | Asked at: Swiggy, Zomato, Dunzo | Time: 45 min

Requirements:
├── Restaurant discovery and search
├── Real-time order tracking
├── Delivery partner assignment
├── ETA calculation
├── Scale: 2M orders/day in 500 cities

High-Level Design:
┌─────────┐    ┌─────────────┐    ┌──────────────┐
│Customer │───▶│ API Gateway │───▶│   Services   │
│  App    │    │             │    │              │
└─────────┘    └─────────────┘    └──────────────┘
                                         │
    ┌────────────┬────────────┬──────────┼──────────┬────────────┐
    ▼            ▼            ▼          ▼          ▼            ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Search  │ │ Order  │ │Delivery│ │Location│ │Payment │ │Notifi- │
│Service │ │Service │ │Service │ │Service │ │Service │ │cation  │
└────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘
    │            │            │          │
    ▼            ▼            ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Elastic │ │PostgreS│ │ Redis  │ │ Redis  │
│Search  │ │   QL   │ │(Assign)│ │(Geo)   │
└────────┘ └────────┘ └────────┘ └────────┘

Delivery Assignment Algorithm:
1. Order placed → find nearby delivery partners
2. Filter by: availability, rating, current orders
3. Calculate: distance, ETA, earnings
4. Broadcast to top 5 partners
5. First accept wins
6. If no accept in 30s → expand radius
7. Assign and start tracking

Real-time Location:
├── Delivery partner sends location every 5 sec
├── Store in Redis with geospatial index
├── Push to customer via WebSocket
├── Calculate ETA using Google Maps API
└── Update restaurant for prep timing
```

### 5. Design BookMyShow/Ticket Booking

```
Difficulty: Medium-Hard | Asked at: BookMyShow, Paytm | Time: 40 min

Requirements:
├── Browse movies and shows
├── Select seats in real-time
├── Handle concurrent bookings
├── Process payments
├── Scale: 10M bookings/day (peak during releases)

The Seat Booking Problem:
├── Multiple users viewing same seats
├── Only one can book
├── Avoid double booking
├── Handle payment failures

High-Level Design:
┌─────────┐    ┌─────────────┐    ┌──────────────┐
│  User   │───▶│ API Gateway │───▶│   Booking    │
│  App    │    │             │    │   Service    │
└─────────┘    └─────────────┘    └──────────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
              ┌──────────┐        ┌──────────┐        ┌──────────┐
              │ Seat Lock│        │ Booking  │        │ Payment  │
              │ (Redis)  │        │   DB     │        │ Service  │
              └──────────┘        └──────────┘        └──────────┘

Seat Locking Strategy:
1. User selects seats
2. Temporarily lock seats in Redis (TTL: 10 min)
3. Show seats as "selected" to others
4. User proceeds to payment
5. If payment success → confirm booking, release lock
6. If payment fails → release lock, seats available again
7. If TTL expires → auto-release

Redis Lock Implementation:
├── Key: show:{show_id}:seat:{seat_id}
├── Value: user_id
├── TTL: 600 seconds (10 min)
├── SETNX for atomic lock acquisition
└── Release on success/failure/timeout
```

### 6. Design Twitter/Social Feed

```
Difficulty: Hard | Asked at: Twitter, LinkedIn, Meta | Time: 45 min

Requirements:
├── Post tweets (280 chars + media)
├── Follow/unfollow users
├── Home timeline (feed)
├── Search tweets
├── Scale: 500M users, 500M tweets/day

The Feed Generation Problem:
├── User follows 500 people
├── Each posts 10 tweets/day
├── 5000 potential tweets to sort
├── Must be fast (<200ms)

Two Approaches:

1. Pull Model (Fan-out on read):
   ├── Fetch tweets from all followed users
   ├── Sort by time/relevance
   ├── Good for users with few followers
   └── Slow for users following many

2. Push Model (Fan-out on write):
   ├── When user tweets → push to all followers' feeds
   ├── Pre-computed feed in cache
   ├── Fast reads
   └── Expensive for celebrities (10M followers)

Hybrid Approach (Twitter's actual solution):
├── Regular users: Push model
├── Celebrities (>10K followers): Pull model
├── Merge at read time
└── Best of both worlds

Feed Storage:
├── Feed cache: Redis sorted set
├── Key: user:{user_id}:feed
├── Score: timestamp
├── Value: tweet_id
├── Keep last 1000 tweets per user
```

### 7. Design Uber/Ride Sharing

```
Difficulty: Hard | Asked at: Uber, Ola, Rapido | Time: 45 min

Requirements:
├── Match riders with drivers
├── Real-time location tracking
├── Dynamic pricing
├── ETA calculation
├── Scale: 1M rides/day

Driver Matching Algorithm:
1. Rider requests ride with pickup/dropoff
2. Find drivers within 5km radius
3. Filter: available, rating > 4.0, vehicle type
4. Calculate ETA for each driver
5. Send request to closest driver
6. If no accept in 15s → next driver
7. Confirmed → start tracking

Location Service Design:
┌─────────────┐
│   Driver    │──── Location every 4 sec ────▶┌──────────────┐
│    App      │                               │   Location   │
└─────────────┘                               │   Service    │
                                              └──────────────┘
┌─────────────┐                                      │
│   Rider     │◀──── Driver location push ──────────┘
│    App      │
└─────────────┘

Geospatial Index (Redis):
├── GEOADD drivers {longitude} {latitude} {driver_id}
├── GEORADIUS drivers {lng} {lat} 5 km
├── Returns drivers within radius
└── O(log N) for 1M drivers

Dynamic Pricing:
├── demand_multiplier = active_requests / available_drivers
├── If multiplier > 1.5 → surge pricing
├── Cap at 3x normal price
├── Show surge to rider before booking
```

### 8. Design YouTube/Video Streaming

```
Difficulty: Hard | Asked at: Google, Hotstar, Netflix | Time: 45 min

Requirements:
├── Upload videos
├── Stream videos
├── Recommendations
├── Comments and likes
├── Scale: 1B videos, 1B views/day

Video Processing Pipeline:
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Upload    │───▶│  Transcoder │───▶│     CDN     │
│   Service   │    │   Service   │    │   Storage   │
└─────────────┘    └─────────────┘    └─────────────┘
                          │
            ┌─────────────┼─────────────┐
            ▼             ▼             ▼
       ┌────────┐   ┌────────┐   ┌────────┐
       │ 360p   │   │ 720p   │   │ 1080p  │
       └────────┘   └────────┘   └────────┘

Streaming Architecture:
├── Adaptive bitrate streaming (HLS/DASH)
├── Segment videos into 4-10 second chunks
├── Client requests based on bandwidth
├── CDN caches popular videos at edge
└── Origin server for long-tail content

CDN Strategy:
├── Global CDN (Akamai, CloudFlare)
├── Edge caching for popular videos
├── 90% cache hit rate target
├── Origin fallback for cache miss
└── ~50ms latency globally
```

### 9. Design Flipkart/E-commerce

```
Difficulty: Hard | Asked at: Flipkart, Amazon, Myntra | Time: 45 min

Core Services:
├── Product Catalog Service
├── Search Service (Elasticsearch)
├── Cart Service
├── Order Service
├── Inventory Service
├── Payment Service
├── Notification Service
└── Recommendation Service

Inventory Management (Critical):
├── Real-time inventory tracking
├── Prevent overselling
├── Handle concurrent purchases
├── Flash sales (10K orders/sec)

Flash Sale Design:
1. Pre-warm inventory in Redis
2. Decrement with Lua script (atomic)
3. If count > 0 → allow to cart
4. If count = 0 → sold out
5. Create order asynchronously
6. If payment fails → restore inventory

Lua Script for Atomic Decrement:
local current = redis.call('GET', KEYS[1])
if tonumber(current) > 0 then
    redis.call('DECR', KEYS[1])
    return 1
else
    return 0
end
```

### 10. Design Google Search

```
Difficulty: Very Hard | Asked at: Google | Time: 45 min

Components:
├── Web Crawler
├── Indexer
├── Ranking Algorithm
├── Query Processor
├── Caching Layer

Inverted Index:
Word → [doc1, doc2, doc3, ...]

"python" → [doc1:0.8, doc5:0.7, doc10:0.6]
"tutorial" → [doc1:0.9, doc3:0.8, doc5:0.5]

Query: "python tutorial"
├── Fetch posting lists for both words
├── Intersect lists
├── Score by TF-IDF + PageRank
├── Return top 10 results

Caching Strategy:
├── 50% queries are repeats
├── Cache top 1M queries
├── Invalidate on index update
├── ~10ms for cached queries
└── ~200ms for uncached
```

## Common Follow-up Questions

```
Questions Interviewers Ask:
===========================

Scale:
├── "What if traffic 10x tomorrow?"
├── "How to handle Black Friday?"
└── "What's the bottleneck?"

Reliability:
├── "What if this service goes down?"
├── "How to handle network partition?"
└── "What's your disaster recovery plan?"

Trade-offs:
├── "Why this database over that?"
├── "Consistency vs Availability?"
└── "What would you do differently?"

India-Specific:
├── "How to handle 2G users?"
├── "Multi-language support?"
└── "Tier-2/3 city latency?"
```

## Preparation Strategy

```
4-Week Preparation Plan
=======================

Week 1: Fundamentals
├── Scalability basics
├── Database design
├── Caching strategies
├── Load balancing
└── Resources: System Design Primer

Week 2: Common Patterns
├── URL shortener
├── Rate limiter
├── Key-value store
├── Distributed cache
└── Practice: Draw diagrams

Week 3: Complex Systems
├── Social feed
├── Chat system
├── E-commerce
├── Streaming
└── Practice: Mock interviews

Week 4: Company-Specific
├── Research company's tech stack
├── Read engineering blogs
├── Practice with time limits
└── Review and refine
```

## Conclusion

System design interviews test your ability to think at scale and make trade-offs. Practice the framework, understand the patterns, and you'll be well-prepared for any system design question.

---

*Preparing for system design interviews? Let's discuss on [LinkedIn](https://www.linkedin.com/in/tushar-agrawal-91b67a28a).*

## Related Articles

- [Backend Developer Roadmap 2026](/blog/backend-developer-roadmap-india-2026)
- [Python vs Go for Backend](/blog/python-vs-go-backend-development-2026)
- [Database Connection Pooling](/blog/database-connection-pooling-performance-guide)
- [Microservices Architecture](/blog/microservices-architecture-patterns)
