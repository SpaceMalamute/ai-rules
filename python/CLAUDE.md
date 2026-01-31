# Python Project Guidelines

@../_shared/CLAUDE.md

## Stack

- Python 3.11+
- FastAPI or Flask
- SQLAlchemy 2.0+ (async support)
- Pydantic v2 for validation
- pytest for testing
- uv or poetry for dependency management

## Architecture

### Domain-Based Structure (Recommended for Monoliths)

```
src/
├── app/
│   ├── __init__.py
│   ├── main.py                    # Application entry point
│   ├── config.py                  # Settings with pydantic-settings
│   ├── database.py                # DB session, engine
│   │
│   ├── users/                     # Domain module
│   │   ├── __init__.py
│   │   ├── router.py              # API endpoints
│   │   ├── schemas.py             # Pydantic models (request/response)
│   │   ├── models.py              # SQLAlchemy models
│   │   ├── service.py             # Business logic
│   │   ├── repository.py          # Data access
│   │   ├── dependencies.py        # Route dependencies
│   │   └── exceptions.py          # Domain exceptions
│   │
│   ├── auth/
│   │   ├── router.py
│   │   ├── schemas.py
│   │   ├── service.py
│   │   ├── jwt.py
│   │   └── dependencies.py
│   │
│   ├── core/                      # Shared utilities
│   │   ├── __init__.py
│   │   ├── exceptions.py          # Base exceptions
│   │   ├── security.py            # Password hashing, etc.
│   │   └── pagination.py
│   │
│   └── common/
│       ├── models.py              # Base model classes
│       └── schemas.py             # Shared schemas
│
├── tests/
│   ├── conftest.py
│   ├── users/
│   │   ├── test_router.py
│   │   └── test_service.py
│   └── auth/
│
├── alembic/                       # Migrations
│   ├── versions/
│   └── env.py
│
├── pyproject.toml
└── alembic.ini
```

### File-Type Structure (For Microservices)

```
src/
├── app/
│   ├── main.py
│   ├── config.py
│   ├── routers/
│   │   ├── users.py
│   │   └── auth.py
│   ├── schemas/
│   │   ├── user.py
│   │   └── auth.py
│   ├── models/
│   │   └── user.py
│   ├── services/
│   │   └── user_service.py
│   └── repositories/
│       └── user_repository.py
```

## Code Style

### Type Hints (Required)

```python
# Always use type hints
def get_user_by_email(email: str) -> User | None:
    ...

async def create_user(user_data: UserCreate) -> User:
    ...

# Use modern syntax (Python 3.10+)
def process_items(items: list[str]) -> dict[str, int]:  # Not List[str]
    ...
```

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Modules | snake_case | `user_service.py` |
| Classes | PascalCase | `UserService` |
| Functions | snake_case | `get_user_by_id` |
| Variables | snake_case | `user_count` |
| Constants | UPPER_SNAKE | `MAX_RETRY_COUNT` |
| Private | _prefix | `_internal_method` |

### Async/Await

```python
# FastAPI is async-first - use async for I/O operations
async def get_users(db: AsyncSession) -> list[User]:
    result = await db.execute(select(User))
    return result.scalars().all()

# Don't mix sync I/O in async functions
# Bad - blocks event loop
async def bad_example():
    time.sleep(1)  # Blocks!
    requests.get(url)  # Blocks!

# Good - use async versions
async def good_example():
    await asyncio.sleep(1)
    async with httpx.AsyncClient() as client:
        await client.get(url)
```

## Commands

```bash
# Development
uvicorn app.main:app --reload
# or
fastapi dev app/main.py

# Tests
pytest
pytest -v --cov=app
pytest -k "test_users"

# Linting
ruff check .
ruff format .

# Type checking
mypy app/

# Migrations (Alembic)
alembic revision --autogenerate -m "Add users table"
alembic upgrade head
alembic downgrade -1
```

## Common Patterns

### Pydantic Settings

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database
    database_url: str

    # Auth
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # App
    debug: bool = False
    api_prefix: str = "/api/v1"

settings = Settings()
```

### Dependency Injection

```python
from typing import Annotated
from fastapi import Depends

# Database session dependency
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise

DbSession = Annotated[AsyncSession, Depends(get_db)]

# Service dependency
def get_user_service(db: DbSession) -> UserService:
    return UserService(UserRepository(db))

UserServiceDep = Annotated[UserService, Depends(get_user_service)]

# Usage in router
@router.get("/{user_id}")
async def get_user(user_id: int, service: UserServiceDep) -> UserResponse:
    return await service.get_by_id(user_id)
```

### Exception Handling

```python
from fastapi import HTTPException, status

# Domain exceptions
class UserNotFoundError(Exception):
    def __init__(self, user_id: int):
        self.user_id = user_id
        super().__init__(f"User {user_id} not found")

class EmailAlreadyExistsError(Exception):
    def __init__(self, email: str):
        self.email = email

# Global exception handler
@app.exception_handler(UserNotFoundError)
async def user_not_found_handler(request: Request, exc: UserNotFoundError):
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": str(exc)},
    )

# Or use HTTPException directly in service
class UserService:
    async def get_by_id(self, user_id: int) -> User:
        user = await self.repository.get(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User {user_id} not found",
            )
        return user
```

### API Versioning

```python
from fastapi import APIRouter

# Versioned routers
v1_router = APIRouter(prefix="/api/v1")
v1_router.include_router(users.router, prefix="/users", tags=["users"])
v1_router.include_router(auth.router, prefix="/auth", tags=["auth"])

v2_router = APIRouter(prefix="/api/v2")
# ... v2 routes

app.include_router(v1_router)
app.include_router(v2_router)
```
