---
paths:
  - "tests/**/*.py"
  - "**/test_*.py"
  - "**/*_test.py"
---

# Python Testing Rules

## pytest Structure

```
tests/
├── conftest.py                 # Shared fixtures
├── unit/
│   ├── test_services.py
│   └── test_utils.py
├── integration/
│   ├── test_repositories.py
│   └── test_database.py
└── e2e/
    ├── test_users_api.py
    └── test_auth_api.py
```

## Fixtures (conftest.py)

### Fixtures

```python
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db
from app.config import settings

# Test database
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"

@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    import asyncio
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def engine():
    """Create test database engine."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest.fixture
async def db_session(engine):
    """Create a new database session for each test."""
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session
        await session.rollback()

@pytest.fixture
async def client(db_session):
    """Create test client with overridden dependencies."""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        yield client

    app.dependency_overrides.clear()

@pytest.fixture
async def authenticated_client(client, db_session):
    """Client with authentication token."""
    # Create test user
    user = User(email="test@example.com", name="Test")
    user.set_password("password123")
    db_session.add(user)
    await db_session.commit()

    # Get token
    response = await client.post("/api/v1/auth/login", json={
        "email": "test@example.com",
        "password": "password123",
    })
    token = response.json()["access_token"]

    client.headers["Authorization"] = f"Bearer {token}"
    return client
```

## Unit Tests

```python
import pytest
from unittest.mock import AsyncMock, MagicMock

from app.users.service import UserService
from app.users.schemas import UserCreate

class TestUserService:
    @pytest.fixture
    def mock_repository(self):
        return AsyncMock()

    @pytest.fixture
    def service(self, mock_repository):
        return UserService(repository=mock_repository)

    async def test_create_user_success(self, service, mock_repository):
        # Arrange
        user_data = UserCreate(
            email="test@example.com",
            password="password123",
            name="Test User",
        )
        mock_repository.get_by_email.return_value = None
        mock_repository.create.return_value = User(
            id=1,
            email=user_data.email,
            name=user_data.name,
        )

        # Act
        result = await service.create(user_data)

        # Assert
        assert result.email == user_data.email
        mock_repository.create.assert_called_once()

    async def test_create_user_email_exists_raises(self, service, mock_repository):
        # Arrange
        user_data = UserCreate(
            email="existing@example.com",
            password="password123",
            name="Test",
        )
        mock_repository.get_by_email.return_value = User(id=1, email=user_data.email)

        # Act & Assert
        with pytest.raises(EmailAlreadyExistsError):
            await service.create(user_data)
```

## Integration Tests (API)

### API Tests

```python
import pytest
from httpx import AsyncClient

class TestUsersAPI:
    async def test_create_user(self, client: AsyncClient):
        # Arrange
        user_data = {
            "email": "new@example.com",
            "password": "password123",
            "name": "New User",
        }

        # Act
        response = await client.post("/api/v1/users", json=user_data)

        # Assert
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == user_data["email"]
        assert "id" in data
        assert "password" not in data

    async def test_create_user_invalid_email(self, client: AsyncClient):
        # Arrange
        user_data = {
            "email": "invalid",
            "password": "password123",
            "name": "Test",
        }

        # Act
        response = await client.post("/api/v1/users", json=user_data)

        # Assert
        assert response.status_code == 422
        assert "email" in response.json()["detail"][0]["loc"]

    async def test_get_user_not_found(self, client: AsyncClient):
        response = await client.get("/api/v1/users/99999")
        assert response.status_code == 404

    async def test_list_users_with_pagination(self, client: AsyncClient, db_session):
        # Arrange - create 25 users
        for i in range(25):
            user = User(email=f"user{i}@example.com", name=f"User {i}")
            db_session.add(user)
        await db_session.commit()

        # Act
        response = await client.get("/api/v1/users?page=2&size=10")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 10
        assert data["total"] == 25
        assert data["page"] == 2

    async def test_protected_route_unauthorized(self, client: AsyncClient):
        response = await client.get("/api/v1/users/me")
        assert response.status_code == 401

    async def test_protected_route_authorized(self, authenticated_client: AsyncClient):
        response = await authenticated_client.get("/api/v1/users/me")
        assert response.status_code == 200
        assert "email" in response.json()
```

## Parametrized Tests

```python
import pytest

@pytest.mark.parametrize("email,expected_valid", [
    ("valid@example.com", True),
    ("also.valid@example.co.uk", True),
    ("invalid", False),
    ("missing@", False),
    ("@nodomain.com", False),
])
def test_email_validation(email: str, expected_valid: bool):
    schema = UserCreateSchema()
    if expected_valid:
        result = schema.load({"email": email, "password": "12345678", "name": "Test"})
        assert result["email"] == email
    else:
        with pytest.raises(ValidationError):
            schema.load({"email": email, "password": "12345678", "name": "Test"})

@pytest.mark.parametrize("password,should_pass", [
    ("short", False),
    ("longenough", True),
    ("12345678", True),
])
def test_password_validation(password: str, should_pass: bool):
    ...
```

## Markers

```python
# pytest.ini or pyproject.toml
[tool.pytest.ini_options]
markers = [
    "slow: marks tests as slow (deselect with '-m \"not slow\"')",
    "integration: marks tests that require database",
    "e2e: marks end-to-end tests",
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

## Coverage

```bash
# Run with coverage
pytest --cov=app --cov-report=html --cov-report=term-missing

# Coverage config in pyproject.toml
[tool.coverage.run]
source = ["app"]
omit = ["*/tests/*", "*/__init__.py"]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "if TYPE_CHECKING:",
    "raise NotImplementedError",
]
fail_under = 80
```
