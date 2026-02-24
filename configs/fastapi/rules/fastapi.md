---
description: "FastAPI route and endpoint patterns"
paths:
  - "**/routers/**/*.py"
  - "**/routes/**/*.py"
  - "**/api/**/*.py"
  - "**/endpoints/**/*.py"
  - "**/main.py"
  - "**/app.py"
---

# FastAPI Endpoint Patterns

## Route Handler Rules

- Every handler MUST be `async def`
- Every handler returning data MUST have `response_model` set
- Use `status_code=` for non-200 defaults (201 on POST create, 204 on DELETE)
- Use `Annotated` type aliases for all dependencies -- NEVER inline `Depends()`
- Use `summary` and `description` on routes for OpenAPI documentation
- Return type annotation should match the ORM/domain object; `response_model` handles serialization

## SQLAlchemy Async Integration

- Use `AsyncSession` with `expire_on_commit=False` -- prevents lazy load issues after commit
- Set `lazy='raise'` on ALL SQLAlchemy relationships -- prevents implicit lazy loads that break async
- Use `selectinload()` / `joinedload()` for eager loading -- NEVER rely on implicit lazy loading
- Always use `select()` + `session.scalars()` / `session.execute()` -- NEVER use legacy `session.query()`

## Error Handling

- Define domain exceptions (`NotFoundError`, `ConflictError`, `BusinessError`) in `core/exceptions.py`
- Register `@app.exception_handler(DomainError)` for each -- returns structured JSON
- Services raise domain exceptions; routers NEVER catch them (middleware handles it)
- Use `responses={404: {"model": ErrorResponse}}` on routes for OpenAPI docs

## OpenAPI Configuration

- Set `title`, `version`, `description` on `FastAPI()` init
- Use `openapi_tags` for logical endpoint grouping
- Disable `docs_url` and `redoc_url` in production via settings toggle

## Type Hints

- Use `X | None` -- NEVER `Optional[X]`
- Use `list[X]`, `dict[K, V]` -- NEVER `List`, `Dict` from typing
- Use `Literal["a", "b"]` for constrained string params

## Anti-patterns

- NEVER put business logic in route handlers -- delegate to service layer
- NEVER use `session.query()` -- it is the legacy sync API
- NEVER access relationships without explicit eager loading in async -- raises `MissingGreenlet`
- NEVER return raw SQLAlchemy models without `response_model` -- leaks internal fields
- NEVER use bare `except Exception` in handlers -- let exception handlers do their job
