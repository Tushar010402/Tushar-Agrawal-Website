---
title: "PM2 & Linux Services: Production Node.js Deployment Guide"
description: "Complete guide to deploying Node.js applications in production using PM2 process manager and Linux systemd services. Learn cluster mode, zero-downtime deployments, and monitoring."
date: "2024-12-18"
author: "Tushar Agrawal"
tags: ["PM2", "Node.js", "Linux", "Systemd", "Process Management", "DevOps", "Production", "Deployment"]
image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&h=630&fit=crop"
published: true
---

## Introduction

Running Node.js applications in production requires robust process management to handle crashes, enable zero-downtime deployments, and utilize multiple CPU cores effectively. Two primary approaches dominate the Linux ecosystem: **PM2** (a Node.js-specific process manager) and **systemd** (the Linux system and service manager).

In this guide, we'll explore:
- PM2 fundamentals and advanced features
- Linux systemd service creation and management
- When to use each approach
- Production-ready configurations
- Monitoring and logging strategies

## PM2 Fundamentals

### Installation and Basic Usage

```bash
# Install PM2 globally
npm install -g pm2

# Or with yarn
yarn global add pm2

# Verify installation
pm2 --version
```

### Starting Applications

```bash
# Basic start
pm2 start app.js

# With a custom name
pm2 start app.js --name "my-api"

# Start with arguments
pm2 start app.js -- --port 3000

# Start a script from package.json
pm2 start npm --name "my-app" -- start

# Start with environment variables
pm2 start app.js --env production
```

### Process Management Commands

```bash
# List all processes
pm2 list
pm2 ls
pm2 status

# Detailed process info
pm2 show <app-name>
pm2 describe <app-name>

# Restart processes
pm2 restart <app-name>
pm2 restart all

# Stop processes
pm2 stop <app-name>
pm2 stop all

# Delete processes from PM2
pm2 delete <app-name>
pm2 delete all

# Reload with zero downtime (graceful reload)
pm2 reload <app-name>
pm2 reload all
```

## PM2 Cluster Mode

PM2's cluster mode allows you to run multiple instances of your Node.js application, utilizing all available CPU cores:

```
PM2 Cluster Mode Architecture
=============================

         ┌─────────────────────────────────────┐
         │            PM2 Master               │
         │     (Load Balancer + Monitor)       │
         └──────────────┬──────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
   ┌─────────┐    ┌─────────┐    ┌─────────┐
   │ Worker  │    │ Worker  │    │ Worker  │
   │   0     │    │   1     │    │   2     │
   │ (CPU 0) │    │ (CPU 1) │    │ (CPU 2) │
   └─────────┘    └─────────┘    └─────────┘
        │               │               │
        └───────────────┼───────────────┘
                        │
                        ▼
              Incoming Requests
              (Round-robin LB)
```

### Starting in Cluster Mode

```bash
# Start with all available CPUs
pm2 start app.js -i max

# Start with specific number of instances
pm2 start app.js -i 4

# Start with CPUs minus 1 (leave one for OS)
pm2 start app.js -i -1
```

### Cluster Mode Application Example

```javascript
// app.js - Express application optimized for cluster mode
const express = require('express');
const process = require('process');

const app = express();
const PORT = process.env.PORT || 3000;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    pid: process.pid,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// Your application routes
app.get('/api/data', (req, res) => {
  res.json({
    message: 'Hello from worker ' + process.pid,
    timestamp: new Date().toISOString(),
  });
});

// Graceful shutdown handling
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

function gracefulShutdown() {
  console.log(`Worker ${process.pid} shutting down gracefully...`);

  // Stop accepting new connections
  server.close(() => {
    console.log(`Worker ${process.pid} closed all connections`);
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    console.error(`Worker ${process.pid} forcing shutdown`);
    process.exit(1);
  }, 10000);
}

const server = app.listen(PORT, () => {
  console.log(`Worker ${process.pid} listening on port ${PORT}`);
});
```

## PM2 Ecosystem File

The ecosystem file (`ecosystem.config.js`) is the recommended way to configure PM2 applications:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'api-server',
      script: './src/server.js',
      instances: 'max',  // Cluster mode with all CPUs
      exec_mode: 'cluster',

      // Environment variables
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8080,
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 8081,
      },

      // Logging
      log_file: '/var/log/pm2/api-combined.log',
      out_file: '/var/log/pm2/api-out.log',
      error_file: '/var/log/pm2/api-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Auto-restart settings
      watch: false,  // Don't watch in production
      max_memory_restart: '1G',  // Restart if memory exceeds 1GB
      restart_delay: 4000,  // Wait 4s between restarts

      // Crash recovery
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',

      // Graceful shutdown
      kill_timeout: 5000,  // 5s to gracefully shutdown
      listen_timeout: 3000,  // 3s to start listening

      // Instance variables
      instance_var: 'INSTANCE_ID',
    },
    {
      name: 'worker',
      script: './src/worker.js',
      instances: 2,
      exec_mode: 'cluster',

      env_production: {
        NODE_ENV: 'production',
        QUEUE_URL: 'redis://localhost:6379',
      },

      cron_restart: '0 0 * * *',  // Restart daily at midnight
    },
    {
      name: 'scheduler',
      script: './src/scheduler.js',
      instances: 1,  // Single instance for cron jobs
      exec_mode: 'fork',

      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: ['server1.example.com', 'server2.example.com'],
      ref: 'origin/main',
      repo: 'git@github.com:username/repo.git',
      path: '/var/www/production',
      'pre-deploy-local': '',
      'post-deploy': 'npm ci && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
    },
    staging: {
      user: 'deploy',
      host: 'staging.example.com',
      ref: 'origin/develop',
      repo: 'git@github.com:username/repo.git',
      path: '/var/www/staging',
      'post-deploy': 'npm ci && pm2 reload ecosystem.config.js --env staging',
    },
  },
};
```

### Using the Ecosystem File

```bash
# Start all apps
pm2 start ecosystem.config.js

# Start specific app
pm2 start ecosystem.config.js --only api-server

# Start with specific environment
pm2 start ecosystem.config.js --env production

# Reload all apps (zero downtime)
pm2 reload ecosystem.config.js

# Deploy to production
pm2 deploy production setup    # First time setup
pm2 deploy production          # Deploy
pm2 deploy production revert 1 # Rollback 1 commit
```

## Linux systemd Services

systemd is the default init system on most modern Linux distributions and provides a powerful way to manage services.

### systemd Service File Structure

```ini
# /etc/systemd/system/myapp.service
[Unit]
Description=My Node.js Application
Documentation=https://example.com/docs
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=nodeapp
Group=nodeapp
WorkingDirectory=/var/www/myapp

# Environment
Environment=NODE_ENV=production
Environment=PORT=3000
EnvironmentFile=/var/www/myapp/.env

# Process management
ExecStart=/usr/bin/node /var/www/myapp/dist/server.js
ExecReload=/bin/kill -HUP $MAINPID
ExecStop=/bin/kill -TERM $MAINPID

# Restart policy
Restart=always
RestartSec=10
StartLimitInterval=60
StartLimitBurst=3

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/www/myapp/logs /var/www/myapp/uploads

# Resource limits
MemoryMax=1G
CPUQuota=80%

# Logging
StandardOutput=append:/var/log/myapp/stdout.log
StandardError=append:/var/log/myapp/stderr.log
SyslogIdentifier=myapp

[Install]
WantedBy=multi-user.target
```

### Managing systemd Services

```bash
# Reload systemd after changing service files
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable myapp.service

# Start service
sudo systemctl start myapp.service

# Stop service
sudo systemctl stop myapp.service

# Restart service
sudo systemctl restart myapp.service

# Check status
sudo systemctl status myapp.service

# View logs
sudo journalctl -u myapp.service
sudo journalctl -u myapp.service -f  # Follow logs
sudo journalctl -u myapp.service --since "1 hour ago"
```

### Running PM2 Under systemd

The best practice is to run PM2 itself under systemd:

```bash
# Generate systemd startup script
pm2 startup systemd

# This outputs a command like:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u deploy --hp /home/deploy

# Save current PM2 process list
pm2 save

# The saved list will auto-restore on system boot
```

**Generated systemd file for PM2:**

```ini
# /etc/systemd/system/pm2-deploy.service
[Unit]
Description=PM2 process manager
Documentation=https://pm2.keymetrics.io/
After=network.target

[Service]
Type=forking
User=deploy
LimitNOFILE=infinity
LimitNPROC=infinity
LimitCORE=infinity
Environment=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/snap/bin:/home/deploy/.nvm/versions/node/v20.10.0/bin
Environment=PM2_HOME=/home/deploy/.pm2
PIDFile=/home/deploy/.pm2/pm2.pid
Restart=on-failure

ExecStart=/home/deploy/.nvm/versions/node/v20.10.0/lib/node_modules/pm2/bin/pm2 resurrect
ExecReload=/home/deploy/.nvm/versions/node/v20.10.0/lib/node_modules/pm2/bin/pm2 reload all
ExecStop=/home/deploy/.nvm/versions/node/v20.10.0/lib/node_modules/pm2/bin/pm2 kill

[Install]
WantedBy=multi-user.target
```

## PM2 vs systemd: When to Use Which

```
Feature Comparison
==================

Feature                    PM2              systemd
──────────────────────────────────────────────────────────────
Cluster mode               Built-in         Manual (multiple units)
Zero-downtime reload       Built-in         Rolling restart
Log management             Built-in         journald
Process monitoring         Built-in + UI    journalctl + custom
Watch & auto-reload        Yes              inotify + script
Memory threshold restart   Yes              MemoryMax (OOM only)
Cron restarts              Yes              systemd timers
Deployment integration     Yes              No
Boot persistence           Needs setup      Native
Non-Node.js apps           Limited          Full support
Security hardening         Basic            Comprehensive
Resource limits            Basic            Comprehensive (cgroups)
Dependencies               Node.js          None
Learning curve             Easy             Moderate
```

### Use PM2 When:

1. **Running Node.js applications exclusively**
2. **Need cluster mode** for multi-core utilization
3. **Want built-in zero-downtime reloads**
4. **Prefer simple deployment workflows**
5. **Need log rotation and management**
6. **Want a web dashboard** (PM2 Plus)

### Use systemd When:

1. **Running multiple types of services** (not just Node.js)
2. **Need comprehensive security hardening**
3. **Want tight resource controls** (cgroups, memory limits)
4. **Managing system-level services**
5. **Need complex service dependencies**
6. **Prefer native Linux tooling**

### Use Both (PM2 under systemd):

1. **Best of both worlds**
2. **PM2 handles Node.js specifics** (clustering, reloads)
3. **systemd handles boot persistence** and supervision
4. **Most production-ready approach**

## Zero-Downtime Deployments

### PM2 Zero-Downtime Reload

```bash
# Graceful reload - waits for new workers before killing old ones
pm2 reload ecosystem.config.js

# Reload specific app
pm2 reload api-server
```

**How it works:**

```
Zero-Downtime Reload Process
============================

Time  │  Old Workers    │  New Workers    │  Traffic
──────┼─────────────────┼─────────────────┼──────────────
T0    │  [1] [2] [3]    │                 │  → [1,2,3]
T1    │  [1] [2] [3]    │  [4] starting   │  → [1,2,3]
T2    │  [1] [2] [3]    │  [4] ready      │  → [1,2,3,4]
T3    │  [1] stopping   │  [4]            │  → [2,3,4]
T4    │  [2] [3]        │  [4] [5] start  │  → [2,3,4]
T5    │  [2] stopping   │  [4] [5]        │  → [3,4,5]
...   │                 │                 │
Tn    │                 │  [4] [5] [6]    │  → [4,5,6]
```

### Graceful Shutdown Implementation

```javascript
// server.js with graceful shutdown
const express = require('express');
const app = express();

// Track active connections
let connections = new Set();
let isShuttingDown = false;

const server = app.listen(3000, () => {
  console.log('Server started on port 3000');

  // Notify PM2 that we're ready
  if (process.send) {
    process.send('ready');
  }
});

// Track connections
server.on('connection', (conn) => {
  connections.add(conn);
  conn.on('close', () => connections.delete(conn));
});

// Graceful shutdown handler
async function gracefulShutdown(signal) {
  console.log(`Received ${signal}, starting graceful shutdown...`);
  isShuttingDown = true;

  // Stop accepting new connections
  server.close(async () => {
    console.log('HTTP server closed');

    // Close database connections
    await closeDatabase();

    // Close message queue connections
    await closeMessageQueue();

    console.log('All connections closed, exiting');
    process.exit(0);
  });

  // Close existing connections gracefully
  for (const conn of connections) {
    conn.end();
  }

  // Force close after timeout
  setTimeout(() => {
    console.error('Forcing shutdown after timeout');
    for (const conn of connections) {
      conn.destroy();
    }
    process.exit(1);
  }, 10000);
}

// Listen for shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Health check that respects shutdown state
app.get('/health', (req, res) => {
  if (isShuttingDown) {
    res.status(503).json({ status: 'shutting_down' });
  } else {
    res.json({ status: 'healthy' });
  }
});
```

### PM2 Configuration for Graceful Shutdown

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'api',
    script: './server.js',
    instances: 'max',
    exec_mode: 'cluster',

    // Wait for 'ready' signal before considering app online
    wait_ready: true,
    listen_timeout: 10000,

    // Give app time to close connections
    kill_timeout: 10000,

    // Shutdown signal
    shutdown_with_message: true,
  }],
};
```

## Log Management

### PM2 Log Commands

```bash
# View logs
pm2 logs
pm2 logs api-server
pm2 logs api-server --lines 100
pm2 logs --json

# Flush logs
pm2 flush
pm2 flush api-server

# Rotate logs
pm2 install pm2-logrotate

# Configure logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
pm2 set pm2-logrotate:rotateModule true
pm2 set pm2-logrotate:workerInterval 30
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'
```

### systemd Journal Logging

```bash
# View all logs for a service
journalctl -u myapp.service

# Follow logs in real-time
journalctl -u myapp.service -f

# Logs since last boot
journalctl -u myapp.service -b

# Logs from specific time
journalctl -u myapp.service --since "2024-01-01 00:00:00"
journalctl -u myapp.service --since "1 hour ago"

# JSON output for parsing
journalctl -u myapp.service -o json

# Limit output
journalctl -u myapp.service -n 100

# Filter by priority
journalctl -u myapp.service -p err  # Only errors
```

### Structured Logging for Production

```javascript
// logger.js - Winston with PM2-friendly configuration
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: process.env.SERVICE_NAME || 'api',
    pid: process.pid,
    instanceId: process.env.INSTANCE_ID || 0,
  },
  transports: [
    // Console transport (PM2 captures this)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    // File transport for persistent logs
    new winston.transports.File({
      filename: '/var/log/app/error.log',
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: '/var/log/app/combined.log',
      maxsize: 10485760,
      maxFiles: 10,
    }),
  ],
});

module.exports = logger;
```

## Monitoring and Metrics

### PM2 Built-in Monitoring

```bash
# Real-time monitoring dashboard
pm2 monit

# Process information
pm2 show api-server

# Metrics
pm2 env api-server

# Memory/CPU snapshot
pm2 prettylist
```

### PM2 Plus (Paid Service)

```bash
# Link to PM2 Plus for advanced monitoring
pm2 plus

# Or link with specific credentials
pm2 link <secret_key> <public_key>
```

### Custom Metrics with PM2

```javascript
// Add custom metrics
const io = require('@pm2/io');

// Counter metric
const requestCounter = io.counter({
  name: 'Requests',
  id: 'app/requests',
});

// Meter metric (requests per second)
const requestMeter = io.meter({
  name: 'req/sec',
  id: 'app/requests/sec',
});

// Histogram metric
const responseTime = io.histogram({
  name: 'Response Time',
  id: 'app/response-time',
  measurement: 'mean',
});

// Gauge metric
const activeConnections = io.metric({
  name: 'Active Connections',
  id: 'app/connections',
});

// Express middleware to track metrics
app.use((req, res, next) => {
  const start = Date.now();
  requestCounter.inc();
  requestMeter.mark();

  res.on('finish', () => {
    const duration = Date.now() - start;
    responseTime.update(duration);
  });

  next();
});

// Update active connections gauge
server.on('connection', () => {
  activeConnections.set(server.connections);
});
```

### Prometheus Metrics Export

```javascript
// metrics.js - Prometheus metrics for Node.js
const client = require('prom-client');
const express = require('express');

// Create a Registry
const register = new client.Registry();

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
});
register.registerMetric(httpRequestDuration);

const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});
register.registerMetric(httpRequestTotal);

// Middleware
function metricsMiddleware(req, res, next) {
  const end = httpRequestDuration.startTimer();

  res.on('finish', () => {
    const route = req.route?.path || req.path;
    const labels = {
      method: req.method,
      route: route,
      status_code: res.statusCode,
    };
    end(labels);
    httpRequestTotal.inc(labels);
  });

  next();
}

// Metrics endpoint
function metricsHandler(req, res) {
  res.set('Content-Type', register.contentType);
  register.metrics().then(data => res.send(data));
}

module.exports = { metricsMiddleware, metricsHandler, register };
```

## Running Multiple Applications

### PM2 Multiple Apps

```javascript
// ecosystem.config.js with multiple apps
module.exports = {
  apps: [
    {
      name: 'api',
      script: './services/api/server.js',
      instances: 4,
      exec_mode: 'cluster',
      env_production: {
        PORT: 3000,
        NODE_ENV: 'production',
      },
    },
    {
      name: 'admin',
      script: './services/admin/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env_production: {
        PORT: 3001,
        NODE_ENV: 'production',
      },
    },
    {
      name: 'websocket',
      script: './services/websocket/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env_production: {
        PORT: 3002,
        NODE_ENV: 'production',
      },
    },
    {
      name: 'worker-email',
      script: './services/workers/email.js',
      instances: 1,
      exec_mode: 'fork',
      cron_restart: '0 */6 * * *',
    },
    {
      name: 'worker-reports',
      script: './services/workers/reports.js',
      instances: 1,
      exec_mode: 'fork',
    },
  ],
};
```

### systemd Multiple Services

```ini
# /etc/systemd/system/myapp-api.service
[Unit]
Description=MyApp API Server
After=network.target postgresql.service redis.service
Requires=postgresql.service

[Service]
Type=simple
User=nodeapp
WorkingDirectory=/var/www/myapp
ExecStart=/usr/bin/node services/api/server.js
Restart=always

[Install]
WantedBy=multi-user.target

# /etc/systemd/system/myapp-worker.service
[Unit]
Description=MyApp Background Worker
After=network.target myapp-api.service redis.service
Requires=redis.service

[Service]
Type=simple
User=nodeapp
WorkingDirectory=/var/www/myapp
ExecStart=/usr/bin/node services/workers/main.js
Restart=always

[Install]
WantedBy=multi-user.target
```

**Creating a target for all services:**

```ini
# /etc/systemd/system/myapp.target
[Unit]
Description=MyApp All Services
Requires=myapp-api.service myapp-worker.service
After=myapp-api.service myapp-worker.service

[Install]
WantedBy=multi-user.target
```

```bash
# Start all myapp services
sudo systemctl start myapp.target

# Enable all to start on boot
sudo systemctl enable myapp.target
```

## Security Best Practices

### PM2 Security

```javascript
// ecosystem.config.js with security settings
module.exports = {
  apps: [{
    name: 'api',
    script: './server.js',

    // Run as non-root user
    uid: 'nodeapp',
    gid: 'nodeapp',

    // Limit resources
    max_memory_restart: '500M',

    // Don't expose PM2 info
    pmx: false,
  }],
};
```

### systemd Security Hardening

```ini
[Service]
# Run as unprivileged user
User=nodeapp
Group=nodeapp

# Filesystem restrictions
NoNewPrivileges=true
PrivateTmp=true
PrivateDevices=true
ProtectSystem=strict
ProtectHome=true
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
ReadWritePaths=/var/www/myapp/logs /var/www/myapp/uploads

# Network restrictions
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
PrivateNetwork=false

# System call filtering
SystemCallFilter=@system-service
SystemCallFilter=~@privileged @resources

# Capabilities
CapabilityBoundingSet=
AmbientCapabilities=

# Memory restrictions
MemoryDenyWriteExecute=true

# Misc security
LockPersonality=true
RestrictRealtime=true
RestrictSUIDSGID=true
```

## Complete Production Setup

Here's a complete setup combining PM2 with systemd:

```bash
#!/bin/bash
# setup-production.sh

set -e

APP_NAME="myapp"
APP_USER="nodeapp"
APP_DIR="/var/www/$APP_NAME"
NODE_VERSION="20"

echo "=== Setting up $APP_NAME production environment ==="

# 1. Create application user
sudo useradd -r -s /bin/false $APP_USER || true

# 2. Create directories
sudo mkdir -p $APP_DIR
sudo mkdir -p /var/log/$APP_NAME
sudo chown -R $APP_USER:$APP_USER $APP_DIR
sudo chown -R $APP_USER:$APP_USER /var/log/$APP_NAME

# 3. Install Node.js via nvm (as app user)
sudo -u $APP_USER bash << 'EOF'
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.nvm/nvm.sh
nvm install 20
nvm use 20
npm install -g pm2
EOF

# 4. Setup PM2 systemd service
sudo -u $APP_USER bash -c 'source ~/.nvm/nvm.sh && pm2 startup systemd -u nodeapp --hp /home/nodeapp'

# 5. Enable and start PM2 service
sudo systemctl enable pm2-$APP_USER
sudo systemctl start pm2-$APP_USER

echo "=== Production setup complete ==="
echo "Deploy your app to $APP_DIR and run:"
echo "sudo -u $APP_USER bash -c 'cd $APP_DIR && pm2 start ecosystem.config.js --env production'"
echo "sudo -u $APP_USER bash -c 'pm2 save'"
```

## Conclusion

Both PM2 and systemd are excellent tools for running Node.js applications in production. The key takeaways:

1. **PM2** excels at Node.js-specific features: clustering, zero-downtime reloads, and built-in monitoring
2. **systemd** provides robust system-level service management with comprehensive security hardening
3. **The combination of both** (PM2 under systemd) is the most production-ready approach
4. **Always implement graceful shutdown** for zero-downtime deployments
5. **Use structured logging** and metrics for observability

At Dr Dangs Lab, we run our Node.js microservices using PM2 in cluster mode, supervised by systemd, with Nginx as a reverse proxy. This stack has provided us with 99.9% uptime and seamless deployments.

## Related Articles

- [Docker & Kubernetes Deployment Guide](/blog/docker-kubernetes-deployment-guide) - Containerized Node.js deployments
- [GitHub Actions CI/CD Complete Guide](/blog/github-actions-cicd-complete-guide) - Automate your deployments
- [Nginx Reverse Proxy & Load Balancing Guide](/blog/nginx-reverse-proxy-load-balancing-guide) - Front your Node.js apps with Nginx
- [Apache vs Nginx Web Server Comparison](/blog/apache-vs-nginx-web-server-comparison) - Choose the right reverse proxy
