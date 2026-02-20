---
description: "Flask error handling and responses"
paths:
  - "**/*.py"
---

# Flask Error Handling

## HTTP Error Handlers

```python
from flask import jsonify, render_template
from werkzeug.exceptions import HTTPException

# JSON API error handler
@app.errorhandler(HTTPException)
def handle_http_exception(error):
    return jsonify({
        "error": error.name,
        "message": error.description,
        "status_code": error.code,
    }), error.code

# Specific error handlers
@app.errorhandler(404)
def not_found(error):
    if request.accept_mimetypes.accept_json:
        return jsonify({"error": "Not found"}), 404
    return render_template("errors/404.html"), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()  # Rollback failed transaction
    return jsonify({"error": "Internal server error"}), 500

@app.errorhandler(429)
def rate_limit_exceeded(error):
    return jsonify({
        "error": "Rate limit exceeded",
        "retry_after": error.description,
    }), 429
```

## Custom Exception Classes

```python
class AppException(Exception):
    """Base exception for application errors."""
    status_code = 500
    error_code = "INTERNAL_ERROR"
    message = "An unexpected error occurred"

    def __init__(self, message: str = None, payload: dict = None):
        super().__init__()
        self.message = message or self.message
        self.payload = payload

    def to_dict(self) -> dict:
        rv = {
            "error": self.error_code,
            "message": self.message,
        }
        if self.payload:
            rv["details"] = self.payload
        return rv

class NotFoundError(AppException):
    status_code = 404
    error_code = "NOT_FOUND"
    message = "Resource not found"

class ValidationError(AppException):
    status_code = 400
    error_code = "VALIDATION_ERROR"
    message = "Validation failed"

class UnauthorizedError(AppException):
    status_code = 401
    error_code = "UNAUTHORIZED"
    message = "Authentication required"

class ForbiddenError(AppException):
    status_code = 403
    error_code = "FORBIDDEN"
    message = "Access denied"

class ConflictError(AppException):
    status_code = 409
    error_code = "CONFLICT"
    message = "Resource already exists"

# Register handler
@app.errorhandler(AppException)
def handle_app_exception(error):
    response = jsonify(error.to_dict())
    response.status_code = error.status_code
    return response

# Usage
@users_bp.route("/<int:user_id>")
def get_user(user_id: int):
    user = User.query.get(user_id)
    if not user:
        raise NotFoundError(f"User {user_id} not found")
    return jsonify(UserSchema().dump(user))
```

## Marshmallow Validation Errors

```python
from marshmallow import ValidationError as MarshmallowValidationError

@app.errorhandler(MarshmallowValidationError)
def handle_validation_error(error):
    return jsonify({
        "error": "VALIDATION_ERROR",
        "message": "Input validation failed",
        "details": error.messages,
    }), 400

# Usage
@users_bp.route("/", methods=["POST"])
def create_user():
    schema = UserCreateSchema()
    data = schema.load(request.get_json())  # Raises ValidationError if invalid
    user = UserService.create(data)
    return jsonify(UserSchema().dump(user)), 201
```

## SQLAlchemy Errors

```python
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

@app.errorhandler(IntegrityError)
def handle_integrity_error(error):
    db.session.rollback()

    # Parse constraint violation
    if "unique constraint" in str(error.orig).lower():
        return jsonify({
            "error": "DUPLICATE_ENTRY",
            "message": "A record with this value already exists",
        }), 409

    return jsonify({
        "error": "DATABASE_ERROR",
        "message": "Database constraint violation",
    }), 400

@app.errorhandler(SQLAlchemyError)
def handle_db_error(error):
    db.session.rollback()
    app.logger.error(f"Database error: {error}")
    return jsonify({
        "error": "DATABASE_ERROR",
        "message": "A database error occurred",
    }), 500
```

## Logging Errors

```python
import logging
import traceback

@app.errorhandler(Exception)
def handle_unexpected_error(error):
    # Log full traceback
    app.logger.error(
        "Unhandled exception",
        extra={
            "error": str(error),
            "traceback": traceback.format_exc(),
            "path": request.path,
            "method": request.method,
            "user_id": g.get("user_id"),
        },
    )

    # Return generic error to client
    if app.debug:
        return jsonify({
            "error": "INTERNAL_ERROR",
            "message": str(error),
            "traceback": traceback.format_exc(),
        }), 500

    return jsonify({
        "error": "INTERNAL_ERROR",
        "message": "An unexpected error occurred",
    }), 500
```

## Blueprint Error Handlers

```python
users_bp = Blueprint("users", __name__)

# Only handles errors from this blueprint
@users_bp.errorhandler(404)
def user_not_found(error):
    return jsonify({
        "error": "USER_NOT_FOUND",
        "message": "The requested user was not found",
    }), 404

# App-level handler is fallback
@app.errorhandler(404)
def generic_not_found(error):
    return jsonify({
        "error": "NOT_FOUND",
        "message": "Resource not found",
    }), 404
```

## Error Response Format

```python
from dataclasses import dataclass
from typing import Any

@dataclass
class ErrorResponse:
    error: str
    message: str
    status_code: int
    details: dict[str, Any] | None = None
    request_id: str | None = None

    def to_dict(self) -> dict:
        data = {
            "error": self.error,
            "message": self.message,
        }
        if self.details:
            data["details"] = self.details
        if self.request_id:
            data["request_id"] = self.request_id
        return data

def error_response(
    error: str,
    message: str,
    status_code: int,
    details: dict = None,
) -> tuple:
    response = ErrorResponse(
        error=error,
        message=message,
        status_code=status_code,
        details=details,
        request_id=g.get("request_id"),
    )
    return jsonify(response.to_dict()), status_code
```

## Abort with Custom Response

```python
from flask import abort

@users_bp.route("/<int:user_id>")
def get_user(user_id: int):
    user = User.query.get(user_id)
    if not user:
        abort(404, description="User not found")
    return jsonify(UserSchema().dump(user))

# Or with custom response
from werkzeug.exceptions import NotFound

@users_bp.route("/<int:user_id>")
def get_user(user_id: int):
    user = User.query.get(user_id)
    if not user:
        raise NotFound(f"User with ID {user_id} not found")
    return jsonify(UserSchema().dump(user))
```
