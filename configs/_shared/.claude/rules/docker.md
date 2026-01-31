---
paths:
  - "**/Dockerfile"
  - "**/docker-compose*.yml"
  - "**/.dockerignore"
---

# Docker Best Practices

## Dockerfile Principles

### Multi-stage Builds

Always use multi-stage builds to minimize image size:

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### Layer Optimization

Order from least to most frequently changed:

```dockerfile
# 1. Base image (rarely changes)
FROM node:20-alpine

# 2. System dependencies (rarely changes)
RUN apk add --no-cache dumb-init

# 3. App dependencies (changes with package.json)
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# 4. App code (changes frequently)
COPY . .

# 5. Build (if needed)
RUN npm run build
```

### Security

```dockerfile
# Use specific version, not :latest
FROM node:20.10.0-alpine

# Run as non-root user
RUN addgroup -g 1001 appgroup && \
    adduser -u 1001 -G appgroup -s /bin/sh -D appuser
USER appuser

# Don't expose unnecessary ports
EXPOSE 3000

# Use read-only filesystem where possible
# (set in docker-compose or runtime)
```

## .dockerignore

Always include:

```
node_modules
npm-debug.log
.git
.gitignore
.env
.env.*
*.md
.vscode
.idea
coverage
dist
.nx
tmp
```

## Docker Compose

### Development

```yaml
# docker-compose.yml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: development
    volumes:
      - .:/app
      - /app/node_modules  # Prevent overwriting
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
    depends_on:
      - db
      - redis

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: app_dev
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

### Production

```yaml
# docker-compose.prod.yml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    restart: unless-stopped
    read_only: true
    security_opt:
      - no-new-privileges:true
    environment:
      - NODE_ENV=production
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
```

## Framework-Specific Patterns

### Node.js / NestJS / Next.js

```dockerfile
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 app
COPY --from=builder --chown=app:nodejs /app/dist ./dist
COPY --from=builder --chown=app:nodejs /app/node_modules ./node_modules
USER app
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### Python / FastAPI

```dockerfile
FROM python:3.12-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

FROM base AS builder
RUN pip install poetry
WORKDIR /app
COPY pyproject.toml poetry.lock ./
RUN poetry export -f requirements.txt --output requirements.txt

FROM base AS runner
WORKDIR /app
COPY --from=builder /app/requirements.txt .
RUN pip install -r requirements.txt
COPY . .
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### .NET

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY *.csproj ./
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser
EXPOSE 8080
ENTRYPOINT ["dotnet", "App.dll"]
```

## Health Checks

Always implement health endpoints:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

## Environment Variables

```dockerfile
# Build-time args
ARG NODE_ENV=production
ARG APP_VERSION

# Runtime environment
ENV NODE_ENV=${NODE_ENV} \
    APP_VERSION=${APP_VERSION}

# Never put secrets in Dockerfile!
# Use: docker run -e SECRET=xxx or docker-compose with env_file
```

## Anti-patterns

- Using `:latest` tag
- Running as root
- Copying entire context before installing deps
- Not using multi-stage builds
- Hardcoding secrets in Dockerfile
- Not setting resource limits
- Missing health checks
- Not using .dockerignore
