---
paths:
  - "**/*.py"
---

# FastAPI Response Patterns

## Response Models

```python
from pydantic import BaseModel, ConfigDict

# GOOD - explicit response model
class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: DbSession) -> User:
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    return user  # Automatically serialized to UserResponse
```

## Pagination Response

```python
from typing import Generic, TypeVar

T = TypeVar("T")

class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    size: int
    pages: int

    @classmethod
    def create(cls, items: list[T], total: int, page: int, size: int) -> "Page[T]":
        return cls(
            items=items,
            total=total,
            page=page,
            size=size,
            pages=(total + size - 1) // size,
        )

@router.get("/users", response_model=Page[UserResponse])
async def list_users(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: DbSession,
) -> Page[User]:
    total = await db.scalar(select(func.count()).select_from(User))

    users = await db.scalars(
        select(User)
        .offset((page - 1) * size)
        .limit(size)
    )

    return Page.create(list(users), total, page, size)
```

## Response Classes

```python
from fastapi.responses import (
    JSONResponse,
    HTMLResponse,
    PlainTextResponse,
    RedirectResponse,
    StreamingResponse,
    FileResponse,
)

# JSON with custom status and headers
@router.post("/users")
async def create_user(data: UserCreate) -> JSONResponse:
    user = await user_service.create(data)
    return JSONResponse(
        content={"id": user.id, "message": "User created"},
        status_code=201,
        headers={"X-Custom-Header": "value"},
    )

# HTML response
@router.get("/page", response_class=HTMLResponse)
async def get_page() -> str:
    return "<html><body><h1>Hello</h1></body></html>"

# Redirect
@router.get("/old-path")
async def redirect() -> RedirectResponse:
    return RedirectResponse(url="/new-path", status_code=301)

# File download
@router.get("/download/{filename}")
async def download_file(filename: str) -> FileResponse:
    return FileResponse(
        path=f"files/{filename}",
        filename=filename,
        media_type="application/octet-stream",
    )
```

## Streaming Response

```python
import asyncio
from typing import AsyncGenerator

async def generate_data() -> AsyncGenerator[bytes, None]:
    for i in range(100):
        yield f"data: {i}\n\n".encode()
        await asyncio.sleep(0.1)

@router.get("/stream")
async def stream_data() -> StreamingResponse:
    return StreamingResponse(
        generate_data(),
        media_type="text/event-stream",
    )

# Stream large file
@router.get("/large-file")
async def stream_file() -> StreamingResponse:
    async def iterfile():
        async with aiofiles.open("large_file.csv", "rb") as f:
            while chunk := await f.read(8192):
                yield chunk

    return StreamingResponse(
        iterfile(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=data.csv"},
    )
```

## Error Responses

```python
from fastapi import HTTPException
from fastapi.responses import JSONResponse

# Standard HTTP exception
@router.get("/users/{user_id}")
async def get_user(user_id: int) -> UserResponse:
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
            headers={"X-Error-Code": "USER_NOT_FOUND"},
        )
    return user

# Custom error response model
class ErrorResponse(BaseModel):
    error: str
    detail: str
    request_id: str | None = None

@router.get(
    "/users/{user_id}",
    responses={
        200: {"model": UserResponse},
        404: {"model": ErrorResponse, "description": "User not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def get_user(user_id: int) -> UserResponse:
    ...

# Global exception handler
@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content={"error": "Bad Request", "detail": str(exc)},
    )
```

## Response Headers

```python
from fastapi import Response

@router.get("/data")
async def get_data(response: Response) -> dict:
    response.headers["X-Custom-Header"] = "custom-value"
    response.headers["Cache-Control"] = "max-age=3600"
    return {"data": "value"}

# Set cookies
@router.post("/login")
async def login(response: Response) -> dict:
    response.set_cookie(
        key="session_id",
        value="abc123",
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=3600,
    )
    return {"status": "logged_in"}

# Delete cookie
@router.post("/logout")
async def logout(response: Response) -> dict:
    response.delete_cookie("session_id")
    return {"status": "logged_out"}
```

## Background Response

```python
from fastapi import BackgroundTasks

@router.post("/send-email")
async def send_email(
    email: EmailSchema,
    background_tasks: BackgroundTasks,
) -> dict:
    # Return immediately
    background_tasks.add_task(send_email_async, email.to, email.subject, email.body)
    return {"message": "Email queued"}
```

## No Content Response

```python
from fastapi import Response, status

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: int, db: DbSession) -> Response:
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")

    await db.delete(user)
    await db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)
```
