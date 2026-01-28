---
title: "Edge Computing Explained: Complete Beginner's Guide 2026"
description: "Understand edge computing from scratch - Cloudflare Workers, AWS Lambda@Edge, IoT edge, latency reduction. Beginner-friendly guide with code examples for Indian developers."
date: "2026-01-28"
author: "Tushar Agrawal"
tags: ["Edge Computing", "Cloudflare Workers", "AWS Lambda Edge", "IoT", "Serverless", "Low Latency", "Indian Developers", "Beginner Guide", "2026"]
image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&h=630&fit=crop"
published: true
---

## What is Edge Computing? (The Simple Explanation)

Imagine you're in Mumbai, ordering food from Swiggy. The restaurant is 2 km away. But what if, instead of the nearby restaurant preparing your food, Swiggy sent your order to a kitchen in New York, and then flew the prepared food back to you?

That would be insane, right? But that's essentially what happens with traditional cloud computing.

When you use an app, your request often travels thousands of kilometers to a data center, gets processed, and travels back. **Edge computing brings the processing closer to you.**

```
Traditional Cloud vs Edge Computing
===================================

TRADITIONAL CLOUD:
────────────────────────────────────────────────────────

You (Mumbai)     Internet      Cloud (US-East/Singapore)
    📱 ──────────────────────────────── 🖥️
    │                                    │
    │      Request travels ~8000km       │
    │         (100-300ms latency)        │
    │                                    │
    📱 ←─────────────────────────────── 🖥️
    │      Response travels back         │

Total Round Trip: 200-600ms


EDGE COMPUTING:
────────────────────────────────────────────────────────

You (Mumbai)     Edge (Mumbai)    Cloud (US-East)
    📱 ─────────── 🖥️ ─ ─ ─ ─ ─ ─ 🖥️
    │              │                │
    │   ~50km      │    Only when   │
    │  (5-20ms)    │    needed      │
    │              │                │
    📱 ←────────── 🖥️               │
    │

Total Round Trip: 10-50ms (90% faster!)
```

### Why Does This Matter?

**Speed of Light is the Limit**

Light travels at ~300,000 km/second. That sounds fast, but:
- Mumbai to US-East: ~14,000 km
- One-way time: ~47ms (just light travel, no processing)
- Real-world with network hops: ~100-150ms one-way

For many applications, this delay is unacceptable.

---

## The Latency Problem (With Real Numbers)

Let me show you actual latency numbers that I've measured from India:

```
Latency Measurements from Mumbai (2025)
=======================================

Destination          | Ping (ms) | Real App Latency*
---------------------|-----------|------------------
Mumbai (local)       |    1-5    |      10-30 ms
Singapore            |   50-70   |     80-150 ms
US West (California) | 180-220   |    250-400 ms
US East (Virginia)   | 200-250   |    300-500 ms
Europe (Frankfurt)   | 120-150   |    180-300 ms

*App latency includes DNS, TLS, processing time

What 200ms Means in Practice:
────────────────────────────
• Button click feels sluggish
• Real-time games become unplayable
• Video calls have noticeable delay
• Financial trading loses money
• AR/VR experiences cause nausea
```

### Where Edge Makes a Difference

```
Latency-Sensitive Applications
==============================

Application          | Acceptable Latency | Without Edge | With Edge
---------------------|-------------------|--------------|----------
Stock Trading        |      <10ms        |   200-300ms  |  5-20ms
Online Gaming        |      <50ms        |   150-250ms  | 20-40ms
Video Conferencing   |     <100ms        |   100-200ms  | 30-60ms
AR/VR Applications   |      <20ms        |   200-300ms  | 10-30ms
IoT Sensors          |     <100ms        |   150-300ms  | 20-50ms
E-commerce Search    |     <200ms        |   300-500ms  | 50-100ms
```

---

## Edge Computing Market Growth

```
Edge Computing Market Size
==========================

Year    | Market Size  | Growth
--------|--------------|--------
2023    | $17.0B       | --
2024    | $19.5B       | +15%
2025    | $21.4B       | +10%
2026    | $28.5B       | +33%  ← We are here
2027    | $37.2B       | +31%
2028    | $48.6B       | +31%

CAGR: 28% (2024-2028)

Key Growth Drivers:
──────────────────
• 5G network rollout
• IoT device explosion (75B by 2025)
• AI/ML at the edge
• Real-time application demand
• Data sovereignty regulations
```

---

## Edge Computing Platforms Compared

Here's an honest comparison of the major edge platforms:

```
Edge Platform Comparison (2026)
===============================

Platform              | Cold Start | Locations | Languages        | Free Tier
----------------------|------------|-----------|------------------|------------
Cloudflare Workers    | 0ms        | 300+      | JS, WASM, Python | 100K req/day
AWS Lambda@Edge       | 50-200ms   | 220+      | Node.js, Python  | 1M req/mo
Vercel Edge Functions | 0ms        | 100+      | JS/TS            | 100K/mo
Deno Deploy           | 0ms        | 35+       | JS/TS, WASM      | 100K req/mo
Fastly Compute@Edge   | 0ms        | 90+       | WASM (Rust, Go)  | Limited free

Edge Database Options:
─────────────────────
• Cloudflare D1 (SQLite at edge)
• Cloudflare KV (key-value)
• Durable Objects (stateful)
• PlanetScale (distributed MySQL)
• Turso (libSQL, edge-native)
• Upstash Redis (edge Redis)

India-Specific Edge Locations:
─────────────────────────────
Cloudflare: Mumbai, Chennai, New Delhi, Hyderabad, Kolkata, Bangalore
AWS CloudFront: Mumbai, Chennai, Hyderabad, Bangalore, New Delhi
Vercel: Mumbai
```

### Which Platform Should You Choose?

```
Edge Platform Decision Tree
===========================

What's your primary use case?
           │
           ├── Web app with static + dynamic content
           │        │
           │        └── Already using Vercel/Next.js?
           │                    │
           │                    ├── YES → Vercel Edge Functions
           │                    │
           │                    └── NO → Cloudflare Workers
           │
           ├── API Gateway / Request transformation
           │        │
           │        └── Cloudflare Workers (best performance)
           │
           ├── Heavy computation / WASM workloads
           │        │
           │        └── Fastly Compute@Edge or Cloudflare Workers
           │
           ├── AWS-heavy infrastructure
           │        │
           │        └── Lambda@Edge
           │
           └── IoT / Real-time data processing
                    │
                    └── AWS IoT Greengrass or Cloudflare Workers
```

---

## Cloudflare Workers Deep Dive

Cloudflare Workers is my top recommendation for edge computing beginners. Here's why and how to get started.

### What Makes Cloudflare Workers Special?

```
Cloudflare Workers Architecture
===============================

Traditional Serverless (Lambda):
────────────────────────────────
Request → Cold Start (100-500ms) → Container → Your Code → Response
          [Spin up container]

Cloudflare Workers:
────────────────────────────────
Request → V8 Isolate (0ms) → Your Code → Response
          [Already running!]

V8 Isolates vs Containers:
─────────────────────────
Container:
┌──────────────────────────────────┐
│  Operating System                │
│  ┌────────────────────────────┐  │
│  │  Runtime (Node.js, Python) │  │
│  │  ┌──────────────────────┐  │  │
│  │  │    Your Code         │  │  │
│  │  └──────────────────────┘  │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
Startup: 100-500ms | Memory: 128MB+

V8 Isolate:
┌──────────────────────────────────┐
│  V8 Engine (shared)              │
│  ┌───────┐ ┌───────┐ ┌───────┐  │
│  │ Your  │ │Other  │ │Other  │  │
│  │ Code  │ │Worker │ │Worker │  │
│  └───────┘ └───────┘ └───────┘  │
└──────────────────────────────────┘
Startup: <1ms | Memory: ~1MB

Result: 0ms cold starts, 300+ global locations
```

### Setting Up Your First Cloudflare Worker

**Step 1: Install Wrangler CLI**

```bash
# Install Wrangler (Cloudflare's CLI)
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create a new Worker project
npm create cloudflare@latest my-edge-api

# Choose:
# - "Hello World" Worker
# - TypeScript
# - Git: Yes
# - Deploy: No (we'll do this later)
```

**Step 2: Project Structure**

```
my-edge-api/
├── src/
│   └── index.ts        # Your Worker code
├── wrangler.toml       # Configuration
├── package.json
└── tsconfig.json
```

**Step 3: Your First Worker**

```typescript
// src/index.ts
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Route handling
    switch (url.pathname) {
      case '/':
        return new Response('Hello from the Edge! 🌐', {
          headers: { 'Content-Type': 'text/plain' },
        });

      case '/api/time':
        return Response.json({
          time: new Date().toISOString(),
          timezone: 'UTC',
          edgeLocation: request.cf?.colo || 'unknown',
        });

      case '/api/geo':
        return Response.json({
          country: request.cf?.country,
          city: request.cf?.city,
          region: request.cf?.region,
          latitude: request.cf?.latitude,
          longitude: request.cf?.longitude,
          timezone: request.cf?.timezone,
          asn: request.cf?.asn,
          asOrganization: request.cf?.asOrganization,
        });

      default:
        return new Response('Not Found', { status: 404 });
    }
  },
};
```

**Step 4: Run Locally and Deploy**

```bash
# Run locally
wrangler dev

# Test your endpoints
curl http://localhost:8787/
curl http://localhost:8787/api/time
curl http://localhost:8787/api/geo

# Deploy to production
wrangler deploy
```

### Geolocation-Based Routing for India

```typescript
// src/index.ts - Complete geolocation routing example

interface Env {
  // KV namespace for caching
  CACHE: KVNamespace;
}

const REGIONAL_BACKENDS = {
  // Indian regions
  'IN': {
    north: 'https://api-north.example.in',
    south: 'https://api-south.example.in',
    east: 'https://api-east.example.in',
    west: 'https://api-west.example.in',
    default: 'https://api-mumbai.example.in',
  },
  // International fallbacks
  'DEFAULT': 'https://api-global.example.com',
};

const INDIAN_REGIONS: Record<string, string> = {
  // North India
  'DL': 'north', 'HR': 'north', 'PB': 'north', 'UP': 'north',
  'UK': 'north', 'HP': 'north', 'JK': 'north', 'RJ': 'north',
  // South India
  'KA': 'south', 'KL': 'south', 'TN': 'south', 'AP': 'south',
  'TS': 'south', 'PY': 'south',
  // East India
  'WB': 'east', 'OR': 'east', 'BR': 'east', 'JH': 'east',
  'AS': 'east', 'MN': 'east', 'ML': 'east', 'TR': 'east',
  // West India
  'MH': 'west', 'GJ': 'west', 'GA': 'west', 'MP': 'west',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cf = request.cf;
    const country = cf?.country as string;
    const region = cf?.region as string;

    // Determine backend URL
    let backendUrl: string;

    if (country === 'IN' && INDIAN_REGIONS[region]) {
      const indianRegion = INDIAN_REGIONS[region];
      backendUrl = REGIONAL_BACKENDS['IN'][indianRegion as keyof typeof REGIONAL_BACKENDS.IN];
    } else if (country === 'IN') {
      backendUrl = REGIONAL_BACKENDS['IN'].default;
    } else {
      backendUrl = REGIONAL_BACKENDS['DEFAULT'];
    }

    // Cache key based on URL and region
    const cacheKey = `${request.url}-${country}-${region}`;

    // Try cache first
    const cached = await env.CACHE.get(cacheKey);
    if (cached) {
      return new Response(cached, {
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
          'X-Edge-Location': cf?.colo as string || 'unknown',
        },
      });
    }

    // Fetch from regional backend
    const backendResponse = await fetch(
      new URL(new URL(request.url).pathname, backendUrl),
      {
        method: request.method,
        headers: request.headers,
        body: request.method !== 'GET' ? request.body : undefined,
      }
    );

    const responseBody = await backendResponse.text();

    // Cache successful GET responses for 60 seconds
    if (request.method === 'GET' && backendResponse.ok) {
      await env.CACHE.put(cacheKey, responseBody, { expirationTtl: 60 });
    }

    return new Response(responseBody, {
      status: backendResponse.status,
      headers: {
        'Content-Type': 'application/json',
        'X-Cache': 'MISS',
        'X-Backend-Region': INDIAN_REGIONS[region] || 'default',
        'X-Edge-Location': cf?.colo as string || 'unknown',
      },
    });
  },
};
```

### Cloudflare KV: Key-Value Storage at the Edge

```typescript
// wrangler.toml - Add KV namespace
/*
[[kv_namespaces]]
binding = "MY_KV"
id = "your-kv-namespace-id"
*/

interface Env {
  MY_KV: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');

    // GET: Read from KV
    if (request.method === 'GET' && key) {
      const value = await env.MY_KV.get(key);
      if (value === null) {
        return new Response('Key not found', { status: 404 });
      }
      return Response.json({ key, value });
    }

    // POST: Write to KV
    if (request.method === 'POST') {
      const body = await request.json() as { key: string; value: string; ttl?: number };

      await env.MY_KV.put(body.key, body.value, {
        expirationTtl: body.ttl || 3600, // Default 1 hour
      });

      return Response.json({ success: true, key: body.key });
    }

    // DELETE: Remove from KV
    if (request.method === 'DELETE' && key) {
      await env.MY_KV.delete(key);
      return Response.json({ success: true, deleted: key });
    }

    return new Response('Method not allowed', { status: 405 });
  },
};
```

### Cloudflare D1: SQLite at the Edge

```typescript
// wrangler.toml - Add D1 database
/*
[[d1_databases]]
binding = "DB"
database_name = "my-edge-db"
database_id = "your-d1-database-id"
*/

interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Initialize table (run once)
    if (url.pathname === '/api/init') {
      await env.DB.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      return Response.json({ success: true, message: 'Table created' });
    }

    // Create user
    if (url.pathname === '/api/users' && request.method === 'POST') {
      const body = await request.json() as { name: string; email: string };

      const result = await env.DB.prepare(
        'INSERT INTO users (name, email) VALUES (?, ?)'
      ).bind(body.name, body.email).run();

      return Response.json({
        success: result.success,
        id: result.meta.last_row_id,
      });
    }

    // Get all users
    if (url.pathname === '/api/users' && request.method === 'GET') {
      const { results } = await env.DB.prepare(
        'SELECT * FROM users ORDER BY created_at DESC'
      ).all();

      return Response.json(results);
    }

    // Get user by ID
    const userMatch = url.pathname.match(/^\/api\/users\/(\d+)$/);
    if (userMatch && request.method === 'GET') {
      const id = userMatch[1];
      const user = await env.DB.prepare(
        'SELECT * FROM users WHERE id = ?'
      ).bind(id).first();

      if (!user) {
        return new Response('User not found', { status: 404 });
      }

      return Response.json(user);
    }

    return new Response('Not found', { status: 404 });
  },
};
```

---

## AWS Lambda@Edge Tutorial

Lambda@Edge runs your code at AWS CloudFront edge locations.

### Understanding Lambda@Edge Triggers

```
Lambda@Edge Trigger Points
==========================

                    ┌─────────────────────────────────┐
                    │         CloudFront              │
                    │         Distribution            │
User                │                                 │         Origin
Request  ──────────>│  ┌─────────────────────────┐   │ ──────> Server
                    │  │                         │   │
         ①          │  │  ② Viewer   ③ Origin   │   │  ④
   Viewer           │  │    Request    Request   │   │  Origin
   Request          │  │                         │   │  Request
                    │  │                         │   │
         ⑧          │  │  ⑦ Viewer   ⑥ Origin   │   │  ⑤
   Viewer <─────────│  │    Response   Response  │<──│  Origin
   Response         │  └─────────────────────────┘   │  Response
                    │                                 │
                    └─────────────────────────────────┘

Trigger Points:
──────────────
① Viewer Request:  Before CloudFront checks cache
② Origin Request:  Before request goes to origin (only on cache miss)
③ Origin Response: After response from origin (only on cache miss)
④ Viewer Response: Before response goes to user

Common Use Cases:
────────────────
① Viewer Request:  Auth, A/B testing, redirects
② Origin Request:  URL rewriting, header manipulation
③ Origin Response: Add security headers, modify response
④ Viewer Response: Customize response for user
```

### Setting Up Lambda@Edge

**Step 1: Create Lambda Function**

```javascript
// lambda/viewer-request.js
// Must be deployed in us-east-1 for Lambda@Edge

exports.handler = async (event) => {
    const request = event.Records[0].cf.request;
    const headers = request.headers;

    // Example: A/B Testing
    const experimentCookie = headers.cookie?.find(
        c => c.value.includes('experiment=')
    );

    let variant = 'A';
    if (experimentCookie) {
        const match = experimentCookie.value.match(/experiment=([AB])/);
        variant = match ? match[1] : 'A';
    } else {
        // Assign random variant (50/50 split)
        variant = Math.random() < 0.5 ? 'A' : 'B';
    }

    // Modify request based on variant
    if (variant === 'B') {
        request.uri = request.uri.replace(/\.html$/, '-variant-b.html');
    }

    // Add variant header for downstream processing
    request.headers['x-experiment-variant'] = [{ value: variant }];

    return request;
};
```

**Step 2: Add Security Headers (Origin Response)**

```javascript
// lambda/origin-response.js

exports.handler = async (event) => {
    const response = event.Records[0].cf.response;
    const headers = response.headers;

    // Security headers
    headers['strict-transport-security'] = [{
        value: 'max-age=31536000; includeSubDomains; preload'
    }];

    headers['x-content-type-options'] = [{
        value: 'nosniff'
    }];

    headers['x-frame-options'] = [{
        value: 'DENY'
    }];

    headers['x-xss-protection'] = [{
        value: '1; mode=block'
    }];

    headers['referrer-policy'] = [{
        value: 'strict-origin-when-cross-origin'
    }];

    headers['content-security-policy'] = [{
        value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
    }];

    // Cache control for static assets
    const uri = event.Records[0].cf.request.uri;
    if (uri.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2)$/)) {
        headers['cache-control'] = [{
            value: 'public, max-age=31536000, immutable'
        }];
    }

    return response;
};
```

**Step 3: Image Optimization at Edge**

```javascript
// lambda/viewer-request-image.js

exports.handler = async (event) => {
    const request = event.Records[0].cf.request;
    const headers = request.headers;

    // Check if this is an image request
    if (!request.uri.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        return request;
    }

    // Get Accept header to check WebP support
    const acceptHeader = headers['accept']?.[0]?.value || '';
    const supportsWebP = acceptHeader.includes('image/webp');

    // Get Client Hints for responsive images
    const viewportWidth = headers['viewport-width']?.[0]?.value;
    const dpr = headers['dpr']?.[0]?.value || '1';

    // Build query string for image processing service
    const params = new URLSearchParams();

    if (supportsWebP) {
        params.set('format', 'webp');
    }

    if (viewportWidth) {
        const width = Math.min(parseInt(viewportWidth), 2000);
        params.set('width', width.toString());
    }

    params.set('quality', dpr > 1 ? '85' : '80');

    // Append parameters to request
    request.querystring = params.toString();

    return request;
};
```

### Deploying Lambda@Edge with Terraform

```hcl
# main.tf

provider "aws" {
  region = "us-east-1"  # Lambda@Edge must be in us-east-1
}

# Lambda function
resource "aws_lambda_function" "edge_function" {
  filename         = "lambda.zip"
  function_name    = "my-edge-function"
  role             = aws_iam_role.lambda_edge.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  publish          = true  # Required for Lambda@Edge
  timeout          = 5     # Max 5 seconds for viewer triggers
  memory_size      = 128   # Max 128MB for viewer triggers
}

# IAM role for Lambda@Edge
resource "aws_iam_role" "lambda_edge" {
  name = "lambda-edge-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = [
          "lambda.amazonaws.com",
          "edgelambda.amazonaws.com"
        ]
      }
    }]
  })
}

# CloudFront distribution with Lambda@Edge
resource "aws_cloudfront_distribution" "main" {
  enabled = true

  origin {
    domain_name = "my-origin.example.com"
    origin_id   = "myOrigin"
  }

  default_cache_behavior {
    target_origin_id       = "myOrigin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]

    # Lambda@Edge association
    lambda_function_association {
      event_type   = "viewer-request"
      lambda_arn   = aws_lambda_function.edge_function.qualified_arn
      include_body = false
    }

    forwarded_values {
      query_string = true
      cookies {
        forward = "none"
      }
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
}
```

---

## Edge Computing + IoT: The Perfect Match

IoT devices generate massive amounts of data. Sending all this data to the cloud is:
- Expensive (bandwidth costs)
- Slow (latency)
- Unreliable (network outages)
- Risky (data in transit)

Edge computing solves all these problems.

```
IoT Edge Architecture
=====================

Traditional IoT:
───────────────
Sensors → Internet → Cloud → Process → Store → Analyze
         [All data travels to cloud]
         [High latency, high bandwidth]

Edge IoT:
─────────
                    ┌─────────────────┐
Sensors → Local    │  Edge Gateway   │ → Cloud
          Network  │  - Filter data  │   [Only aggregated/
                   │  - Aggregate    │    important data]
                   │  - Alert        │
                   │  - Store local  │
                   └─────────────────┘

Benefits:
─────────
• 90% less data transferred to cloud
• <50ms local response time
• Works offline
• Data sovereignty compliance
• Reduced cloud costs
```

### AWS IoT Greengrass Example

```python
# Greengrass Lambda function for sensor processing
# Runs on edge device (Raspberry Pi, industrial gateway, etc.)

import json
import greengrasssdk
from datetime import datetime

# Initialize Greengrass client
client = greengrasssdk.client('iot-data')

# Configuration
TEMPERATURE_THRESHOLD = 35.0  # Celsius
HUMIDITY_THRESHOLD = 80.0  # Percent

# Local storage for aggregation
sensor_readings = []

def lambda_handler(event, context):
    """
    Process sensor data at the edge
    Only send alerts and aggregated data to cloud
    """
    global sensor_readings

    # Parse sensor data
    temperature = event.get('temperature')
    humidity = event.get('humidity')
    sensor_id = event.get('sensor_id')
    timestamp = datetime.now().isoformat()

    # Store reading locally
    sensor_readings.append({
        'sensor_id': sensor_id,
        'temperature': temperature,
        'humidity': humidity,
        'timestamp': timestamp
    })

    # Check for alerts (immediate cloud notification)
    if temperature > TEMPERATURE_THRESHOLD:
        publish_alert({
            'type': 'HIGH_TEMPERATURE',
            'sensor_id': sensor_id,
            'value': temperature,
            'threshold': TEMPERATURE_THRESHOLD,
            'timestamp': timestamp
        })

    if humidity > HUMIDITY_THRESHOLD:
        publish_alert({
            'type': 'HIGH_HUMIDITY',
            'sensor_id': sensor_id,
            'value': humidity,
            'threshold': HUMIDITY_THRESHOLD,
            'timestamp': timestamp
        })

    # Aggregate and send to cloud every 100 readings
    if len(sensor_readings) >= 100:
        aggregated = aggregate_readings(sensor_readings)
        publish_to_cloud(aggregated)
        sensor_readings = []  # Clear local buffer

    return {'status': 'processed'}


def aggregate_readings(readings):
    """Calculate statistics from readings"""
    temps = [r['temperature'] for r in readings]
    humidities = [r['humidity'] for r in readings]

    return {
        'type': 'AGGREGATED_DATA',
        'count': len(readings),
        'temperature': {
            'min': min(temps),
            'max': max(temps),
            'avg': sum(temps) / len(temps)
        },
        'humidity': {
            'min': min(humidities),
            'max': max(humidities),
            'avg': sum(humidities) / len(humidities)
        },
        'period_start': readings[0]['timestamp'],
        'period_end': readings[-1]['timestamp']
    }


def publish_alert(alert_data):
    """Publish alert to cloud IoT topic"""
    client.publish(
        topic='factory/alerts',
        qos=1,
        payload=json.dumps(alert_data)
    )


def publish_to_cloud(data):
    """Publish aggregated data to cloud"""
    client.publish(
        topic='factory/sensor-data/aggregated',
        qos=0,
        payload=json.dumps(data)
    )
```

### Azure IoT Edge Example

```python
# Azure IoT Edge module for data filtering
# modules/filter_module/main.py

import asyncio
import json
from azure.iot.device.aio import IoTHubModuleClient

TEMPERATURE_THRESHOLD = 30

async def main():
    # Create module client
    module_client = IoTHubModuleClient.create_from_edge_environment()
    await module_client.connect()

    # Define message handler
    async def message_handler(message):
        try:
            data = json.loads(message.data)
            temperature = data.get('temperature', 0)

            # Only forward messages above threshold
            if temperature > TEMPERATURE_THRESHOLD:
                # Add edge processing metadata
                data['processed_at_edge'] = True
                data['original_threshold'] = TEMPERATURE_THRESHOLD

                # Send to next module or cloud
                await module_client.send_message_to_output(
                    json.dumps(data),
                    "output1"
                )
                print(f"Forwarded: temp={temperature}")
            else:
                print(f"Filtered: temp={temperature}")

        except Exception as e:
            print(f"Error processing message: {e}")

    # Set handler
    module_client.on_message_received = message_handler

    # Keep running
    while True:
        await asyncio.sleep(1)

if __name__ == "__main__":
    asyncio.run(main())
```

---

## Microservices at the Edge

Research shows significant benefits from edge microservices:

```
Edge Microservices Research Findings
====================================

Performance Improvements:
────────────────────────
• 40-60% latency reduction
• 30% better resource utilization
• 50% bandwidth savings
• 99.9% availability (vs 99.5% cloud-only)

When to Use Edge Microservices:
──────────────────────────────
✓ Latency-sensitive operations
✓ Regional data processing
✓ Content personalization
✓ Request validation/transformation
✓ Rate limiting and auth

When NOT to Use:
────────────────
✗ Complex stateful operations
✗ Heavy database transactions
✗ Long-running processes
✗ Operations requiring global state
```

### Hybrid Cloud-Edge Architecture

```
Cloud-Edge Hybrid Pattern
=========================

┌─────────────────────────────────────────────────────────────┐
│                         CLOUD                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Core APIs   │  │  Database   │  │   ML Model  │        │
│  │ (stateful)  │  │  (primary)  │  │  Training   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│         ↑                ↑                ↓                │
└─────────┼────────────────┼────────────────┼────────────────┘
          │                │                │
          │     Sync       │    Model       │
          │                │   Deployment   │
          │                │                │
┌─────────┼────────────────┼────────────────┼────────────────┐
│         ↓                ↓                ↓        EDGE    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Edge      │  │ Edge Cache  │  │ ML Model   │        │
│  │   APIs      │  │  (replica)  │  │ Inference  │        │
│  │(stateless)  │  │             │  │            │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│         ↑                                                  │
└─────────┼──────────────────────────────────────────────────┘
          │
      ┌───┴───┐
      │ Users │
      └───────┘

What Runs Where:
───────────────
EDGE:
• Authentication/Authorization
• Request validation
• Response caching
• Static content
• A/B testing
• Rate limiting
• Geolocation routing
• ML inference (pre-trained)

CLOUD:
• Business logic
• Database writes
• ML training
• Complex queries
• Batch processing
• State management
```

---

## Real-World Use Cases

### Indian Fintech: Low-Latency Trading

```
Stock Trading Edge Architecture
===============================

Traditional:
───────────
Trader (Mumbai) → Internet → AWS Mumbai → NSE/BSE API
                 (50-100ms)   (10-20ms)   (5-10ms)
Total: 65-130ms per trade

With Edge:
──────────
Trader (Mumbai) → Edge (Mumbai) → NSE/BSE API
                    (5-10ms)       (5-10ms)
Total: 10-20ms per trade

6x faster execution!

Implementation:
──────────────
// Edge function for order validation
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const startTime = Date.now();

    // Parse order
    const order = await request.json();

    // Validate at edge (no round-trip to cloud)
    const validation = validateOrder(order);
    if (!validation.valid) {
      return Response.json({
        error: validation.error,
        processingTime: Date.now() - startTime
      }, { status: 400 });
    }

    // Risk checks at edge
    const riskCheck = await checkRiskLimits(order, env.RISK_KV);
    if (!riskCheck.approved) {
      return Response.json({
        error: 'Risk limit exceeded',
        processingTime: Date.now() - startTime
      }, { status: 403 });
    }

    // Forward to exchange API
    const exchangeResponse = await fetch(env.EXCHANGE_API, {
      method: 'POST',
      body: JSON.stringify(order),
      headers: { 'Authorization': env.API_KEY }
    });

    return Response.json({
      ...await exchangeResponse.json(),
      edgeProcessingTime: Date.now() - startTime,
      edgeLocation: request.cf?.colo
    });
  }
};
```

### E-commerce: Personalization at Speed

```typescript
// Edge-based product recommendations
interface Env {
  RECOMMENDATIONS_KV: KVNamespace;
  USER_PREFERENCES: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const userId = request.headers.get('X-User-ID');
    const sessionId = request.headers.get('X-Session-ID');

    // Get user preferences from edge KV (cached)
    const preferences = await env.USER_PREFERENCES.get(userId || sessionId, 'json');

    // Get geo-based recommendations
    const country = request.cf?.country;
    const city = request.cf?.city;
    const geoKey = `recommendations:${country}:${city}`;

    let recommendations = await env.RECOMMENDATIONS_KV.get(geoKey, 'json');

    if (!recommendations) {
      // Fallback to country-level
      recommendations = await env.RECOMMENDATIONS_KV.get(
        `recommendations:${country}:default`,
        'json'
      );
    }

    // Personalize based on preferences
    if (preferences) {
      recommendations = personalizeRecommendations(recommendations, preferences);
    }

    return Response.json({
      recommendations,
      personalized: !!preferences,
      region: `${city}, ${country}`,
      servedFrom: request.cf?.colo
    });
  }
};

function personalizeRecommendations(recs: any[], prefs: any) {
  // Sort by preference match
  return recs.sort((a, b) => {
    const scoreA = calculatePreferenceScore(a, prefs);
    const scoreB = calculatePreferenceScore(b, prefs);
    return scoreB - scoreA;
  }).slice(0, 10);
}

function calculatePreferenceScore(item: any, prefs: any): number {
  let score = 0;
  if (prefs.categories?.includes(item.category)) score += 10;
  if (prefs.brands?.includes(item.brand)) score += 5;
  if (prefs.priceRange && item.price >= prefs.priceRange[0] && item.price <= prefs.priceRange[1]) {
    score += 3;
  }
  return score;
}
```

### Healthcare: Patient Monitoring

```
Patient Monitoring Edge System
==============================

                    ┌─────────────────────────────┐
                    │     Hospital Cloud          │
                    │   • Patient records         │
                    │   • Long-term analytics     │
                    │   • Compliance storage      │
                    └──────────────┬──────────────┘
                                   │
                            Only critical
                            alerts + daily
                            summaries
                                   │
                    ┌──────────────┴──────────────┐
                    │     Ward Edge Gateway       │
                    │   • Real-time monitoring    │
                    │   • Local alert processing  │
                    │   • Data aggregation        │
                    │   • Offline capability      │
                    └──────────────┬──────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
        ┌─────┴─────┐        ┌─────┴─────┐        ┌─────┴─────┐
        │ Patient 1 │        │ Patient 2 │        │ Patient 3 │
        │ Monitors  │        │ Monitors  │        │ Monitors  │
        └───────────┘        └───────────┘        └───────────┘

Benefits:
• <10ms local alert response
• Works during internet outage
• Patient data stays within hospital
• Reduced bandwidth costs
• HIPAA/DPDP compliance
```

---

## Indian Edge Computing Landscape

### Infrastructure Availability

```
Edge Infrastructure in India (2026)
===================================

Cloudflare PoPs:
• Mumbai (Primary)
• Chennai
• New Delhi
• Hyderabad
• Kolkata
• Bangalore
[6 locations covering major metros]

AWS CloudFront Edge Locations:
• Mumbai (3 locations)
• Chennai
• Hyderabad
• Bangalore
• New Delhi
[7+ locations]

Google Cloud CDN:
• Mumbai
• Delhi

Azure CDN:
• Mumbai
• Chennai
• Pune

Jio Edge Computing:
• Partnership with Microsoft Azure
• Edge nodes across Jio network
• 5G edge capabilities

Reliance Data Centers:
• 10+ locations for edge workloads
```

### Career Opportunities

```
Edge Computing Careers in India
===============================

Role                        | Experience | Salary Range
----------------------------|------------|-------------
Edge Developer              | 2-4 years  | ₹12-20 LPA
Cloud/Edge Architect        | 5-8 years  | ₹25-45 LPA
IoT Edge Engineer           | 3-5 years  | ₹15-25 LPA
Edge DevOps Engineer        | 3-6 years  | ₹18-30 LPA
Edge AI/ML Engineer         | 4-7 years  | ₹22-40 LPA

Top Hiring Companies:
────────────────────
• Jio Platforms
• Infosys
• TCS
• Wipro
• Tech Mahindra
• HCLTech
• Cloudflare India
• AWS India
• Microsoft India

In-Demand Skills:
────────────────
1. Cloudflare Workers / AWS Lambda@Edge
2. WebAssembly (WASM)
3. Kubernetes at the edge (K3s, KubeEdge)
4. IoT protocols (MQTT, CoAP)
5. Edge AI frameworks (TensorFlow Lite, ONNX)
```

---

## Hands-On Project: Build a Geo-Aware API

Let's build a complete edge API with caching, geolocation, and database access.

### Project Structure

```
geo-api/
├── src/
│   ├── index.ts          # Main Worker
│   ├── routes/
│   │   ├── weather.ts    # Weather endpoint
│   │   ├── news.ts       # Regional news
│   │   └── health.ts     # Health check
│   ├── middleware/
│   │   ├── cache.ts      # Caching logic
│   │   └── rateLimit.ts  # Rate limiting
│   └── utils/
│       └── geo.ts        # Geolocation helpers
├── wrangler.toml
└── package.json
```

### Complete Implementation

**wrangler.toml:**

```toml
name = "geo-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
API_VERSION = "1.0.0"

[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-id"

[[kv_namespaces]]
binding = "RATE_LIMITS"
id = "your-rate-limit-kv-id"

[[d1_databases]]
binding = "DB"
database_name = "geo-api-db"
database_id = "your-d1-id"
```

**src/index.ts:**

```typescript
import { weatherHandler } from './routes/weather';
import { newsHandler } from './routes/news';
import { healthHandler } from './routes/health';
import { cacheMiddleware } from './middleware/cache';
import { rateLimitMiddleware } from './middleware/rateLimit';

export interface Env {
  CACHE: KVNamespace;
  RATE_LIMITS: KVNamespace;
  DB: D1Database;
  API_VERSION: string;
}

interface GeoInfo {
  country: string;
  city: string;
  region: string;
  latitude: string;
  longitude: string;
  timezone: string;
  colo: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const startTime = Date.now();

    // Extract geo info
    const geo: GeoInfo = {
      country: request.cf?.country as string || 'unknown',
      city: request.cf?.city as string || 'unknown',
      region: request.cf?.region as string || 'unknown',
      latitude: request.cf?.latitude as string || '0',
      longitude: request.cf?.longitude as string || '0',
      timezone: request.cf?.timezone as string || 'UTC',
      colo: request.cf?.colo as string || 'unknown',
    };

    // Rate limiting
    const rateLimitResult = await rateLimitMiddleware(request, env, geo);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Route handling
    let response: Response;

    try {
      switch (url.pathname) {
        case '/':
        case '/health':
          response = await healthHandler(request, env, geo);
          break;

        case '/api/weather':
          response = await cacheMiddleware(
            request,
            env,
            geo,
            () => weatherHandler(request, env, geo),
            300 // 5 minute cache
          );
          break;

        case '/api/news':
          response = await cacheMiddleware(
            request,
            env,
            geo,
            () => newsHandler(request, env, geo),
            600 // 10 minute cache
          );
          break;

        default:
          response = new Response('Not Found', { status: 404 });
      }
    } catch (error) {
      console.error('Error:', error);
      response = Response.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      );
    }

    // Add standard headers
    const headers = new Headers(response.headers);
    headers.set('X-Processing-Time', `${Date.now() - startTime}ms`);
    headers.set('X-Edge-Location', geo.colo);
    headers.set('X-API-Version', env.API_VERSION);

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  },
};
```

**src/middleware/cache.ts:**

```typescript
import type { Env } from '../index';

interface GeoInfo {
  country: string;
  city: string;
  colo: string;
}

export async function cacheMiddleware(
  request: Request,
  env: Env,
  geo: GeoInfo,
  handler: () => Promise<Response>,
  ttlSeconds: number
): Promise<Response> {
  // Only cache GET requests
  if (request.method !== 'GET') {
    return handler();
  }

  // Build cache key including geo for regional content
  const url = new URL(request.url);
  const cacheKey = `cache:${url.pathname}:${geo.country}:${geo.city}`;

  // Check cache
  const cached = await env.CACHE.get(cacheKey);
  if (cached) {
    const data = JSON.parse(cached);
    return Response.json(data, {
      headers: {
        'X-Cache': 'HIT',
        'X-Cache-Key': cacheKey,
      },
    });
  }

  // Call handler
  const response = await handler();

  // Cache successful responses
  if (response.ok) {
    const body = await response.clone().text();
    await env.CACHE.put(cacheKey, body, {
      expirationTtl: ttlSeconds,
    });
  }

  // Return with cache miss header
  const headers = new Headers(response.headers);
  headers.set('X-Cache', 'MISS');
  headers.set('X-Cache-Key', cacheKey);

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}
```

**src/middleware/rateLimit.ts:**

```typescript
import type { Env } from '../index';

interface GeoInfo {
  country: string;
}

const RATE_LIMIT = 100; // requests per minute
const WINDOW_SIZE = 60; // seconds

export async function rateLimitMiddleware(
  request: Request,
  env: Env,
  geo: GeoInfo
): Promise<Response | null> {
  // Get client identifier (IP or header)
  const clientId = request.headers.get('CF-Connecting-IP') ||
                   request.headers.get('X-Forwarded-For') ||
                   'unknown';

  const key = `ratelimit:${clientId}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - WINDOW_SIZE;

  // Get current count
  const data = await env.RATE_LIMITS.get(key, 'json') as {
    count: number;
    resetAt: number;
  } | null;

  if (data && data.resetAt > now) {
    if (data.count >= RATE_LIMIT) {
      return Response.json(
        {
          error: 'Rate limit exceeded',
          retryAfter: data.resetAt - now,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(data.resetAt - now),
            'X-RateLimit-Limit': String(RATE_LIMIT),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(data.resetAt),
          },
        }
      );
    }

    // Increment counter
    await env.RATE_LIMITS.put(key, JSON.stringify({
      count: data.count + 1,
      resetAt: data.resetAt,
    }), { expirationTtl: WINDOW_SIZE });
  } else {
    // Start new window
    await env.RATE_LIMITS.put(key, JSON.stringify({
      count: 1,
      resetAt: now + WINDOW_SIZE,
    }), { expirationTtl: WINDOW_SIZE });
  }

  return null; // Continue to handler
}
```

**src/routes/weather.ts:**

```typescript
import type { Env } from '../index';

interface GeoInfo {
  country: string;
  city: string;
  latitude: string;
  longitude: string;
}

export async function weatherHandler(
  request: Request,
  env: Env,
  geo: GeoInfo
): Promise<Response> {
  // In production, call a weather API
  // For demo, return mock data based on location

  const weather = generateWeatherData(geo);

  return Response.json({
    location: {
      city: geo.city,
      country: geo.country,
      coordinates: {
        lat: parseFloat(geo.latitude),
        lon: parseFloat(geo.longitude),
      },
    },
    current: weather,
    generated: new Date().toISOString(),
    source: 'edge',
  });
}

function generateWeatherData(geo: GeoInfo) {
  // Mock weather based on Indian city
  const cityWeather: Record<string, any> = {
    'Mumbai': { temp: 32, humidity: 75, condition: 'Humid' },
    'Delhi': { temp: 28, humidity: 45, condition: 'Clear' },
    'Bangalore': { temp: 26, humidity: 60, condition: 'Pleasant' },
    'Chennai': { temp: 34, humidity: 80, condition: 'Hot & Humid' },
    'Kolkata': { temp: 30, humidity: 70, condition: 'Warm' },
    'Hyderabad': { temp: 29, humidity: 55, condition: 'Clear' },
  };

  return cityWeather[geo.city] || {
    temp: 25,
    humidity: 50,
    condition: 'Unknown',
  };
}
```

**src/routes/health.ts:**

```typescript
import type { Env } from '../index';

interface GeoInfo {
  country: string;
  city: string;
  colo: string;
  timezone: string;
}

export async function healthHandler(
  request: Request,
  env: Env,
  geo: GeoInfo
): Promise<Response> {
  // Test database connection
  let dbStatus = 'unknown';
  try {
    await env.DB.prepare('SELECT 1').first();
    dbStatus = 'connected';
  } catch {
    dbStatus = 'error';
  }

  // Test KV connection
  let kvStatus = 'unknown';
  try {
    await env.CACHE.put('health-check', Date.now().toString());
    kvStatus = 'connected';
  } catch {
    kvStatus = 'error';
  }

  return Response.json({
    status: 'healthy',
    version: env.API_VERSION,
    timestamp: new Date().toISOString(),
    edge: {
      location: geo.colo,
      city: geo.city,
      country: geo.country,
      timezone: geo.timezone,
    },
    services: {
      database: dbStatus,
      cache: kvStatus,
    },
  });
}
```

### Deploy and Test

```bash
# Deploy
wrangler deploy

# Test endpoints
curl https://geo-api.your-subdomain.workers.dev/health

curl https://geo-api.your-subdomain.workers.dev/api/weather

curl https://geo-api.your-subdomain.workers.dev/api/news

# Check headers
curl -I https://geo-api.your-subdomain.workers.dev/api/weather
# X-Processing-Time: 12ms
# X-Edge-Location: BOM (Mumbai)
# X-Cache: MISS

# Second request (cached)
curl -I https://geo-api.your-subdomain.workers.dev/api/weather
# X-Cache: HIT
```

---

## Monitoring and Debugging Edge Applications

```
Edge Monitoring Best Practices
==============================

1. Structured Logging
────────────────────
// Cloudflare Workers
console.log(JSON.stringify({
  level: 'info',
  message: 'Request processed',
  requestId: crypto.randomUUID(),
  path: url.pathname,
  method: request.method,
  country: request.cf?.country,
  colo: request.cf?.colo,
  duration: Date.now() - startTime,
}));

2. Metrics Collection
────────────────────
// Use Cloudflare Analytics
// Or send to external service
fetch('https://metrics.example.com/collect', {
  method: 'POST',
  body: JSON.stringify({
    metric: 'request_duration',
    value: duration,
    tags: { colo, country, path }
  })
});

3. Error Tracking
────────────────
try {
  // Your code
} catch (error) {
  // Send to Sentry or similar
  fetch('https://sentry.io/api/...', {
    method: 'POST',
    body: JSON.stringify({
      exception: error.message,
      stack: error.stack,
      request: {
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers)
      }
    })
  });
}
```

---

## Conclusion: The Edge is the Future

You've learned:

1. **What edge computing is** - Processing data closer to users
2. **Why latency matters** - Real numbers showing the speed of light problem
3. **Platform comparison** - Cloudflare Workers, Lambda@Edge, and more
4. **Cloudflare Workers deep dive** - From hello world to production
5. **AWS Lambda@Edge** - CloudFront integration and use cases
6. **Edge + IoT** - The perfect combination
7. **Real-world use cases** - Fintech, e-commerce, healthcare
8. **Indian landscape** - Infrastructure and careers
9. **Complete project** - Geo-aware API with caching

**Key takeaways:**

1. **Start with Cloudflare Workers** - Best developer experience, 0ms cold starts
2. **Think "edge-first"** for latency-sensitive features
3. **Use hybrid architecture** - Edge for speed, cloud for complexity
4. **Cache aggressively** - Most requests can be served from cache
5. **Monitor everything** - Edge debugging is different from traditional

The edge is not replacing the cloud. It's extending it to be closer to your users. In 2026, developers who understand edge computing will have a significant advantage in building fast, reliable, global applications.

---

## Resources

### Official Documentation
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [AWS Lambda@Edge](https://docs.aws.amazon.com/lambda/latest/dg/lambda-edge.html)
- [Vercel Edge Functions](https://vercel.com/docs/functions/edge-functions)
- [Deno Deploy](https://deno.com/deploy)

### Learning Resources
- [Cloudflare Developer Discord](https://discord.gg/cloudflaredev)
- [AWS re:Invent Edge Sessions](https://reinvent.awsevents.com/)
- [Edge Computing Patterns (Microsoft)](https://docs.microsoft.com/en-us/azure/architecture/patterns/)

### Indian Communities
- [AWS User Group India](https://awsug.in/)
- [Cloudflare India Meetups](https://www.meetup.com/cloudflare/)
- [r/developersIndia](https://reddit.com/r/developersindia)

---

*This guide is part of my series on emerging technologies for Indian developers. Follow for more in-depth technical guides.*
