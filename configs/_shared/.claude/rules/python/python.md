# Python Conventions

## Activation

```yaml
paths:
  - "**/*.py"
  - "**/pyproject.toml"
  - "**/requirements*.txt"
```

## Type Hints (Required)

Use modern syntax (Python 3.10+):

```python
# GOOD
def get_user(user_id: int) -> User | None: ...
def process(items: list[str]) -> dict[str, int]: ...

# BAD - old syntax
def get_user(user_id: int) -> Optional[User]: ...
def process(items: List[str]) -> Dict[str, int]: ...
```

Use `Annotated` for metadata:

```python
from typing import Annotated
from fastapi import Depends

CurrentUser = Annotated[User, Depends(get_current_user)]
```

## Naming Conventions

| Element    | Convention    | Example              |
|------------|---------------|----------------------|
| Modules    | snake_case    | `user_service.py`    |
| Classes    | PascalCase    | `UserRepository`     |
| Functions  | snake_case    | `get_user_by_id`     |
| Constants  | UPPER_SNAKE   | `MAX_RETRY_COUNT`    |
| Private    | _prefix       | `_validate_input`    |
| Protected  | _prefix       | `_internal_method`   |

## Async/Await

```python
# GOOD - async for I/O
async def fetch_user(user_id: int) -> User:
    async with httpx.AsyncClient() as client:
        response = await client.get(f"/users/{user_id}")
        return User(**response.json())

# BAD - sync I/O in async context
async def fetch_user(user_id: int) -> User:
    response = requests.get(f"/users/{user_id}")  # Blocks event loop!
    return User(**response.json())
```

Async library choices:
- HTTP: `httpx` (not `requests`)
- PostgreSQL: `asyncpg` (not `psycopg2`)
- Redis: `redis.asyncio` (not sync `redis`)

## Code Style

```bash
# Tools
ruff check .          # Linting
ruff format .         # Formatting (Black-compatible)
mypy --strict .       # Type checking
```

Configuration in `pyproject.toml`:

```toml
[tool.ruff]
line-length = 88
target-version = "py312"

[tool.ruff.lint]
select = ["E", "F", "I", "N", "UP", "B", "A", "C4", "PT", "RUF"]

[tool.mypy]
python_version = "3.12"
strict = true
```

## Avoid

```python
# BAD - type: ignore without reason
result = some_call()  # type: ignore

# GOOD - explain why
result = some_call()  # type: ignore[arg-type]  # Library typing issue, see #123

# BAD - mutable default argument
def append_to(item, target=[]):  # Shared across calls!
    target.append(item)
    return target

# GOOD - use None
def append_to(item, target: list | None = None):
    if target is None:
        target = []
    target.append(item)
    return target

# BAD - global state
_cache = {}
def get_cached(key): ...

# GOOD - class or function parameter
class Cache:
    def __init__(self):
        self._data = {}
```

## Docstrings (Google Style)

```python
def calculate_total(
    items: list[Item],
    discount: float = 0.0,
) -> Decimal:
    """Calculate the total price of items with optional discount.

    Args:
        items: List of items to calculate.
        discount: Discount percentage (0.0 to 1.0).

    Returns:
        Total price after discount.

    Raises:
        ValueError: If discount is not between 0 and 1.
    """
```

## Testing

```python
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_get_user_returns_user_when_exists(
    client: AsyncClient,
    user_factory: UserFactory,
):
    # Arrange
    user = await user_factory.create()

    # Act
    response = await client.get(f"/users/{user.id}")

    # Assert
    assert response.status_code == 200
    assert response.json()["id"] == user.id
```

Use fixtures for setup:

```python
@pytest.fixture
async def db_session():
    async with async_session() as session:
        yield session
        await session.rollback()
```
