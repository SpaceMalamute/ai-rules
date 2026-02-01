---
paths:
  - "**/routers/**/*.py"
  - "**/routes/**/*.py"
  - "**/api/**/*.py"
  - "**/endpoints/**/*.py"
  - "**/main.py"
  - "**/app.py"
  - "**/*.py"
---

# FastAPI Rules

## Router Structure

```python
from fastapi import APIRouter, Depends, status
from typing import Annotated

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/", response_model=list[UserResponse])
async def list_users(db: DbSession) -> list[User]:
    return await db.scalars(select(User).where(User.is_active))

@router.get("/{user_id}", responses={404: {"description": "Not found"}})
async def get_user(user_id: int, db: DbSession) -> UserResponse:
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    return user

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_user(data: UserCreate, db: DbSession) -> UserResponse:
    user = User(**data.model_dump())
    db.add(user)
    await db.commit()
    return user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: int, db: DbSession) -> None:
    await db.delete(await db.get(User, user_id))
    await db.commit()
```

## Router Registration

```python
from fastapi import FastAPI

app = FastAPI(title="My API", version="1.0.0")

api_v1 = APIRouter(prefix="/api/v1")
api_v1.include_router(users_router)
api_v1.include_router(auth_router)

app.include_router(api_v1)
```

## Dependencies

```python
# Database session
async def get_db():
    async with async_session() as session:
        yield session

DbSession = Annotated[AsyncSession, Depends(get_db)]

# Authentication
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

# Role-based
def require_role(role: str):
    async def check_role(user: CurrentUser) -> User:
        if user.role != role:
            raise HTTPException(403, "Insufficient permissions")
        return user
    return check_role

AdminUser = Annotated[User, Depends(require_role("admin"))]

# Validation dependency
async def valid_user_id(user_id: int, db: DbSession) -> User:
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, f"User {user_id} not found")
    return user

ValidUser = Annotated[User, Depends(valid_user_id)]
```

## Lifespan

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    app.state.db = await create_database_pool()
    app.state.redis = await create_redis_pool()
    yield
    # Shutdown
    await app.state.db.close()
    await app.state.redis.close()

app = FastAPI(lifespan=lifespan)
```

## Middleware

```python
from starlette.middleware.base import BaseHTTPMiddleware

class TimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        response.headers["X-Process-Time"] = f"{time.perf_counter() - start:.4f}"
        return response

app.add_middleware(TimingMiddleware)

# CORS
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Background Tasks

```python
from fastapi import BackgroundTasks

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_user(
    data: UserCreate,
    background_tasks: BackgroundTasks,
    db: DbSession,
) -> UserResponse:
    user = await create_user_in_db(db, data)
    background_tasks.add_task(send_welcome_email, user.email)
    return user

# For long-running tasks, use Celery or ARQ
```

## WebSockets

```python
from fastapi import WebSocket, WebSocketDisconnect

class ConnectionManager:
    def __init__(self):
        self.connections: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.connections.append(ws)

    def disconnect(self, ws: WebSocket):
        self.connections.remove(ws)

    async def broadcast(self, message: str):
        for conn in self.connections:
            await conn.send_text(message)

manager = ConnectionManager()

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.broadcast(f"{client_id}: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
```

## Responses

```python
from fastapi.responses import JSONResponse, StreamingResponse, FileResponse

# Custom response
@router.post("/users")
async def create_user(data: UserCreate) -> JSONResponse:
    user = await user_service.create(data)
    return JSONResponse(
        content={"id": user.id},
        status_code=201,
        headers={"X-Custom": "value"},
    )

# Streaming
@router.get("/stream")
async def stream():
    async def generate():
        for i in range(100):
            yield f"data: {i}\n\n"
    return StreamingResponse(generate(), media_type="text/event-stream")

# File download
@router.get("/download/{filename}")
async def download(filename: str):
    return FileResponse(f"files/{filename}", filename=filename)
```

## Exception Handling

```python
class NotFoundError(Exception):
    def __init__(self, resource: str, id: int):
        self.resource = resource
        self.id = id

@app.exception_handler(NotFoundError)
async def not_found_handler(request, exc: NotFoundError):
    return JSONResponse(
        status_code=404,
        content={"detail": f"{exc.resource} {exc.id} not found"}
    )

# Usage in service
def get_user(user_id: int) -> User:
    user = db.get(User, user_id)
    if not user:
        raise NotFoundError("User", user_id)
    return user
```

## Query & Path Parameters

```python
from fastapi import Query, Path

@router.get("/")
async def list_items(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, min_length=1),
    sort_by: Literal["name", "created_at"] = "created_at",
) -> Page[Item]:
    ...

@router.get("/{item_id}")
async def get_item(
    item_id: Annotated[int, Path(ge=1, description="Item ID")],
) -> Item:
    ...
```

## File Uploads

```python
from fastapi import File, UploadFile

@router.post("/upload")
async def upload(file: UploadFile = File(...)) -> dict:
    contents = await file.read()
    return {"filename": file.filename, "size": len(contents)}
```
