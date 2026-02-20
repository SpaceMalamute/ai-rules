---
description: "Flask blueprint organization patterns"
paths:
  - "**/*.py"
---

# Flask Blueprint Patterns

## Basic Blueprint

```python
# GOOD - organized blueprint
from flask import Blueprint, request, jsonify

users_bp = Blueprint("users", __name__)

@users_bp.route("/", methods=["GET"])
def list_users():
    """List all users."""
    users = UserService.get_all()
    return jsonify(UserSchema(many=True).dump(users))

@users_bp.route("/", methods=["POST"])
def create_user():
    """Create a new user."""
    schema = UserCreateSchema()
    data = schema.load(request.get_json())
    user = UserService.create(data)
    return jsonify(UserSchema().dump(user)), 201

@users_bp.route("/<int:user_id>")
def get_user(user_id: int):
    """Get user by ID."""
    user = UserService.get_by_id(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(UserSchema().dump(user))
```

## Blueprint Registration

```python
# app/__init__.py
from flask import Flask

def create_app(config_name: str = "development") -> Flask:
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # Register blueprints
    from app.users import users_bp
    from app.auth import auth_bp
    from app.products import products_bp

    app.register_blueprint(users_bp, url_prefix="/api/v1/users")
    app.register_blueprint(auth_bp, url_prefix="/api/v1/auth")
    app.register_blueprint(products_bp, url_prefix="/api/v1/products")

    return app
```

## Blueprint with Resources

```python
# app/users/__init__.py
from flask import Blueprint

users_bp = Blueprint("users", __name__)

# Import routes after blueprint creation to avoid circular imports
from app.users import routes  # noqa: E402, F401
```

```python
# app/users/routes.py
from app.users import users_bp
from app.users.schemas import UserSchema, UserCreateSchema
from app.users.services import UserService

@users_bp.route("/", methods=["GET"])
def list_users():
    ...
```

## Nested Blueprints

```python
# API versioning with nested blueprints
api_v1 = Blueprint("api_v1", __name__, url_prefix="/api/v1")
api_v2 = Blueprint("api_v2", __name__, url_prefix="/api/v2")

# Register child blueprints
api_v1.register_blueprint(users_bp, url_prefix="/users")
api_v1.register_blueprint(products_bp, url_prefix="/products")

api_v2.register_blueprint(users_v2_bp, url_prefix="/users")

# Register with app
app.register_blueprint(api_v1)
app.register_blueprint(api_v2)
```

## Blueprint-Specific Error Handlers

```python
users_bp = Blueprint("users", __name__)

@users_bp.errorhandler(404)
def user_not_found(error):
    return jsonify({"error": "User not found"}), 404

@users_bp.errorhandler(ValidationError)
def validation_error(error):
    return jsonify({"error": "Validation failed", "details": error.messages}), 400
```

## Blueprint Hooks

```python
users_bp = Blueprint("users", __name__)

@users_bp.before_request
def before_user_request():
    """Run before every request to this blueprint."""
    # Verify API key, log request, etc.
    if not verify_api_key(request.headers.get("X-API-Key")):
        return jsonify({"error": "Invalid API key"}), 401

@users_bp.after_request
def after_user_request(response):
    """Run after every request to this blueprint."""
    response.headers["X-Blueprint"] = "users"
    return response
```

## Blueprint URL Builders

```python
from flask import url_for

# Build URL for blueprint route
url = url_for("users.get_user", user_id=1)  # /api/v1/users/1

# With external URL
url = url_for("users.get_user", user_id=1, _external=True)
# https://example.com/api/v1/users/1
```

## Blueprint Templates

```python
# Blueprint with templates
users_bp = Blueprint(
    "users",
    __name__,
    template_folder="templates",
    static_folder="static",
)

@users_bp.route("/profile")
def profile():
    return render_template("users/profile.html")  # From blueprint's templates/
```

## Blueprint Context Processor

```python
@users_bp.context_processor
def user_context():
    """Add variables to all templates rendered by this blueprint."""
    return {
        "current_user": get_current_user(),
        "user_count": User.query.count(),
    }
```

## Class-Based Views with Blueprints

```python
from flask.views import MethodView

class UserAPI(MethodView):
    def get(self, user_id: int | None = None):
        if user_id is None:
            return jsonify(UserSchema(many=True).dump(User.query.all()))
        user = User.query.get_or_404(user_id)
        return jsonify(UserSchema().dump(user))

    def post(self):
        data = UserCreateSchema().load(request.get_json())
        user = UserService.create(data)
        return jsonify(UserSchema().dump(user)), 201

    def put(self, user_id: int):
        user = User.query.get_or_404(user_id)
        data = UserUpdateSchema().load(request.get_json())
        user = UserService.update(user, data)
        return jsonify(UserSchema().dump(user))

    def delete(self, user_id: int):
        user = User.query.get_or_404(user_id)
        UserService.delete(user)
        return "", 204

# Register view
user_view = UserAPI.as_view("user_api")
users_bp.add_url_rule("/", view_func=user_view, methods=["GET", "POST"])
users_bp.add_url_rule("/<int:user_id>", view_func=user_view, methods=["GET", "PUT", "DELETE"])
```
