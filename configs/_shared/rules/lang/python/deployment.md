---
description: "Python deployment and packaging"
paths:
  - "Dockerfile"
  - "**/docker-compose*.yml"
  - "**/gunicorn.conf.py"
  - "**/uvicorn_config.py"
  - "**/deploy/**"
  - ".github/workflows/*.yml"
---

# Python Deployment

## Dockerfile

- Base image: `python:3.12-slim` — not full image, not alpine (C extension issues)
- Set: `PYTHONDONTWRITEBYTECODE=1`, `PYTHONUNBUFFERED=1`, `PIP_NO_CACHE_DIR=1`
- Multi-stage: builder installs deps, production copies only what is needed
- Create non-root user: `useradd --create-home appuser` then `USER appuser`
- Add HEALTHCHECK: `curl -f http://localhost:8000/health || exit 1`

## Gunicorn Configuration

- Worker class: `uvicorn.workers.UvicornWorker` for ASGI apps
- Workers: `cpu_count * 2 + 1` as starting point
- Set `max_requests` + `max_requests_jitter` to recycle workers and prevent memory leaks
- Set `timeout` and `graceful_timeout` for request deadlines
- Enable `preload_app = True` for memory efficiency

## Health Endpoints

| Endpoint | Purpose | What to check |
|----------|---------|---------------|
| `/health` | Overall health | DB + Redis + external deps with latency |
| `/ready` | Readiness probe | Can serve traffic |
| `/live` | Liveness probe | Process is alive |

## Docker Compose

- Use `depends_on` with `condition: service_healthy` for startup ordering
- Set resource limits: `cpus`, `memory` for all services
- Separate services: app, worker (Celery), beat (scheduler), db, redis

## CI/CD Pipeline

1. Lint (`ruff check .`, `ruff format --check .`)
2. Type check (`mypy app`)
3. Test (`pytest --cov=app`)
4. Build and push Docker image
5. Deploy with approval gate

## Anti-patterns

- DO NOT run as root in containers
- DO NOT install dev dependencies in production images
- DO NOT skip health checks — orchestrators need them
- DO NOT hardcode secrets in Dockerfile — use runtime env vars
- DO NOT skip resource limits — workers can consume all memory
