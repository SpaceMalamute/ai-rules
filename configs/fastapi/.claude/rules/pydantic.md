---
paths:
  - "**/schemas/**/*.py"
  - "**/models/**/*.py"
  - "**/*_schema.py"
  - "**/*_model.py"
---

# Python Validation (Pydantic)

## Basic Models

```python
# schemas/user.py
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator
from uuid import UUID


class UserBase(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=2, max_length=100)


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain digit")
        if not any(c in "!@#$%^&*" for c in v):
            raise ValueError("Password must contain special character")
        return v


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = None


class UserResponse(UserBase):
    id: UUID
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
```

## Nested Models

```python
# schemas/order.py
from pydantic import BaseModel, Field, model_validator
from typing import List
from decimal import Decimal


class OrderItem(BaseModel):
    product_id: UUID
    quantity: int = Field(..., gt=0, le=100)
    price: Decimal = Field(..., gt=0, decimal_places=2)


class OrderCreate(BaseModel):
    items: List[OrderItem] = Field(..., min_length=1)
    shipping_address: str = Field(..., min_length=10)
    notes: Optional[str] = None

    @model_validator(mode="after")
    def validate_order(self) -> "OrderCreate":
        total_items = sum(item.quantity for item in self.items)
        if total_items > 100:
            raise ValueError("Maximum 100 items per order")
        return self


class OrderResponse(BaseModel):
    id: UUID
    items: List[OrderItem]
    total: Decimal
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
```

## Custom Types

```python
# schemas/types.py
from typing import Annotated
from pydantic import AfterValidator, BeforeValidator
import re


def validate_phone(v: str) -> str:
    pattern = r"^\+?[1-9]\d{1,14}$"
    if not re.match(pattern, v):
        raise ValueError("Invalid phone number format")
    return v


def validate_slug(v: str) -> str:
    pattern = r"^[a-z0-9]+(?:-[a-z0-9]+)*$"
    if not re.match(pattern, v):
        raise ValueError("Invalid slug format")
    return v


def normalize_email(v: str) -> str:
    return v.lower().strip()


PhoneNumber = Annotated[str, AfterValidator(validate_phone)]
Slug = Annotated[str, AfterValidator(validate_slug)]
NormalizedEmail = Annotated[str, BeforeValidator(normalize_email)]


# Usage
class UserCreate(BaseModel):
    email: NormalizedEmail
    phone: Optional[PhoneNumber] = None


class PostCreate(BaseModel):
    title: str
    slug: Slug
```

## Enum Validation

```python
# schemas/enums.py
from enum import Enum


class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"
    MODERATOR = "moderator"


class OrderStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


# Usage
class UserCreate(BaseModel):
    email: EmailStr
    role: UserRole = UserRole.USER


class OrderUpdate(BaseModel):
    status: OrderStatus
```

## Computed Fields

```python
# schemas/product.py
from pydantic import BaseModel, computed_field
from decimal import Decimal


class Product(BaseModel):
    name: str
    price: Decimal
    discount_percent: int = 0

    @computed_field
    @property
    def discounted_price(self) -> Decimal:
        discount = self.price * self.discount_percent / 100
        return self.price - discount

    @computed_field
    @property
    def display_name(self) -> str:
        if self.discount_percent > 0:
            return f"{self.name} ({self.discount_percent}% off)"
        return self.name
```

## Conditional Validation

```python
# schemas/payment.py
from pydantic import BaseModel, model_validator
from typing import Optional


class PaymentMethod(str, Enum):
    CREDIT_CARD = "credit_card"
    BANK_TRANSFER = "bank_transfer"
    PAYPAL = "paypal"


class PaymentCreate(BaseModel):
    method: PaymentMethod
    amount: Decimal

    # Credit card fields
    card_number: Optional[str] = None
    expiry_date: Optional[str] = None
    cvv: Optional[str] = None

    # Bank transfer fields
    bank_account: Optional[str] = None
    routing_number: Optional[str] = None

    # PayPal fields
    paypal_email: Optional[EmailStr] = None

    @model_validator(mode="after")
    def validate_payment_details(self) -> "PaymentCreate":
        if self.method == PaymentMethod.CREDIT_CARD:
            if not all([self.card_number, self.expiry_date, self.cvv]):
                raise ValueError("Card details required for credit card payment")

        elif self.method == PaymentMethod.BANK_TRANSFER:
            if not all([self.bank_account, self.routing_number]):
                raise ValueError("Bank details required for bank transfer")

        elif self.method == PaymentMethod.PAYPAL:
            if not self.paypal_email:
                raise ValueError("PayPal email required")

        return self
```

## Generic Pagination

```python
# schemas/pagination.py
from typing import Generic, TypeVar, List
from pydantic import BaseModel

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    size: int
    pages: int

    @classmethod
    def create(
        cls,
        items: List[T],
        total: int,
        page: int,
        size: int,
    ) -> "PaginatedResponse[T]":
        return cls(
            items=items,
            total=total,
            page=page,
            size=size,
            pages=(total + size - 1) // size,
        )


class PaginationParams(BaseModel):
    page: int = Field(1, ge=1)
    size: int = Field(10, ge=1, le=100)

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.size


# Usage
# PaginatedResponse[UserResponse]
```

## FastAPI Integration

```python
# api/users.py
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import ValidationError

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/", response_model=UserResponse, status_code=201)
async def create_user(
    user: UserCreate,
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    # Validation already done by Pydantic
    existing = await db.execute(
        select(User).where(User.email == user.email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    new_user = User(**user.model_dump())
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return UserResponse.model_validate(new_user)


@router.get("/", response_model=PaginatedResponse[UserResponse])
async def list_users(
    pagination: PaginationParams = Depends(),
    search: Optional[str] = Query(None, min_length=1),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[UserResponse]:
    query = select(User)

    if search:
        query = query.where(User.name.ilike(f"%{search}%"))

    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    users = await db.scalars(
        query.offset(pagination.offset).limit(pagination.size)
    )

    return PaginatedResponse.create(
        items=[UserResponse.model_validate(u) for u in users],
        total=total,
        page=pagination.page,
        size=pagination.size,
    )
```

## Custom Error Messages

```python
# schemas/user.py
from pydantic import BaseModel, Field


class UserCreate(BaseModel):
    email: EmailStr = Field(
        ...,
        description="User email address",
        json_schema_extra={"example": "user@example.com"},
    )
    password: str = Field(
        ...,
        min_length=8,
        max_length=100,
        description="User password (min 8 characters)",
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "email": "john@example.com",
                    "password": "SecurePass123!",
                }
            ]
        }
    }
```

## Anti-patterns

```python
# BAD: Using dict instead of Pydantic model
@router.post("/users")
async def create_user(data: dict):  # No validation!
    email = data.get("email")


# GOOD: Use Pydantic models
@router.post("/users")
async def create_user(data: UserCreate):
    email = data.email  # Validated and typed


# BAD: Manual validation
class UserCreate(BaseModel):
    email: str

    def validate_email(self):
        if "@" not in self.email:
            raise ValueError("Invalid email")


# GOOD: Use built-in validators
class UserCreate(BaseModel):
    email: EmailStr  # Automatic validation


# BAD: Catching all exceptions
try:
    user = UserCreate(**data)
except Exception as e:
    return {"error": str(e)}


# GOOD: Catch specific validation errors
from pydantic import ValidationError

try:
    user = UserCreate(**data)
except ValidationError as e:
    return {"errors": e.errors()}


# BAD: Not using model_config for ORM
class UserResponse(BaseModel):
    id: UUID
    name: str
    # This won't work with SQLAlchemy objects


# GOOD: Enable from_attributes
class UserResponse(BaseModel):
    id: UUID
    name: str

    model_config = {"from_attributes": True}
```
