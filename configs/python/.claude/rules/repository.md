---
paths:
  - "**/repositories/**/*.py"
  - "**/repository/**/*.py"
  - "**/*_repository.py"
  - "**/dal/**/*.py"
---

# Python Repository Pattern

## Base Repository (SQLAlchemy)

```python
# repositories/base.py
from typing import Generic, TypeVar, Sequence
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.base import Base

ModelT = TypeVar("ModelT", bound=Base)


class BaseRepository(Generic[ModelT]):
    """Base repository with common CRUD operations."""

    def __init__(self, session: AsyncSession, model: type[ModelT]):
        self.session = session
        self.model = model

    async def get(self, id: int) -> ModelT | None:
        return await self.session.get(self.model, id)

    async def get_or_raise(self, id: int) -> ModelT:
        entity = await self.get(id)
        if not entity:
            raise NotFoundError(self.model.__name__, id)
        return entity

    async def get_all(
        self,
        *,
        skip: int = 0,
        limit: int = 100,
    ) -> Sequence[ModelT]:
        result = await self.session.scalars(
            select(self.model).offset(skip).limit(limit)
        )
        return result.all()

    async def count(self) -> int:
        result = await self.session.scalar(
            select(func.count()).select_from(self.model)
        )
        return result or 0

    async def create(self, **kwargs) -> ModelT:
        entity = self.model(**kwargs)
        self.session.add(entity)
        await self.session.flush()
        await self.session.refresh(entity)
        return entity

    async def update(self, entity: ModelT, **kwargs) -> ModelT:
        for key, value in kwargs.items():
            if hasattr(entity, key):
                setattr(entity, key, value)
        await self.session.flush()
        await self.session.refresh(entity)
        return entity

    async def delete(self, entity: ModelT) -> None:
        await self.session.delete(entity)
        await self.session.flush()

    async def exists(self, id: int) -> bool:
        result = await self.session.scalar(
            select(func.count())
            .select_from(self.model)
            .where(self.model.id == id)
        )
        return (result or 0) > 0
```

## Typed Repository

```python
# repositories/user.py
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models import User
from schemas import UserCreate, UserUpdate
from .base import BaseRepository


class UserRepository(BaseRepository[User]):
    def __init__(self, session: AsyncSession):
        super().__init__(session, User)

    async def get_by_email(self, email: str) -> User | None:
        result = await self.session.scalar(
            select(User).where(User.email == email)
        )
        return result

    async def get_with_posts(self, user_id: int) -> User | None:
        result = await self.session.scalar(
            select(User)
            .options(selectinload(User.posts))
            .where(User.id == user_id)
        )
        return result

    async def get_active_users(
        self,
        *,
        skip: int = 0,
        limit: int = 100,
    ) -> list[User]:
        result = await self.session.scalars(
            select(User)
            .where(User.is_active == True)
            .order_by(User.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.all())

    async def search(
        self,
        query: str,
        *,
        skip: int = 0,
        limit: int = 100,
    ) -> list[User]:
        search_term = f"%{query}%"
        result = await self.session.scalars(
            select(User)
            .where(
                (User.name.ilike(search_term)) |
                (User.email.ilike(search_term))
            )
            .offset(skip)
            .limit(limit)
        )
        return list(result.all())

    async def create_user(self, data: UserCreate) -> User:
        return await self.create(
            email=data.email,
            name=data.name,
            hashed_password=hash_password(data.password),
        )

    async def update_user(self, user: User, data: UserUpdate) -> User:
        update_data = data.model_dump(exclude_unset=True)
        return await self.update(user, **update_data)
```

## Unit of Work Pattern

```python
# repositories/uow.py
from sqlalchemy.ext.asyncio import AsyncSession

from .user import UserRepository
from .post import PostRepository
from .order import OrderRepository


class UnitOfWork:
    """Unit of Work pattern for managing transactions."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self._users: UserRepository | None = None
        self._posts: PostRepository | None = None
        self._orders: OrderRepository | None = None

    @property
    def users(self) -> UserRepository:
        if self._users is None:
            self._users = UserRepository(self.session)
        return self._users

    @property
    def posts(self) -> PostRepository:
        if self._posts is None:
            self._posts = PostRepository(self.session)
        return self._posts

    @property
    def orders(self) -> OrderRepository:
        if self._orders is None:
            self._orders = OrderRepository(self.session)
        return self._orders

    async def commit(self) -> None:
        await self.session.commit()

    async def rollback(self) -> None:
        await self.session.rollback()

    async def __aenter__(self) -> "UnitOfWork":
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        if exc_type:
            await self.rollback()
        else:
            await self.commit()
        await self.session.close()
```

## FastAPI Integration

```python
# dependencies.py
from typing import Annotated, AsyncIterator
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import async_session
from repositories import UnitOfWork, UserRepository


async def get_session() -> AsyncIterator[AsyncSession]:
    async with async_session() as session:
        yield session


async def get_uow(
    session: Annotated[AsyncSession, Depends(get_session)]
) -> AsyncIterator[UnitOfWork]:
    async with UnitOfWork(session) as uow:
        yield uow


async def get_user_repository(
    session: Annotated[AsyncSession, Depends(get_session)]
) -> UserRepository:
    return UserRepository(session)


# Type aliases for dependency injection
SessionDep = Annotated[AsyncSession, Depends(get_session)]
UowDep = Annotated[UnitOfWork, Depends(get_uow)]
UserRepoDep = Annotated[UserRepository, Depends(get_user_repository)]


# Usage in routes
@router.get("/{user_id}")
async def get_user(user_id: int, repo: UserRepoDep) -> UserResponse:
    user = await repo.get_or_raise(user_id)
    return UserResponse.model_validate(user)


# Usage with UoW for transactions
@router.post("/transfer")
async def transfer_funds(data: TransferRequest, uow: UowDep) -> None:
    sender = await uow.users.get_or_raise(data.sender_id)
    receiver = await uow.users.get_or_raise(data.receiver_id)

    sender.balance -= data.amount
    receiver.balance += data.amount

    await uow.commit()  # Single transaction
```

## Abstract Repository (Interface)

```python
# repositories/interfaces.py
from abc import ABC, abstractmethod
from typing import Generic, TypeVar, Sequence

T = TypeVar("T")


class IRepository(ABC, Generic[T]):
    """Repository interface for dependency inversion."""

    @abstractmethod
    async def get(self, id: int) -> T | None:
        ...

    @abstractmethod
    async def get_all(self, *, skip: int = 0, limit: int = 100) -> Sequence[T]:
        ...

    @abstractmethod
    async def create(self, **kwargs) -> T:
        ...

    @abstractmethod
    async def update(self, entity: T, **kwargs) -> T:
        ...

    @abstractmethod
    async def delete(self, entity: T) -> None:
        ...


class IUserRepository(IRepository["User"], ABC):
    """User-specific repository interface."""

    @abstractmethod
    async def get_by_email(self, email: str) -> "User | None":
        ...

    @abstractmethod
    async def get_active_users(self) -> list["User"]:
        ...


# SQLAlchemy implementation
class SqlAlchemyUserRepository(IUserRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get(self, id: int) -> User | None:
        return await self.session.get(User, id)

    # ... implement all methods


# In-memory implementation for testing
class InMemoryUserRepository(IUserRepository):
    def __init__(self):
        self._users: dict[int, User] = {}
        self._counter = 0

    async def get(self, id: int) -> User | None:
        return self._users.get(id)

    async def create(self, **kwargs) -> User:
        self._counter += 1
        user = User(id=self._counter, **kwargs)
        self._users[self._counter] = user
        return user

    # ... implement all methods
```

## Anti-Patterns

```python
# BAD: Business logic in repository
class UserRepository:
    async def create_user(self, data: UserCreate) -> User:
        if await self.get_by_email(data.email):
            raise ConflictError("User", "email", data.email)  # Business logic!
        # ...


# GOOD: Repository only handles data access
class UserRepository:
    async def get_by_email(self, email: str) -> User | None:
        # Just data access
        ...


class UserService:
    async def create_user(self, data: UserCreate) -> User:
        if await self.repo.get_by_email(data.email):
            raise ConflictError("User", "email", data.email)  # In service
        return await self.repo.create(...)


# BAD: Using session directly in routes
@router.get("/{user_id}")
async def get_user(user_id: int, session: SessionDep):
    user = await session.get(User, user_id)  # Couples route to ORM
    return user


# GOOD: Use repository abstraction
@router.get("/{user_id}")
async def get_user(user_id: int, repo: UserRepoDep):
    return await repo.get_or_raise(user_id)  # Decoupled
```
