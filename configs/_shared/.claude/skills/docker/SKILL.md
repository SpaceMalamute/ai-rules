---
name: docker
description: Generate Dockerfile and docker-compose configuration for the project
argument-hint: "[service-name]"
---

# Docker Configuration Generator

Generate production-ready Docker configuration for the current project.

## Behavior

1. **Detect Project Type**
   - Check for `package.json` → Node.js/Next.js/NestJS
   - Check for `requirements.txt` / `pyproject.toml` → Python/FastAPI/Django
   - Check for `*.csproj` / `*.sln` → .NET

2. **Analyze Dependencies**
   - Database requirements (PostgreSQL, MySQL, MongoDB, Redis)
   - Message queues (RabbitMQ, Kafka)
   - Cache layers (Redis, Memcached)
   - Storage requirements

3. **Generate Configuration**
   - Create multi-stage `Dockerfile` with:
     - Build stage with dev dependencies
     - Production stage with minimal footprint
     - Non-root user
     - Health checks
     - Proper caching of layers
   - Create `docker-compose.yml` with:
     - Application service
     - Required infrastructure services
     - Volume mounts for persistence
     - Network configuration
     - Health checks and dependencies
   - Create `.dockerignore` if not present

4. **Optional: Generate for specific service**
   - If service name provided (e.g., `/docker worker`), generate worker-specific config

## Output Format

```
## Dockerfile

<dockerfile content>

## docker-compose.yml

<compose content>

## .dockerignore

<ignore patterns>

## Commands

- Build: `docker compose build`
- Start: `docker compose up -d`
- Logs: `docker compose logs -f`
- Stop: `docker compose down`
```

## Framework-Specific Requirements

### Node.js / Next.js
- Use `node:20-alpine` base
- Copy `package*.json` first for layer caching
- Use `npm ci --only=production`
- Set `NODE_ENV=production`

### Python / FastAPI
- Use `python:3.12-slim` base
- Install only production requirements
- Use `gunicorn` + `uvicorn` workers
- Set `PYTHONDONTWRITEBYTECODE=1`

### .NET
- Use `mcr.microsoft.com/dotnet/aspnet:8.0` runtime
- Build with `mcr.microsoft.com/dotnet/sdk:8.0`
- Publish as self-contained if needed

### NestJS
- Similar to Node.js
- Include Prisma generation if detected
- Handle migrations in entrypoint

## Security Considerations

- Never include secrets in Dockerfile
- Use `.dockerignore` to exclude sensitive files
- Run as non-root user
- Pin base image versions
- Scan for vulnerabilities recommendation
