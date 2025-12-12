# Docker Optimization Guide for MFO Shield Ukraine

## Overview

This guide provides best practices for optimizing Docker images and containers for the MFO Shield Ukraine application, focusing on image size reduction, build performance, and runtime efficiency.

## Image Size Optimization

### 1. Multi-Stage Builds

Use multi-stage builds to reduce final image size by separating build and runtime environments.

```dockerfile
# Stage 1: Builder
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
RUN npm install --save-dev
COPY . .
RUN npm run build

# Stage 2: Runtime
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### 2. Choose Minimal Base Images

- **Alpine Linux**: ~5MB (recommended for most applications)
- **Debian slim**: ~80MB
- **Ubuntu**: ~77MB
- **CentOS**: ~200MB

```dockerfile
# Preferred
FROM python:3.11-alpine

# Avoid
FROM ubuntu:22.04
```

### 3. Leverage Layer Caching

```dockerfile
# Order matters - put frequently changing files last
FROM node:18-alpine

# Install system dependencies (less frequent)
RUN apk add --no-cache python3 make g++

# Copy package files (moderate frequency)
COPY package*.json ./
RUN npm ci --only=production

# Copy source code (frequently changing)
COPY . .
RUN npm run build
```

### 4. Minimize Layers

```dockerfile
# Bad - Creates many layers
RUN apt-get update
RUN apt-get install -y curl
RUN apt-get install -y git
RUN apt-get clean

# Good - Combines into single layer
RUN apk add --no-cache curl git && rm -rf /var/cache/apk/*
```

## Build Performance Optimization

### 1. Docker BuildKit

Enable BuildKit for parallel layer building and better caching:

```bash
# Enable BuildKit
export DOCKER_BUILDKIT=1

# Or in Dockerfile
# syntax=docker/dockerfile:1
```

### 2. .dockerignore File

Exclude unnecessary files from build context:

```
node_modules
npm-debug.log
.git
.gitignore
.DS_Store
*.md
test
.env
.env.local
__pycache__
*.pyc
.pytest_cache
.coverage
.vscode
.idea
```

### 3. Parallel Builds

```dockerfile
# Use BuildKit for parallel stages
FROM node:18-alpine AS frontend
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM python:3.11-alpine AS backend
WORKDIR /backend
COPY coordinator/requirements.txt ./
RUN pip install -r requirements.txt
COPY coordinator/ .
```

## Runtime Optimization

### 1. Resource Limits

```dockerfile
# Set memory and CPU limits in docker-compose.yml
version: '3.9'
services:
  app:
    image: mfo-shield:latest
    resources:
      limits:
        cpus: '1'
        memory: 512M
      reservations:
        cpus: '0.5'
        memory: 256M
```

### 2. Health Checks

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

### 3. Non-Root User

```dockerfile
# Create unprivileged user
RUN addgroup -g 1000 appuser && adduser -D -u 1000 -G appuser appuser
USER appuser
```

### 4. Signal Handling

```dockerfile
# Use exec form to ensure proper signal handling
CMD ["node", "server.js"]  # Good
CMD node server.js           # Bad - spawns sh wrapper
```

## Dockerfile Best Practices

### Complete Optimized Example

```dockerfile
# syntax=docker/dockerfile:1
FROM node:18-alpine AS builder
LABEL builder=true

WORKDIR /build
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
RUN npm install --save-dev
COPY . .
RUN npm run build

FROM node:18-alpine
LABEL maintainer="MFO Shield Team"

# Install dumb-init for signal handling
RUN apk add --no-cache dumb-init curl

# Create non-root user
RUN addgroup -g 1000 app && adduser -D -u 1000 -G app app

WORKDIR /app
COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/dist ./dist
COPY --from=builder /build/package*.json ./

# Set ownership
RUN chown -R app:app /app
USER app

EXPOSE 3000
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

ENTRYPOINT ["/usr/sbin/dumb-init", "--"]
CMD ["node", "dist/index.js"]
```

## Build and Push Best Practices

### 1. Tagging Strategy

```bash
# Build with multiple tags
docker build -t mfo-shield:latest -t mfo-shield:1.0.0 .

# Tag for registry
docker tag mfo-shield:latest registry.example.com/mfo-shield:latest

# Push all tags
docker push registry.example.com/mfo-shield:latest
docker push registry.example.com/mfo-shield:1.0.0
```

### 2. Scan for Vulnerabilities

```bash
# Using Docker Scout
docker scout cves mfo-shield:latest

# Using Trivy
trivy image mfo-shield:latest

# Using Grype
grype mfo-shield:latest
```

### 3. Image Inspection

```bash
# View layers
docker history mfo-shield:latest

# Inspect image metadata
docker inspect mfo-shield:latest

# Check size
docker images mfo-shield:latest --format "{{.Size}}"
```

## Performance Metrics

### Image Size Reduction Targets

| Component | Current | Target | Reduction |
|-----------|---------|--------|----------|
| Frontend | ~450MB | ~200MB | 55% |
| Backend | ~650MB | ~350MB | 46% |
| Overall | ~1.1GB | ~550MB | 50% |

## Monitoring and Debugging

### 1. Container Logs

```bash
# Follow logs with timestamps
docker logs -f --timestamps container_id

# Get last N lines
docker logs --tail 100 container_id
```

### 2. Resource Usage

```bash
# Monitor real-time stats
docker stats --no-stream

# Check memory usage
docker stats --format "table {{.Container}}\t{{.MemUsage}}"
```

### 3. Interactive Debugging

```bash
# Enter running container
docker exec -it container_id /bin/sh

# Debug build
docker run -it --entrypoint /bin/sh mfo-shield:latest
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Push Docker Image

on:
  push:
    branches: [main]
    tags: [v*]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to Registry
        uses: docker/login-action@v2
        with:
          registry: registry.example.com
          username: ${{ secrets.REGISTRY_USER }}
          password: ${{ secrets.REGISTRY_PASS }}
      
      - name: Build and Push
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: registry.example.com/mfo-shield:${{ github.sha }}
          cache-from: type=registry,ref=registry.example.com/mfo-shield:buildcache
          cache-to: type=registry,ref=registry.example.com/mfo-shield:buildcache,mode=max
```

## Common Pitfalls

1. **Large Base Images** - Use Alpine or minimal images
2. **Not Using .dockerignore** - Reduces build context size
3. **Creating Many Layers** - Combine RUN commands
4. **Forgetting to Clean Cache** - Always remove package manager cache
5. **Running as Root** - Create non-root user for security
6. **Not Using Health Checks** - Helps orchestrators detect failures
7. **Ignoring Security Scanning** - Scan images for vulnerabilities

## Security Best Practices

1. Use specific base image versions (not `latest`)
2. Keep dependencies updated
3. Scan images for CVEs
4. Run containers as non-root user
5. Use secrets management for sensitive data
6. Implement read-only root filesystem when possible
7. Use image signing for verification
