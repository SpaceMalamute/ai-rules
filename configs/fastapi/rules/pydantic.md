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


def normalize_email(v: str) -> str:
    return v.lower().strip()


PhoneNumber = Annotated[str, AfterValidator(validate_phone)]
NormalizedEmail = Annotated[str, BeforeValidator(normalize_email)]


# Usage
class UserCreate(BaseModel):
    email: NormalizedEmail
    phone: Optional[PhoneNumber] = None
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
```

## Conditional Validation

```python
# schemas/payment.py
from pydantic import BaseModel, model_validator


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
from pydantic import BaseModel, Field

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
