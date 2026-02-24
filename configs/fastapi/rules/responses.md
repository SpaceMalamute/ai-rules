---
description: "FastAPI response models and status codes"
paths:
  - "**/*.py"
---

# FastAPI Responses

## Response Model Rules

- Every data-returning route MUST set `response_model=SchemaName`
- Use `response_model_exclude_unset=True` as default -- omits fields not explicitly set
- Create dedicated response schemas to control exposed fields — NEVER use `response_model_exclude` to hide fields
- Response schemas MUST have `model_config = ConfigDict(from_attributes=True)` for ORM compatibility

## Status Code Conventions

| Operation | Status code | Return type |
|-----------|------------|-------------|
| GET single | 200 | `response_model=ItemResponse` |
| GET list | 200 | `response_model=Page[ItemResponse]` |
| POST create | 201 | `response_model=ItemResponse` |
| PUT/PATCH update | 200 | `response_model=ItemResponse` |
| DELETE | 204 | `Response(status_code=204)` |
| Async job queued | 202 | `{"task_id": "..."}` |

## Response Classes

| Class | Use case |
|-------|----------|
| `JSONResponse` | Custom status/headers with JSON body |
| `StreamingResponse` | SSE, large files, chunked data |
| `FileResponse` | File downloads with `Content-Disposition` |
| `RedirectResponse` | HTTP redirects (301/302) |
| `HTMLResponse` | Server-rendered HTML |

## Error Responses

- Document error responses in `responses={404: {"model": ErrorResponse}}` for OpenAPI
- Use structured `ErrorResponse` schema with `error`, `detail`, `code` fields
- Register `@app.exception_handler(DomainException)` -- NEVER catch-and-return `JSONResponse` inline
- Use `HTTPException` headers param for auth errors: `headers={"WWW-Authenticate": "Bearer"}`

## Headers and Cookies

- Inject `Response` parameter to set custom headers: `response.headers["X-Custom"] = "value"`
- Set `Cache-Control` header for cacheable GET endpoints
- Cookies: always set `httponly=True`, `secure=True`, `samesite="lax"` for session cookies

## Streaming

- Use `AsyncGenerator[bytes, None]` for streaming responses
- Set `media_type="text/event-stream"` for SSE
- Use chunked reads (`8192` bytes) for large file streaming -- NEVER load entire file into memory

## Anti-patterns

- NEVER return raw dicts from routes -- always use `response_model` for serialization control
- NEVER return 200 for creation -- use 201
- NEVER return response body on DELETE -- use 204 No Content
- NEVER leak internal model fields -- `response_model` acts as a serialization firewall
