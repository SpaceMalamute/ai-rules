---
description: "Flask extension integration patterns"
paths:
  - "**/*.py"
---

# Flask Extensions Patterns

## Extension Initialization

```python
# GOOD - Lazy initialization (extensions.py)
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_mail import Mail

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
cors = CORS()
mail = Mail()

# In factory (app/__init__.py)
def create_app(config_name: str = "development") -> Flask:
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(app)
    mail.init_app(app)

    return app

# BAD - Eager initialization
from flask import Flask
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
db = SQLAlchemy(app)  # Can't use different configs!
```

## Flask-SQLAlchemy

```python
from app.extensions import db
from sqlalchemy.orm import Mapped, mapped_column

class User(db.Model):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(unique=True, index=True)
    name: Mapped[str] = mapped_column(db.String(100))
    is_active: Mapped[bool] = mapped_column(default=True)

    # Relationships
    orders: Mapped[list["Order"]] = db.relationship(back_populates="user")

# Usage in routes
@users_bp.route("/")
def list_users():
    users = db.session.scalars(db.select(User).where(User.is_active)).all()
    return jsonify(UserSchema(many=True).dump(users))
```

## Flask-Migrate

```python
# migrations/env.py is auto-generated
# Commands:
# flask db init        - Initialize migrations
# flask db migrate -m "Add users table"
# flask db upgrade     - Apply migrations
# flask db downgrade   - Rollback last migration
# flask db current     - Show current revision
# flask db history     - Show migration history
```

## Flask-JWT-Extended

```python
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    current_user,
    get_jwt_identity,
)

# Configure in factory
app.config["JWT_SECRET_KEY"] = os.environ["JWT_SECRET_KEY"]
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=1)
app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(days=30)

# User loader callback
@jwt.user_lookup_loader
def user_lookup_callback(_jwt_header, jwt_data):
    identity = jwt_data["sub"]
    return db.session.get(User, identity)

# Login endpoint
@auth_bp.route("/login", methods=["POST"])
def login():
    data = LoginSchema().load(request.get_json())
    user = db.session.execute(db.select(User).filter_by(email=data["email"])).scalar_one_or_none()

    if not user or not user.check_password(data["password"]):
        return jsonify({"error": "Invalid credentials"}), 401

    access_token = create_access_token(identity=user.id)
    refresh_token = create_refresh_token(identity=user.id)

    return jsonify({
        "access_token": access_token,
        "refresh_token": refresh_token,
    })

# Protected endpoint
@users_bp.route("/me")
@jwt_required()
def get_current_user():
    return jsonify(UserSchema().dump(current_user))

# Refresh token
@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    access_token = create_access_token(identity=identity)
    return jsonify({"access_token": access_token})
```

## Flask-CORS

```python
from flask_cors import CORS

# Global CORS
cors.init_app(app, resources={
    r"/api/*": {
        "origins": ["https://example.com"],
        "methods": ["GET", "POST", "PUT", "DELETE"],
        "allow_headers": ["Authorization", "Content-Type"],
    }
})

# Blueprint-specific CORS
CORS(users_bp, origins=["https://admin.example.com"])

# Route-specific
from flask_cors import cross_origin

@app.route("/public")
@cross_origin(origins="*")
def public_endpoint():
    return jsonify({"public": True})
```

## Flask-Mail

```python
from flask_mail import Message
from app.extensions import mail

def send_welcome_email(user: User):
    msg = Message(
        subject="Welcome!",
        sender="noreply@example.com",
        recipients=[user.email],
    )
    msg.body = f"Hello {user.name}, welcome to our platform!"
    msg.html = render_template("emails/welcome.html", user=user)

    mail.send(msg)

# Async email sending
from threading import Thread

def send_async_email(app, msg):
    with app.app_context():
        mail.send(msg)

def send_email_async(msg):
    Thread(target=send_async_email, args=(current_app._get_current_object(), msg)).start()
```

## Flask-Caching

```python
from flask_caching import Cache

cache = Cache()

# Configuration
app.config["CACHE_TYPE"] = "redis"
app.config["CACHE_REDIS_URL"] = os.environ["REDIS_URL"]
app.config["CACHE_DEFAULT_TIMEOUT"] = 300

cache.init_app(app)

# Usage
@users_bp.route("/<int:user_id>")
@cache.cached(timeout=60, key_prefix="user")
def get_user(user_id: int):
    user = User.query.get_or_404(user_id)
    return jsonify(UserSchema().dump(user))

# Memoize (cache with arguments)
@cache.memoize(timeout=300)
def get_user_stats(user_id: int) -> dict:
    return calculate_stats(user_id)

# Clear cache
cache.delete("user")
cache.delete_memoized(get_user_stats, user_id)
```

## Flask-Limiter

```python
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100 per hour"],
    storage_uri="redis://localhost:6379",
)

limiter.init_app(app)

# Route-specific limits
@auth_bp.route("/login", methods=["POST"])
@limiter.limit("5 per minute")
def login():
    ...

# Blueprint limits
limiter.limit("50 per hour")(users_bp)

# Exempt from limits
@app.route("/health")
@limiter.exempt
def health():
    return jsonify({"status": "ok"})
```

## Flask-Login (Session-Based)

```python
from flask_login import LoginManager, login_user, logout_user, login_required, current_user

login_manager = LoginManager()
login_manager.login_view = "auth.login"

@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))

# Login
@auth_bp.route("/login", methods=["POST"])
def login():
    user = authenticate(request.form["email"], request.form["password"])
    if user:
        login_user(user, remember=True)
        return redirect(url_for("main.index"))
    return render_template("login.html", error="Invalid credentials")

# Protected route
@main_bp.route("/dashboard")
@login_required
def dashboard():
    return render_template("dashboard.html", user=current_user)
```
