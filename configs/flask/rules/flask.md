---
description: "Flask route and view patterns"
paths:
  - "**/*.py"
---

# Flask Rules

## Application Factory

- Every app MUST use `create_app()` returning a `Flask` instance
- Accept `config_name` parameter to support multiple environments
- Initialize extensions via `ext.init_app(app)`, never `Extension(app)`

**BANNED:** `app = Flask(__name__)` at module level — breaks testing and multi-config

## SQLAlchemy 2.0 Query Style (Mandatory)

Use `db.session.execute(select(...))` for all queries. The legacy query API is banned.

| Banned (Legacy) | Required (2.0 Style) |
|---|---|
| `Model.query.all()` | `db.session.execute(select(Model)).scalars().all()` |
| `Model.query.filter_by(x=1)` | `db.session.execute(select(Model).where(Model.x == 1)).scalars()` |
| `Model.query.get(id)` | `db.session.get(Model, id)` |
| `Model.query.first()` | `db.session.execute(select(Model)).scalar_one_or_none()` |

**WHY:** Legacy `Model.query` is deprecated in SQLAlchemy 2.0 and will be removed.

## Route Handlers

- Routes are thin: validate with Marshmallow, delegate to service, serialize response
- Always validate `request.get_json()` through a schema before processing
- Return explicit HTTP status codes — never rely on defaults for non-200 responses
- Use `@bp.route` with explicit `methods=` parameter, never implicit GET-only

**BANNED:** Direct `request.get_json()` field access without schema validation — silent data corruption

## Blueprints

- One blueprint per domain feature, created in `__init__.py` of the domain package
- Register all blueprints in the application factory with `url_prefix`
- Import routes after blueprint creation to avoid circular imports

## Models — SQLAlchemy 2.0 Mapped Types

- Use `Mapped[T]` and `mapped_column()` for all column definitions
- Always set `__tablename__` explicitly
- Never store plain-text passwords — use `werkzeug.security` hashing

## Context Proxies

- Use `current_app` to access app inside request context — never import the app instance
- Use `g` for request-scoped data only (e.g., current user, request ID)
