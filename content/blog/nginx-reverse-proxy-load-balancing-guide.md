---
title: "Nginx Reverse Proxy and Load Balancing: Complete Production Guide"
description: "Master Nginx configuration for reverse proxy, load balancing, SSL termination, caching, and rate limiting. Learn production-ready configurations with practical examples and performance optimization."
date: "2024-12-09"
author: "Tushar Agrawal"
tags: ["Nginx", "Load Balancing", "DevOps", "Web Server", "Performance", "SSL"]
image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&h=630&fit=crop"
published: true
---

## Introduction

Nginx powers over 30% of all websites and is the go-to solution for reverse proxying and load balancing. At Dr. Dangs Lab, Nginx handles millions of requests daily, routing traffic across our microservices. This guide covers everything from basics to production-ready configurations.

## Nginx Architecture

```
                        ┌─────────────────────────┐
                        │       Internet          │
                        └───────────┬─────────────┘
                                    │
                        ┌───────────▼─────────────┐
                        │      Nginx Server       │
                        │   (Reverse Proxy/LB)    │
                        │                         │
                        │ ┌─────────────────────┐ │
                        │ │   Worker Process 1  │ │
                        │ │   Worker Process 2  │ │
                        │ │   Worker Process N  │ │
                        │ └─────────────────────┘ │
                        └───────────┬─────────────┘
                                    │
           ┌────────────────────────┼────────────────────────┐
           │                        │                        │
    ┌──────▼──────┐          ┌──────▼──────┐          ┌──────▼──────┐
    │  Backend 1  │          │  Backend 2  │          │  Backend 3  │
    │ (App Server)│          │ (App Server)│          │ (App Server)│
    └─────────────┘          └─────────────┘          └─────────────┘
```

## Basic Reverse Proxy

### Simple Configuration

```nginx
# /etc/nginx/nginx.conf
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;  # Linux only
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for" '
                    'rt=$request_time uct="$upstream_connect_time" '
                    'uht="$upstream_header_time" urt="$upstream_response_time"';

    access_log /var/log/nginx/access.log main;

    # Performance settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json
               application/javascript application/xml+rss
               application/atom+xml image/svg+xml;

    include /etc/nginx/conf.d/*.conf;
}
```

### Reverse Proxy Configuration

```nginx
# /etc/nginx/conf.d/app.conf
server {
    listen 80;
    server_name api.example.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;

        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }
}
```

## Load Balancing

### Round Robin (Default)

```nginx
upstream backend_servers {
    server 10.0.0.1:8000;
    server 10.0.0.2:8000;
    server 10.0.0.3:8000;
}

server {
    listen 80;

    location / {
        proxy_pass http://backend_servers;
    }
}
```

### Weighted Load Balancing

```nginx
upstream backend_servers {
    server 10.0.0.1:8000 weight=5;  # Gets 5x more traffic
    server 10.0.0.2:8000 weight=3;  # Gets 3x more traffic
    server 10.0.0.3:8000 weight=1;  # Baseline
}
```

### Least Connections

```nginx
upstream backend_servers {
    least_conn;
    server 10.0.0.1:8000;
    server 10.0.0.2:8000;
    server 10.0.0.3:8000;
}
```

### IP Hash (Session Persistence)

```nginx
upstream backend_servers {
    ip_hash;
    server 10.0.0.1:8000;
    server 10.0.0.2:8000;
    server 10.0.0.3:8000;
}
```

### Health Checks and Failover

```nginx
upstream backend_servers {
    server 10.0.0.1:8000 max_fails=3 fail_timeout=30s;
    server 10.0.0.2:8000 max_fails=3 fail_timeout=30s;
    server 10.0.0.3:8000 backup;  # Only used when others fail

    # Keep connections alive
    keepalive 32;
}

server {
    location / {
        proxy_pass http://backend_servers;
        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503;
        proxy_connect_timeout 2s;
        proxy_read_timeout 30s;
    }
}
```

## Advanced Configurations

### Rate Limiting

```nginx
# Define rate limit zone
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login_limit:10m rate=1r/s;

server {
    # Apply rate limiting
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        limit_req_status 429;
        proxy_pass http://backend_servers;
    }

    # Stricter limit for login
    location /api/auth/login {
        limit_req zone=login_limit burst=5 nodelay;
        limit_req_status 429;
        proxy_pass http://backend_servers;
    }
}

# Custom error page for rate limit
error_page 429 @rate_limit_exceeded;
location @rate_limit_exceeded {
    default_type application/json;
    return 429 '{"error": "Too many requests", "retry_after": 60}';
}
```

### Caching

```nginx
# Define cache zone
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:100m
                 max_size=10g inactive=60m use_temp_path=off;

server {
    location /api/public/ {
        proxy_cache api_cache;
        proxy_cache_valid 200 10m;
        proxy_cache_valid 404 1m;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503;
        proxy_cache_lock on;

        # Cache key
        proxy_cache_key "$scheme$request_method$host$request_uri";

        # Add cache status header
        add_header X-Cache-Status $upstream_cache_status;

        proxy_pass http://backend_servers;
    }

    # Skip cache for authenticated requests
    location /api/private/ {
        proxy_cache api_cache;
        proxy_cache_bypass $http_authorization;
        proxy_no_cache $http_authorization;
        proxy_pass http://backend_servers;
    }
}
```

### WebSocket Support

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

upstream websocket_servers {
    server 10.0.0.1:8080;
    server 10.0.0.2:8080;
}

server {
    location /ws/ {
        proxy_pass http://websocket_servers;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;

        # Longer timeout for WebSocket
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
```

### Static File Serving

```nginx
server {
    # Serve static files directly
    location /static/ {
        alias /var/www/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Serve media files
    location /media/ {
        alias /var/www/media/;
        expires 30d;
        add_header Cache-Control "public";
    }

    # SPA fallback
    location / {
        root /var/www/app;
        try_files $uri $uri/ /index.html;
        expires -1;  # No cache for HTML
    }

    # API proxy
    location /api/ {
        proxy_pass http://backend_servers;
    }
}
```

### Security Headers

```nginx
server {
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'" always;

    # Hide Nginx version
    server_tokens off;

    # Block bad bots
    if ($http_user_agent ~* (wget|curl|scrapy|bot|spider)) {
        return 403;
    }

    # Block common exploits
    location ~ /\. {
        deny all;
    }

    location ~* \.(git|env|sql|bak)$ {
        deny all;
    }
}
```

## Microservices Routing

```nginx
# Route to different services based on path
upstream user_service {
    server 10.0.1.1:8000;
    server 10.0.1.2:8000;
}

upstream order_service {
    server 10.0.2.1:8000;
    server 10.0.2.2:8000;
}

upstream product_service {
    server 10.0.3.1:8000;
    server 10.0.3.2:8000;
}

upstream notification_service {
    server 10.0.4.1:8000;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    # User service
    location /api/users/ {
        proxy_pass http://user_service/;
        include /etc/nginx/proxy_params.conf;
    }

    # Order service
    location /api/orders/ {
        proxy_pass http://order_service/;
        include /etc/nginx/proxy_params.conf;
    }

    # Product service
    location /api/products/ {
        proxy_pass http://product_service/;
        include /etc/nginx/proxy_params.conf;
    }

    # Notification WebSocket
    location /api/notifications/ws {
        proxy_pass http://notification_service/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

# /etc/nginx/proxy_params.conf
proxy_http_version 1.1;
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Request-ID $request_id;
proxy_connect_timeout 5s;
proxy_read_timeout 30s;
```

## Docker and Kubernetes

### Docker Compose Example

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - app1
      - app2
    networks:
      - app-network

  app1:
    image: myapp:latest
    environment:
      - PORT=8000
    networks:
      - app-network

  app2:
    image: myapp:latest
    environment:
      - PORT=8000
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

```nginx
# nginx.conf for Docker
upstream app {
    server app1:8000;
    server app2:8000;
}

server {
    listen 80;
    location / {
        proxy_pass http://app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Kubernetes Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
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
          - path: /users
            pathType: Prefix
            backend:
              service:
                name: user-service
                port:
                  number: 80
          - path: /orders
            pathType: Prefix
            backend:
              service:
                name: order-service
                port:
                  number: 80
```

## Monitoring and Debugging

### Enable Status Module

```nginx
server {
    listen 127.0.0.1:8080;

    location /nginx_status {
        stub_status on;
        access_log off;
        allow 127.0.0.1;
        deny all;
    }
}
```

### Debug Logging

```nginx
# Detailed error logging
error_log /var/log/nginx/error.log debug;

# Log specific variables
log_format debug '$remote_addr - [$time_local] '
                 '"$request" $status $body_bytes_sent '
                 'upstream: $upstream_addr '
                 'cache: $upstream_cache_status '
                 'time: $request_time';
```

### Testing Configuration

```bash
# Test configuration syntax
nginx -t

# Test and show full configuration
nginx -T

# Reload without downtime
nginx -s reload

# View current connections
curl http://localhost:8080/nginx_status
# Active connections: 291
# server accepts handled requests
#  16630948 16630948 31070465
# Reading: 6 Writing: 179 Waiting: 106
```

## Performance Optimization

```nginx
# Worker optimization
worker_processes auto;  # One per CPU core
worker_rlimit_nofile 65535;

events {
    worker_connections 4096;
    use epoll;
    multi_accept on;
}

http {
    # Buffer sizes
    client_body_buffer_size 10K;
    client_header_buffer_size 1k;
    client_max_body_size 10m;
    large_client_header_buffers 4 32k;

    # Timeouts
    client_body_timeout 12;
    client_header_timeout 12;
    keepalive_timeout 15;
    send_timeout 10;

    # File handling
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;

    # Open file cache
    open_file_cache max=200000 inactive=20s;
    open_file_cache_valid 30s;
    open_file_cache_min_uses 2;
    open_file_cache_errors on;
}
```

## Key Takeaways

1. **Use upstream blocks** for load balancing flexibility
2. **Enable keepalive** between Nginx and backends
3. **Configure health checks** for automatic failover
4. **Implement rate limiting** to protect services
5. **Cache static content** aggressively
6. **Use SSL termination** at Nginx level
7. **Monitor with stub_status** and logs
8. **Test configuration** before reload

## Conclusion

Nginx is an incredibly powerful tool for reverse proxying and load balancing. Start with basic configurations, then add features like caching, rate limiting, and health checks as your needs grow. The key is to understand your traffic patterns and optimize accordingly.

---

*Building scalable infrastructure? Connect on [LinkedIn](https://www.linkedin.com/in/tushar-agrawal-91b67a28a) to discuss architecture patterns.*
