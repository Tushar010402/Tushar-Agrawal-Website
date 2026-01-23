---
title: "Docker Tutorial for Beginners 2026: Complete Guide with Examples"
description: "Learn Docker from scratch in 2026. Step-by-step tutorial covering containers, images, Dockerfile, Docker Compose, and deployment. Perfect for Indian developers starting with containerization."
date: "2026-01-21"
author: "Tushar Agrawal"
tags: ["Docker", "Docker Tutorial", "Containers", "DevOps", "Docker Compose", "Containerization", "Docker for Beginners", "DevOps 2026"]
image: "https://images.unsplash.com/photo-1605745341112-85968b19335b?w=1200&h=630&fit=crop"
published: true
---

## Why Learn Docker in 2026?

Docker has become an essential skill for developers. Whether you're deploying to AWS, working with Kubernetes, or just want consistent development environments, Docker is the foundation.

```
Docker Job Market (India 2026)
==============================

Jobs mentioning Docker: 45,000+
Average salary premium: +20-30%
Required at: Almost all product companies

Who uses Docker:
├── Backend developers
├── DevOps engineers
├── Full-stack developers
├── Data engineers
└── ML engineers
```

## What is Docker?

Docker is a platform that packages your application and all its dependencies into a **container** - a lightweight, standalone unit that runs consistently anywhere.

```
The Problem Docker Solves
=========================

Without Docker:
├── "Works on my machine" syndrome
├── Different versions on dev/staging/prod
├── Complex setup for new developers
├── Dependency conflicts
└── Hours wasted on environment issues

With Docker:
├── Same environment everywhere
├── One command to start
├── Easy onboarding (docker-compose up)
├── Isolated dependencies
└── Ship containers, not code
```

## Docker Concepts

### Containers vs Virtual Machines

```
Virtual Machine                    Container
==============                    =========

┌─────────────────┐              ┌─────────────────┐
│     App A       │              │     App A       │
├─────────────────┤              ├─────────────────┤
│   Guest OS      │              │   Container     │
│   (Ubuntu)      │              │   Runtime       │
├─────────────────┤              ├─────────────────┤
│   Hypervisor    │              │  Docker Engine  │
├─────────────────┤              ├─────────────────┤
│    Host OS      │              │    Host OS      │
├─────────────────┤              ├─────────────────┤
│   Hardware      │              │   Hardware      │
└─────────────────┘              └─────────────────┘

Size: 1-10 GB                    Size: 10-500 MB
Startup: Minutes                 Startup: Seconds
Isolation: Complete              Isolation: Process-level
```

### Key Terms

```
Docker Terminology
==================

Image:
├── Blueprint/template for containers
├── Read-only
├── Built from Dockerfile
└── Example: python:3.11, nginx:latest

Container:
├── Running instance of an image
├── Isolated environment
├── Can be started, stopped, deleted
└── Example: my-python-app running

Dockerfile:
├── Text file with build instructions
├── Defines how to create an image
└── Example: FROM python:3.11, COPY, RUN

Docker Hub:
├── Public registry for images
├── Like GitHub for Docker images
└── hub.docker.com

Volume:
├── Persistent storage for containers
├── Data survives container restart
└── Example: database files
```

## Installing Docker

### On Ubuntu/Debian

```bash
# Update package index
sudo apt-get update

# Install prerequisites
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up the repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add your user to docker group (avoid sudo)
sudo usermod -aG docker $USER

# Verify installation
docker --version
docker run hello-world
```

### On macOS

```bash
# Download Docker Desktop from docker.com
# Or use Homebrew:
brew install --cask docker

# Start Docker Desktop from Applications
# Verify
docker --version
```

### On Windows

```
1. Download Docker Desktop from docker.com
2. Enable WSL 2 (Windows Subsystem for Linux)
3. Install Docker Desktop
4. Restart computer
5. Verify: docker --version
```

## Your First Docker Commands

### Running Containers

```bash
# Run a simple container
docker run hello-world

# Run Ubuntu and access shell
docker run -it ubuntu bash

# Run Nginx web server
docker run -d -p 8080:80 nginx
# -d = detached (background)
# -p = port mapping (host:container)

# Visit http://localhost:8080

# Run Python
docker run -it python:3.11 python
>>> print("Hello from Docker!")
```

### Managing Containers

```bash
# List running containers
docker ps

# List all containers (including stopped)
docker ps -a

# Stop a container
docker stop <container_id>

# Start a stopped container
docker start <container_id>

# Remove a container
docker rm <container_id>

# Remove all stopped containers
docker container prune

# View container logs
docker logs <container_id>

# Execute command in running container
docker exec -it <container_id> bash
```

### Managing Images

```bash
# List images
docker images

# Pull an image
docker pull python:3.11

# Remove an image
docker rmi python:3.11

# Remove unused images
docker image prune

# Search Docker Hub
docker search nginx
```

## Writing Your First Dockerfile

### Python Application

```dockerfile
# Dockerfile for Python FastAPI app

# Base image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy requirements first (for caching)
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Command to run
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Build and Run

```bash
# Build the image
docker build -t my-fastapi-app .

# Run the container
docker run -d -p 8000:8000 my-fastapi-app

# Visit http://localhost:8000
```

### Node.js Application

```dockerfile
# Dockerfile for Node.js app

FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "index.js"]
```

### Multi-Stage Build (Optimized)

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/index.js"]

# Result: Smaller image, no dev dependencies
```

## Dockerfile Best Practices

```dockerfile
# 1. Use specific base image versions
FROM python:3.11-slim  # Good
FROM python:latest     # Bad (unpredictable)

# 2. Minimize layers
RUN apt-get update && \
    apt-get install -y gcc && \
    rm -rf /var/lib/apt/lists/*
# Better than 3 separate RUN commands

# 3. Use .dockerignore
# .dockerignore file:
node_modules
.git
*.log
__pycache__
.env

# 4. Don't run as root
RUN useradd -m appuser
USER appuser

# 5. Use COPY instead of ADD
COPY ./src ./src  # Preferred
ADD ./src ./src   # Only for tar extraction or URLs

# 6. Order commands by change frequency
# Least changing first (better caching)
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .  # Most changing last
```

## Docker Compose

Docker Compose manages multi-container applications.

### Basic docker-compose.yml

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/mydb
    depends_on:
      - db
      - redis

  db:
    image: postgres:15
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=mydb

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

### Docker Compose Commands

```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild images
docker-compose up --build

# Scale a service
docker-compose up --scale web=3

# Execute command in service
docker-compose exec web bash
```

### Full-Stack Example

```yaml
# docker-compose.yml - Full Stack App
version: '3.8'

services:
  # Frontend (React/Next.js)
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
    depends_on:
      - backend

  # Backend (FastAPI)
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/app
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    volumes:
      - ./backend:/app  # Hot reload for development

  # Database
  db:
    image: postgres:15
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=app
    ports:
      - "5432:5432"

  # Cache
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  # Reverse Proxy (Production)
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - frontend
      - backend

volumes:
  postgres_data:
```

## Docker Networking

```bash
# List networks
docker network ls

# Create a network
docker network create my-network

# Run container on network
docker run -d --network my-network --name web nginx

# Connect existing container to network
docker network connect my-network my-container

# Containers on same network can communicate by name
# From 'web' container: curl http://api:8000
```

## Docker Volumes

```bash
# Create a volume
docker volume create my-data

# Run with volume
docker run -d -v my-data:/var/lib/postgresql/data postgres

# Bind mount (local directory)
docker run -d -v $(pwd)/data:/app/data my-app

# List volumes
docker volume ls

# Remove unused volumes
docker volume prune
```

## Deploying Docker to Production

### Push to Docker Hub

```bash
# Login to Docker Hub
docker login

# Tag your image
docker tag my-app username/my-app:v1.0

# Push to registry
docker push username/my-app:v1.0

# Pull on production server
docker pull username/my-app:v1.0
```

### Deploy to AWS EC2

```bash
# On EC2 instance
# Install Docker
sudo yum update -y
sudo yum install -y docker
sudo service docker start
sudo usermod -aG docker ec2-user

# Pull and run
docker pull username/my-app:v1.0
docker run -d -p 80:8000 username/my-app:v1.0
```

### Deploy with Docker Compose

```bash
# Copy docker-compose.yml to server
scp docker-compose.yml user@server:~/app/

# SSH and run
ssh user@server
cd app
docker-compose up -d
```

## Common Docker Commands Cheat Sheet

```bash
# Images
docker build -t name .          # Build image
docker images                   # List images
docker rmi image_name           # Remove image
docker pull image:tag           # Pull from registry
docker push image:tag           # Push to registry

# Containers
docker run -d -p 8080:80 nginx  # Run detached with port
docker run -it ubuntu bash      # Run interactive
docker ps                       # List running
docker ps -a                    # List all
docker stop container_id        # Stop container
docker rm container_id          # Remove container
docker logs container_id        # View logs
docker exec -it container bash  # Shell into container

# Docker Compose
docker-compose up -d            # Start services
docker-compose down             # Stop services
docker-compose logs -f          # Follow logs
docker-compose exec web bash    # Shell into service

# Cleanup
docker system prune             # Remove unused data
docker container prune          # Remove stopped containers
docker image prune              # Remove unused images
docker volume prune             # Remove unused volumes
```

## Troubleshooting

```bash
# Container won't start
docker logs container_id        # Check logs
docker inspect container_id     # Check config

# Port already in use
docker ps                       # Find conflicting container
docker stop container_id        # Stop it
# Or use different port: -p 8081:80

# Permission denied
sudo usermod -aG docker $USER   # Add user to docker group
newgrp docker                   # Apply without logout

# Out of disk space
docker system prune -a          # Remove everything unused
docker volume prune             # Remove unused volumes

# Slow builds
# Use .dockerignore
# Order Dockerfile commands by change frequency
# Use multi-stage builds
```

## Next Steps

```
Learning Path After Docker Basics
=================================

1. Docker Compose (multi-container apps)
2. Docker Networking (advanced)
3. Docker Swarm (simple orchestration)
4. Kubernetes (production orchestration)
5. CI/CD with Docker (GitHub Actions)
6. Docker Security best practices
```

## Conclusion

Docker is a foundational skill for modern development. Start with simple containers, progress to Docker Compose, and eventually explore Kubernetes for production orchestration.

**Practice Project:** Dockerize your existing project today!

---

*Learning Docker? Connect with me on [LinkedIn](https://www.linkedin.com/in/tushar-agrawal-91b67a28a) for more DevOps tips.*

## Related Articles

- [Backend Developer Roadmap 2026](/blog/backend-developer-roadmap-india-2026)
- [System Design Interview Questions](/blog/system-design-interview-questions-india-2026)
- [FastAPI vs Django](/blog/fastapi-vs-django-python-framework-2026)
- [Database Connection Pooling](/blog/database-connection-pooling-performance-guide)
