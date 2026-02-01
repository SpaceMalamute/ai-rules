---
paths:
  - "**/*.py"
---

# Marshmallow Validation Rules

## Schema Definition

```python
# GOOD - Clear schema with validation
from marshmallow import Schema, fields, validate, validates, ValidationError, post_load

class UserCreateSchema(Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=validate.Length(min=8))
    name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    age = fields.Int(validate=validate.Range(min=0, max=150))

class UserResponseSchema(Schema):
    id = fields.Int(dump_only=True)
    email = fields.Email()
    name = fields.Str()
    created_at = fields.DateTime(dump_only=True)

# BAD - No validation
class UserSchema(Schema):
    email = fields.Str()  # Should be fields.Email
    password = fields.Str()  # No length validation
```

## Custom Validation

```python
# GOOD - Field-level validation
class UserSchema(Schema):
    username = fields.Str(required=True)

    @validates("username")
    def validate_username(self, value):
        if not value.isalnum():
            raise ValidationError("Username must be alphanumeric")
        if len(value) < 3:
            raise ValidationError("Username must be at least 3 characters")

# GOOD - Cross-field validation
from marshmallow import validates_schema

class PasswordChangeSchema(Schema):
    password = fields.Str(required=True)
    password_confirm = fields.Str(required=True)

    @validates_schema
    def validate_passwords_match(self, data, **kwargs):
        if data.get("password") != data.get("password_confirm"):
            raise ValidationError("Passwords must match", field_name="password_confirm")
```

## Load/Dump Hooks

```python
from marshmallow import pre_load, post_load, post_dump

class UserSchema(Schema):
    email = fields.Email(required=True)
    name = fields.Str(required=True)

    @pre_load
    def normalize_email(self, data, **kwargs):
        if "email" in data:
            data["email"] = data["email"].lower().strip()
        return data

    @post_load
    def make_user(self, data, **kwargs):
        return User(**data)

    @post_dump
    def remove_nulls(self, data, **kwargs):
        return {k: v for k, v in data.items() if v is not None}
```

## Nested Schemas

```python
# GOOD - Nested relationships
class AddressSchema(Schema):
    street = fields.Str(required=True)
    city = fields.Str(required=True)
    country = fields.Str(required=True)

class UserSchema(Schema):
    name = fields.Str(required=True)
    address = fields.Nested(AddressSchema)
    addresses = fields.List(fields.Nested(AddressSchema))

# GOOD - Self-referential (e.g., comments with replies)
class CommentSchema(Schema):
    id = fields.Int(dump_only=True)
    text = fields.Str(required=True)
    replies = fields.List(fields.Nested("self", exclude=("replies",)))
```

## Partial Loading

```python
# GOOD - Partial updates
class UserUpdateSchema(Schema):
    email = fields.Email()
    name = fields.Str(validate=validate.Length(min=1, max=100))

@users_bp.route("/<int:user_id>", methods=["PATCH"])
def update_user(user_id: int):
    schema = UserUpdateSchema()
    data = schema.load(request.get_json(), partial=True)
    user = UserService.update(user_id, data)
    return jsonify(UserResponseSchema().dump(user))
```

## Schema Inheritance

```python
# GOOD - Base schema with common fields
class BaseSchema(Schema):
    class Meta:
        strict = True

class TimestampMixin:
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

class UserSchema(BaseSchema, TimestampMixin):
    id = fields.Int(dump_only=True)
    email = fields.Email(required=True)
    name = fields.Str(required=True)
```

## Error Handling

```python
# GOOD - Centralized error handling
from marshmallow import ValidationError
from flask import jsonify

@app.errorhandler(ValidationError)
def handle_validation_error(error):
    return jsonify({
        "error": "Validation Error",
        "details": error.messages,
    }), 400

# In routes
@users_bp.route("/", methods=["POST"])
def create_user():
    schema = UserCreateSchema()
    try:
        data = schema.load(request.get_json())
    except ValidationError as e:
        return jsonify({"errors": e.messages}), 400

    user = UserService.create(data)
    return jsonify(UserResponseSchema().dump(user)), 201
```

## SQLAlchemy Integration

```python
# GOOD - With marshmallow-sqlalchemy
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema

class UserSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = User
        include_relationships = True
        load_instance = True
        exclude = ("hashed_password",)

# Manual approach (more control)
class UserSchema(Schema):
    class Meta:
        load_instance = True

    id = fields.Int(dump_only=True)
    email = fields.Email(required=True)

    @post_load
    def make_user(self, data, **kwargs):
        return User(**data)
```

## Many Parameter

```python
# GOOD - Serialize/deserialize collections
schema = UserSchema()

# Single object
user_data = schema.dump(user)
user = schema.load(data)

# Multiple objects
users_data = schema.dump(users, many=True)
users = schema.load(data_list, many=True)
```
