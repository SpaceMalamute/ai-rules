---
description: "FastAPI application lifespan management"
paths:
  - "**/*.py"
---

# FastAPI Lifespan Management

## Lifespan Context Manager

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: runs before app starts accepting requests
    print("Starting up...")
    app.state.db = await create_database_pool()
    app.state.redis = await create_redis_pool()

    yield  # App runs here

    # Shutdown: runs when app is shutting down
    print("Shutting down...")
    await app.state.db.close()
    await app.state.redis.close()

app = FastAPI(lifespan=lifespan)
```

## Database Connection Pool

```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create engine
    engine = create_async_engine(
        settings.database_url,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
    )

    # Create session factory
    app.state.async_session = async_sessionmaker(
        engine,
        expire_on_commit=False,
    )

    yield

    # Dispose engine
    await engine.dispose()

# Dependency
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with app.state.async_session() as session:
        yield session
```

## Redis Connection

```python
import redis.asyncio as redis

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Redis pool
    app.state.redis = await redis.from_url(
        settings.redis_url,
        encoding="utf-8",
        decode_responses=True,
    )

    yield

    await app.state.redis.close()

# Usage
@router.get("/cached/{key}")
async def get_cached(key: str, request: Request) -> dict:
    value = await request.app.state.redis.get(key)
    return {"key": key, "value": value}
```

## HTTP Client Pool

```python
import httpx

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create shared HTTP client
    app.state.http_client = httpx.AsyncClient(
        timeout=30.0,
        limits=httpx.Limits(max_connections=100),
    )

    yield

    await app.state.http_client.aclose()

# Usage
async def call_external_api(request: Request) -> dict:
    client = request.app.state.http_client
    response = await client.get("https://api.example.com/data")
    return response.json()
```

## Background Task Scheduler

```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = AsyncIOScheduler()

    # Add scheduled jobs
    scheduler.add_job(
        cleanup_expired_sessions,
        "interval",
        hours=1,
        id="cleanup_sessions",
    )

    scheduler.add_job(
        send_daily_reports,
        "cron",
        hour=9,
        minute=0,
        id="daily_reports",
    )

    scheduler.start()
    app.state.scheduler = scheduler

    yield

    scheduler.shutdown(wait=True)
```

## Multiple Resources

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize all resources
    engine = create_async_engine(settings.database_url)
    redis_pool = await redis.from_url(settings.redis_url)
    http_client = httpx.AsyncClient()

    # Store in app state
    app.state.db_engine = engine
    app.state.async_session = async_sessionmaker(engine)
    app.state.redis = redis_pool
    app.state.http_client = http_client

    # Run migrations
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Log startup
    logger.info("Application started", extra={
        "database": settings.database_url,
        "redis": settings.redis_url,
    })

    yield

    # Cleanup in reverse order
    await http_client.aclose()
    await redis_pool.close()
    await engine.dispose()

    logger.info("Application shutdown complete")
```

## Health Checks with Lifespan

```python
from dataclasses import dataclass, field
from datetime import datetime

@dataclass
class AppHealth:
    started_at: datetime = field(default_factory=datetime.utcnow)
    ready: bool = False
    checks: dict = field(default_factory=dict)

@asynccontextmanager
async def lifespan(app: FastAPI):
    health = AppHealth()
    app.state.health = health

    # Initialize resources
    try:
        app.state.db = await create_database_pool()
        health.checks["database"] = "ok"
    except Exception as e:
        health.checks["database"] = f"error: {e}"

    try:
        app.state.redis = await create_redis_pool()
        health.checks["redis"] = "ok"
    except Exception as e:
        health.checks["redis"] = f"error: {e}"

    health.ready = all(v == "ok" for v in health.checks.values())

    yield

    health.ready = False
    await cleanup_resources(app)

@router.get("/health/live")
async def liveness() -> dict:
    return {"status": "ok"}

@router.get("/health/ready")
async def readiness(request: Request) -> dict:
    health = request.app.state.health

    if not health.ready:
        raise HTTPException(503, detail=health.checks)

    return {
        "status": "ready",
        "uptime": (datetime.utcnow() - health.started_at).total_seconds(),
        "checks": health.checks,
    }
```

## Deprecated: on_event

```python
# DEPRECATED - Don't use this pattern
@app.on_event("startup")
async def startup():
    ...

@app.on_event("shutdown")
async def shutdown():
    ...

# Use lifespan instead (see above)
```

## Testing with Lifespan

```python
import pytest
from httpx import AsyncClient, ASGITransport

@pytest.fixture
async def client():
    # Lifespan is automatically handled
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        yield client

# Or override lifespan for tests
@asynccontextmanager
async def test_lifespan(app: FastAPI):
    app.state.db = MockDatabase()
    app.state.redis = MockRedis()
    yield

app_for_testing = FastAPI(lifespan=test_lifespan)
```
