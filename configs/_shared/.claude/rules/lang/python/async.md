---
paths:
  - "**/handlers/**/*.py"
  - "**/services/**/*.py"
  - "**/consumers/**/*.py"
  - "**/workers/**/*.py"
  - "**/*_async*.py"
---

# Python Async Patterns

## Async Function Basics

```python
import asyncio
from typing import AsyncIterator

# Always use async def for I/O operations
async def fetch_user(user_id: int) -> User:
    return await db.users.get(user_id)

# Never mix sync I/O in async functions
# BAD
async def bad_fetch():
    return requests.get(url)  # Blocks event loop!

# GOOD
async def good_fetch():
    async with httpx.AsyncClient() as client:
        return await client.get(url)
```

## Concurrent Execution

```python
import asyncio

# Run tasks concurrently
async def fetch_all_data():
    # Wrong - sequential execution
    users = await fetch_users()
    orders = await fetch_orders()
    products = await fetch_products()

    # Right - concurrent execution
    users, orders, products = await asyncio.gather(
        fetch_users(),
        fetch_orders(),
        fetch_products(),
    )

    return users, orders, products

# With error handling
async def fetch_with_errors():
    results = await asyncio.gather(
        fetch_users(),
        fetch_orders(),
        fetch_products(),
        return_exceptions=True,  # Don't fail on first error
    )

    for result in results:
        if isinstance(result, Exception):
            logger.error(f"Task failed: {result}")
```

## TaskGroup (Python 3.11+)

```python
async def process_items(items: list[Item]) -> list[Result]:
    results = []

    async with asyncio.TaskGroup() as tg:
        for item in items:
            tg.create_task(process_item(item))

    # All tasks complete when exiting context
    return results

# With exception handling
async def process_with_handling(items: list[Item]):
    try:
        async with asyncio.TaskGroup() as tg:
            for item in items:
                tg.create_task(process_item(item))
    except* ValueError as eg:
        for exc in eg.exceptions:
            logger.error(f"Validation error: {exc}")
    except* ConnectionError as eg:
        for exc in eg.exceptions:
            logger.error(f"Connection error: {exc}")
```

## Async Context Managers

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def get_db_connection():
    conn = await create_connection()
    try:
        yield conn
    finally:
        await conn.close()

# Usage
async def query_users():
    async with get_db_connection() as conn:
        return await conn.fetch("SELECT * FROM users")

# Class-based context manager
class AsyncDatabaseSession:
    async def __aenter__(self):
        self.session = await create_session()
        return self.session

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            await self.session.rollback()
        else:
            await self.session.commit()
        await self.session.close()
```

## Async Iterators

```python
from typing import AsyncIterator

async def fetch_pages(url: str) -> AsyncIterator[Page]:
    next_url = url
    while next_url:
        response = await fetch(next_url)
        yield response.data
        next_url = response.next_url

# Usage
async def process_all_pages():
    async for page in fetch_pages("/api/items"):
        for item in page.items:
            await process_item(item)

# Async comprehension
async def get_all_items():
    return [
        item
        async for page in fetch_pages("/api/items")
        for item in page.items
    ]
```

## Semaphore for Rate Limiting

```python
import asyncio

async def fetch_with_limit(urls: list[str], max_concurrent: int = 10):
    semaphore = asyncio.Semaphore(max_concurrent)

    async def fetch_one(url: str):
        async with semaphore:
            async with httpx.AsyncClient() as client:
                return await client.get(url)

    return await asyncio.gather(*[fetch_one(url) for url in urls])
```

## Timeouts

```python
import asyncio

async def fetch_with_timeout(url: str, timeout: float = 10.0):
    try:
        async with asyncio.timeout(timeout):
            return await fetch(url)
    except asyncio.TimeoutError:
        logger.error(f"Timeout fetching {url}")
        raise

# Or with wait_for (older style)
async def fetch_with_wait_for(url: str):
    try:
        return await asyncio.wait_for(fetch(url), timeout=10.0)
    except asyncio.TimeoutError:
        raise
```

## Background Tasks

```python
import asyncio
from collections.abc import Callable

class BackgroundTasks:
    def __init__(self):
        self._tasks: set[asyncio.Task] = set()

    def add_task(self, coro):
        task = asyncio.create_task(coro)
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)

    async def shutdown(self):
        for task in self._tasks:
            task.cancel()
        await asyncio.gather(*self._tasks, return_exceptions=True)

# Usage in FastAPI
background = BackgroundTasks()

@app.post("/orders")
async def create_order(order: Order):
    saved = await save_order(order)
    background.add_task(send_notification(order))
    return saved

@app.on_event("shutdown")
async def shutdown():
    await background.shutdown()
```

## Async Queue

```python
import asyncio

async def producer(queue: asyncio.Queue[int]):
    for i in range(10):
        await queue.put(i)
        print(f"Produced: {i}")
        await asyncio.sleep(0.1)
    await queue.put(None)  # Sentinel to stop

async def consumer(queue: asyncio.Queue[int]):
    while True:
        item = await queue.get()
        if item is None:
            break
        print(f"Consumed: {item}")
        queue.task_done()

async def main():
    queue: asyncio.Queue[int] = asyncio.Queue(maxsize=5)

    await asyncio.gather(
        producer(queue),
        consumer(queue),
    )
```

## Async Lock

```python
import asyncio

class Counter:
    def __init__(self):
        self._value = 0
        self._lock = asyncio.Lock()

    async def increment(self):
        async with self._lock:
            self._value += 1
            return self._value

    async def get(self) -> int:
        async with self._lock:
            return self._value
```

## SQLAlchemy Async

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Create async engine
engine = create_async_engine(
    "postgresql+asyncpg://user:pass@localhost/db",
    echo=True,
)

# Async session factory
async_session = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Usage
async def get_user(user_id: int) -> User | None:
    async with async_session() as session:
        result = await session.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()

# FastAPI dependency
async def get_db() -> AsyncIterator[AsyncSession]:
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

## httpx Async Client

```python
import httpx

# Reuse client for connection pooling
class ApiClient:
    def __init__(self, base_url: str):
        self._client = httpx.AsyncClient(
            base_url=base_url,
            timeout=30.0,
            headers={"User-Agent": "MyApp/1.0"},
        )

    async def get(self, path: str) -> dict:
        response = await self._client.get(path)
        response.raise_for_status()
        return response.json()

    async def close(self):
        await self._client.aclose()

# Usage with context manager
async with httpx.AsyncClient() as client:
    response = await client.get("https://api.example.com/data")
```
