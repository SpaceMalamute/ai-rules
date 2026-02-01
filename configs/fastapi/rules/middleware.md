---
paths:
  - "**/*.py"
---

# FastAPI Middleware Patterns

## Custom Middleware

```python
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
import time

class TimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.perf_counter()

        response = await call_next(request)

        process_time = time.perf_counter() - start_time
        response.headers["X-Process-Time"] = f"{process_time:.4f}"

        return response

app.add_middleware(TimingMiddleware)
```

## Request ID Middleware

```python
import uuid
from contextvars import ContextVar

request_id_ctx: ContextVar[str] = ContextVar("request_id", default="")

class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request_id_ctx.set(request_id)

        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id

        return response

def get_request_id() -> str:
    return request_id_ctx.get()
```

## Logging Middleware

```python
import logging
from typing import Callable

logger = logging.getLogger(__name__)

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        # Log request
        logger.info(
            "Request started",
            extra={
                "method": request.method,
                "path": request.url.path,
                "client_ip": request.client.host,
                "request_id": get_request_id(),
            },
        )

        start_time = time.perf_counter()

        try:
            response = await call_next(request)
        except Exception as e:
            logger.exception(
                "Request failed",
                extra={
                    "path": request.url.path,
                    "error": str(e),
                    "request_id": get_request_id(),
                },
            )
            raise

        duration = time.perf_counter() - start_time

        # Log response
        logger.info(
            "Request completed",
            extra={
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration": f"{duration:.4f}s",
                "request_id": get_request_id(),
            },
        )

        return response
```

## Error Handling Middleware

```python
from fastapi.responses import JSONResponse

class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        try:
            return await call_next(request)
        except ValueError as e:
            return JSONResponse(
                status_code=400,
                content={"error": "Bad Request", "detail": str(e)},
            )
        except PermissionError as e:
            return JSONResponse(
                status_code=403,
                content={"error": "Forbidden", "detail": str(e)},
            )
        except Exception as e:
            logger.exception("Unhandled exception")
            return JSONResponse(
                status_code=500,
                content={"error": "Internal Server Error"},
            )
```

## Pure ASGI Middleware

```python
# More performant than BaseHTTPMiddleware
class PureASGIMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        # Before request
        start_time = time.perf_counter()

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                # Add headers
                headers = list(message.get("headers", []))
                duration = time.perf_counter() - start_time
                headers.append((b"x-process-time", f"{duration:.4f}".encode()))
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_wrapper)

app.add_middleware(PureASGIMiddleware)
```

## Database Session Middleware

```python
from contextvars import ContextVar

db_session_ctx: ContextVar[AsyncSession | None] = ContextVar("db_session", default=None)

class DatabaseSessionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        async with async_session() as session:
            db_session_ctx.set(session)
            try:
                response = await call_next(request)
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                db_session_ctx.set(None)

        return response

def get_db() -> AsyncSession:
    session = db_session_ctx.get()
    if session is None:
        raise RuntimeError("No database session available")
    return session
```

## Middleware Order

```python
# Order matters! Last added = first executed
# Request flow: A -> B -> C -> Handler -> C -> B -> A

app.add_middleware(ErrorHandlingMiddleware)    # 3rd (innermost)
app.add_middleware(LoggingMiddleware)          # 2nd
app.add_middleware(RequestIDMiddleware)        # 1st (outermost)
```

## Built-in Middleware

```python
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware

# HTTPS redirect
app.add_middleware(HTTPSRedirectMiddleware)

# Trusted hosts
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["example.com", "*.example.com"],
)

# GZip compression
app.add_middleware(GZipMiddleware, minimum_size=1000)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://example.com"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```
