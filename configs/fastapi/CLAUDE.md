# FastAPI Project Guidelines

@../_shared/CLAUDE.md

## Stack

- Python 3.12+
- FastAPI 0.115+ (Pydantic v2 by default)
- SQLAlchemy 2.0+ (async support)
- Pydantic v2 for validation
- pytest + httpx for testing
- uv or poetry for dependencies

## Architecture

```
src/app/
├── main.py              # Entry point
├── config.py            # Settings (pydantic-settings)
├── database.py          # DB session, engine
├── [domain]/            # Feature modules
│   ├── router.py        # API endpoints
│   ├── schemas.py       # Pydantic models (request/response)
│   ├── models.py        # SQLAlchemy models
│   ├── service.py       # Business logic
│   ├── repository.py    # Data access
│   └── dependencies.py  # Route dependencies
├── core/                # Shared utilities
│   ├── exceptions.py
│   └── security.py
└── common/
    ├── models.py        # Base models
    └── schemas.py       # Shared schemas
```

## FastAPI Patterns

### Dependency Injection

```python
from typing import Annotated
from fastapi import Depends

CurrentUser = Annotated[User, Depends(get_current_user)]
DbSession = Annotated[AsyncSession, Depends(get_db)]

@router.get("/users/me")
async def get_me(user: CurrentUser, db: DbSession) -> UserResponse:
    return await user_service.get_profile(db, user.id)
```

### Lifespan (not `on_event`)

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    app.state.db = await create_engine()
    app.state.redis = await aioredis.from_url(settings.redis_url)
    yield
    # Shutdown
    await app.state.db.dispose()
    await app.state.redis.close()

app = FastAPI(lifespan=lifespan)
```

### Response Models

```python
@router.get(
    "/users/{user_id}",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
)
async def get_user(user_id: int, db: DbSession) -> User:
    user = await user_repo.get(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
```

## Pydantic v2

```python
from pydantic import BaseModel, ConfigDict, Field, EmailStr

class UserBase(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=100)

class UserCreate(UserBase):
    password: str = Field(min_length=8)

class UserResponse(UserBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
```

## SQLAlchemy 2.0

```python
from sqlalchemy.orm import Mapped, mapped_column, DeclarativeBase

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(unique=True, index=True)
    hashed_password: Mapped[str]
    is_active: Mapped[bool] = mapped_column(default=True)
```

## Error Handling

```python
class AppException(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail

@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail},
    )
```

## Commands

```bash
uvicorn app.main:app --reload    # Dev server
pytest                            # Run tests
pytest --cov=app                  # Coverage
ruff check . && ruff format .    # Lint + format
alembic upgrade head             # Run migrations
alembic revision --autogenerate  # Generate migration
```
