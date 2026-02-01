---
paths:
  - "**/alembic/**/*.py"
  - "**/migrations/**/*.py"
  - "**/alembic.ini"
---

# Python Database Migrations

## Alembic Setup (SQLAlchemy)

### Configuration

```python
# alembic/env.py
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
from app.core.config import settings
from app.db.base import Base

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def get_url() -> str:
    return settings.DATABASE_URL


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    configuration = config.get_section(config.config_ini_section) or {}
    configuration["sqlalchemy.url"] = get_url()

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

### alembic.ini

```ini
[alembic]
script_location = alembic
prepend_sys_path = .
version_path_separator = os
sqlalchemy.url = driver://user:pass@localhost/dbname

[post_write_hooks]
hooks = black
black.type = console_scripts
black.entrypoint = black
black.options = -l 88

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualname =

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
```

## Migration Commands

```bash
# Create migration
alembic revision --autogenerate -m "add users table"

# Apply migrations
alembic upgrade head

# Rollback last migration
alembic downgrade -1

# Rollback to specific revision
alembic downgrade abc123

# Show current revision
alembic current

# Show migration history
alembic history --verbose

# Generate SQL without applying
alembic upgrade head --sql > migration.sql
```

## Migration File Structure

```python
# alembic/versions/2024_01_15_add_users_table.py
"""Add users table

Revision ID: abc123def456
Revises:
Create Date: 2024-01-15 10:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "abc123def456"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("name", sa.String(100), nullable=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), default=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), onupdate=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"])


def downgrade() -> None:
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
```

## Common Migration Operations

### Column Operations

```python
def upgrade() -> None:
    # Add column
    op.add_column("users", sa.Column("phone", sa.String(20), nullable=True))

    # Alter column
    op.alter_column(
        "users",
        "name",
        existing_type=sa.String(100),
        type_=sa.String(200),
        existing_nullable=True,
    )

    # Rename column
    op.alter_column("users", "name", new_column_name="full_name")

    # Drop column
    op.drop_column("users", "deprecated_field")

    # Add non-nullable column with default
    op.add_column("users", sa.Column("role", sa.String(20), nullable=True))
    op.execute("UPDATE users SET role = 'user' WHERE role IS NULL")
    op.alter_column("users", "role", nullable=False)
```

### Index Operations

```python
def upgrade() -> None:
    # Create index
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # Composite index
    op.create_index("ix_posts_author_date", "posts", ["author_id", "created_at"])

    # Partial index
    op.create_index(
        "ix_users_active_email",
        "users",
        ["email"],
        postgresql_where=sa.text("is_active = true"),
    )

    # Drop index
    op.drop_index("ix_old_index", table_name="users")
```

### Foreign Key Operations

```python
def upgrade() -> None:
    # Add foreign key
    op.create_foreign_key(
        "fk_posts_author",
        "posts",
        "users",
        ["author_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # Drop foreign key
    op.drop_constraint("fk_posts_author", "posts", type_="foreignkey")
```

### Enum Operations

```python
def upgrade() -> None:
    # Create enum type
    status_enum = sa.Enum("pending", "active", "suspended", name="user_status")
    status_enum.create(op.get_bind())

    # Add column with enum
    op.add_column("users", sa.Column("status", status_enum, default="pending"))


def downgrade() -> None:
    op.drop_column("users", "status")

    # Drop enum type
    sa.Enum(name="user_status").drop(op.get_bind())
```

## Data Migrations

```python
from sqlalchemy.orm import Session
from alembic import op
import sqlalchemy as sa

def upgrade() -> None:
    # Get connection
    connection = op.get_bind()

    # Execute raw SQL
    connection.execute(sa.text("""
        UPDATE users
        SET role = 'admin'
        WHERE email LIKE '%@admin.com'
    """))

    # Using ORM (with Session)
    session = Session(bind=connection)
    try:
        users = session.execute(sa.text("SELECT id, name FROM users")).fetchall()
        for user in users:
            session.execute(
                sa.text("UPDATE users SET slug = :slug WHERE id = :id"),
                {"slug": slugify(user.name), "id": user.id}
            )
        session.commit()
    except Exception:
        session.rollback()
        raise
```

## Multi-Database Migrations

```python
# alembic/env.py
from app.db.base import Base
from app.db.tenant import TenantBase

def run_migrations_online() -> None:
    connectable = engine_from_config(...)

    with connectable.connect() as connection:
        # Run core migrations
        context.configure(
            connection=connection,
            target_metadata=Base.metadata,
            version_table="alembic_version_core",
        )
        with context.begin_transaction():
            context.run_migrations()

        # Run tenant migrations
        context.configure(
            connection=connection,
            target_metadata=TenantBase.metadata,
            version_table="alembic_version_tenant",
        )
        with context.begin_transaction():
            context.run_migrations()
```

## CI/CD Integration

```yaml
# .github/workflows/migrations.yml
- name: Check for pending migrations
  run: |
    alembic upgrade head --sql > /dev/null
    if [ $? -ne 0 ]; then
      echo "Migration check failed"
      exit 1
    fi

- name: Run migrations
  run: alembic upgrade head
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## Anti-patterns

```python
# BAD: Hardcoded values
op.execute("UPDATE users SET role = 'admin' WHERE id = 1")

# GOOD: Use parameterized queries
connection.execute(
    sa.text("UPDATE users SET role = :role WHERE id = :id"),
    {"role": "admin", "id": 1}
)

# BAD: Destructive migration without data preservation
def upgrade() -> None:
    op.drop_column("users", "legacy_data")  # Data lost!

# GOOD: Preserve data first
def upgrade() -> None:
    # Step 1: Copy data
    op.execute("INSERT INTO users_archive SELECT * FROM users")
    # Step 2: Then drop
    op.drop_column("users", "legacy_data")

# BAD: Long-running migration blocking table
def upgrade() -> None:
    op.add_column("users", sa.Column("computed", sa.String(255)))
    op.execute("UPDATE users SET computed = complex_function(data)")  # Locks table!

# GOOD: Use batching with parameterized queries
def upgrade() -> None:
    connection = op.get_bind()
    batch_size = 1000
    offset = 0

    while True:
        result = connection.execute(
            sa.text("""
                UPDATE users SET computed = complex_function(data)
                WHERE id IN (
                    SELECT id FROM users
                    ORDER BY id
                    LIMIT :batch_size OFFSET :offset
                )
            """),
            {"batch_size": batch_size, "offset": offset}
        )
        if result.rowcount == 0:
            break
        offset += batch_size
        connection.commit()

# BAD: No downgrade path
def downgrade() -> None:
    pass  # Cannot rollback!

# GOOD: Always implement downgrade
def downgrade() -> None:
    op.drop_column("users", "new_column")
```
