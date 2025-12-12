# Kubernetes Deployment Guide for MFO Shield Ukraine

## Overview

This guide provides comprehensive instructions for deploying the MFO Shield Ukraine application to Kubernetes clusters, including resource optimization, monitoring, and scaling strategies.

## Prerequisites

- Kubernetes cluster (v1.24+)
- kubectl CLI tool configured
- Docker images built and pushed to registry
- Persistent storage class available
- Ingress controller installed

## Architecture

The MFO Shield application consists of:
- **Frontend** (React/TypeScript) - Static assets and UI server
- **Backend Coordinator** (Python) - Orchestration and business logic
- **Services** (Python) - Microservices for specific domain functions
- **Database** - PostgreSQL for persistent data
- **Cache** - Redis for session and data caching

## Deployment Strategy

### 1. Namespace Setup

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: mfo-shield
  labels:
    app: mfo-shield
    environment: production
```

### 2. ConfigMap and Secrets

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mfo-config
  namespace: mfo-shield
data:
  ENVIRONMENT: production
  LOG_LEVEL: info
  API_TIMEOUT: "30"
---
apiVersion: v1
kind: Secret
metadata:
  name: mfo-secrets
  namespace: mfo-shield
type: Opaque
stringData:
  GEMINI_API_KEY: <base64-encoded-key>
  DATABASE_URL: postgresql://user:pass@postgres:5432/mfo
  REDIS_URL: redis://redis:6379
```

## Resource Management

### Frontend Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mfo-frontend
  namespace: mfo-shield
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mfo-frontend
  template:
    metadata:
      labels:
        app: mfo-frontend
    spec:
      containers:
      - name: frontend
        image: mfo-shield/frontend:latest
        ports:
        - containerPort: 3000
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Backend Coordinator Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mfo-coordinator
  namespace: mfo-shield
spec:
  replicas: 2
  selector:
    matchLabels:
      app: mfo-coordinator
  template:
    metadata:
      labels:
        app: mfo-coordinator
    spec:
      containers:
      - name: coordinator
        image: mfo-shield/coordinator:latest
        ports:
        - containerPort: 8000
        env:
        - name: ENVIRONMENT
          valueFrom:
            configMapKeyRef:
              name: mfo-config
              key: ENVIRONMENT
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: mfo-secrets
              key: DATABASE_URL
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8000
          initialDelaySeconds: 10
          periodSeconds: 5
```

## Scaling Strategy

### Horizontal Pod Autoscaling

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: mfo-coordinator-hpa
  namespace: mfo-shield
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: mfo-coordinator
  minReplicas: 2
  maxReplicas: 10
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
```

## Networking

### Service Definition

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mfo-frontend-svc
  namespace: mfo-shield
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: 3000
  selector:
    app: mfo-frontend
```

### Ingress Configuration

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: mfo-ingress
  namespace: mfo-shield
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - mfo-shield.example.com
    secretName: mfo-tls-cert
  rules:
  - host: mfo-shield.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: mfo-frontend-svc
            port:
              number: 80
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: mfo-coordinator-svc
            port:
              number: 8000
```

## Storage

### Persistent Volume Claim

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mfo-pvc
  namespace: mfo-shield
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: fast-ssd
  resources:
    requests:
      storage: 50Gi
```

## Monitoring and Logging

### ServiceMonitor for Prometheus

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: mfo-monitor
  namespace: mfo-shield
spec:
  selector:
    matchLabels:
      app: mfo-coordinator
  endpoints:
  - port: metrics
    interval: 30s
```

## Deployment Commands

```bash
# Create namespace
kubectl create namespace mfo-shield

# Apply configuration
kubectl apply -f k8s/

# Check deployment status
kubectl get deployments -n mfo-shield

# View logs
kubectl logs -f deployment/mfo-coordinator -n mfo-shield

# Scale deployment
kubectl scale deployment mfo-coordinator --replicas=5 -n mfo-shield

# Update image
kubectl set image deployment/mfo-coordinator coordinator=mfo-shield/coordinator:v1.1.0 -n mfo-shield
```

## Performance Optimization Tips

1. **Pod Disruption Budgets** - Ensure high availability during updates
2. **Network Policies** - Restrict traffic between pods
3. **Resource Quotas** - Prevent resource hogging
4. **Vertical Pod Autoscaling** - Automatically adjust resource requests
5. **Node Affinity** - Pin workloads to specific node types

## Troubleshooting

- Check pod events: `kubectl describe pod <pod-name> -n mfo-shield`
- View metrics: `kubectl top nodes` and `kubectl top pods -n mfo-shield`
- Debug connectivity: `kubectl exec -it <pod> -n mfo-shield -- /bin/sh`
