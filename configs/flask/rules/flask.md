---
paths:
  - "**/*.py"
---

# Flask Rules

## Application Factory

```python
# GOOD - Application factory pattern
def create_app(config_name: str = "development") -> Flask:
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    db.init_app(app)
    register_blueprints(app)

    return app

# BAD - Global app instance
app = Flask(__name__)  # Hard to test, can't have multiple configs
```

## Blueprints

```python
# GOOD - Organized blueprints
from flask import Blueprint

users_bp = Blueprint("users", __name__)

@users_bp.route("/", methods=["GET"])
def list_users():
    ...

# Register in factory
app.register_blueprint(users_bp, url_prefix="/api/v1/users")

# BAD - All routes in one file
@app.route("/api/v1/users")
@app.route("/api/v1/posts")
@app.route("/api/v1/comments")  # Messy, hard to maintain
```

## Request Handling

```python
# GOOD - Validate input with schemas
from marshmallow import ValidationError

@users_bp.route("/", methods=["POST"])
def create_user():
    try:
        data = UserCreateSchema().load(request.get_json())
    except ValidationError as e:
        return jsonify({"errors": e.messages}), 400

    user = user_service.create(data)
    return jsonify(UserResponseSchema().dump(user)), 201

# BAD - Direct access without validation
@users_bp.route("/", methods=["POST"])
def create_user():
    data = request.get_json()
    user = User(email=data["email"])  # No validation!
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict())
```

## Context Management

```python
# GOOD - Use application context
with app.app_context():
    db.create_all()

# GOOD - Use test request context
with app.test_request_context():
    url = url_for("users.get_user", user_id=1)

# BAD - Access outside context
db.create_all()  # RuntimeError: No application context
```

## Configuration

```python
# GOOD - Class-based config
class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-key")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///dev.db"

class ProductionConfig(Config):
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ["DATABASE_URL"]

config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
}

# BAD - Hardcoded config
app.config["SECRET_KEY"] = "hardcoded-secret"  # Never do this
```

## Testing

```python
# GOOD - Test client fixture
import pytest

@pytest.fixture
def app():
    app = create_app("testing")
    return app

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def db_session(app):
    with app.app_context():
        db.create_all()
        yield db.session
        db.drop_all()

def test_create_user(client):
    response = client.post("/api/v1/users", json={
        "email": "test@example.com",
        "password": "password123",
        "name": "Test User",
    })
    assert response.status_code == 201
    assert response.json["email"] == "test@example.com"
```

## Extensions Pattern

```python
# GOOD - Lazy initialization
# extensions.py
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

db = SQLAlchemy()
migrate = Migrate()

# __init__.py
def create_app():
    app = Flask(__name__)
    db.init_app(app)
    migrate.init_app(app, db)
    return app

# BAD - Eager initialization
from flask import Flask
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
db = SQLAlchemy(app)  # Can't use different configs
```
