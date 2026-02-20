---
description: "FastAPI authentication and security"
paths:
  - "**/*.py"
---

# FastAPI Security Patterns

## OAuth2 Password Flow

```python
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

@router.post("/token")
async def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: DbSession,
) -> Token:
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": str(user.id)})
    return Token(access_token=access_token, token_type="bearer")
```

## JWT Authentication

```python
from jose import JWTError, jwt
from datetime import datetime, timedelta

SECRET_KEY = settings.secret_key
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: DbSession,
) -> User:
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = await db.get(User, int(user_id))
    if user is None:
        raise credentials_exception

    return user

CurrentUser = Annotated[User, Depends(get_current_user)]
```

## API Key Authentication

```python
from fastapi.security import APIKeyHeader, APIKeyQuery

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)
api_key_query = APIKeyQuery(name="api_key", auto_error=False)

async def get_api_key(
    api_key_header: str | None = Depends(api_key_header),
    api_key_query: str | None = Depends(api_key_query),
) -> str:
    api_key = api_key_header or api_key_query
    if not api_key:
        raise HTTPException(403, "API key required")

    if not await verify_api_key(api_key):
        raise HTTPException(403, "Invalid API key")

    return api_key

@router.get("/data", dependencies=[Depends(get_api_key)])
async def get_data() -> dict:
    ...
```

## Role-Based Access Control

```python
from enum import Enum
from functools import wraps

class Role(str, Enum):
    USER = "user"
    ADMIN = "admin"
    MODERATOR = "moderator"

def require_roles(*roles: Role):
    async def dependency(user: CurrentUser) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=403,
                detail=f"Required roles: {', '.join(r.value for r in roles)}",
            )
        return user
    return dependency

AdminOnly = Annotated[User, Depends(require_roles(Role.ADMIN))]
ModeratorOrAdmin = Annotated[User, Depends(require_roles(Role.ADMIN, Role.MODERATOR))]

@router.delete("/{user_id}")
async def delete_user(user_id: int, admin: AdminOnly) -> None:
    ...
```

## Permission-Based Access

```python
class Permission(str, Enum):
    READ_USERS = "read:users"
    WRITE_USERS = "write:users"
    DELETE_USERS = "delete:users"

def require_permissions(*permissions: Permission):
    async def dependency(user: CurrentUser) -> User:
        user_permissions = set(user.permissions)
        required = set(permissions)

        if not required.issubset(user_permissions):
            missing = required - user_permissions
            raise HTTPException(
                status_code=403,
                detail=f"Missing permissions: {', '.join(p.value for p in missing)}",
            )
        return user
    return dependency

CanDeleteUsers = Annotated[User, Depends(require_permissions(Permission.DELETE_USERS))]
```

## Password Hashing

```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

async def authenticate_user(db: DbSession, email: str, password: str) -> User | None:
    user = await db.scalar(select(User).where(User.email == email))
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user
```

## CORS Configuration

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,  # ["https://example.com"]
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)
```

## Security Headers Middleware

```python
from starlette.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

app.add_middleware(SecurityHeadersMiddleware)
```

## Rate Limiting

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@router.get("/")
@limiter.limit("10/minute")
async def get_items(request: Request) -> list[Item]:
    ...
```
