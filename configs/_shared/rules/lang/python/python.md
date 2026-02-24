---
description: "Python code style and conventions"
paths:
  - "**/*.py"
  - "**/pyproject.toml"
  - "**/requirements*.txt"
---

# Python Conventions

## Type Hints (Required)

Use modern syntax (Python 3.10+):

- `list[str]` not `List[str]`, `dict[str, int]` not `Dict[str, int]`
- `str | None` not `Optional[str]`, `int | str` not `Union[int, str]`
- Use `Annotated[T, metadata]` for dependency injection and field metadata
- Ban `# type: ignore` without a specific error code and justification

## Modern Python (3.11+)

- Use `asyncio.TaskGroup` for structured concurrent tasks — replaces manual `gather` patterns
- Use `tomllib` for TOML/config parsing — it is in the stdlib
- Use `ExceptionGroup` and `except*` for handling multiple concurrent errors

## Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Modules | snake_case | `user_service.py` |
| Classes | PascalCase | `UserRepository` |
| Functions | snake_case | `get_user_by_id` |
| Constants | UPPER_SNAKE | `MAX_RETRY_COUNT` |
| Private | _prefix | `_validate_input` |

## Async/Await

- Use `async def` for all I/O operations
- Async lib choices: `httpx` (HTTP), `asyncpg` (PostgreSQL), `redis.asyncio` (Redis)
- DO NOT use `requests`, `psycopg2`, or sync `redis` in async code — blocks event loop

## Code Style

- Use `ruff check .` for linting, `ruff format .` for formatting
- Use `mypy --strict .` for type checking
- Configure in `pyproject.toml` with `target-version = "py312"` and strict ruff rules

## Docstrings

- Use Google style: `Args:`, `Returns:`, `Raises:` sections
- Document public APIs — skip private internals unless behavior is non-obvious

## Anti-patterns

- DO NOT use mutable default arguments (`def f(items=[])`) — use `None` and initialize inside
- DO NOT use global mutable state — encapsulate in classes or pass as parameters
- DO NOT use `# type: ignore` without specifying the error code and reason
- DO NOT use `from typing import Optional, List, Dict` — use builtin `list`, `dict`, `X | None`
