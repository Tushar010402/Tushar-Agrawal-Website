---
title: "Observability Stack: Prometheus, Grafana & Jaeger Complete Guide"
description: "Build production-grade observability with Prometheus metrics, Grafana dashboards, and Jaeger distributed tracing. Complete setup guide with alerting, custom metrics, and troubleshooting patterns."
date: "2025-12-19"
author: "Tushar Agrawal"
tags: ["Observability", "Prometheus", "Grafana", "Jaeger", "Monitoring", "Distributed Tracing", "DevOps", "Microservices", "OpenTelemetry"]
image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=630&fit=crop"
published: true
---

## Introduction

You can't fix what you can't see. In distributed systems, **observability** isn't a luxury—it's survival. When a healthcare platform serving millions of patients experiences a latency spike at 2 AM, you need answers in seconds, not hours.

This guide covers the three pillars of observability: **Metrics (Prometheus)**, **Visualization (Grafana)**, and **Distributed Tracing (Jaeger)**. I'll share production patterns from building HIPAA-compliant systems that demand 99.99% uptime.

## The Three Pillars of Observability

```
┌─────────────────────────────────────────────────────────────┐
│                    OBSERVABILITY                             │
├───────────────────┬───────────────────┬─────────────────────┤
│      METRICS      │       LOGS        │      TRACES         │
│                   │                   │                     │
│  ┌─────────────┐  │  ┌─────────────┐  │  ┌───────────────┐  │
│  │ Prometheus  │  │  │    Loki     │  │  │    Jaeger     │  │
│  │             │  │  │   (ELK)     │  │  │   (Zipkin)    │  │
│  └─────────────┘  │  └─────────────┘  │  └───────────────┘  │
│                   │                   │                     │
│  What happened?   │  Why it happened? │  How it happened?   │
│  (Numeric data)   │  (Event context)  │  (Request flow)     │
└───────────────────┴───────────────────┴─────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │     Grafana     │
                    │  (Visualization)│
                    └─────────────────┘
```

## Setting Up Prometheus

### Docker Compose Setup

```yaml
# docker-compose.observability.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:v2.47.0
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./prometheus/rules:/etc/prometheus/rules
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
      - '--web.enable-lifecycle'
      - '--web.enable-admin-api'
    networks:
      - observability

  alertmanager:
    image: prom/alertmanager:v0.26.0
    container_name: alertmanager
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml
    networks:
      - observability

  grafana:
    image: grafana/grafana:10.2.0
    container_name: grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=secure_password
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_SERVER_ROOT_URL=https://grafana.example.com
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
    networks:
      - observability

  jaeger:
    image: jaegertracing/all-in-one:1.51
    container_name: jaeger
    ports:
      - "16686:16686"  # UI
      - "14268:14268"  # HTTP collector
      - "6831:6831/udp"  # Thrift compact
      - "4317:4317"    # OTLP gRPC
      - "4318:4318"    # OTLP HTTP
    environment:
      - COLLECTOR_OTLP_ENABLED=true
    networks:
      - observability

volumes:
  prometheus_data:
  grafana_data:

networks:
  observability:
    driver: bridge
```

### Prometheus Configuration

```yaml
# prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'production'
    env: 'prod'

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - /etc/prometheus/rules/*.yml

scrape_configs:
  # Prometheus itself
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Application services
  - job_name: 'api-services'
    metrics_path: /metrics
    static_configs:
      - targets:
          - 'user-service:8000'
          - 'order-service:8000'
          - 'payment-service:8000'
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        regex: '([^:]+):\d+'
        replacement: '${1}'

  # Kubernetes service discovery
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__

  # Node exporter for system metrics
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  # PostgreSQL exporter
  - job_name: 'postgresql'
    static_configs:
      - targets: ['postgres-exporter:9187']

  # Redis exporter
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

## Instrumenting Python Applications

### FastAPI with Prometheus Metrics

```python
# metrics.py
from prometheus_client import (
    Counter, Histogram, Gauge, Info,
    generate_latest, CONTENT_TYPE_LATEST
)
from fastapi import FastAPI, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import time

# Define metrics
REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status_code']
)

REQUEST_LATENCY = Histogram(
    'http_request_duration_seconds',
    'HTTP request latency in seconds',
    ['method', 'endpoint'],
    buckets=[.005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 10]
)

REQUESTS_IN_PROGRESS = Gauge(
    'http_requests_in_progress',
    'Number of HTTP requests in progress',
    ['method', 'endpoint']
)

DB_QUERY_LATENCY = Histogram(
    'db_query_duration_seconds',
    'Database query latency',
    ['query_type', 'table'],
    buckets=[.001, .005, .01, .025, .05, .1, .25, .5, 1, 2.5]
)

CACHE_HITS = Counter(
    'cache_hits_total',
    'Cache hit count',
    ['cache_name']
)

CACHE_MISSES = Counter(
    'cache_misses_total',
    'Cache miss count',
    ['cache_name']
)

APP_INFO = Info('app', 'Application information')
APP_INFO.info({
    'version': '1.2.3',
    'environment': 'production'
})


class PrometheusMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        method = request.method
        endpoint = self._get_endpoint(request)

        REQUESTS_IN_PROGRESS.labels(method=method, endpoint=endpoint).inc()

        start_time = time.perf_counter()
        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception as e:
            status_code = 500
            raise
        finally:
            duration = time.perf_counter() - start_time

            REQUEST_COUNT.labels(
                method=method,
                endpoint=endpoint,
                status_code=status_code
            ).inc()

            REQUEST_LATENCY.labels(
                method=method,
                endpoint=endpoint
            ).observe(duration)

            REQUESTS_IN_PROGRESS.labels(
                method=method,
                endpoint=endpoint
            ).dec()

        return response

    def _get_endpoint(self, request: Request) -> str:
        # Normalize path parameters
        path = request.url.path
        for route in request.app.routes:
            if hasattr(route, 'path_regex'):
                match = route.path_regex.match(path)
                if match:
                    return route.path
        return path


# FastAPI setup
app = FastAPI()
app.add_middleware(PrometheusMiddleware)


@app.get('/metrics')
async def metrics():
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )


# Custom metrics decorator
def track_db_query(query_type: str, table: str):
    def decorator(func):
        async def wrapper(*args, **kwargs):
            start = time.perf_counter()
            try:
                return await func(*args, **kwargs)
            finally:
                duration = time.perf_counter() - start
                DB_QUERY_LATENCY.labels(
                    query_type=query_type,
                    table=table
                ).observe(duration)
        return wrapper
    return decorator


# Usage
@track_db_query('select', 'users')
async def get_user(user_id: int):
    return await db.fetch_one("SELECT * FROM users WHERE id = $1", user_id)
```

### Business Metrics

```python
# business_metrics.py
from prometheus_client import Counter, Gauge, Histogram

# Revenue metrics
ORDERS_TOTAL = Counter(
    'orders_total',
    'Total orders placed',
    ['status', 'payment_method']
)

ORDER_VALUE = Histogram(
    'order_value_dollars',
    'Order value distribution',
    buckets=[10, 25, 50, 100, 250, 500, 1000, 2500, 5000]
)

# User metrics
ACTIVE_USERS = Gauge(
    'active_users_current',
    'Currently active users',
    ['user_type']
)

USER_SIGNUPS = Counter(
    'user_signups_total',
    'Total user signups',
    ['source', 'plan']
)

# Healthcare specific
LAB_TESTS_PROCESSED = Counter(
    'lab_tests_processed_total',
    'Lab tests processed',
    ['test_type', 'priority']
)

REPORT_GENERATION_TIME = Histogram(
    'report_generation_seconds',
    'Time to generate patient reports',
    ['report_type'],
    buckets=[1, 5, 10, 30, 60, 120, 300]
)


# Usage in business logic
async def create_order(order: OrderCreate) -> Order:
    result = await db.create_order(order)

    # Record business metrics
    ORDERS_TOTAL.labels(
        status='created',
        payment_method=order.payment_method
    ).inc()

    ORDER_VALUE.observe(float(order.total))

    return result
```

## Distributed Tracing with Jaeger

### OpenTelemetry Setup

```python
# tracing.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.asyncpg import AsyncPGInstrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.propagate import set_global_textmap
from opentelemetry.propagators.b3 import B3MultiFormat

def setup_tracing(service_name: str):
    """Initialize OpenTelemetry tracing with Jaeger."""

    # Create resource with service info
    resource = Resource.create({
        "service.name": service_name,
        "service.version": "1.2.3",
        "deployment.environment": "production",
    })

    # Create tracer provider
    provider = TracerProvider(resource=resource)

    # Configure Jaeger exporter
    jaeger_exporter = JaegerExporter(
        agent_host_name="jaeger",
        agent_port=6831,
    )

    # Add span processor
    provider.add_span_processor(
        BatchSpanProcessor(jaeger_exporter)
    )

    # Set global tracer provider
    trace.set_tracer_provider(provider)

    # Set propagation format (B3 for compatibility)
    set_global_textmap(B3MultiFormat())

    return trace.get_tracer(service_name)


def instrument_app(app):
    """Instrument FastAPI and dependencies."""

    # FastAPI
    FastAPIInstrumentor.instrument_app(app)

    # HTTP client
    HTTPXClientInstrumentor().instrument()

    # Database
    AsyncPGInstrumentor().instrument()

    # Redis
    RedisInstrumentor().instrument()


# Usage
tracer = setup_tracing("user-service")


# Custom span creation
async def process_order(order_id: str):
    with tracer.start_as_current_span("process_order") as span:
        span.set_attribute("order.id", order_id)

        # Validate order
        with tracer.start_as_current_span("validate_order"):
            await validate_order(order_id)

        # Process payment
        with tracer.start_as_current_span("process_payment") as payment_span:
            result = await payment_service.charge(order_id)
            payment_span.set_attribute("payment.status", result.status)

        # Send notifications
        with tracer.start_as_current_span("send_notifications"):
            await notification_service.send(order_id)

        span.set_attribute("order.status", "completed")
```

### Trace Context Propagation

```python
# context_propagation.py
import httpx
from opentelemetry import trace
from opentelemetry.propagate import inject

async def call_downstream_service(endpoint: str, data: dict):
    """Call downstream service with trace context."""

    headers = {}
    inject(headers)  # Inject trace context into headers

    async with httpx.AsyncClient() as client:
        response = await client.post(
            endpoint,
            json=data,
            headers=headers
        )
        return response.json()


# gRPC context propagation
import grpc
from opentelemetry.propagate import inject

def create_grpc_metadata():
    """Create gRPC metadata with trace context."""
    carrier = {}
    inject(carrier)
    return [(k, v) for k, v in carrier.items()]


async def call_grpc_service(stub, request):
    metadata = create_grpc_metadata()
    return await stub.SomeMethod(request, metadata=metadata)
```

## Grafana Dashboards

### API Performance Dashboard

```json
{
  "dashboard": {
    "title": "API Performance",
    "panels": [
      {
        "title": "Request Rate",
        "type": "timeseries",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total[5m])) by (endpoint)",
            "legendFormat": "{{endpoint}}"
          }
        ]
      },
      {
        "title": "Latency P95",
        "type": "timeseries",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, endpoint))",
            "legendFormat": "{{endpoint}}"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{status_code=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m])) * 100",
            "legendFormat": "Error %"
          }
        ],
        "thresholds": {
          "steps": [
            {"color": "green", "value": 0},
            {"color": "yellow", "value": 1},
            {"color": "red", "value": 5}
          ]
        }
      },
      {
        "title": "Requests In Progress",
        "type": "gauge",
        "targets": [
          {
            "expr": "sum(http_requests_in_progress)",
            "legendFormat": "In Progress"
          }
        ]
      }
    ]
  }
}
```

### Database Dashboard Queries

```promql
# Connection pool usage
pg_stat_activity_count{state="active"} / pg_settings_max_connections * 100

# Query latency by type
histogram_quantile(0.95, sum(rate(db_query_duration_seconds_bucket[5m])) by (le, query_type))

# Slow queries count
sum(rate(db_query_duration_seconds_count{le="1"}[5m])) - sum(rate(db_query_duration_seconds_count{le="0.1"}[5m]))

# Cache hit ratio
sum(rate(cache_hits_total[5m])) / (sum(rate(cache_hits_total[5m])) + sum(rate(cache_misses_total[5m]))) * 100
```

## Alerting Rules

```yaml
# prometheus/rules/alerts.yml
groups:
  - name: api_alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status_code=~"5.."}[5m]))
          / sum(rate(http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} (threshold: 5%)"

      - alert: HighLatency
        expr: |
          histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
          > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High API latency"
          description: "P95 latency is {{ $value }}s (threshold: 2s)"

      - alert: ServiceDown
        expr: up{job="api-services"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.instance }} is down"
          description: "Service has been unreachable for more than 1 minute"

  - name: database_alerts
    rules:
      - alert: HighConnectionUsage
        expr: |
          pg_stat_activity_count / pg_settings_max_connections > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High database connection usage"
          description: "{{ $value | humanizePercentage }} of connections in use"

      - alert: SlowQueries
        expr: |
          rate(pg_stat_activity_max_tx_duration{state="active"}[5m]) > 30
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow database queries detected"

  - name: business_alerts
    rules:
      - alert: OrderProcessingDelayed
        expr: |
          histogram_quantile(0.95, rate(order_processing_duration_seconds_bucket[5m]))
          > 60
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Order processing is delayed"

      - alert: LowOrderVolume
        expr: |
          sum(rate(orders_total[1h])) < 10
        for: 30m
        labels:
          severity: info
        annotations:
          summary: "Unusually low order volume"
```

### AlertManager Configuration

```yaml
# alertmanager/alertmanager.yml
global:
  resolve_timeout: 5m
  slack_api_url: 'https://hooks.slack.com/services/xxx/yyy/zzz'

route:
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'default-receiver'
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty-critical'
      continue: true
    - match:
        severity: critical
      receiver: 'slack-critical'
    - match:
        severity: warning
      receiver: 'slack-warning'

receivers:
  - name: 'default-receiver'
    slack_configs:
      - channel: '#alerts'
        send_resolved: true

  - name: 'slack-critical'
    slack_configs:
      - channel: '#alerts-critical'
        color: '{{ if eq .Status "firing" }}danger{{ else }}good{{ end }}'
        title: '{{ .CommonAnnotations.summary }}'
        text: '{{ .CommonAnnotations.description }}'
        send_resolved: true

  - name: 'slack-warning'
    slack_configs:
      - channel: '#alerts-warning'
        send_resolved: true

  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: 'your-pagerduty-key'
        severity: critical
```

## SLO/SLI Implementation

```python
# slo_metrics.py
from prometheus_client import Counter, Histogram

# SLI: Request success rate
REQUESTS_TOTAL = Counter(
    'sli_requests_total',
    'Total requests for SLO calculation',
    ['service', 'endpoint']
)

REQUESTS_SUCCESS = Counter(
    'sli_requests_success_total',
    'Successful requests for SLO calculation',
    ['service', 'endpoint']
)

# SLI: Latency
REQUEST_LATENCY = Histogram(
    'sli_request_latency_seconds',
    'Request latency for SLO calculation',
    ['service', 'endpoint'],
    buckets=[.1, .25, .5, 1, 2.5]
)


# SLO Prometheus rules
"""
# prometheus/rules/slo.yml
groups:
  - name: slo_rules
    rules:
      # Error budget burn rate
      - record: slo:error_budget:ratio
        expr: |
          1 - (
            sum(rate(sli_requests_success_total[30d]))
            / sum(rate(sli_requests_total[30d]))
          )

      # SLO: 99.9% availability
      - record: slo:availability:ratio
        expr: |
          sum(rate(sli_requests_success_total[5m]))
          / sum(rate(sli_requests_total[5m]))

      # SLO: 95% of requests under 500ms
      - record: slo:latency:ratio
        expr: |
          sum(rate(sli_request_latency_seconds_bucket{le="0.5"}[5m]))
          / sum(rate(sli_request_latency_seconds_count[5m]))

      # Alert on error budget burn
      - alert: ErrorBudgetBurn
        expr: slo:error_budget:ratio > 0.001  # Burned more than 0.1%
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Error budget burning too fast"
          description: "{{ $value | humanizePercentage }} of monthly error budget consumed"
"""
```

## Conclusion

A robust observability stack is essential for operating reliable distributed systems:

- **Prometheus** for time-series metrics and alerting
- **Grafana** for visualization and dashboards
- **Jaeger** for distributed tracing across services

Key takeaways:
- Instrument early, not after problems occur
- Use business metrics alongside technical metrics
- Set up SLOs and error budgets
- Create runbooks linked to alerts
- Practice observability-driven development

This stack has helped me maintain 99.99% uptime for healthcare systems where reliability isn't optional.

## Related Articles

- [Docker Kubernetes Deployment Guide](/blog/docker-kubernetes-deployment-guide) - Container orchestration
- [Building Scalable Microservices](/blog/building-scalable-microservices-with-go-and-fastapi) - Service architecture
- [Redis Caching Strategies](/blog/redis-caching-strategies-complete-guide) - Performance optimization
- [GitHub Actions CI/CD Guide](/blog/github-actions-cicd-complete-guide) - Deployment pipelines
- [PostgreSQL Performance Optimization](/blog/postgresql-performance-optimization) - Database monitoring
