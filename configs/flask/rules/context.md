---
paths:
  - "**/*.py"
---

# Flask Context Management

## Application Context

```python
from flask import current_app, g

# GOOD - use application context
with app.app_context():
    db.create_all()
    current_app.logger.info("Database initialized")

# In CLI commands
@app.cli.command("init-db")
def init_db():
    # Already in app context
    db.create_all()
    click.echo("Database initialized")

# BAD - access outside context
db.create_all()  # RuntimeError: Working outside of application context
```

## Request Context

```python
from flask import request, session, g

# Automatically pushed during requests
@app.route("/")
def index():
    user_agent = request.headers.get("User-Agent")
    user_id = session.get("user_id")
    return f"UA: {user_agent}"

# Test request context
with app.test_request_context("/users?page=2"):
    assert request.path == "/users"
    assert request.args["page"] == "2"
    url = url_for("users.list_users")
```

## The `g` Object

```python
from flask import g

# GOOD - store per-request data in g
@app.before_request
def load_user():
    user_id = session.get("user_id")
    if user_id:
        g.user = User.query.get(user_id)
    else:
        g.user = None

@app.route("/profile")
def profile():
    if g.user is None:
        return redirect(url_for("auth.login"))
    return render_template("profile.html", user=g.user)

# GOOD - lazy loading with g
def get_db():
    if "db" not in g:
        g.db = connect_to_database()
    return g.db

@app.teardown_appcontext
def close_db(exception):
    db = g.pop("db", None)
    if db is not None:
        db.close()
```

## Request Hooks

```python
# Before first request (deprecated in Flask 2.3+)
# Use app.before_request or lifespan pattern instead

@app.before_request
def before_every_request():
    """Run before every request."""
    g.start_time = time.time()
    g.request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))

@app.after_request
def after_every_request(response):
    """Run after every request (even on error)."""
    duration = time.time() - g.start_time
    response.headers["X-Request-ID"] = g.request_id
    response.headers["X-Response-Time"] = f"{duration:.4f}s"
    return response

@app.teardown_request
def teardown_request(exception):
    """Run at the end of request, for cleanup."""
    if exception:
        app.logger.error(f"Request failed: {exception}")
```

## Blueprint-Specific Hooks

```python
users_bp = Blueprint("users", __name__)

@users_bp.before_request
def before_user_request():
    """Only runs for requests to this blueprint."""
    g.service = UserService(db.session)

@users_bp.after_request
def after_user_request(response):
    """Only runs for requests to this blueprint."""
    return response

# App-wide hooks still run for blueprint requests
```

## Context Locals with werkzeug

```python
from werkzeug.local import LocalStack, LocalProxy

# Custom context local
_request_ctx_stack = LocalStack()

def get_current_request_id():
    ctx = _request_ctx_stack.top
    if ctx is not None:
        return ctx.request_id
    return None

request_id = LocalProxy(get_current_request_id)
```

## Async Context (Flask 2.0+)

```python
from flask import Flask
import asyncio

app = Flask(__name__)

@app.route("/async")
async def async_route():
    # Can use async/await in routes
    result = await some_async_operation()
    return jsonify(result)

# Context is preserved in async functions
@app.route("/async-context")
async def async_with_context():
    # current_app, g, request all work
    app.logger.info("Async route called")
    g.async_data = await fetch_data()
    return jsonify(g.async_data)
```

## Testing Contexts

```python
import pytest

@pytest.fixture
def app():
    app = create_app("testing")
    return app

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def app_context(app):
    with app.app_context():
        yield

@pytest.fixture
def request_context(app):
    with app.test_request_context():
        yield

def test_with_app_context(app_context):
    # current_app is available
    assert current_app.config["TESTING"]

def test_with_request_context(request_context):
    # request, g are available
    g.user = User(name="Test")
    assert g.user.name == "Test"
```

## Pushing Contexts Manually

```python
# For background tasks, CLI commands, etc.
def background_task(app, user_id):
    with app.app_context():
        user = User.query.get(user_id)
        send_email(user)

# Thread-safe context pushing
from threading import Thread

def run_in_thread(app):
    def wrapper():
        with app.app_context():
            do_work()

    thread = Thread(target=wrapper)
    thread.start()
    return thread
```

## Context Processor

```python
@app.context_processor
def inject_globals():
    """Inject variables into all templates."""
    return {
        "current_year": datetime.now().year,
        "app_name": current_app.config["APP_NAME"],
        "user": g.get("user"),
    }

# In templates
# {{ current_year }}
# {{ app_name }}
# {% if user %}Hello {{ user.name }}{% endif %}
```
