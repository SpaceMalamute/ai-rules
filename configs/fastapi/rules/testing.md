---
description: "FastAPI testing with pytest and httpx AsyncClient"
paths:
  - "**/tests/**/*.py"
  - "**/test_*.py"
---

# FastAPI Testing

## Test Stack

- `pytest` + `pytest-asyncio` (mode: `auto`) as test runner
- `httpx.AsyncClient` with `ASGITransport` as default test client -- NEVER use sync `TestClient`
- `respx` for mocking external HTTP calls in tests
- `factory_boy` or fixtures for test data creation
- SQLite async (`aiosqlite`) or testcontainers for test database

## pytest-asyncio Configuration

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
```

This makes all `async def test_*` automatically async -- no need for `@pytest.mark.asyncio` on every test.

## Test Client Fixture

```python
@pytest.fixture
async def client(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()
```

## Mocking External HTTP with respx

```python
@respx.mock
async def test_external_api(client):
    respx.get("https://api.example.com/data").mock(return_value=httpx.Response(200, json={"key": "value"}))
    response = await client.get("/endpoint-that-calls-external")
    assert response.status_code == 200
```

## Key Testing Patterns

| Pattern | Implementation |
|---------|---------------|
| DB isolation | Transaction rollback per test via `db_session` fixture |
| Auth override | `app.dependency_overrides[get_current_user] = lambda: fake_user` |
| Dependency mock | `app.dependency_overrides[get_service] = lambda: AsyncMock()` |
| File upload | `client.post("/upload", files={"file": ("name.txt", b"content", "text/plain")})` |
| Auth headers | Fixture that creates user + returns `{"Authorization": "Bearer <token>"}` |

## Test Structure

- Group related tests in classes: `class TestUsersAPI:`
- Name tests: `test_<action>_<scenario>` (e.g., `test_create_user_duplicate_email`)
- Assert status code first, then response body
- Use `pytest.mark.parametrize` for validation edge cases

## Anti-patterns

- NEVER use sync `TestClient` -- all FastAPI tests should be async with `AsyncClient`
- NEVER share mutable state between tests -- use per-test fixtures with rollback
- NEVER call real external APIs in tests -- always mock with `respx` or `dependency_overrides`
- NEVER forget `app.dependency_overrides.clear()` in teardown -- leaks between tests
- NEVER test framework internals (Pydantic validation details) -- test HTTP contract
