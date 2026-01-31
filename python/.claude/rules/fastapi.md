---
paths:
  - "**/*.py"
---

# FastAPI Rules

## Router Structure

```python
from fastapi import APIRouter, Depends, status
from typing import Annotated

router = APIRouter()

@router.get(
    "/",
    response_model=list[UserResponse],
    summary="List all users",
    description="Get a paginated list of users",
)
async def list_users(
    service: UserServiceDep,
    skip: int = 0,
    limit: int = 100,
) -> list[UserResponse]:
    return await service.get_all(skip=skip, limit=limit)


@router.get(
    "/{user_id}",
    response_model=UserResponse,
    responses={404: {"description": "User not found"}},
)
async def get_user(
    user_id: int,
    service: UserServiceDep,
) -> UserResponse:
    return await service.get_by_id(user_id)


@router.post(
    "/",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_user(
    user_data: UserCreate,
    service: UserServiceDep,
) -> UserResponse:
    return await service.create(user_data)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    service: UserServiceDep,
) -> UserResponse:
    return await service.update(user_id, user_data)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    service: UserServiceDep,
) -> None:
    await service.delete(user_id)
```

## Pydantic Schemas (v2)

```python
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from datetime import datetime

# Base schema with common config
class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

# Request schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str = Field(min_length=1, max_length=100)

class UserUpdate(BaseModel):
    email: EmailStr | None = None
    name: str | None = Field(default=None, max_length=100)

# Response schemas
class UserResponse(BaseSchema):
    id: int
    email: EmailStr
    name: str
    created_at: datetime

# Nested schemas
class UserWithPostsResponse(UserResponse):
    posts: list["PostResponse"] = []

# Pagination
class PaginatedResponse[T](BaseModel):
    items: list[T]
    total: int
    page: int
    size: int
    pages: int
```

## Dependencies

### Validation with Dependencies

```python
from fastapi import Depends, HTTPException, status, Path

async def valid_user_id(
    user_id: Annotated[int, Path(gt=0)],
    db: DbSession,
) -> User:
    """Validate user exists and return it."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {user_id} not found",
        )
    return user

ValidUser = Annotated[User, Depends(valid_user_id)]

# Usage - user is already validated
@router.get("/{user_id}")
async def get_user(user: ValidUser) -> UserResponse:
    return user
```

### Authentication Dependency

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: DbSession,
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = await db.get(User, user_id)
    if user is None:
        raise credentials_exception
    return user

CurrentUser = Annotated[User, Depends(get_current_user)]

# Role-based dependency
def require_role(required_role: str):
    async def check_role(user: CurrentUser) -> User:
        if user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return user
    return check_role

AdminUser = Annotated[User, Depends(require_role("admin"))]
```

## Background Tasks

```python
from fastapi import BackgroundTasks

async def send_welcome_email(email: str, name: str) -> None:
    # Async email sending
    ...

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    background_tasks: BackgroundTasks,
    service: UserServiceDep,
) -> UserResponse:
    user = await service.create(user_data)
    background_tasks.add_task(send_welcome_email, user.email, user.name)
    return user
```

## Middleware

```python
from fastapi import FastAPI, Request
from starlette.middleware.cors import CORSMiddleware
import time

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.perf_counter()
    response = await call_next(request)
    process_time = time.perf_counter() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response
```

## Lifespan Events

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    print("Application started")

    yield

    # Shutdown
    await close_db()
    print("Application stopped")

app = FastAPI(lifespan=lifespan)
```

## OpenAPI Documentation

```python
app = FastAPI(
    title="My API",
    description="API description with **markdown** support",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=[
        {"name": "users", "description": "User operations"},
        {"name": "auth", "description": "Authentication"},
    ],
)

# Disable docs in production
if settings.environment == "production":
    app = FastAPI(docs_url=None, redoc_url=None)
```
