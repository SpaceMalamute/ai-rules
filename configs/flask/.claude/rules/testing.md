---
paths:
  - "tests/**/*.py"
  - "**/test_*.py"
---

# Flask Testing Patterns

## Test Configuration

```python
# conftest.py
import pytest
from app import create_app, db

@pytest.fixture(scope="session")
def app():
    """Create application for testing."""
    app = create_app("testing")
    return app

@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()

@pytest.fixture
def runner(app):
    """Create CLI test runner."""
    return app.test_cli_runner()

@pytest.fixture
def db_session(app):
    """Create database session for testing."""
    with app.app_context():
        db.create_all()
        yield db.session
        db.session.rollback()
        db.drop_all()
```

## Testing Config

```python
# config.py
class TestingConfig:
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    WTF_CSRF_ENABLED = False
    SECRET_KEY = "test-secret-key"
```

## API Endpoint Tests

```python
class TestUsersAPI:
    def test_create_user(self, client, db_session):
        response = client.post("/api/v1/users", json={
            "email": "test@example.com",
            "password": "password123",
            "name": "Test User",
        })

        assert response.status_code == 201
        data = response.get_json()
        assert data["email"] == "test@example.com"
        assert "id" in data
        assert "password" not in data

    def test_create_user_duplicate_email(self, client, db_session):
        # Create existing user
        user = User(email="existing@example.com", name="Existing")
        db_session.add(user)
        db_session.commit()

        response = client.post("/api/v1/users", json={
            "email": "existing@example.com",
            "password": "password123",
            "name": "New User",
        })

        assert response.status_code == 409

    def test_get_user_not_found(self, client):
        response = client.get("/api/v1/users/99999")
        assert response.status_code == 404

    def test_list_users_pagination(self, client, db_session):
        # Create users
        for i in range(25):
            db_session.add(User(email=f"user{i}@example.com", name=f"User {i}"))
        db_session.commit()

        response = client.get("/api/v1/users?page=2&size=10")

        assert response.status_code == 200
        data = response.get_json()
        assert len(data["items"]) == 10
        assert data["total"] == 25
```

## Authentication Tests

```python
@pytest.fixture
def auth_headers(client, db_session):
    """Create authenticated user and return headers."""
    user = User(email="auth@example.com", name="Auth User")
    user.set_password("password123")
    db_session.add(user)
    db_session.commit()

    response = client.post("/api/v1/auth/login", json={
        "email": "auth@example.com",
        "password": "password123",
    })
    token = response.get_json()["access_token"]

    return {"Authorization": f"Bearer {token}"}

class TestAuthenticatedEndpoints:
    def test_get_me_unauthorized(self, client):
        response = client.get("/api/v1/users/me")
        assert response.status_code == 401

    def test_get_me_authorized(self, client, auth_headers):
        response = client.get("/api/v1/users/me", headers=auth_headers)
        assert response.status_code == 200
        assert response.get_json()["email"] == "auth@example.com"
```

## Form Tests

```python
def test_login_form(client, db_session):
    # Create user
    user = User(email="test@example.com", name="Test")
    user.set_password("password")
    db_session.add(user)
    db_session.commit()

    response = client.post("/login", data={
        "email": "test@example.com",
        "password": "password",
    }, follow_redirects=True)

    assert response.status_code == 200
    assert b"Dashboard" in response.data
```

## File Upload Tests

```python
from io import BytesIO

def test_file_upload(client, auth_headers):
    data = {
        "file": (BytesIO(b"file content"), "test.txt"),
    }

    response = client.post(
        "/api/v1/files/upload",
        data=data,
        content_type="multipart/form-data",
        headers=auth_headers,
    )

    assert response.status_code == 201
    assert response.get_json()["filename"] == "test.txt"
```

## CLI Command Tests

```python
def test_init_db_command(runner):
    result = runner.invoke(args=["init-db"])
    assert result.exit_code == 0
    assert "Database initialized" in result.output

def test_create_user_command(runner, db_session):
    result = runner.invoke(args=[
        "create-user",
        "test@example.com",
        "Test User",
        "--admin",
    ])

    assert result.exit_code == 0
    assert "Created user" in result.output

    user = User.query.filter_by(email="test@example.com").first()
    assert user is not None
    assert user.is_admin is True
```

## Mocking External Services

```python
from unittest.mock import patch, MagicMock

def test_send_email(client, db_session):
    with patch("app.services.email.mail") as mock_mail:
        response = client.post("/api/v1/users", json={
            "email": "test@example.com",
            "password": "password123",
            "name": "Test User",
        })

        assert response.status_code == 201
        mock_mail.send.assert_called_once()

def test_external_api_call(client):
    with patch("app.services.external.requests") as mock_requests:
        mock_requests.get.return_value = MagicMock(
            status_code=200,
            json=lambda: {"data": "mocked"},
        )

        response = client.get("/api/v1/external-data")

        assert response.status_code == 200
        assert response.get_json()["data"] == "mocked"
```

## Parametrized Tests

```python
@pytest.mark.parametrize("email,expected_status", [
    ("valid@example.com", 201),
    ("also.valid@test.co.uk", 201),
    ("invalid", 400),
    ("missing@", 400),
    ("@nodomain.com", 400),
])
def test_email_validation(client, email: str, expected_status: int):
    response = client.post("/api/v1/users", json={
        "email": email,
        "password": "password123",
        "name": "Test",
    })

    assert response.status_code == expected_status
```

## Test Markers

```python
# pytest.ini or pyproject.toml
[tool.pytest.ini_options]
markers = [
    "slow: marks tests as slow",
    "integration: requires database",
]

# Usage
@pytest.mark.slow
def test_heavy_computation():
    ...

@pytest.mark.integration
def test_database_query(db_session):
    ...

# Run specific markers
# pytest -m "not slow"
# pytest -m integration
```

## Coverage Configuration

```toml
# pyproject.toml
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
