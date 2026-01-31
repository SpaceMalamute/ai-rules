# Python Project Guidelines

@../_shared/CLAUDE.md

## Stack

- Python 3.12+
- FastAPI 0.115+ (Pydantic v2 by default)
- SQLAlchemy 2.0+ (async support)
- Pydantic v2 for validation
- pytest + httpx for testing
- uv or poetry for dependencies

## Architecture

```
src/app/
├── main.py              # Entry point
├── config.py            # Settings (pydantic-settings)
├── database.py          # DB session, engine
├── [domain]/            # Feature modules
│   ├── router.py        # API endpoints
│   ├── schemas.py       # Pydantic models (request/response)
│   ├── models.py        # SQLAlchemy models
│   ├── service.py       # Business logic
│   ├── repository.py    # Data access
│   └── dependencies.py  # Route dependencies
├── core/                # Shared utilities
│   ├── exceptions.py
│   └── security.py
└── common/
    ├── models.py        # Base models
    └── schemas.py       # Shared schemas
```

## Core Principles

### Type Hints Required

- Always use modern syntax (3.10+): `list[str]`, `dict[str, int]`, `User | None`
- Use `Annotated` for dependency injection
- All functions must have type hints

### Async/Await

- `async def` for ALL I/O operations
- Never mix sync I/O in async functions
- Use `httpx` (not `requests`) for HTTP calls
- Use `asyncpg` (not `psycopg2`) for PostgreSQL

### Naming

| Element | Convention |
|---------|------------|
| Modules | snake_case |
| Classes | PascalCase |
| Functions | snake_case |
| Constants | UPPER_SNAKE |
| Private | _prefix |

### FastAPI Patterns

- Use dependency injection with `Annotated[Type, Depends(...)]`
- Define response models with `response_model=`
- Use status codes from `fastapi.status`
- Use `@asynccontextmanager` lifespan (not deprecated `on_event`)
- Store resources in `app.state` during lifespan
- Never do blocking I/O in `async def` routes

### Pydantic v2

- Use `model_config = ConfigDict(from_attributes=True)` for ORM models
- Use `Field()` for validation constraints
- Prefer `EmailStr`, `HttpUrl` for specialized types

### Error Handling

- Create custom exception classes
- Register exception handlers with `@app.exception_handler()`
- Return consistent error response format

## Code Style

- **Formatter**: `ruff format` (Black-compatible)
- **Linter**: `ruff check` with strict rules
- **Type checker**: `mypy --strict`
- **Imports**: Sorted with `isort` (via ruff)
- **Docstrings**: Google style for public APIs
- **Line length**: 88 characters (Black default)

### Avoid

- `# type: ignore` without explanation
- `noqa` without justification
- Global variables
- Mutable default arguments

## Commands

```bash
uvicorn app.main:app --reload    # Dev server
pytest                            # Run tests
pytest --cov=app                  # Coverage
ruff check . && ruff format .    # Lint + format
alembic upgrade head             # Run migrations
alembic revision --autogenerate  # Generate migration
```
