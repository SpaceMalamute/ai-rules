---
description: "Python configuration with pydantic-settings"
paths:
  - "**/config.py"
  - "**/settings.py"
  - "**/config/**/*.py"
  - "**/settings/**/*.py"
---

# Python Configuration (pydantic-settings)

## Basic Settings

```python
# config.py
from pydantic import Field, PostgresDsn, RedisDsn
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "MyApp"
    debug: bool = False
    environment: str = Field(default="development", pattern="^(development|staging|production)$")

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    workers: int = 4

    # Database
    database_url: PostgresDsn
    database_pool_size: int = 5
    database_max_overflow: int = 10

    # Redis
    redis_url: RedisDsn | None = None

    # Security
    secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # CORS
    cors_origins: list[str] = ["http://localhost:3000"]

    # External APIs
    stripe_api_key: str | None = None
    sendgrid_api_key: str | None = None


# Singleton instance
settings = Settings()
```

## Nested Settings

```python
# config/settings.py
from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict


class DatabaseSettings(BaseModel):
    """Database configuration."""

    url: str
    pool_size: int = 5
    max_overflow: int = 10
    echo: bool = False


class RedisSettings(BaseModel):
    """Redis configuration."""

    url: str
    password: str | None = None
    db: int = 0


class AuthSettings(BaseModel):
    """Authentication configuration."""

    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7


class Settings(BaseSettings):
    """Root settings with nested configuration."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_nested_delimiter="__",  # DATABASE__URL -> database.url
        case_sensitive=False,
    )

    app_name: str = "MyApp"
    debug: bool = False
    environment: str = "development"

    database: DatabaseSettings
    redis: RedisSettings | None = None
    auth: AuthSettings


settings = Settings()

# Access: settings.database.url, settings.auth.secret_key
```

## Environment-Specific Settings

```python
# config/base.py
from pydantic_settings import BaseSettings


class BaseAppSettings(BaseSettings):
    """Base settings shared across all environments."""

    app_name: str = "MyApp"
    api_prefix: str = "/api/v1"


# config/development.py
class DevelopmentSettings(BaseAppSettings):
    debug: bool = True
    database_url: str = "postgresql://localhost/myapp_dev"
    log_level: str = "DEBUG"


# config/production.py
class ProductionSettings(BaseAppSettings):
    debug: bool = False
    database_url: str  # Required in production
    log_level: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=None,  # No .env in production
    )


# config/__init__.py
import os
from functools import lru_cache

from .development import DevelopmentSettings
from .production import ProductionSettings


@lru_cache
def get_settings():
    environment = os.getenv("ENVIRONMENT", "development")

    settings_map = {
        "development": DevelopmentSettings,
        "production": ProductionSettings,
    }

    settings_class = settings_map.get(environment, DevelopmentSettings)
    return settings_class()


settings = get_settings()
```

## Validation

```python
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    environment: str
    debug: bool = False

    database_url: str
    database_pool_size: int = 5

    @field_validator("environment")
    @classmethod
    def validate_environment(cls, v: str) -> str:
        allowed = {"development", "staging", "production"}
        if v not in allowed:
            raise ValueError(f"environment must be one of {allowed}")
        return v

    @field_validator("database_pool_size")
    @classmethod
    def validate_pool_size(cls, v: int) -> int:
        if v < 1 or v > 100:
            raise ValueError("database_pool_size must be between 1 and 100")
        return v

    @model_validator(mode="after")
    def validate_production(self) -> "Settings":
        if self.environment == "production" and self.debug:
            raise ValueError("debug must be False in production")
        return self
```

## FastAPI Integration

```python
# main.py
from functools import lru_cache
from typing import Annotated

from fastapi import Depends, FastAPI

from config import Settings


@lru_cache
def get_settings() -> Settings:
    return Settings()


SettingsDep = Annotated[Settings, Depends(get_settings)]

app = FastAPI()


@app.get("/info")
async def info(settings: SettingsDep):
    return {
        "app_name": settings.app_name,
        "environment": settings.environment,
    }


# Override in tests
def get_test_settings() -> Settings:
    return Settings(
        database_url="postgresql://localhost/test",
        secret_key="test-secret",
    )


app.dependency_overrides[get_settings] = get_test_settings
```

## Secrets Management

```python
from pydantic import SecretStr
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # SecretStr hides value in logs and repr
    database_password: SecretStr
    api_key: SecretStr

    def get_database_url(self) -> str:
        # Access secret value with .get_secret_value()
        password = self.database_password.get_secret_value()
        return f"postgresql://user:{password}@localhost/db"


# In code
settings = Settings()
print(settings.database_password)  # SecretStr('**********')
print(settings.database_password.get_secret_value())  # actual password
```

## .env File

```bash
# .env
APP_NAME=MyApp
ENVIRONMENT=development
DEBUG=true

# Database
DATABASE__URL=postgresql://user:pass@localhost/myapp
DATABASE__POOL_SIZE=10

# Redis
REDIS__URL=redis://localhost:6379
REDIS__DB=0

# Auth
AUTH__SECRET_KEY=your-super-secret-key-here
AUTH__ACCESS_TOKEN_EXPIRE_MINUTES=60

# External APIs
STRIPE_API_KEY=sk_test_xxx
SENDGRID_API_KEY=SG.xxx
```

## Anti-Patterns

```python
# BAD: Hardcoded secrets
SECRET_KEY = "my-secret-key"


# GOOD: Load from environment
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    secret_key: str  # Required from env


# BAD: Global mutable config
config = {}

def load_config():
    global config
    config["db_url"] = os.getenv("DATABASE_URL")


# GOOD: Immutable settings with caching
@lru_cache
def get_settings() -> Settings:
    return Settings()


# BAD: No validation
database_url = os.getenv("DATABASE_URL")  # Could be None!


# GOOD: Required fields with validation
class Settings(BaseSettings):
    database_url: PostgresDsn  # Validated URL format, required
```
