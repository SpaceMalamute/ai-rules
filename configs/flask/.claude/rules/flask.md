---
paths:
  - "**/*.py"
---

# Flask Rules

## Application Factory

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
    register_blueprints(app)

    # Register error handlers
    register_error_handlers(app)

    return app

def register_blueprints(app: Flask):
    from app.users import users_bp
    from app.auth import auth_bp

    app.register_blueprint(users_bp, url_prefix="/api/v1/users")
    app.register_blueprint(auth_bp, url_prefix="/api/v1/auth")
```

## Blueprints

```python
from flask import Blueprint, request, jsonify

users_bp = Blueprint("users", __name__)

@users_bp.route("/", methods=["GET"])
def list_users():
    users = UserService.get_all()
    return jsonify(UserSchema(many=True).dump(users))

@users_bp.route("/", methods=["POST"])
def create_user():
    schema = UserCreateSchema()
    data = schema.load(request.get_json())
    user = UserService.create(data)
    return jsonify(UserSchema().dump(user)), 201

@users_bp.route("/<int:user_id>")
def get_user(user_id: int):
    user = UserService.get_by_id(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(UserSchema().dump(user))
```

## Nested Blueprints (API Versioning)

```python
api_v1 = Blueprint("api_v1", __name__, url_prefix="/api/v1")
api_v2 = Blueprint("api_v2", __name__, url_prefix="/api/v2")

api_v1.register_blueprint(users_bp, url_prefix="/users")
api_v1.register_blueprint(products_bp, url_prefix="/products")

app.register_blueprint(api_v1)
app.register_blueprint(api_v2)
```

## Class-Based Views

```python
from flask.views import MethodView

class UserAPI(MethodView):
    def get(self, user_id: int | None = None):
        if user_id is None:
            return jsonify(UserSchema(many=True).dump(User.query.all()))
        return jsonify(UserSchema().dump(User.query.get_or_404(user_id)))

    def post(self):
        data = UserCreateSchema().load(request.get_json())
        user = UserService.create(data)
        return jsonify(UserSchema().dump(user)), 201

    def put(self, user_id: int):
        user = User.query.get_or_404(user_id)
        data = UserUpdateSchema().load(request.get_json())
        user = UserService.update(user, data)
        return jsonify(UserSchema().dump(user))

    def delete(self, user_id: int):
        UserService.delete(User.query.get_or_404(user_id))
        return "", 204

user_view = UserAPI.as_view("user_api")
users_bp.add_url_rule("/", view_func=user_view, methods=["GET", "POST"])
users_bp.add_url_rule("/<int:user_id>", view_func=user_view, methods=["GET", "PUT", "DELETE"])
```

## Extensions

```python
# extensions.py - Lazy initialization
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_caching import Cache
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
cors = CORS()
cache = Cache()
limiter = Limiter(key_func=get_remote_address, default_limits=["100 per hour"])

# In factory
def create_app():
    app = Flask(__name__)
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(app)
    cache.init_app(app)
    limiter.init_app(app)
    return app
```

## Flask-JWT-Extended

```python
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, current_user, get_jwt_identity,
)

@jwt.user_lookup_loader
def user_lookup_callback(_jwt_header, jwt_data):
    return User.query.get(jwt_data["sub"])

@auth_bp.route("/login", methods=["POST"])
def login():
    data = LoginSchema().load(request.get_json())
    user = User.query.filter_by(email=data["email"]).first()

    if not user or not user.check_password(data["password"]):
        return jsonify({"error": "Invalid credentials"}), 401

    return jsonify({
        "access_token": create_access_token(identity=user.id),
        "refresh_token": create_refresh_token(identity=user.id),
    })

@users_bp.route("/me")
@jwt_required()
def get_me():
    return jsonify(UserSchema().dump(current_user))

@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    return jsonify({"access_token": create_access_token(identity=get_jwt_identity())})
```

## Context Management

```python
from flask import current_app, g, request

# Application context
with app.app_context():
    db.create_all()
    current_app.logger.info("Database initialized")

# Request context
with app.test_request_context("/users?page=2"):
    assert request.path == "/users"
    url = url_for("users.list_users")

# The g object - per-request storage
@app.before_request
def load_user():
    user_id = session.get("user_id")
    g.user = User.query.get(user_id) if user_id else None

# Lazy loading with g
def get_db():
    if "db" not in g:
        g.db = connect_to_database()
    return g.db

@app.teardown_appcontext
def close_db(exception):
    db = g.pop("db", None)
    if db is not None:
        db.close()
```

## Request Hooks

```python
@app.before_request
def before_every_request():
    g.start_time = time.time()
    g.request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))

@app.after_request
def after_every_request(response):
    duration = time.time() - g.start_time
    response.headers["X-Request-ID"] = g.request_id
    response.headers["X-Response-Time"] = f"{duration:.4f}s"
    return response

@app.teardown_request
def teardown_request(exception):
    if exception:
        app.logger.error(f"Request failed: {exception}")

# Blueprint-specific hooks
@users_bp.before_request
def before_user_request():
    g.service = UserService(db.session)
```

## Error Handling

```python
from flask import jsonify
from werkzeug.exceptions import HTTPException

@app.errorhandler(HTTPException)
def handle_http_exception(error):
    return jsonify({
        "error": error.name,
        "message": error.description,
        "status_code": error.code,
    }), error.code

@app.errorhandler(404)
def not_found(error):
    if request.accept_mimetypes.accept_json:
        return jsonify({"error": "Not found"}), 404
    return render_template("errors/404.html"), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({"error": "Internal server error"}), 500
```

## Custom Exception Classes

```python
class AppException(Exception):
    status_code = 500
    error_code = "INTERNAL_ERROR"
    message = "An unexpected error occurred"

    def __init__(self, message: str = None, payload: dict = None):
        super().__init__()
        self.message = message or self.message
        self.payload = payload

    def to_dict(self) -> dict:
        rv = {"error": self.error_code, "message": self.message}
        if self.payload:
            rv["details"] = self.payload
        return rv

class NotFoundError(AppException):
    status_code = 404
    error_code = "NOT_FOUND"

class ValidationError(AppException):
    status_code = 400
    error_code = "VALIDATION_ERROR"

@app.errorhandler(AppException)
def handle_app_exception(error):
    return jsonify(error.to_dict()), error.status_code
```

## SQLAlchemy Error Handling

```python
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

@app.errorhandler(IntegrityError)
def handle_integrity_error(error):
    db.session.rollback()
    if "unique constraint" in str(error.orig).lower():
        return jsonify({"error": "DUPLICATE_ENTRY", "message": "Record already exists"}), 409
    return jsonify({"error": "DATABASE_ERROR", "message": "Constraint violation"}), 400

@app.errorhandler(SQLAlchemyError)
def handle_db_error(error):
    db.session.rollback()
    app.logger.error(f"Database error: {error}")
    return jsonify({"error": "DATABASE_ERROR", "message": "A database error occurred"}), 500
```

## Configuration

```python
import os
from datetime import timedelta

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-key")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)

class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///dev.db"
    SQLALCHEMY_ECHO = True

class ProductionConfig(Config):
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ["DATABASE_URL"]
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    WTF_CSRF_ENABLED = False

config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
}
```

## Pydantic Settings (Recommended)

```python
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    app_name: str = "My App"
    debug: bool = False
    secret_key: str
    database_url: str
    redis_url: str = "redis://localhost:6379/0"

    class Config:
        env_file = ".env"

@lru_cache
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
```

## CLI Commands

```python
import click
from flask.cli import with_appcontext

@app.cli.command("init-db")
@with_appcontext
def init_db_command():
    db.create_all()
    click.echo("Database initialized.")

@app.cli.command("create-user")
@click.argument("email")
@click.argument("name")
@click.option("--admin", is_flag=True)
@with_appcontext
def create_user_command(email: str, name: str, admin: bool):
    user = User(email=email, name=name, is_admin=admin)
    db.session.add(user)
    db.session.commit()
    click.echo(f"Created user: {user.email}")

# Command groups
@app.cli.group()
def user():
    """User management commands."""
    pass

@user.command("list")
@click.option("--limit", default=10)
@with_appcontext
def user_list(limit: int):
    for u in User.query.limit(limit).all():
        click.echo(f"{u.id}: {u.email}")
```

## CLI Progress & Colors

```python
@app.cli.command("migrate-data")
@with_appcontext
def migrate_data_command():
    records = OldModel.query.all()
    with click.progressbar(records, label="Migrating") as bar:
        for record in bar:
            db.session.add(migrate_record(record))
    db.session.commit()

@app.cli.command("check")
@with_appcontext
def check_command():
    try:
        db.session.execute("SELECT 1")
        click.secho("✓ Database: OK", fg="green")
    except Exception as e:
        click.secho(f"✗ Database: {e}", fg="red")
```

## Context Processor

```python
@app.context_processor
def inject_globals():
    return {
        "current_year": datetime.now().year,
        "app_name": current_app.config["APP_NAME"],
        "user": g.get("user"),
    }
```

## Caching

```python
@users_bp.route("/<int:user_id>")
@cache.cached(timeout=60, key_prefix="user")
def get_user(user_id: int):
    return jsonify(UserSchema().dump(User.query.get_or_404(user_id)))

@cache.memoize(timeout=300)
def get_user_stats(user_id: int) -> dict:
    return calculate_stats(user_id)

# Clear cache
cache.delete("user")
cache.delete_memoized(get_user_stats, user_id)
```

## Rate Limiting

```python
@auth_bp.route("/login", methods=["POST"])
@limiter.limit("5 per minute")
def login():
    ...

# Blueprint limits
limiter.limit("50 per hour")(users_bp)

# Exempt from limits
@app.route("/health")
@limiter.exempt
def health():
    return jsonify({"status": "ok"})
```
