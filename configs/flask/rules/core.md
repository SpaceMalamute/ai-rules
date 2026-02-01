---
description: "Flask 3.0+ project conventions and architecture"
alwaysApply: true
---

# Flask Project Guidelines

## Stack

- Python 3.12+
- Flask 3.0+
- SQLAlchemy 2.0+ (sync or async)
- Marshmallow for validation
- pytest for testing
- uv or poetry for dependencies

## Architecture

```
src/app/
├── __init__.py          # App factory
├── config.py            # Configuration classes
├── extensions.py        # Flask extensions (db, migrate, etc.)
├── [domain]/            # Feature blueprints
│   ├── __init__.py      # Blueprint registration
│   ├── routes.py        # Route handlers
│   ├── schemas.py       # Marshmallow schemas
│   ├── models.py        # SQLAlchemy models
│   ├── services.py      # Business logic
│   └── repository.py    # Data access
├── core/                # Shared utilities
│   ├── exceptions.py
│   └── security.py
└── common/
    ├── models.py        # Base models
    └── schemas.py       # Shared schemas
```

## Flask Patterns

### Application Factory

```python
from flask import Flask
from app.extensions import db, migrate
from app.config import config

def create_app(config_name: str = "development") -> Flask:
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)

    # Register blueprints
    from app.users import users_bp
    app.register_blueprint(users_bp, url_prefix="/api/v1/users")

    # Register error handlers
    register_error_handlers(app)

    return app
```

### Blueprints

```python
from flask import Blueprint, request, jsonify
from app.users.schemas import UserCreateSchema, UserResponseSchema
from app.users.services import UserService

users_bp = Blueprint("users", __name__)

@users_bp.route("/", methods=["POST"])
def create_user():
    schema = UserCreateSchema()
    data = schema.load(request.get_json())

    user = UserService.create(data)

    return jsonify(UserResponseSchema().dump(user)), 201

@users_bp.route("/<int:user_id>")
def get_user(user_id: int):
    user = UserService.get_by_id(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(UserResponseSchema().dump(user))
```

### Extensions

```python
# extensions.py
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
```

## Marshmallow Schemas

```python
from marshmallow import Schema, fields, validate, post_load

class UserCreateSchema(Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=validate.Length(min=8))
    name = fields.Str(required=True, validate=validate.Length(min=1, max=100))

class UserResponseSchema(Schema):
    id = fields.Int(dump_only=True)
    email = fields.Email()
    name = fields.Str()
    created_at = fields.DateTime(dump_only=True)
```

## SQLAlchemy 2.0

```python
from sqlalchemy.orm import Mapped, mapped_column
from app.extensions import db

class User(db.Model):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(unique=True, index=True)
    hashed_password: Mapped[str]
    name: Mapped[str] = mapped_column(db.String(100))
    is_active: Mapped[bool] = mapped_column(default=True)
```

## Error Handling

```python
from flask import jsonify
from werkzeug.exceptions import HTTPException

def register_error_handlers(app):
    @app.errorhandler(HTTPException)
    def handle_http_error(error):
        return jsonify({
            "error": error.name,
            "message": error.description,
        }), error.code

    @app.errorhandler(ValidationError)
    def handle_validation_error(error):
        return jsonify({
            "error": "Validation Error",
            "details": error.messages,
        }), 400
```

## Commands

```bash
flask run                         # Dev server
flask db upgrade                  # Run migrations
flask db migrate -m "message"     # Generate migration
pytest                            # Run tests
pytest --cov=app                  # Coverage
ruff check . && ruff format .    # Lint + format
```
