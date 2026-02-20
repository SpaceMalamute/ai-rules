---
description: "Python error handling and custom exceptions"
paths:
  - "**/exceptions/**/*.py"
  - "**/errors/**/*.py"
  - "**/handlers/**/*.py"
  - "**/api/**/*.py"
  - "**/routers/**/*.py"
---

# Python Error Handling

## Custom Exception Hierarchy

```python
# exceptions/base.py
from typing import Any


class AppError(Exception):
    """Base exception for application errors."""

    def __init__(
        self,
        message: str,
        code: str = "APP_ERROR",
        details: dict[str, Any] | None = None,
    ):
        self.message = message
        self.code = code
        self.details = details or {}
        super().__init__(message)


class ValidationError(AppError):
    """Input validation failed."""

    def __init__(self, message: str, field: str | None = None):
        super().__init__(
            message=message,
            code="VALIDATION_ERROR",
            details={"field": field} if field else {},
        )


class NotFoundError(AppError):
    """Resource not found."""

    def __init__(self, resource: str, id: str | int):
        super().__init__(
            message=f"{resource} with id {id} not found",
            code="NOT_FOUND",
            details={"resource": resource, "id": str(id)},
        )


class ConflictError(AppError):
    """Resource already exists."""

    def __init__(self, resource: str, field: str, value: str):
        super().__init__(
            message=f"{resource} with {field}={value} already exists",
            code="CONFLICT",
            details={"resource": resource, "field": field, "value": value},
        )


class UnauthorizedError(AppError):
    """Authentication required."""

    def __init__(self, message: str = "Authentication required"):
        super().__init__(message=message, code="UNAUTHORIZED")


class ForbiddenError(AppError):
    """Permission denied."""

    def __init__(self, message: str = "Permission denied"):
        super().__init__(message=message, code="FORBIDDEN")


class ExternalServiceError(AppError):
    """External service call failed."""

    def __init__(self, service: str, message: str):
        super().__init__(
            message=f"{service}: {message}",
            code="EXTERNAL_SERVICE_ERROR",
            details={"service": service},
        )
```

## FastAPI Exception Handlers

```python
# exceptions/handlers.py
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import ValidationError as PydanticValidationError
import logging

from .base import (
    AppError,
    NotFoundError,
    ValidationError,
    UnauthorizedError,
    ForbiddenError,
)

logger = logging.getLogger(__name__)


def register_exception_handlers(app: FastAPI) -> None:
    """Register all exception handlers."""

    @app.exception_handler(NotFoundError)
    async def not_found_handler(request: Request, exc: NotFoundError):
        return JSONResponse(
            status_code=404,
            content={
                "error": exc.code,
                "message": exc.message,
                "details": exc.details,
            },
        )

    @app.exception_handler(ValidationError)
    async def validation_handler(request: Request, exc: ValidationError):
        return JSONResponse(
            status_code=400,
            content={
                "error": exc.code,
                "message": exc.message,
                "details": exc.details,
            },
        )

    @app.exception_handler(UnauthorizedError)
    async def unauthorized_handler(request: Request, exc: UnauthorizedError):
        return JSONResponse(
            status_code=401,
            content={"error": exc.code, "message": exc.message},
            headers={"WWW-Authenticate": "Bearer"},
        )

    @app.exception_handler(ForbiddenError)
    async def forbidden_handler(request: Request, exc: ForbiddenError):
        return JSONResponse(
            status_code=403,
            content={"error": exc.code, "message": exc.message},
        )

    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError):
        logger.error(f"Application error: {exc.code} - {exc.message}")
        return JSONResponse(
            status_code=422,
            content={
                "error": exc.code,
                "message": exc.message,
                "details": exc.details,
            },
        )

    @app.exception_handler(PydanticValidationError)
    async def pydantic_validation_handler(
        request: Request, exc: PydanticValidationError
    ):
        return JSONResponse(
            status_code=422,
            content={
                "error": "VALIDATION_ERROR",
                "message": "Request validation failed",
                "details": exc.errors(),
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.exception("Unhandled exception")
        return JSONResponse(
            status_code=500,
            content={
                "error": "INTERNAL_ERROR",
                "message": "An unexpected error occurred",
            },
        )
```

## Error Response Schema

```python
# schemas/error.py
from pydantic import BaseModel
from typing import Any


class ErrorResponse(BaseModel):
    """Standard error response format."""

    error: str
    message: str
    details: dict[str, Any] = {}

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "error": "NOT_FOUND",
                    "message": "User with id 123 not found",
                    "details": {"resource": "User", "id": "123"},
                }
            ]
        }
    }
```

## Usage in Services

```python
# services/user.py
from exceptions import NotFoundError, ConflictError


class UserService:
    async def get_by_id(self, user_id: int) -> User:
        user = await self.repository.get(user_id)
        if not user:
            raise NotFoundError("User", user_id)
        return user

    async def create(self, data: UserCreate) -> User:
        existing = await self.repository.get_by_email(data.email)
        if existing:
            raise ConflictError("User", "email", data.email)
        return await self.repository.create(data)
```

## Result Pattern (Alternative)

```python
# core/result.py
from dataclasses import dataclass
from typing import Generic, TypeVar

T = TypeVar("T")
E = TypeVar("E", bound=Exception)


@dataclass
class Ok(Generic[T]):
    value: T

    def is_ok(self) -> bool:
        return True

    def is_err(self) -> bool:
        return False


@dataclass
class Err(Generic[E]):
    error: E

    def is_ok(self) -> bool:
        return False

    def is_err(self) -> bool:
        return True


Result = Ok[T] | Err[E]


# Usage
async def get_user(user_id: int) -> Result[User, NotFoundError]:
    user = await repository.get(user_id)
    if not user:
        return Err(NotFoundError("User", user_id))
    return Ok(user)


# Handling
result = await get_user(123)
match result:
    case Ok(user):
        return user
    case Err(error):
        raise error
```

## Anti-Patterns

```python
# BAD: Catching all exceptions
try:
    user = await get_user(user_id)
except Exception:
    return None  # Swallows all errors!


# GOOD: Catch specific exceptions
try:
    user = await get_user(user_id)
except NotFoundError:
    return None
except Exception:
    logger.exception("Unexpected error getting user")
    raise


# BAD: Raising generic exceptions
if not user:
    raise Exception("User not found")


# GOOD: Raise typed exceptions
if not user:
    raise NotFoundError("User", user_id)


# BAD: Exposing internal errors to clients
except Exception as e:
    return {"error": str(e)}  # Leaks implementation details!


# GOOD: Map to safe error responses
except Exception as e:
    logger.exception("Internal error")
    return {"error": "INTERNAL_ERROR", "message": "An unexpected error occurred"}
```
