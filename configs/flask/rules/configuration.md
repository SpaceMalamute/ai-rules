---
description: "Flask configuration and environments"
paths:
  - "**/*.py"
---

# Flask Configuration Patterns

## Class-Based Configuration

```python
# config.py
import os
from datetime import timedelta

class Config:
    """Base configuration."""
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    # Mail
    MAIL_SERVER = os.environ.get("MAIL_SERVER", "localhost")
    MAIL_PORT = int(os.environ.get("MAIL_PORT", 587))
    MAIL_USE_TLS = True

class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL",
        "postgresql://localhost/app_dev"
    )
    SQLALCHEMY_ECHO = True  # Log SQL queries

class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    WTF_CSRF_ENABLED = False

class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ["DATABASE_URL"]

    # Security
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"

config = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
```

## Loading Configuration

```python
# app/__init__.py
from flask import Flask
from config import config

def create_app(config_name: str = None) -> Flask:
    if config_name is None:
        config_name = os.environ.get("FLASK_CONFIG", "development")

    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # Load additional config from file
    app.config.from_pyfile("config.py", silent=True)

    # Load from environment variable pointing to file
    app.config.from_envvar("APP_CONFIG_FILE", silent=True)

    return app
```

## Environment Variables

```python
# .env (development)
FLASK_APP=app
FLASK_CONFIG=development
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://user:pass@localhost/app_dev
REDIS_URL=redis://localhost:6379/0

# Load with python-dotenv
from dotenv import load_dotenv
load_dotenv()

# Or in create_app
def create_app(config_name: str = None) -> Flask:
    load_dotenv()
    ...
```

## Pydantic Settings (Recommended)

```python
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # App
    app_name: str = "My App"
    debug: bool = False
    secret_key: str

    # Database
    database_url: str

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # JWT
    jwt_secret_key: str | None = None
    jwt_access_token_expires: int = 3600  # seconds

    # Mail
    mail_server: str = "localhost"
    mail_port: int = 587
    mail_username: str | None = None
    mail_password: str | None = None

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

@lru_cache
def get_settings() -> Settings:
    return Settings()

settings = get_settings()

# Usage in app
def create_app() -> Flask:
    app = Flask(__name__)

    app.config["SECRET_KEY"] = settings.secret_key
    app.config["SQLALCHEMY_DATABASE_URI"] = settings.database_url
    app.config["DEBUG"] = settings.debug

    return app
```

## Configuration Validation

```python
def validate_config(app: Flask):
    """Validate required configuration."""
    required = [
        "SECRET_KEY",
        "SQLALCHEMY_DATABASE_URI",
    ]

    missing = [key for key in required if not app.config.get(key)]

    if missing:
        raise RuntimeError(f"Missing required config: {', '.join(missing)}")

    # Validate SECRET_KEY strength in production
    if not app.debug:
        if len(app.config["SECRET_KEY"]) < 32:
            raise RuntimeError("SECRET_KEY must be at least 32 characters in production")

def create_app(config_name: str = None) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    validate_config(app)
    return app
```

## Instance Configuration

```python
# instance/config.py (not in version control)
SECRET_KEY = "your-production-secret"
SQLALCHEMY_DATABASE_URI = "postgresql://prod-db/app"

# Load instance config
app = Flask(__name__, instance_relative_config=True)
app.config.from_pyfile("config.py", silent=True)
```

## Configuration by Feature

```python
class Config:
    # Core
    SECRET_KEY = os.environ["SECRET_KEY"]

    # Database
    SQLALCHEMY_DATABASE_URI = os.environ["DATABASE_URL"]
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_size": 10,
        "pool_recycle": 3600,
        "pool_pre_ping": True,
    }

    # Cache
    CACHE_TYPE = "redis"
    CACHE_REDIS_URL = os.environ.get("REDIS_URL")
    CACHE_DEFAULT_TIMEOUT = 300

    # Session
    SESSION_TYPE = "redis"
    SESSION_REDIS = redis.from_url(os.environ.get("REDIS_URL"))
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)

    # Security
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"

    # CORS
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "").split(",")

    # Uploads
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    UPLOAD_FOLDER = os.environ.get("UPLOAD_FOLDER", "/tmp/uploads")

    # Logging
    LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")
    LOG_FORMAT = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
```

## Runtime Configuration Access

```python
from flask import current_app

@users_bp.route("/config-example")
def config_example():
    # Access config in routes
    debug = current_app.config["DEBUG"]
    app_name = current_app.config.get("APP_NAME", "Default")

    return jsonify({
        "debug": debug,
        "app_name": app_name,
    })

# In services
class EmailService:
    def __init__(self):
        self.server = current_app.config["MAIL_SERVER"]
        self.port = current_app.config["MAIL_PORT"]
```

## Configuration for Extensions

```python
def configure_extensions(app: Flask):
    """Configure Flask extensions."""
    # SQLAlchemy
    app.config.setdefault("SQLALCHEMY_TRACK_MODIFICATIONS", False)

    # JWT
    app.config.setdefault("JWT_TOKEN_LOCATION", ["headers"])
    app.config.setdefault("JWT_HEADER_NAME", "Authorization")
    app.config.setdefault("JWT_HEADER_TYPE", "Bearer")

    # CORS
    app.config.setdefault("CORS_SUPPORTS_CREDENTIALS", True)

def create_app(config_name: str = None) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    configure_extensions(app)
    return app
```
