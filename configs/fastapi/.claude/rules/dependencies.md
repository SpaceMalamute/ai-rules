---
paths:
  - "**/*.py"
---

# FastAPI Dependency Injection

## Basic Dependencies

```python
# GOOD - reusable dependency
from typing import Annotated
from fastapi import Depends

async def get_db():
    async with async_session() as session:
        yield session

DbSession = Annotated[AsyncSession, Depends(get_db)]

@router.get("/users/{user_id}")
async def get_user(user_id: int, db: DbSession) -> User:
    return await db.get(User, user_id)
```

## Dependency with Parameters

```python
# GOOD - parameterized dependency
def get_pagination(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
) -> Pagination:
    return Pagination(page=page, size=size)

Paginated = Annotated[Pagination, Depends(get_pagination)]

@router.get("/users")
async def list_users(pagination: Paginated) -> Page[User]:
    ...
```

## Class-Based Dependencies

```python
# GOOD - stateful dependency
class RateLimiter:
    def __init__(self, requests_per_minute: int):
        self.rpm = requests_per_minute
        self.requests: dict[str, list[float]] = {}

    async def __call__(self, request: Request) -> None:
        client_ip = request.client.host
        now = time.time()

        # Clean old requests
        self.requests[client_ip] = [
            t for t in self.requests.get(client_ip, [])
            if now - t < 60
        ]

        if len(self.requests[client_ip]) >= self.rpm:
            raise HTTPException(429, "Rate limit exceeded")

        self.requests[client_ip].append(now)

rate_limiter = RateLimiter(requests_per_minute=60)

@router.get("/api/data", dependencies=[Depends(rate_limiter)])
async def get_data():
    ...
```

## Authentication Dependencies

```python
# GOOD - reusable auth dependency
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: DbSession,
) -> User:
    payload = verify_token(token)
    if not payload:
        raise HTTPException(401, "Invalid token")

    user = await db.get(User, payload["sub"])
    if not user:
        raise HTTPException(401, "User not found")

    return user

CurrentUser = Annotated[User, Depends(get_current_user)]

# Role-based dependency
def require_role(role: str):
    async def check_role(user: CurrentUser) -> User:
        if user.role != role:
            raise HTTPException(403, "Insufficient permissions")
        return user
    return check_role

AdminUser = Annotated[User, Depends(require_role("admin"))]
```

## Dependency Chaining

```python
# Dependencies can depend on other dependencies
async def get_user_service(db: DbSession) -> UserService:
    return UserService(db)

async def get_current_user_with_service(
    token: Annotated[str, Depends(oauth2_scheme)],
    service: Annotated[UserService, Depends(get_user_service)],
) -> User:
    return await service.get_by_token(token)
```

## Global Dependencies

```python
# Apply to all routes in router
router = APIRouter(
    prefix="/admin",
    dependencies=[Depends(require_role("admin"))],
)

# Apply to entire app
app = FastAPI(dependencies=[Depends(verify_api_key)])
```

## Yield Dependencies (Context Managers)

```python
# GOOD - cleanup after request
async def get_db_transaction():
    async with async_session() as session:
        async with session.begin():
            yield session
            # Commit happens automatically if no exception
        # Rollback happens automatically on exception

# GOOD - resource cleanup
async def get_temp_file():
    path = Path(tempfile.mktemp())
    try:
        yield path
    finally:
        path.unlink(missing_ok=True)
```

## Testing Dependencies

```python
# Override dependencies in tests
from fastapi.testclient import TestClient

def get_test_db():
    return TestDatabase()

app.dependency_overrides[get_db] = get_test_db

with TestClient(app) as client:
    response = client.get("/users")

# Clean up
app.dependency_overrides.clear()
```
