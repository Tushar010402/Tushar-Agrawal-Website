---
title: "Apache vs Nginx: Complete Web Server Comparison Guide for 2025"
description: "In-depth comparison of Apache and Nginx web servers covering architecture, performance, configuration, and real-world use cases. Learn which server is right for your project."
date: "2024-12-18"
author: "Tushar Agrawal"
tags: ["Apache", "Nginx", "Web Servers", "DevOps", "Performance", "Load Balancing", "Reverse Proxy"]
image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&h=630&fit=crop"
published: true
---

## Introduction

Choosing between Apache and Nginx is one of the most fundamental decisions in web infrastructure. Both are battle-tested, production-ready web servers, but they take fundamentally different approaches to handling web traffic. Having deployed both in production environments serving thousands of requests per second, I'll share a comprehensive comparison to help you make the right choice.

In this guide, we'll explore:
- Architectural differences and their implications
- Performance characteristics under various workloads
- Configuration approaches with practical examples
- Real-world deployment scenarios
- When to use each (or both together)

## Architecture Deep Dive

### Apache: Process-Based Architecture

Apache HTTP Server uses a **process-based** or **thread-based** architecture through Multi-Processing Modules (MPMs). Understanding these MPMs is crucial for optimization.

```
Apache Architecture (Prefork MPM)
================================

                    ┌─────────────────┐
                    │  Master Process │
                    │   (Parent)      │
                    └────────┬────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
           ▼                 ▼                 ▼
    ┌──────────┐      ┌──────────┐      ┌──────────┐
    │  Worker  │      │  Worker  │      │  Worker  │
    │ Process  │      │ Process  │      │ Process  │
    │    1     │      │    2     │      │    N     │
    └──────────┘      └──────────┘      └──────────┘
         │                 │                 │
         ▼                 ▼                 ▼
    1 Connection      1 Connection      1 Connection
```

**Apache MPM Types:**

```apache
# 1. Prefork MPM (Process-based)
# Best for: Compatibility with non-thread-safe modules (like mod_php)
<IfModule mpm_prefork_module>
    StartServers             5
    MinSpareServers          5
    MaxSpareServers         10
    MaxRequestWorkers      250
    MaxConnectionsPerChild   0
</IfModule>

# 2. Worker MPM (Hybrid: Process + Threads)
# Best for: High traffic with thread-safe modules
<IfModule mpm_worker_module>
    StartServers             3
    MinSpareThreads         75
    MaxSpareThreads        250
    ThreadsPerChild         25
    MaxRequestWorkers      400
    MaxConnectionsPerChild   0
</IfModule>

# 3. Event MPM (Async event-based)
# Best for: Keep-alive connections, modern workloads
<IfModule mpm_event_module>
    StartServers             3
    MinSpareThreads         75
    MaxSpareThreads        250
    ThreadsPerChild         25
    MaxRequestWorkers      400
    MaxConnectionsPerChild   0
</IfModule>
```

### Nginx: Event-Driven Architecture

Nginx uses an **event-driven, asynchronous** architecture that handles thousands of connections within a single worker process.

```
Nginx Architecture (Event-Driven)
=================================

                    ┌─────────────────┐
                    │  Master Process │
                    │  (Config, Mgmt) │
                    └────────┬────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
           ▼                 ▼                 ▼
    ┌──────────┐      ┌──────────┐      ┌──────────┐
    │  Worker  │      │  Worker  │      │  Worker  │
    │ Process  │      │ Process  │      │ Process  │
    │    1     │      │    2     │      │    N     │
    └──────────┘      └──────────┘      └──────────┘
         │                 │                 │
         ▼                 ▼                 ▼
    ┌─────────┐       ┌─────────┐       ┌─────────┐
    │  Event  │       │  Event  │       │  Event  │
    │  Loop   │       │  Loop   │       │  Loop   │
    │(epoll/  │       │(epoll/  │       │(epoll/  │
    │ kqueue) │       │ kqueue) │       │ kqueue) │
    └─────────┘       └─────────┘       └─────────┘
         │                 │                 │
         ▼                 ▼                 ▼
    1000s of          1000s of          1000s of
    Connections       Connections       Connections
```

**Nginx Configuration:**

```nginx
# /etc/nginx/nginx.conf
user nginx;
worker_processes auto;  # Match CPU cores
worker_rlimit_nofile 65535;

events {
    worker_connections 4096;  # Connections per worker
    use epoll;                # Linux: epoll, BSD: kqueue
    multi_accept on;          # Accept multiple connections at once
}

http {
    # Optimize file serving
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;

    # Keep-alive settings
    keepalive_timeout 65;
    keepalive_requests 100;

    # Buffer sizes
    client_body_buffer_size 128k;
    client_max_body_size 10m;
    client_header_buffer_size 1k;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript;
}
```

## Performance Comparison

### Static File Serving

Nginx excels at serving static content due to its event-driven architecture:

```
Static File Serving Benchmark (1KB file, 10,000 concurrent connections)
======================================================================

                Requests/sec    Memory Usage    CPU Usage
Nginx           50,000+         50MB            15%
Apache (Event)  25,000          200MB           45%
Apache (Worker) 15,000          500MB           60%
Apache (Prefork) 8,000          1.5GB           80%

Note: Results vary based on hardware and configuration
```

**Nginx Static File Configuration:**

```nginx
server {
    listen 80;
    server_name static.example.com;
    root /var/www/static;

    # Efficient static file serving
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;

        # Open file cache
        open_file_cache max=1000 inactive=20s;
        open_file_cache_valid 30s;
        open_file_cache_min_uses 2;
        open_file_cache_errors on;
    }

    # Try files, then directory, then 404
    location / {
        try_files $uri $uri/ =404;
    }
}
```

**Apache Static File Configuration:**

```apache
<VirtualHost *:80>
    ServerName static.example.com
    DocumentRoot /var/www/static

    # Enable caching
    <IfModule mod_expires.c>
        ExpiresActive On
        ExpiresByType image/jpeg "access plus 1 year"
        ExpiresByType image/png "access plus 1 year"
        ExpiresByType text/css "access plus 1 year"
        ExpiresByType application/javascript "access plus 1 year"
    </IfModule>

    # Disable .htaccess for performance
    <Directory /var/www/static>
        AllowOverride None
        Options -Indexes
        Require all granted
    </Directory>

    # Enable sendfile
    EnableSendfile On
    EnableMMAP On
</VirtualHost>
```

### Dynamic Content (PHP)

For PHP applications, both servers can perform well with proper configuration:

```
PHP Application Benchmark (WordPress, 100 concurrent users)
==========================================================

                Requests/sec    TTFB (avg)    Memory
Nginx + PHP-FPM    850          45ms          300MB
Apache + mod_php   600          65ms          800MB
Apache + PHP-FPM   750          50ms          400MB
```

**Nginx with PHP-FPM:**

```nginx
server {
    listen 80;
    server_name app.example.com;
    root /var/www/app/public;
    index index.php index.html;

    # PHP handling
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;

        # FastCGI optimizations
        fastcgi_buffer_size 128k;
        fastcgi_buffers 256 16k;
        fastcgi_busy_buffers_size 256k;
        fastcgi_temp_file_write_size 256k;
        fastcgi_read_timeout 300;

        # Cache fastcgi responses (optional)
        # fastcgi_cache_valid 200 60m;
    }

    # Deny access to .htaccess
    location ~ /\.ht {
        deny all;
    }

    # Laravel/Symfony style routing
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
}
```

**Apache with PHP-FPM (Recommended):**

```apache
<VirtualHost *:80>
    ServerName app.example.com
    DocumentRoot /var/www/app/public

    <Directory /var/www/app/public>
        AllowOverride All
        Require all granted
    </Directory>

    # PHP-FPM via proxy
    <FilesMatch \.php$>
        SetHandler "proxy:unix:/var/run/php/php8.2-fpm.sock|fcgi://localhost"
    </FilesMatch>

    # Security
    <FilesMatch "^\.ht">
        Require all denied
    </FilesMatch>
</VirtualHost>
```

## Configuration Comparison

### Virtual Hosts / Server Blocks

**Apache Virtual Host:**

```apache
# /etc/apache2/sites-available/myapp.conf
<VirtualHost *:80>
    ServerName myapp.com
    ServerAlias www.myapp.com
    DocumentRoot /var/www/myapp/public

    ErrorLog ${APACHE_LOG_DIR}/myapp_error.log
    CustomLog ${APACHE_LOG_DIR}/myapp_access.log combined

    <Directory /var/www/myapp/public>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    # Environment variables
    SetEnv APP_ENV production
    SetEnv DB_HOST localhost
</VirtualHost>

# Enable site
# a2ensite myapp.conf && systemctl reload apache2
```

**Nginx Server Block:**

```nginx
# /etc/nginx/sites-available/myapp.conf
server {
    listen 80;
    server_name myapp.com www.myapp.com;
    root /var/www/myapp/public;
    index index.php index.html;

    access_log /var/log/nginx/myapp_access.log;
    error_log /var/log/nginx/myapp_error.log;

    # Environment variables (passed to FastCGI)
    set $app_env production;
    set $db_host localhost;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_param APP_ENV $app_env;
        fastcgi_param DB_HOST $db_host;
        include fastcgi_params;
    }
}

# Enable site
# ln -s /etc/nginx/sites-available/myapp.conf /etc/nginx/sites-enabled/
# nginx -t && systemctl reload nginx
```

### SSL/TLS Configuration

**Apache SSL:**

```apache
<VirtualHost *:443>
    ServerName secure.example.com
    DocumentRoot /var/www/secure

    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/example.com.crt
    SSLCertificateKeyFile /etc/ssl/private/example.com.key
    SSLCertificateChainFile /etc/ssl/certs/chain.crt

    # Modern SSL settings
    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384
    SSLHonorCipherOrder off
    SSLSessionTickets off

    # HSTS
    Header always set Strict-Transport-Security "max-age=63072000"

    # OCSP Stapling
    SSLUseStapling on
    SSLStaplingResponderTimeout 5
    SSLStaplingReturnResponderErrors off
</VirtualHost>

# OCSP cache (in global config)
SSLStaplingCache shmcb:/var/run/ocsp(128000)

# HTTP to HTTPS redirect
<VirtualHost *:80>
    ServerName secure.example.com
    Redirect permanent / https://secure.example.com/
</VirtualHost>
```

**Nginx SSL:**

```nginx
server {
    listen 443 ssl http2;
    server_name secure.example.com;
    root /var/www/secure;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/example.com.crt;
    ssl_certificate_key /etc/ssl/private/example.com.key;
    ssl_trusted_certificate /etc/ssl/certs/chain.crt;

    # Modern SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # SSL session caching
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name secure.example.com;
    return 301 https://$server_name$request_uri;
}
```

## Reverse Proxy Configuration

### Nginx as Reverse Proxy

Nginx is widely preferred for reverse proxy scenarios:

```nginx
# Load balancing multiple backend servers
upstream backend_servers {
    least_conn;  # Load balancing method

    server 10.0.0.1:8080 weight=3;
    server 10.0.0.2:8080 weight=2;
    server 10.0.0.3:8080 backup;

    # Health checks (Nginx Plus only, or use upstream_check module)
    keepalive 32;  # Keep connections alive to backends
}

server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://backend_servers;

        # Proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffering
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

### Apache as Reverse Proxy

```apache
<VirtualHost *:80>
    ServerName api.example.com

    # Enable proxy modules
    # a2enmod proxy proxy_http proxy_balancer lbmethod_byrequests

    # Load balancer configuration
    <Proxy "balancer://backend">
        BalancerMember "http://10.0.0.1:8080" loadfactor=3
        BalancerMember "http://10.0.0.2:8080" loadfactor=2
        BalancerMember "http://10.0.0.3:8080" status=+H  # Hot standby

        ProxySet lbmethod=byrequests
        ProxySet stickysession=JSESSIONID
    </Proxy>

    # Proxy settings
    ProxyPreserveHost On
    ProxyPass "/" "balancer://backend/"
    ProxyPassReverse "/" "balancer://backend/"

    # Headers
    RequestHeader set X-Forwarded-Proto "http"
    RequestHeader set X-Real-IP "%{REMOTE_ADDR}s"

    # Timeouts
    ProxyTimeout 60

    # WebSocket proxy
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/?(.*) "ws://backend/$1" [P,L]
</VirtualHost>
```

## Module Ecosystem

### Apache Modules

Apache's strength is its extensive module ecosystem:

```apache
# Common Apache modules
LoadModule rewrite_module modules/mod_rewrite.so
LoadModule ssl_module modules/mod_ssl.so
LoadModule headers_module modules/mod_headers.so
LoadModule deflate_module modules/mod_deflate.so
LoadModule expires_module modules/mod_expires.so
LoadModule proxy_module modules/mod_proxy.so
LoadModule proxy_http_module modules/mod_proxy_http.so
LoadModule security2_module modules/mod_security2.so  # WAF

# Enable modules on Debian/Ubuntu
# a2enmod rewrite ssl headers deflate expires proxy proxy_http

# .htaccess support (flexible but slower)
<Directory /var/www/html>
    AllowOverride All  # Enable .htaccess
</Directory>
```

**Popular Apache Modules:**
- `mod_rewrite` - URL rewriting
- `mod_security` - Web Application Firewall
- `mod_php` - Embedded PHP (deprecated, use PHP-FPM)
- `mod_pagespeed` - Automatic optimization
- `mod_evasive` - DDoS protection
- `mod_auth_*` - Various authentication methods

### Nginx Modules

Nginx modules are compiled-in (mostly) but very efficient:

```nginx
# Check compiled modules
# nginx -V 2>&1 | grep -o 'with-[^[:space:]]*'

# Common configurations using built-in modules

# Rate limiting (ngx_http_limit_req_module)
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
server {
    location /api/ {
        limit_req zone=api burst=20 nodelay;
    }
}

# Caching (ngx_http_proxy_module)
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=cache:10m max_size=1g;
server {
    location / {
        proxy_cache cache;
        proxy_cache_valid 200 60m;
        proxy_cache_use_stale error timeout updating;
    }
}

# Gzip (ngx_http_gzip_module)
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;
gzip_comp_level 6;

# Brotli (requires ngx_brotli module)
# brotli on;
# brotli_types text/plain text/css application/json application/javascript;
```

## Memory and Resource Usage

```
Resource Comparison (Serving 10,000 concurrent connections)
==========================================================

Metric              Nginx           Apache (Event)    Apache (Prefork)
Memory per conn     ~2.5KB          ~10KB            ~10MB (process)
Total memory        ~25MB           ~100MB           ~100GB
File descriptors    10,000          10,000           10,000 processes
CPU context switch  Minimal         Moderate         High
```

**Memory Optimization for Nginx:**

```nginx
# /etc/nginx/nginx.conf
worker_processes auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 4096;
    use epoll;
}

http {
    # Reduce memory for idle connections
    reset_timedout_connection on;

    # Optimize buffers
    client_body_buffer_size 16k;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 8k;

    # Limit request body size
    client_max_body_size 8m;
}
```

**Memory Optimization for Apache:**

```apache
# Use Event MPM
<IfModule mpm_event_module>
    StartServers             2
    MinSpareThreads         25
    MaxSpareThreads         75
    ThreadLimit             64
    ThreadsPerChild         25
    MaxRequestWorkers      150
    MaxConnectionsPerChild 1000  # Recycle workers to prevent memory leaks
</IfModule>

# Disable unnecessary modules
# a2dismod autoindex status cgi

# Limit request sizes
LimitRequestBody 8388608
LimitRequestFields 50
LimitRequestFieldSize 8190
```

## Real-World Deployment Scenarios

### Scenario 1: Static Website + CDN Origin

**Best Choice: Nginx**

```nginx
# High-performance static site origin
server {
    listen 80;
    server_name cdn-origin.example.com;
    root /var/www/static;

    # Aggressive caching headers for CDN
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header X-Content-Type-Options "nosniff";
        access_log off;
    }

    # HTML files - shorter cache
    location ~* \.html$ {
        expires 1h;
        add_header Cache-Control "public, must-revalidate";
    }

    # Enable gzip for all responses
    gzip on;
    gzip_vary on;
    gzip_min_length 256;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
```

### Scenario 2: PHP Application (WordPress/Laravel)

**Best Choice: Nginx + PHP-FPM or Apache with PHP-FPM**

```nginx
# Nginx for WordPress
server {
    listen 80;
    server_name wordpress.example.com;
    root /var/www/wordpress;
    index index.php;

    # WordPress permalinks
    location / {
        try_files $uri $uri/ /index.php?$args;
    }

    # PHP handling
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_intercept_errors on;
    }

    # Block sensitive files
    location ~ /\.(ht|git|svn) {
        deny all;
    }

    location = /wp-config.php {
        deny all;
    }

    # Static file caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
```

### Scenario 3: Microservices API Gateway

**Best Choice: Nginx**

```nginx
# API Gateway configuration
upstream user_service {
    server user-svc:8080;
    keepalive 32;
}

upstream order_service {
    server order-svc:8080;
    keepalive 32;
}

upstream product_service {
    server product-svc:8080;
    keepalive 32;
}

server {
    listen 80;
    server_name api.example.com;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;

    # API versioning via path
    location /v1/users {
        limit_req zone=api_limit burst=50 nodelay;
        proxy_pass http://user_service;
        include /etc/nginx/proxy_params;
    }

    location /v1/orders {
        limit_req zone=api_limit burst=50 nodelay;
        proxy_pass http://order_service;
        include /etc/nginx/proxy_params;
    }

    location /v1/products {
        limit_req zone=api_limit burst=50 nodelay;
        proxy_pass http://product_service;
        include /etc/nginx/proxy_params;
    }

    # Health check
    location /health {
        access_log off;
        return 200 '{"status":"healthy"}';
        add_header Content-Type application/json;
    }
}

# /etc/nginx/proxy_params
proxy_http_version 1.1;
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header Connection "";
proxy_connect_timeout 5s;
proxy_read_timeout 30s;
```

### Scenario 4: Legacy Application with .htaccess

**Best Choice: Apache**

```apache
# When you need .htaccess support
<VirtualHost *:80>
    ServerName legacy.example.com
    DocumentRoot /var/www/legacy

    <Directory /var/www/legacy>
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>

# Example .htaccess in application
# RewriteEngine On
# RewriteCond %{REQUEST_FILENAME} !-f
# RewriteCond %{REQUEST_FILENAME} !-d
# RewriteRule ^(.*)$ index.php/$1 [L]
```

## Hybrid Setup: Nginx + Apache

For the best of both worlds, use Nginx as a reverse proxy in front of Apache:

```
Hybrid Architecture
===================

    Client Request
          │
          ▼
    ┌───────────┐
    │   Nginx   │ ◄── Static files, SSL termination,
    │  (Front)  │     caching, load balancing
    └─────┬─────┘
          │
          ▼
    ┌───────────┐
    │  Apache   │ ◄── Dynamic content, .htaccess,
    │ (Backend) │     mod_php (legacy), mod_security
    └───────────┘
```

**Nginx Frontend:**

```nginx
upstream apache_backend {
    server 127.0.0.1:8080;
    keepalive 32;
}

server {
    listen 80;
    server_name hybrid.example.com;
    root /var/www/hybrid;

    # Serve static files directly from Nginx
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff2)$ {
        expires 30d;
        access_log off;
        try_files $uri @apache;
    }

    # Pass everything else to Apache
    location / {
        proxy_pass http://apache_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location @apache {
        proxy_pass http://apache_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Apache Backend:**

```apache
# Listen on localhost only
Listen 127.0.0.1:8080

<VirtualHost 127.0.0.1:8080>
    ServerName hybrid.example.com
    DocumentRoot /var/www/hybrid

    # Trust Nginx proxy headers
    RemoteIPHeader X-Real-IP

    <Directory /var/www/hybrid>
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

## Decision Matrix

```
When to Choose Which Server
===========================

Use Case                              Nginx    Apache    Hybrid
─────────────────────────────────────────────────────────────────
Static file serving                   ✓✓✓      ✓        ✓✓
High concurrent connections           ✓✓✓      ✓        ✓✓
Reverse proxy / Load balancer         ✓✓✓      ✓✓       ✓✓✓
PHP applications                      ✓✓       ✓✓✓      ✓✓✓
.htaccess required                    ✗        ✓✓✓      ✓✓✓
mod_security (WAF)                    ✓        ✓✓✓      ✓✓✓
Memory constrained environment        ✓✓✓      ✓        ✓✓
SSL termination                       ✓✓✓      ✓✓       ✓✓✓
WebSocket proxy                       ✓✓✓      ✓✓       ✓✓✓
Streaming / Long-polling              ✓✓✓      ✓        ✓✓
Legacy application support            ✓        ✓✓✓      ✓✓✓
Configuration flexibility             ✓✓       ✓✓✓      ✓✓✓
Learning curve (simpler)              ✓✓✓      ✓✓       ✓

✓✓✓ = Excellent  ✓✓ = Good  ✓ = Adequate  ✗ = Not recommended
```

## Migration Guide: Apache to Nginx

### Step 1: Audit Current Configuration

```bash
# List enabled Apache modules
apache2ctl -M

# Find all virtual hosts
grep -r "ServerName" /etc/apache2/sites-enabled/

# Check for .htaccess files
find /var/www -name ".htaccess" -exec cat {} \;
```

### Step 2: Convert Common Directives

```
Apache → Nginx Conversion Cheatsheet
====================================

Apache                          Nginx
─────────────────────────────────────────────────────
DocumentRoot /var/www           root /var/www;
DirectoryIndex index.php        index index.php;
ServerName example.com          server_name example.com;
ErrorLog /var/log/error.log     error_log /var/log/error.log;
CustomLog /var/log/access.log   access_log /var/log/access.log;
Redirect 301 /old /new          return 301 /new;
RewriteRule ^/old$ /new [R=301] rewrite ^/old$ /new permanent;
ProxyPass / http://backend/     proxy_pass http://backend;
<Location /path>                location /path { }
<Directory /path>               location /path { }  (context-dependent)
```

### Step 3: Convert .htaccess to Nginx

```apache
# Original .htaccess
RewriteEngine On
RewriteBase /
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.php?q=$1 [L,QSA]
```

```nginx
# Equivalent Nginx
location / {
    try_files $uri $uri/ /index.php?q=$uri&$args;
}
```

## Conclusion

Both Apache and Nginx are excellent web servers with different strengths:

**Choose Nginx when:**
- Serving high-traffic static content
- Building a reverse proxy or load balancer
- Memory efficiency is critical
- Handling many concurrent connections

**Choose Apache when:**
- You need .htaccess per-directory configuration
- Running legacy applications with mod_php
- Complex authentication requirements (mod_auth_*)
- Need Web Application Firewall (mod_security)

**Consider a hybrid setup when:**
- You want the best of both worlds
- Migrating from Apache gradually
- Different applications have different requirements

In my experience at Dr Dangs Lab, we use Nginx as the primary reverse proxy and load balancer, with backend services running on their optimal platforms. This hybrid approach gives us the performance of Nginx with the flexibility to use different technologies behind it.

## Related Articles

- [Docker & Kubernetes Deployment Guide](/blog/docker-kubernetes-deployment-guide) - Containerize your web servers
- [AWS Services for Backend Developers](/blog/aws-services-backend-developers-guide) - Deploy on cloud infrastructure
- [Nginx Reverse Proxy & Load Balancing Guide](/blog/nginx-reverse-proxy-load-balancing-guide) - Deep dive into Nginx proxy features
- [GitHub Actions CI/CD Complete Guide](/blog/github-actions-cicd-complete-guide) - Automate web server deployments
