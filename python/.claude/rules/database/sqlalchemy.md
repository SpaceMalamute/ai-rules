---
paths:
  - "**/*.py"
---

# SQLAlchemy 2.0 Rules

## Async Setup

```python
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker,
)
from sqlalchemy.orm import DeclarativeBase

DATABASE_URL = "postgresql+asyncpg://user:pass@localhost/db"

engine = create_async_engine(DATABASE_URL, echo=False)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

class Base(DeclarativeBase):
    pass
```

## Model Definitions (SQLAlchemy 2.0 style)

```python
from datetime import datetime
from sqlalchemy import String, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        default=func.now(),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        onupdate=func.now(),
        default=None,
    )

class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(256), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(256))
    name: Mapped[str | None] = mapped_column(String(100))
    role: Mapped[str] = mapped_column(String(50), default="user")
    is_active: Mapped[bool] = mapped_column(default=True)

    # Relationships
    posts: Mapped[list["Post"]] = relationship(
        back_populates="author",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email})>"


class Post(TimestampMixin, Base):
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[str | None]
    published: Mapped[bool] = mapped_column(default=False)

    # Foreign key
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    author: Mapped["User"] = relationship(back_populates="posts")
```

## Repository Pattern

```python
from sqlalchemy import select, delete, update
from sqlalchemy.ext.asyncio import AsyncSession

class BaseRepository[T]:
    def __init__(self, session: AsyncSession, model: type[T]):
        self.session = session
        self.model = model

    async def get(self, id: int) -> T | None:
        return await self.session.get(self.model, id)

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
    ) -> list[T]:
        stmt = select(self.model).offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create(self, **kwargs) -> T:
        instance = self.model(**kwargs)
        self.session.add(instance)
        await self.session.flush()
        await self.session.refresh(instance)
        return instance

    async def update(self, id: int, **kwargs) -> T | None:
        stmt = (
            update(self.model)
            .where(self.model.id == id)
            .values(**kwargs)
            .returning(self.model)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def delete(self, id: int) -> bool:
        stmt = delete(self.model).where(self.model.id == id)
        result = await self.session.execute(stmt)
        return result.rowcount > 0


class UserRepository(BaseRepository[User]):
    def __init__(self, session: AsyncSession):
        super().__init__(session, User)

    async def get_by_email(self, email: str) -> User | None:
        stmt = select(User).where(User.email == email)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_active_users(self) -> list[User]:
        stmt = select(User).where(User.is_active == True)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def search(
        self,
        query: str,
        skip: int = 0,
        limit: int = 20,
    ) -> list[User]:
        stmt = (
            select(User)
            .where(
                User.email.ilike(f"%{query}%") |
                User.name.ilike(f"%{query}%")
            )
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
```

## Query Patterns

### Select Queries

```python
from sqlalchemy import select, and_, or_, func

# Basic select
stmt = select(User).where(User.is_active == True)

# Multiple conditions
stmt = select(User).where(
    and_(
        User.is_active == True,
        User.role == "admin",
    )
)

# OR conditions
stmt = select(User).where(
    or_(
        User.email.contains("@company.com"),
        User.role == "admin",
    )
)

# Ordering
stmt = select(User).order_by(User.created_at.desc())

# Aggregation
stmt = select(func.count(User.id)).where(User.is_active == True)
result = await session.execute(stmt)
count = result.scalar_one()
```

### Joins and Relationships

```python
from sqlalchemy.orm import selectinload, joinedload

# Eager load relationships (N+1 prevention)
stmt = (
    select(User)
    .options(selectinload(User.posts))
    .where(User.id == user_id)
)

# Join for filtering
stmt = (
    select(User)
    .join(User.posts)
    .where(Post.published == True)
    .distinct()
)

# Left outer join
stmt = (
    select(User, func.count(Post.id).label("post_count"))
    .outerjoin(User.posts)
    .group_by(User.id)
)
```

### Pagination

```python
from sqlalchemy import select, func

async def get_paginated(
    session: AsyncSession,
    page: int = 1,
    size: int = 20,
) -> tuple[list[User], int]:
    # Count total
    count_stmt = select(func.count(User.id))
    total = await session.scalar(count_stmt)

    # Get items
    stmt = (
        select(User)
        .order_by(User.id)
        .offset((page - 1) * size)
        .limit(size)
    )
    result = await session.execute(stmt)
    items = list(result.scalars().all())

    return items, total
```

## Transactions

```python
from sqlalchemy.exc import IntegrityError

# Automatic transaction (recommended)
async with async_session_maker() as session:
    user = User(email="test@example.com")
    session.add(user)
    await session.commit()  # Commits transaction

# Manual transaction control
async with async_session_maker() as session:
    async with session.begin():
        user = User(email="test@example.com")
        session.add(user)
        # Commits automatically at end of block

# Nested transaction (savepoint)
async with async_session_maker() as session:
    async with session.begin():
        session.add(user1)

        try:
            async with session.begin_nested():
                session.add(user2)
                raise ValueError("Rollback nested only")
        except ValueError:
            pass  # user2 rolled back, user1 still pending

        await session.commit()  # Only user1 committed
```

## Alembic Migrations

```bash
# Initialize
alembic init alembic

# Generate migration
alembic revision --autogenerate -m "Add users table"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1

# Show current revision
alembic current
```

### Async Alembic Config

```python
# alembic/env.py
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine

def run_migrations_online():
    connectable = create_async_engine(settings.database_url)

    async def do_run_migrations():
        async with connectable.connect() as connection:
            await connection.run_sync(do_run_migrations_sync)
        await connectable.dispose()

    def do_run_migrations_sync(connection):
        context.configure(
            connection=connection,
            target_metadata=Base.metadata,
        )
        with context.begin_transaction():
            context.run_migrations()

    asyncio.run(do_run_migrations())
```

## Soft Delete

```python
from datetime import datetime
from sqlalchemy import event

class SoftDeleteMixin:
    deleted_at: Mapped[datetime | None] = mapped_column(default=None)

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None

    def soft_delete(self) -> None:
        self.deleted_at = datetime.utcnow()

class User(SoftDeleteMixin, Base):
    __tablename__ = "users"
    # ...

# Query filter for soft delete
def not_deleted():
    return User.deleted_at.is_(None)

# Usage
stmt = select(User).where(not_deleted())
```
