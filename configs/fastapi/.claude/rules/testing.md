---
paths:
  - "tests/**/*.py"
  - "**/test_*.py"
---

# FastAPI Testing Patterns

## Test Client Setup

```python
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db

TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"

@pytest.fixture(scope="session")
def event_loop():
    import asyncio
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def engine():
    engine = create_async_engine(TEST_DATABASE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest.fixture
async def db_session(engine):
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session
        await session.rollback()

@pytest.fixture
async def client(db_session):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        yield client

    app.dependency_overrides.clear()
```

## API Tests

```python
class TestUsersAPI:
    async def test_create_user(self, client: AsyncClient):
        response = await client.post("/api/v1/users", json={
            "email": "test@example.com",
            "password": "password123",
            "name": "Test User",
        })

        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "test@example.com"
        assert "id" in data
        assert "password" not in data

    async def test_create_user_duplicate_email(self, client: AsyncClient, db_session):
        # Create existing user
        user = User(email="existing@example.com", name="Existing")
        db_session.add(user)
        await db_session.commit()

        response = await client.post("/api/v1/users", json={
            "email": "existing@example.com",
            "password": "password123",
            "name": "New User",
        })

        assert response.status_code == 409
        assert "already exists" in response.json()["detail"]

    async def test_get_user_not_found(self, client: AsyncClient):
        response = await client.get("/api/v1/users/99999")

        assert response.status_code == 404

    async def test_list_users_pagination(self, client: AsyncClient, db_session):
        # Create users
        for i in range(25):
            db_session.add(User(email=f"user{i}@example.com", name=f"User {i}"))
        await db_session.commit()

        response = await client.get("/api/v1/users?page=2&size=10")

        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 10
        assert data["total"] == 25
        assert data["page"] == 2
```

## Authentication Tests

```python
@pytest.fixture
async def auth_headers(client: AsyncClient, db_session):
    # Create user
    user = User(email="auth@example.com", name="Auth User")
    user.set_password("password123")
    db_session.add(user)
    await db_session.commit()

    # Get token
    response = await client.post("/api/v1/auth/login", data={
        "username": "auth@example.com",
        "password": "password123",
    })
    token = response.json()["access_token"]

    return {"Authorization": f"Bearer {token}"}

class TestAuthenticatedEndpoints:
    async def test_get_me_unauthorized(self, client: AsyncClient):
        response = await client.get("/api/v1/users/me")
        assert response.status_code == 401

    async def test_get_me_authorized(self, client: AsyncClient, auth_headers):
        response = await client.get("/api/v1/users/me", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["email"] == "auth@example.com"
```

## Dependency Override

```python
from unittest.mock import AsyncMock

@pytest.fixture
def mock_email_service():
    return AsyncMock()

async def test_signup_sends_email(client: AsyncClient, mock_email_service):
    app.dependency_overrides[get_email_service] = lambda: mock_email_service

    response = await client.post("/api/v1/auth/signup", json={
        "email": "new@example.com",
        "password": "password123",
        "name": "New User",
    })

    assert response.status_code == 201
    mock_email_service.send_welcome.assert_called_once_with("new@example.com")

    app.dependency_overrides.clear()
```

## WebSocket Tests

```python
from httpx_ws import aconnect_ws

async def test_websocket_echo(client: AsyncClient):
    async with aconnect_ws("http://test/ws", client) as ws:
        await ws.send_text("Hello")
        response = await ws.receive_text()
        assert response == "Echo: Hello"

async def test_websocket_auth_required():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        with pytest.raises(Exception):
            async with aconnect_ws("http://test/ws", client) as ws:
                pass  # Should fail without token
```

## File Upload Tests

```python
async def test_file_upload(client: AsyncClient, auth_headers):
    files = {"file": ("test.txt", b"file content", "text/plain")}

    response = await client.post(
        "/api/v1/files/upload",
        files=files,
        headers=auth_headers,
    )

    assert response.status_code == 201
    assert response.json()["filename"] == "test.txt"
```

## Parametrized Tests

```python
@pytest.mark.parametrize("email,expected_valid", [
    ("valid@example.com", True),
    ("also.valid@example.co.uk", True),
    ("invalid", False),
    ("missing@", False),
    ("@nodomain.com", False),
])
async def test_email_validation(client: AsyncClient, email: str, expected_valid: bool):
    response = await client.post("/api/v1/users", json={
        "email": email,
        "password": "password123",
        "name": "Test",
    })

    if expected_valid:
        assert response.status_code in (201, 409)  # Created or duplicate
    else:
        assert response.status_code == 422
```

## Test Markers

```python
# pyproject.toml
[tool.pytest.ini_options]
markers = [
    "slow: marks tests as slow",
    "integration: requires database",
]

# Usage
@pytest.mark.slow
async def test_heavy_computation():
    ...

@pytest.mark.integration
async def test_database_query():
    ...

# Run specific markers
# pytest -m "not slow"
# pytest -m integration
```
