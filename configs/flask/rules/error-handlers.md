---
description: "Flask error handling and responses"
paths:
  - "**/*.py"
---

# Flask Error Handling

## Error Handler Registration

Register all error handlers in a dedicated `register_error_handlers(app)` function called from `create_app()`. Keep handlers out of route files.

## Handler Priority

| Handler | Catches | Response |
|---|---|---|
| `@app.errorhandler(MarshmallowValidationError)` | Schema validation failures | 400 + `{"error": "...", "details": error.messages}` |
| `@app.errorhandler(AppException)` | Custom domain exceptions | Dynamic status + `error.to_dict()` |
| `@app.errorhandler(IntegrityError)` | DB constraint violations | 409 for unique, 400 otherwise — always `db.session.rollback()` |
| `@app.errorhandler(HTTPException)` | Werkzeug HTTP errors | Error code + `{"error": name, "message": description}` |
| `@app.errorhandler(Exception)` | Unhandled exceptions | 500 + generic message (log full traceback) |

## Custom Exception Hierarchy

Define a base `AppException` with `status_code`, `error_code`, and `message`. Subclass for each domain error:

| Exception | Status | Error Code |
|---|---|---|
| `NotFoundError` | 404 | `NOT_FOUND` |
| `ValidationError` | 400 | `VALIDATION_ERROR` |
| `UnauthorizedError` | 401 | `UNAUTHORIZED` |
| `ForbiddenError` | 403 | `FORBIDDEN` |
| `ConflictError` | 409 | `CONFLICT` |

Raise these from services — the global handler converts them to JSON responses automatically.

## Consistent Response Format

All error responses MUST follow the same structure: `{"error": "<CODE>", "message": "<human-readable>"}` with optional `"details"` for validation errors and `"request_id"` from `g.request_id`.

## Blueprint Error Handlers

Use `@bp.errorhandler(...)` for domain-specific error messages. App-level handlers are the fallback. Blueprint handlers only catch errors raised within that blueprint.

## SQLAlchemy Error Handling

Always `db.session.rollback()` in `IntegrityError` and `SQLAlchemyError` handlers. Parse `error.orig` to distinguish unique constraint violations (409) from other DB errors (400/500).

## Logging

Log unhandled exceptions with full traceback, request path, method, and user ID. In debug mode, include traceback in response. In production, return only generic message.

## Anti-Patterns

- Catching `ValidationError` in every route — use global `errorhandler` instead
- Missing `db.session.rollback()` in DB error handlers — leaves session in broken state
- Returning stack traces in production — information leak
- Inconsistent error response formats across endpoints — standardize with `AppException`
