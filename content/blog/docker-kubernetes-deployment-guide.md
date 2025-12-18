---
title: "Docker and Kubernetes: Complete Deployment Guide for Production"
description: "Master containerization with Docker and orchestration with Kubernetes. Learn to build, deploy, and scale applications with practical examples, best practices, and production-ready configurations."
date: "2024-12-18"
author: "Tushar Agrawal"
tags: ["Docker", "Kubernetes", "DevOps", "Containers", "Cloud", "Deployment"]
image: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=1200&h=630&fit=crop"
published: true
---

## Introduction

Containerization has revolutionized how we build, ship, and run applications. At Dr. Dangs Lab, we've containerized over 50 microservices and manage them across multiple Kubernetes clusters. In this guide, I'll share practical knowledge from deploying healthcare applications at scale.

## Why Docker + Kubernetes?

### The Problem They Solve

**Before Containers:**
- "It works on my machine" syndrome
- Complex dependency management
- Inconsistent environments
- Slow, error-prone deployments

**With Docker + Kubernetes:**
- Consistent environments everywhere
- Isolated, reproducible builds
- Automated scaling and healing
- Zero-downtime deployments

## Docker Fundamentals

### Writing Production-Ready Dockerfiles

```dockerfile
# Bad: Single-stage, large image
FROM python:3.11
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt
CMD ["python", "app.py"]

# Good: Multi-stage, optimized
FROM python:3.11-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

FROM python:3.11-slim
WORKDIR /app

# Create non-root user
RUN useradd --create-home --shell /bin/bash appuser

# Copy dependencies from builder
COPY --from=builder /root/.local /home/appuser/.local
COPY --chown=appuser:appuser . .

USER appuser
ENV PATH=/home/appuser/.local/bin:$PATH

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["gunicorn", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "app:app", "-b", "0.0.0.0:8000"]
```

### Docker Compose for Development

```yaml
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/app
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    volumes:
      - ./src:/app/src  # Hot reload in development
    networks:
      - app-network

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: app
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - app-network

volumes:
  postgres_data:
  redis_data:

networks:
  app-network:
    driver: bridge
```

### Docker Best Practices

```dockerfile
# 1. Use specific versions, not 'latest'
FROM python:3.11.6-slim-bookworm

# 2. Combine RUN commands to reduce layers
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 3. Copy dependency files first for better caching
COPY requirements.txt .
RUN pip install -r requirements.txt

# 4. Copy source code last (changes most frequently)
COPY . .

# 5. Use .dockerignore
# .dockerignore contents:
# __pycache__
# *.pyc
# .git
# .env
# tests/
# docs/
```

## Kubernetes Fundamentals

### Core Concepts

```
┌─────────────────────────────────────────────────────────────┐
│                        CLUSTER                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    NAMESPACE                         │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │    │
│  │  │ Deployment  │  │   Service   │  │   Ingress   │ │    │
│  │  │  ┌───────┐  │  │             │  │             │ │    │
│  │  │  │ Pod   │  │  │  ClusterIP  │  │   Routes    │ │    │
│  │  │  │┌─────┐│  │  │  NodePort   │  │   traffic   │ │    │
│  │  │  ││Cont.││  │  │  LoadBal.   │  │             │ │    │
│  │  │  │└─────┘│  │  │             │  │             │ │    │
│  │  │  └───────┘  │  └─────────────┘  └─────────────┘ │    │
│  │  └─────────────┘                                    │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Deployment Configuration

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: production
  labels:
    app: api-server
    version: v1
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
        version: v1
    spec:
      serviceAccountName: api-server
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
        - name: api-server
          image: registry.example.com/api-server:1.2.3
          imagePullPolicy: Always
          ports:
            - containerPort: 8000
              protocol: TCP
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: api-secrets
                  key: database-url
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8000
            initialDelaySeconds: 10
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8000
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3
          volumeMounts:
            - name: config
              mountPath: /app/config
              readOnly: true
      volumes:
        - name: config
          configMap:
            name: api-config
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: api-server
                topologyKey: kubernetes.io/hostname
```

### Service and Ingress

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api-server
  namespace: production
spec:
  type: ClusterIP
  selector:
    app: api-server
  ports:
    - port: 80
      targetPort: 8000
      protocol: TCP

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  namespace: production
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.example.com
      secretName: api-tls
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-server
                port:
                  number: 80
```

### ConfigMaps and Secrets

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: api-config
  namespace: production
data:
  LOG_LEVEL: "INFO"
  MAX_CONNECTIONS: "100"
  CACHE_TTL: "3600"

---
apiVersion: v1
kind: Secret
metadata:
  name: api-secrets
  namespace: production
type: Opaque
stringData:
  database-url: "postgresql://user:pass@host:5432/db"
  api-key: "your-secret-api-key"
```

## Horizontal Pod Autoscaling

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-server-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15
```

## CI/CD Pipeline Integration

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Kubernetes
        uses: azure/k8s-deploy@v4
        with:
          namespace: production
          manifests: |
            k8s/deployment.yaml
            k8s/service.yaml
          images: |
            ${{ needs.build.outputs.image-tag }}
```

## Monitoring and Observability

### Prometheus Metrics

```python
from prometheus_client import Counter, Histogram, generate_latest
from fastapi import FastAPI, Response

app = FastAPI()

REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

REQUEST_LATENCY = Histogram(
    'http_request_duration_seconds',
    'HTTP request latency',
    ['method', 'endpoint']
)

@app.get("/metrics")
async def metrics():
    return Response(
        generate_latest(),
        media_type="text/plain"
    )
```

### Kubernetes Monitoring Stack

```yaml
# ServiceMonitor for Prometheus
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: api-server-monitor
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: api-server
  endpoints:
    - port: http
      path: /metrics
      interval: 30s
  namespaceSelector:
    matchNames:
      - production
```

## Key Takeaways

1. **Use multi-stage builds** to minimize image size
2. **Never run as root** in containers
3. **Set resource limits** to prevent noisy neighbors
4. **Implement proper health checks** for reliable orchestration
5. **Use namespaces** for environment isolation
6. **Enable HPA** for automatic scaling
7. **Store secrets securely** with Kubernetes Secrets or external vaults
8. **Implement proper logging** and monitoring from day one

## Conclusion

Docker and Kubernetes form the backbone of modern cloud-native applications. While the learning curve is steep, the benefits—consistency, scalability, and reliability—make it worthwhile. Start with Docker locally, then graduate to Kubernetes as your needs grow.

---

*Building containerized applications? Connect on [LinkedIn](https://www.linkedin.com/in/tushar-agrawal-91b67a28a) to discuss deployment strategies.*

## Related Articles

- [AWS Services for Backend Developers](/blog/aws-services-backend-developers-guide) - Deploy containers on AWS ECS/EKS
- [GitHub Actions CI/CD Complete Guide](/blog/github-actions-cicd-complete-guide) - Automate your Docker builds
- [Nginx Reverse Proxy & Load Balancing](/blog/nginx-reverse-proxy-load-balancing-guide) - Configure ingress for containers
- [System Design Interview Guide](/blog/system-design-interview-guide) - Design scalable containerized systems
