---
paths:
  - "**/blueprints/**/*.py"
  - "**/views/**/*.py"
  - "**/routes/**/*.py"
  - "**/app.py"
  - "**/wsgi.py"
---

# Flask Rules

## Application Factory

```python
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

db = SQLAlchemy()
migrate = Migrate()

def create_app(config_name: str = "development") -> Flask:
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)

    # Register blueprints
    from app.users import bp as users_bp
    from app.auth import bp as auth_bp

    app.register_blueprint(users_bp, url_prefix="/api/v1/users")
    app.register_blueprint(auth_bp, url_prefix="/api/v1/auth")

    # Register error handlers
    register_error_handlers(app)

    return app
```

## Blueprints

```python
from flask import Blueprint, request, jsonify
from http import HTTPStatus

bp = Blueprint("users", __name__)

@bp.get("/")
def list_users():
    """List all users with pagination."""
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)

    pagination = User.query.paginate(page=page, per_page=per_page)

    return jsonify({
        "items": [user.to_dict() for user in pagination.items],
        "total": pagination.total,
        "page": pagination.page,
        "pages": pagination.pages,
    })


@bp.get("/<int:user_id>")
def get_user(user_id: int):
    """Get a user by ID."""
    user = db.get_or_404(User, user_id)
    return jsonify(user.to_dict())


@bp.post("/")
def create_user():
    """Create a new user."""
    data = request.get_json()

    # Validation
    errors = validate_user_data(data)
    if errors:
        return jsonify({"errors": errors}), HTTPStatus.BAD_REQUEST

    user = User(
        email=data["email"],
        name=data["name"],
    )
    user.set_password(data["password"])

    db.session.add(user)
    db.session.commit()

    return jsonify(user.to_dict()), HTTPStatus.CREATED


@bp.put("/<int:user_id>")
def update_user(user_id: int):
    """Update a user."""
    user = db.get_or_404(User, user_id)
    data = request.get_json()

    if "email" in data:
        user.email = data["email"]
    if "name" in data:
        user.name = data["name"]

    db.session.commit()
    return jsonify(user.to_dict())


@bp.delete("/<int:user_id>")
def delete_user(user_id: int):
    """Delete a user."""
    user = db.get_or_404(User, user_id)
    db.session.delete(user)
    db.session.commit()
    return "", HTTPStatus.NO_CONTENT
```

## Models with Flask-SQLAlchemy

```python
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from app import db

class TimestampMixin:
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class User(TimestampMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(256), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    name = db.Column(db.String(100))
    role = db.Column(db.String(50), default="user")

    # Relationships
    posts = db.relationship("Post", back_populates="author", lazy="dynamic")

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "role": self.role,
            "created_at": self.created_at.isoformat(),
        }
```

## Error Handling

```python
from flask import jsonify
from werkzeug.exceptions import HTTPException

def register_error_handlers(app: Flask) -> None:

    @app.errorhandler(HTTPException)
    def handle_http_exception(error: HTTPException):
        return jsonify({
            "error": error.name,
            "message": error.description,
        }), error.code

    @app.errorhandler(ValidationError)
    def handle_validation_error(error: ValidationError):
        return jsonify({
            "error": "Validation Error",
            "message": str(error),
            "details": error.errors,
        }), HTTPStatus.BAD_REQUEST

    @app.errorhandler(Exception)
    def handle_generic_exception(error: Exception):
        app.logger.exception("Unhandled exception")
        return jsonify({
            "error": "Internal Server Error",
            "message": "An unexpected error occurred",
        }), HTTPStatus.INTERNAL_SERVER_ERROR
```

## Authentication with Flask-JWT-Extended

```python
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
    current_user,
)

jwt = JWTManager()

@jwt.user_identity_loader
def user_identity_lookup(user: User) -> int:
    return user.id

@jwt.user_lookup_loader
def user_lookup_callback(_jwt_header, jwt_data) -> User | None:
    identity = jwt_data["sub"]
    return User.query.get(identity)

# Auth blueprint
auth_bp = Blueprint("auth", __name__)

@auth_bp.post("/login")
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data["email"]).first()

    if not user or not user.check_password(data["password"]):
        return jsonify({"error": "Invalid credentials"}), HTTPStatus.UNAUTHORIZED

    return jsonify({
        "access_token": create_access_token(identity=user),
        "refresh_token": create_refresh_token(identity=user),
    })

@auth_bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    user = current_user
    return jsonify({
        "access_token": create_access_token(identity=user),
    })

# Protected route
@bp.get("/me")
@jwt_required()
def get_current_user():
    return jsonify(current_user.to_dict())
```

## Request Validation with Marshmallow

```python
from marshmallow import Schema, fields, validate, ValidationError, post_load

class UserCreateSchema(Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=validate.Length(min=8))
    name = fields.Str(required=True, validate=validate.Length(min=1, max=100))

class UserUpdateSchema(Schema):
    email = fields.Email()
    name = fields.Str(validate=validate.Length(max=100))

class UserResponseSchema(Schema):
    id = fields.Int(dump_only=True)
    email = fields.Email()
    name = fields.Str()
    created_at = fields.DateTime(dump_only=True)

# Usage in route
@bp.post("/")
def create_user():
    schema = UserCreateSchema()
    try:
        data = schema.load(request.get_json())
    except ValidationError as err:
        return jsonify({"errors": err.messages}), HTTPStatus.BAD_REQUEST

    # Create user...
```

## Configuration

```python
import os

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "jwt-secret")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)

class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", "sqlite:///dev.db"
    )

class ProductionConfig(Config):
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ["DATABASE_URL"]

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"

config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
}
```

## CLI Commands

```python
import click
from flask.cli import with_appcontext

@app.cli.command("seed-db")
@with_appcontext
def seed_db():
    """Seed the database with initial data."""
    admin = User(email="admin@example.com", name="Admin", role="admin")
    admin.set_password("admin123")
    db.session.add(admin)
    db.session.commit()
    click.echo("Database seeded!")

@app.cli.command("create-admin")
@click.argument("email")
@click.password_option()
@with_appcontext
def create_admin(email: str, password: str):
    """Create an admin user."""
    user = User(email=email, role="admin")
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    click.echo(f"Admin {email} created!")
```
