---
description: "FastAPI authentication and security"
paths:
  - "**/*.py"
---

# FastAPI Security

## Authentication Dependencies

- Define `CurrentUser = Annotated[User, Depends(get_current_user)]` as the standard auth dependency
- `get_current_user` decodes JWT, fetches user from DB, raises 401 on failure
- Use `OAuth2PasswordBearer(tokenUrl="/auth/token")` as the token extractor
- Always include `headers={"WWW-Authenticate": "Bearer"}` in 401 responses

## Role-Based Access Control

Use parameterized dependencies for role/permission checks:

```python
def require_roles(*roles: Role):
    async def dependency(user: CurrentUser) -> User:
        if user.role not in roles:
            raise HTTPException(403, "Insufficient permissions")
        return user
    return dependency

AdminOnly = Annotated[User, Depends(require_roles(Role.ADMIN))]
```

## API Key Authentication

- Support both header (`X-API-Key`) and query param (`api_key`) via `APIKeyHeader` / `APIKeyQuery`
- Combine with `auto_error=False` and a union dependency that checks both sources
- Apply as router-level or app-level dependency

## Password Handling

- Use `bcrypt` directly (`bcrypt.hashpw` / `bcrypt.checkpw`) or `pwdlib` for password hashing -- `passlib` is unmaintained
- Hash on create, verify on login -- NEVER compare plaintext
- NEVER log or return passwords in responses

## CORS Configuration

- Whitelist exact origins in `allow_origins` -- NEVER `["*"]` in production
- Set `allow_credentials=True` only when using cookies
- Restrict `allow_methods` to actual methods used
- Use `expose_headers` for custom response headers the client needs

## Security Headers

Add via middleware: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`, `X-XSS-Protection: 0` (modern browsers).

## Rate Limiting

- Use `slowapi` with `Limiter(key_func=get_remote_address)` for per-IP limiting
- Apply per-route with `@limiter.limit("10/minute")` decorator
- Return 429 with `Retry-After` header

## Anti-patterns

- NEVER store JWT secret in code -- use environment variables via `pydantic-settings`
- NEVER use `HS256` with a weak secret -- minimum 256-bit random key
- NEVER skip token expiry (`exp` claim) -- always set reasonable TTL
- NEVER trust client-provided user ID -- always derive from token
- NEVER disable CORS in production -- configure it properly
