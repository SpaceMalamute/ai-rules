---
paths:
  - "Dockerfile"
  - "**/docker-compose*.yml"
  - "**/gunicorn.conf.py"
  - "**/uvicorn_config.py"
  - "**/deploy/**"
  - ".github/workflows/*.yml"
---

# Python Deployment

## Dockerfile (FastAPI)

```dockerfile
# Dockerfile
FROM python:3.12-slim AS base

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONFAULTHANDLER=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Builder stage
FROM base AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --user -r requirements.txt

# Production stage
FROM base AS production

# Copy installed packages from builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copy application code
COPY ./app ./app
COPY ./alembic ./alembic
COPY alembic.ini .

# Create non-root user
RUN useradd --create-home --shell /bin/bash appuser
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Gunicorn Configuration

```python
# gunicorn.conf.py
import multiprocessing
import os

# Server socket
bind = os.getenv("BIND", "0.0.0.0:8000")
backlog = 2048

# Worker processes
workers = int(os.getenv("WORKERS", multiprocessing.cpu_count() * 2 + 1))
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 100
timeout = 120
graceful_timeout = 30
keepalive = 5

# Preload app for memory efficiency
preload_app = True

# Logging
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("LOG_LEVEL", "info")
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = "myapp"

# Server mechanics
daemon = False
pidfile = None
umask = 0
user = None
group = None
tmp_upload_dir = None

# Hooks
def on_starting(server):
    """Called before the master process is initialized."""
    pass


def on_reload(server):
    """Called to recycle workers during a reload via SIGHUP."""
    pass


def worker_int(worker):
    """Called when a worker receives SIGINT or SIGQUIT."""
    pass


def worker_abort(worker):
    """Called when a worker receives SIGABRT."""
    pass
```

## Docker Compose

```yaml
# docker-compose.yml
services:
  app:
    build:
      context: .
      target: production
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/app
      - REDIS_URL=redis://redis:6379/0
      - SECRET_KEY=${SECRET_KEY}
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: "1"
          memory: 512M
        reservations:
          cpus: "0.25"
          memory: 256M

  worker:
    build:
      context: .
      target: production
    command: celery -A app.celery worker --loglevel=info
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/app
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis
    deploy:
      replicas: 2

  beat:
    build:
      context: .
      target: production
    command: celery -A app.celery beat --loglevel=info
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/app
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis

  db:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=app
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d app"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## GitHub Actions CI/CD

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: "pip"

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install -r requirements-dev.txt

      - name: Run linting
        run: |
          ruff check .
          ruff format --check .

      - name: Run type checking
        run: mypy app

      - name: Run tests
        run: pytest --cov=app --cov-report=xml
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          file: ./coverage.xml

  build:
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

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
            type=sha
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: production

    steps:
      - name: Deploy to production
        run: |
          # Trigger deployment (e.g., ArgoCD, kubectl, etc.)
          curl -X POST ${{ secrets.DEPLOY_WEBHOOK_URL }}
```

## Kubernetes Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  labels:
    app: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: app
          image: ghcr.io/org/myapp:latest
          ports:
            - containerPort: 8000
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: myapp-secrets
                  key: database-url
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "1000m"
          readinessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 15
            periodSeconds: 20
---
apiVersion: v1
kind: Service
metadata:
  name: myapp
spec:
  selector:
    app: myapp
  ports:
    - port: 80
      targetPort: 8000
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - api.example.com
      secretName: myapp-tls
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: myapp
                port:
                  number: 80
```

## Health Check Endpoint

```python
# app/api/health.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from redis import Redis
import time

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check(
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> dict:
    """Health check endpoint for load balancers."""
    checks = {}

    # Database check
    try:
        start = time.time()
        await db.execute(text("SELECT 1"))
        checks["database"] = {
            "status": "healthy",
            "latency_ms": round((time.time() - start) * 1000, 2),
        }
    except Exception as e:
        checks["database"] = {"status": "unhealthy", "error": str(e)}

    # Redis check
    try:
        start = time.time()
        redis.ping()
        checks["redis"] = {
            "status": "healthy",
            "latency_ms": round((time.time() - start) * 1000, 2),
        }
    except Exception as e:
        checks["redis"] = {"status": "unhealthy", "error": str(e)}

    # Overall status
    all_healthy = all(c.get("status") == "healthy" for c in checks.values())

    return {
        "status": "healthy" if all_healthy else "unhealthy",
        "checks": checks,
    }


@router.get("/ready")
async def readiness_check() -> dict:
    """Readiness probe - is the app ready to receive traffic?"""
    return {"status": "ready"}


@router.get("/live")
async def liveness_check() -> dict:
    """Liveness probe - is the app alive?"""
    return {"status": "alive"}
```

## Anti-patterns

```python
# BAD: Running as root
FROM python:3.12
WORKDIR /app
COPY . .
CMD ["python", "main.py"]  # Runs as root!

# GOOD: Non-root user
RUN useradd --create-home appuser
USER appuser

# BAD: Installing dev dependencies in production
COPY requirements.txt requirements-dev.txt ./
RUN pip install -r requirements.txt -r requirements-dev.txt

# GOOD: Only production dependencies
COPY requirements.txt ./
RUN pip install -r requirements.txt

# BAD: No health checks
# Container appears healthy even if app is broken

# GOOD: Proper health checks
HEALTHCHECK CMD curl -f http://localhost:8000/health || exit 1

# BAD: Hardcoded secrets
ENV DATABASE_URL=postgresql://user:password@db/app

# GOOD: Use secrets or environment variables at runtime
ENV DATABASE_URL=${DATABASE_URL}

# BAD: No resource limits
# Worker can consume all memory

# GOOD: Set resource limits in docker-compose/k8s
deploy:
  resources:
    limits:
      memory: 512M
```
