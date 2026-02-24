---
description: "Flask testing with pytest"
paths:
  - "**/tests/**/*.py"
  - "**/test_*.py"
---

# Flask Testing Patterns

## Stack

- `pytest` + `pytest-flask` as default test framework
- `conftest.py` at project root for shared fixtures
- `TestingConfig` with `TESTING=True`, `SQLALCHEMY_DATABASE_URI=sqlite:///:memory:`

## Core Fixtures

Define these in `conftest.py`:

| Fixture | Scope | Provides |
|---|---|---|
| `app` | session | `create_app("testing")` instance |
| `client` | function | `app.test_client()` — the HTTP test client |
| `runner` | function | `app.test_cli_runner()` — for CLI command tests |
| `db_session` | function | Scoped DB session — `create_all` before, `rollback` + `drop_all` after. Must operate within `app.app_context()` — push context in fixture setup |

`client` fixture is the primary interface for endpoint tests. Use `client.get()`, `client.post(json={...})`, etc.

## Testing Conventions

- Group related tests in classes: `class TestUsersAPI:`
- Test method naming: `test_{action}_{scenario}` (e.g., `test_create_user_duplicate_email`)
- Assert status code first, then response body
- Always assert sensitive fields are absent in responses (e.g., `assert "password" not in data`)

## Authentication in Tests

Create an `auth_headers` fixture that logs in a test user and returns `{"Authorization": "Bearer <token>"}`. Pass to client calls: `client.get("/endpoint", headers=auth_headers)`.

## Parametrized Tests

Use `@pytest.mark.parametrize` for input validation testing — test valid and invalid inputs in one test function with expected status codes.

## Mocking

- `unittest.mock.patch` for external services (email, third-party APIs)
- Patch at the import path, not the definition path: `patch("app.services.email.mail")`
- Use `MagicMock` for complex return values

## CLI Command Tests

Use `runner.invoke(args=["command-name", "arg1"])`. Assert `result.exit_code == 0` and check `result.output` for expected messages.

## Test Markers

Define markers in `pyproject.toml`: `slow`, `integration`. Run subsets with `pytest -m "not slow"`.

## Anti-Patterns

- Testing without `TESTING=True` config — error handlers behave differently
- Sharing DB state between tests — each test gets a clean session via fixture rollback
- Testing implementation details instead of HTTP interface — test routes, not service internals
- Missing `db.session.rollback()` in fixture teardown — state leaks between tests
