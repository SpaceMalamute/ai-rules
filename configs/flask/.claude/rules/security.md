---
paths:
  - "**/*.py"
---

# Flask Security Patterns

## Password Hashing

```python
from werkzeug.security import generate_password_hash, check_password_hash

class User(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(unique=True)
    password_hash: Mapped[str]

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

# Usage
user = User(email="test@example.com")
user.set_password("secure_password")

if user.check_password("secure_password"):
    print("Password correct")
```

## CSRF Protection

```python
from flask_wtf.csrf import CSRFProtect

csrf = CSRFProtect()
csrf.init_app(app)

# In templates
<form method="post">
    {{ csrf_token() }}
    <!-- or -->
    <input type="hidden" name="csrf_token" value="{{ csrf_token() }}">
</form>

# For AJAX requests
<script>
    fetch('/api/endpoint', {
        method: 'POST',
        headers: {
            'X-CSRFToken': '{{ csrf_token() }}'
        },
        body: JSON.stringify(data)
    });
</script>

# Exempt API routes from CSRF
@csrf.exempt
@app.route("/api/webhook", methods=["POST"])
def webhook():
    ...

# Or exempt entire blueprint
csrf.exempt(api_bp)
```

## Security Headers

```python
from flask_talisman import Talisman

# Basic security headers
Talisman(app, force_https=True)

# Custom configuration
Talisman(
    app,
    force_https=True,
    strict_transport_security=True,
    strict_transport_security_max_age=31536000,
    content_security_policy={
        "default-src": "'self'",
        "script-src": ["'self'", "cdn.example.com"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", "data:", "*.example.com"],
    },
)

# Manual headers
@app.after_request
def add_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response
```

## Session Security

```python
# Configuration
app.config.update(
    SECRET_KEY=os.environ["SECRET_KEY"],
    SESSION_COOKIE_SECURE=True,        # HTTPS only
    SESSION_COOKIE_HTTPONLY=True,      # No JavaScript access
    SESSION_COOKIE_SAMESITE="Lax",     # CSRF protection
    PERMANENT_SESSION_LIFETIME=timedelta(hours=24),
)

# Server-side sessions with Redis
from flask_session import Session

app.config["SESSION_TYPE"] = "redis"
app.config["SESSION_REDIS"] = redis.from_url(os.environ["REDIS_URL"])
Session(app)
```

## Input Validation

```python
from markupsafe import escape
from marshmallow import Schema, fields, validate

# Always validate input
class UserInputSchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    email = fields.Email(required=True)
    bio = fields.Str(validate=validate.Length(max=500))

@users_bp.route("/", methods=["POST"])
def create_user():
    schema = UserInputSchema()
    data = schema.load(request.get_json())  # Validates and sanitizes
    user = UserService.create(data)
    return jsonify(UserSchema().dump(user)), 201

# Escape output for HTML
@app.route("/search")
def search():
    query = request.args.get("q", "")
    safe_query = escape(query)  # Prevents XSS
    return render_template("search.html", query=safe_query)
```

## SQL Injection Prevention

```python
# GOOD - Use ORM or parameterized queries
user = User.query.filter_by(email=email).first()

# GOOD - Raw SQL with parameters
result = db.session.execute(
    text("SELECT * FROM users WHERE email = :email"),
    {"email": email}
)

# BAD - String interpolation (SQL injection vulnerable!)
result = db.session.execute(f"SELECT * FROM users WHERE email = '{email}'")
```

## API Key Authentication

```python
from functools import wraps

def require_api_key(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        api_key = request.headers.get("X-API-Key")

        if not api_key:
            return jsonify({"error": "API key required"}), 401

        # Constant-time comparison to prevent timing attacks
        import hmac
        valid_key = current_app.config["API_KEY"]
        if not hmac.compare_digest(api_key, valid_key):
            return jsonify({"error": "Invalid API key"}), 401

        return f(*args, **kwargs)
    return decorated

@api_bp.route("/data")
@require_api_key
def get_data():
    return jsonify({"data": "sensitive"})
```

## Rate Limiting

```python
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="redis://localhost:6379",
)

@auth_bp.route("/login", methods=["POST"])
@limiter.limit("5 per minute")
def login():
    ...

# Per-user rate limiting
@limiter.limit("100 per hour", key_func=lambda: current_user.id)
def user_endpoint():
    ...
```

## Secure File Uploads

```python
from werkzeug.utils import secure_filename
import os

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "pdf"}
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB

app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH

def allowed_file(filename: str) -> bool:
    return "." in filename and \
           filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

@files_bp.route("/upload", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "File type not allowed"}), 400

    # Secure the filename
    filename = secure_filename(file.filename)

    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}_{filename}"

    # Save to secure location
    file.save(os.path.join(app.config["UPLOAD_FOLDER"], unique_filename))

    return jsonify({"filename": unique_filename}), 201
```

## Secrets Management

```python
import os

# GOOD - Environment variables
app.config["SECRET_KEY"] = os.environ["SECRET_KEY"]
app.config["DATABASE_URL"] = os.environ["DATABASE_URL"]

# GOOD - Secrets file (not in repo)
# config/secrets.py (in .gitignore)

# BAD - Hardcoded secrets
app.config["SECRET_KEY"] = "hardcoded-secret"  # NEVER do this
```
