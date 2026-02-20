---
description: "Flask CLI command patterns"
paths:
  - "**/*.py"
---

# Flask CLI Commands

## Basic Commands

```python
import click
from flask import Flask
from flask.cli import with_appcontext

app = Flask(__name__)

@app.cli.command("init-db")
@with_appcontext
def init_db_command():
    """Initialize the database."""
    db.create_all()
    click.echo("Database initialized.")

@app.cli.command("seed")
@with_appcontext
def seed_command():
    """Seed the database with sample data."""
    from app.seeds import seed_all
    seed_all()
    click.echo("Database seeded.")

# Usage:
# flask init-db
# flask seed
```

## Commands with Arguments

```python
@app.cli.command("create-user")
@click.argument("email")
@click.argument("name")
@click.option("--admin", is_flag=True, help="Make user an admin")
@with_appcontext
def create_user_command(email: str, name: str, admin: bool):
    """Create a new user."""
    user = User(email=email, name=name, is_admin=admin)
    db.session.add(user)
    db.session.commit()
    click.echo(f"Created user: {user.email} (admin={admin})")

# Usage:
# flask create-user john@example.com "John Doe"
# flask create-user admin@example.com "Admin" --admin
```

## Commands with Options

```python
@app.cli.command("export-users")
@click.option("--format", type=click.Choice(["json", "csv"]), default="json")
@click.option("--output", "-o", type=click.Path(), default="users.json")
@click.option("--active-only", is_flag=True, help="Export only active users")
@with_appcontext
def export_users_command(format: str, output: str, active_only: bool):
    """Export users to a file."""
    query = User.query
    if active_only:
        query = query.filter(User.is_active == True)

    users = query.all()

    if format == "json":
        data = UserSchema(many=True).dump(users)
        with open(output, "w") as f:
            json.dump(data, f, indent=2)
    elif format == "csv":
        # CSV export logic
        pass

    click.echo(f"Exported {len(users)} users to {output}")

# Usage:
# flask export-users --format csv -o users.csv --active-only
```

## Command Groups

```python
@app.cli.group()
def user():
    """User management commands."""
    pass

@user.command("create")
@click.argument("email")
@click.argument("name")
@with_appcontext
def user_create(email: str, name: str):
    """Create a new user."""
    user = User(email=email, name=name)
    db.session.add(user)
    db.session.commit()
    click.echo(f"Created: {user.email}")

@user.command("delete")
@click.argument("email")
@click.confirmation_option(prompt="Are you sure?")
@with_appcontext
def user_delete(email: str):
    """Delete a user."""
    user = User.query.filter_by(email=email).first()
    if not user:
        click.echo(f"User not found: {email}", err=True)
        return

    db.session.delete(user)
    db.session.commit()
    click.echo(f"Deleted: {email}")

@user.command("list")
@click.option("--limit", default=10)
@with_appcontext
def user_list(limit: int):
    """List users."""
    users = User.query.limit(limit).all()
    for user in users:
        click.echo(f"{user.id}: {user.email} ({user.name})")

# Usage:
# flask user create john@example.com "John"
# flask user delete john@example.com
# flask user list --limit 20
```

## Blueprint Commands

```python
# In blueprint
from flask import Blueprint

users_bp = Blueprint("users", __name__, cli_group="users")

@users_bp.cli.command("sync")
@with_appcontext
def sync_users():
    """Sync users from external source."""
    # Sync logic
    click.echo("Users synced")

# Usage:
# flask users sync
```

## Progress Bars

```python
@app.cli.command("migrate-data")
@with_appcontext
def migrate_data_command():
    """Migrate data with progress bar."""
    records = OldModel.query.all()

    with click.progressbar(records, label="Migrating") as bar:
        for record in bar:
            new_record = migrate_record(record)
            db.session.add(new_record)

    db.session.commit()
    click.echo("Migration complete!")
```

## Colored Output

```python
@app.cli.command("check")
@with_appcontext
def check_command():
    """Check application health."""
    # Database
    try:
        db.session.execute("SELECT 1")
        click.secho("✓ Database: OK", fg="green")
    except Exception as e:
        click.secho(f"✗ Database: {e}", fg="red")

    # Redis
    try:
        redis_client.ping()
        click.secho("✓ Redis: OK", fg="green")
    except Exception as e:
        click.secho(f"✗ Redis: {e}", fg="red")

    # External API
    try:
        response = requests.get(f"{API_URL}/health", timeout=5)
        response.raise_for_status()
        click.secho("✓ External API: OK", fg="green")
    except Exception as e:
        click.secho(f"✗ External API: {e}", fg="yellow")
```

## Interactive Prompts

```python
@app.cli.command("setup")
def setup_command():
    """Interactive setup wizard."""
    click.echo("Welcome to the setup wizard!")

    # Text input
    app_name = click.prompt("Application name", default="My App")

    # Password input
    secret = click.prompt("Secret key", hide_input=True)

    # Choice
    env = click.prompt(
        "Environment",
        type=click.Choice(["development", "staging", "production"]),
        default="development",
    )

    # Confirmation
    if click.confirm("Save configuration?"):
        save_config(app_name=app_name, secret=secret, env=env)
        click.echo("Configuration saved!")
    else:
        click.echo("Aborted.")
```

## Async Commands (Flask 2.0+)

```python
import asyncio

@app.cli.command("async-task")
@with_appcontext
def async_task_command():
    """Run async task."""
    asyncio.run(run_async_task())

async def run_async_task():
    async with aiohttp.ClientSession() as session:
        async with session.get("https://api.example.com/data") as response:
            data = await response.json()
            click.echo(f"Fetched {len(data)} records")
```

## Custom CLI Script

```python
# manage.py
import click
from app import create_app, db

app = create_app()

@click.group()
def cli():
    """Management script."""
    pass

@cli.command()
def runserver():
    """Run development server."""
    app.run(debug=True)

@cli.command()
@click.option("--drop", is_flag=True, help="Drop tables first")
def initdb(drop: bool):
    """Initialize database."""
    with app.app_context():
        if drop:
            db.drop_all()
        db.create_all()
        click.echo("Database initialized.")

if __name__ == "__main__":
    cli()

# Usage:
# python manage.py runserver
# python manage.py initdb --drop
```
