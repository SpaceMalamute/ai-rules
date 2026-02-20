---
description: "FastAPI router organization"
paths:
  - "**/routers/**/*.py"
  - "**/routes/**/*.py"
  - "**/api/**/*.py"
  - "**/endpoints/**/*.py"
---

# FastAPI Router Patterns

## Router Organization

```python
# GOOD - organized router structure
# app/users/router.py
from fastapi import APIRouter, status

router = APIRouter(
    prefix="/users",
    tags=["Users"],
    responses={404: {"description": "User not found"}},
)

@router.get("/", response_model=list[UserResponse])
async def list_users(db: DbSession) -> list[User]:
    """List all active users."""
    return await db.scalars(select(User).where(User.is_active))

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_user(data: UserCreate, db: DbSession) -> UserResponse:
    """Create a new user."""
    user = User(**data.model_dump())
    db.add(user)
    await db.commit()
    return user

@router.get("/{user_id}")
async def get_user(user_id: int, db: DbSession) -> UserResponse:
    """Get user by ID."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    return user
```

## Router Registration

```python
# app/main.py
from fastapi import FastAPI
from app.users.router import router as users_router
from app.auth.router import router as auth_router
from app.products.router import router as products_router

app = FastAPI(title="My API", version="1.0.0")

# Version prefix
api_v1 = APIRouter(prefix="/api/v1")
api_v1.include_router(users_router)
api_v1.include_router(auth_router)
api_v1.include_router(products_router)

app.include_router(api_v1)
```

## Path Parameters

```python
# GOOD - typed path parameters with validation
@router.get("/{user_id}")
async def get_user(
    user_id: Annotated[int, Path(ge=1, description="User ID")],
) -> UserResponse:
    ...

# UUID path parameter
@router.get("/{item_id}")
async def get_item(item_id: UUID) -> ItemResponse:
    ...

# Multiple path parameters
@router.get("/{user_id}/orders/{order_id}")
async def get_user_order(user_id: int, order_id: int) -> OrderResponse:
    ...
```

## Query Parameters

```python
# GOOD - query parameters with defaults and validation
@router.get("/")
async def list_items(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, min_length=1, max_length=100),
    status: ItemStatus | None = None,
    sort_by: Literal["name", "created_at", "price"] = "created_at",
    order: Literal["asc", "desc"] = "desc",
) -> Page[ItemResponse]:
    ...

# List query parameter
@router.get("/")
async def get_items(
    ids: Annotated[list[int], Query()] = [],
) -> list[ItemResponse]:
    ...
```

## Request Body

```python
# GOOD - explicit body parameter
@router.post("/")
async def create_item(
    item: Annotated[ItemCreate, Body(embed=True)],
) -> ItemResponse:
    ...

# Multiple body parameters
@router.post("/transfer")
async def transfer(
    source: Annotated[Account, Body()],
    destination: Annotated[Account, Body()],
    amount: Annotated[Decimal, Body(gt=0)],
) -> TransferResult:
    ...
```

## Response Configuration

```python
# GOOD - explicit response models and status codes
@router.post(
    "/",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        201: {"description": "User created successfully"},
        400: {"model": ErrorResponse, "description": "Validation error"},
        409: {"model": ErrorResponse, "description": "Email already exists"},
    },
)
async def create_user(data: UserCreate) -> User:
    ...

# Exclude fields from response
@router.get("/", response_model_exclude={"password", "secret"})
async def get_user() -> User:
    ...

# Dynamic response model
@router.get("/", response_model=UserResponse | AdminResponse)
async def get_current(user: CurrentUser) -> User:
    return user
```

## File Uploads

```python
from fastapi import File, UploadFile

@router.post("/upload")
async def upload_file(
    file: Annotated[UploadFile, File(description="File to upload")],
) -> dict:
    contents = await file.read()
    return {"filename": file.filename, "size": len(contents)}

# Multiple files
@router.post("/upload-many")
async def upload_files(
    files: Annotated[list[UploadFile], File()],
) -> list[dict]:
    return [{"filename": f.filename} for f in files]
```

## Form Data

```python
from fastapi import Form

@router.post("/login")
async def login(
    username: Annotated[str, Form()],
    password: Annotated[str, Form()],
) -> Token:
    ...
```

## Headers and Cookies

```python
from fastapi import Header, Cookie

@router.get("/")
async def get_items(
    x_token: Annotated[str, Header()],
    session_id: Annotated[str | None, Cookie()] = None,
) -> list[Item]:
    ...
```
