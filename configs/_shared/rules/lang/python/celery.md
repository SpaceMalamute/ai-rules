---
description: "Celery task queue patterns"
paths:
  - "**/tasks/**/*.py"
  - "**/celery.py"
  - "**/celeryconfig.py"
  - "**/*_task.py"
  - "**/*_tasks.py"
---

# Python Celery

## Configuration

```python
# celery.py
from celery import Celery
from kombu import Queue, Exchange

app = Celery("myapp")

app.config_from_object({
    # Broker
    "broker_url": "redis://localhost:6379/0",
    "result_backend": "redis://localhost:6379/1",

    # Serialization
    "task_serializer": "json",
    "result_serializer": "json",
    "accept_content": ["json"],

    # Task settings
    "task_acks_late": True,
    "task_reject_on_worker_lost": True,
    "task_time_limit": 300,  # 5 minutes hard limit
    "task_soft_time_limit": 240,  # 4 minutes soft limit

    # Result settings
    "result_expires": 3600,  # 1 hour
    "result_extended": True,

    # Worker settings
    "worker_prefetch_multiplier": 1,
    "worker_concurrency": 4,

    # Task routing
    "task_queues": [
        Queue("default", Exchange("default"), routing_key="default"),
        Queue("high_priority", Exchange("high_priority"), routing_key="high_priority"),
        Queue("low_priority", Exchange("low_priority"), routing_key="low_priority"),
    ],
    "task_default_queue": "default",
    "task_routes": {
        "app.tasks.email.*": {"queue": "high_priority"},
        "app.tasks.reports.*": {"queue": "low_priority"},
    },

    # Beat scheduler
    "beat_scheduler": "celery.beat:PersistentScheduler",
    "beat_schedule_filename": "celerybeat-schedule",
})

# Auto-discover tasks
app.autodiscover_tasks(["app.tasks"])
```

## Basic Tasks

```python
# tasks/email.py
from celery import shared_task
from celery.exceptions import MaxRetriesExceededError
import logging

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
)
def send_email(self, to: str, subject: str, body: str) -> dict:
    """Send email with automatic retry."""
    try:
        logger.info(f"Sending email to {to}")
        # Email sending logic
        return {"status": "sent", "to": to}

    except Exception as exc:
        logger.error(f"Failed to send email: {exc}")
        raise self.retry(exc=exc)


@shared_task(bind=True)
def send_bulk_emails(self, recipients: list[str], subject: str, body: str) -> dict:
    """Send emails in bulk with progress tracking."""
    total = len(recipients)
    successful = 0
    failed = []

    for i, recipient in enumerate(recipients):
        try:
            send_email.delay(recipient, subject, body)
            successful += 1
        except Exception as e:
            failed.append({"email": recipient, "error": str(e)})

        # Update progress
        self.update_state(
            state="PROGRESS",
            meta={"current": i + 1, "total": total, "successful": successful},
        )

    return {"total": total, "successful": successful, "failed": failed}
```

## Task with Database

```python
# tasks/orders.py
from celery import shared_task
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models import Order, OrderStatus
from contextlib import contextmanager


@contextmanager
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@shared_task(bind=True)
def process_order(self, order_id: str) -> dict:
    """Process an order."""
    with get_db() as db:
        order = db.query(Order).filter(Order.id == order_id).first()

        if not order:
            return {"status": "error", "message": "Order not found"}

        try:
            order.status = OrderStatus.PROCESSING
            db.commit()

            # Process order logic
            process_payment(order)
            reserve_inventory(order)
            schedule_shipping(order)

            order.status = OrderStatus.COMPLETED
            db.commit()

            return {"status": "completed", "order_id": order_id}

        except Exception as e:
            order.status = OrderStatus.FAILED
            order.error_message = str(e)
            db.commit()
            raise
```

## Chaining and Groups

```python
# tasks/workflows.py
from celery import shared_task, chain, group, chord


@shared_task
def fetch_data(url: str) -> dict:
    # Fetch data from URL
    return {"data": "..."}


@shared_task
def process_data(data: dict) -> dict:
    # Process the data
    return {"processed": True}


@shared_task
def save_data(data: dict) -> dict:
    # Save to database
    return {"saved": True}


@shared_task
def aggregate_results(results: list) -> dict:
    # Aggregate all results
    return {"aggregated": results}


# Chain: Sequential execution
def run_pipeline(url: str):
    workflow = chain(
        fetch_data.s(url),
        process_data.s(),
        save_data.s(),
    )
    return workflow.apply_async()


# Group: Parallel execution
def process_multiple_urls(urls: list[str]):
    job = group(fetch_data.s(url) for url in urls)
    return job.apply_async()


# Chord: Parallel with callback
def process_and_aggregate(urls: list[str]):
    workflow = chord(
        group(fetch_data.s(url) for url in urls),
        aggregate_results.s(),
    )
    return workflow.apply_async()
```

## Scheduled Tasks (Beat)

```python
# celery.py
from celery.schedules import crontab

app.conf.beat_schedule = {
    # Run every minute
    "check-pending-orders": {
        "task": "app.tasks.orders.check_pending_orders",
        "schedule": 60.0,
    },

    # Run every hour
    "cleanup-expired-sessions": {
        "task": "app.tasks.cleanup.cleanup_sessions",
        "schedule": crontab(minute=0),
    },

    # Run daily at midnight
    "generate-daily-report": {
        "task": "app.tasks.reports.generate_daily_report",
        "schedule": crontab(hour=0, minute=0),
    },

    # Run every Monday at 9am
    "send-weekly-digest": {
        "task": "app.tasks.email.send_weekly_digest",
        "schedule": crontab(hour=9, minute=0, day_of_week=1),
    },

    # Run on first day of month
    "generate-monthly-invoice": {
        "task": "app.tasks.billing.generate_monthly_invoices",
        "schedule": crontab(hour=0, minute=0, day_of_month=1),
    },
}
```

## Task Monitoring

```python
# tasks/base.py
from celery import Task
from celery.signals import (
    task_prerun,
    task_postrun,
    task_failure,
    task_success,
)
import time
import logging

logger = logging.getLogger(__name__)


class BaseTask(Task):
    """Base task with monitoring."""

    abstract = True

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        logger.error(
            f"Task {self.name}[{task_id}] failed: {exc}",
            extra={"task_id": task_id, "args": args, "kwargs": kwargs},
        )

    def on_success(self, retval, task_id, args, kwargs):
        logger.info(
            f"Task {self.name}[{task_id}] succeeded",
            extra={"task_id": task_id, "result": retval},
        )

    def on_retry(self, exc, task_id, args, kwargs, einfo):
        logger.warning(
            f"Task {self.name}[{task_id}] retrying: {exc}",
            extra={"task_id": task_id},
        )


@task_prerun.connect
def task_prerun_handler(task_id, task, args, kwargs, **extras):
    task.start_time = time.time()


@task_postrun.connect
def task_postrun_handler(task_id, task, args, kwargs, retval, state, **extras):
    duration = time.time() - getattr(task, "start_time", time.time())
    logger.info(f"Task {task.name} completed in {duration:.2f}s")


# Usage
@shared_task(base=BaseTask)
def my_task():
    pass
```

## Task Cancellation

```python
# tasks/long_running.py
from celery import shared_task
from celery.exceptions import SoftTimeLimitExceeded


@shared_task(bind=True, soft_time_limit=300)
def long_running_task(self, data: dict) -> dict:
    """Task that respects cancellation."""
    results = []

    for i, item in enumerate(data["items"]):
        # Check if task was revoked
        if self.is_aborted():
            return {"status": "aborted", "processed": i}

        try:
            result = process_item(item)
            results.append(result)

        except SoftTimeLimitExceeded:
            # Graceful shutdown
            return {"status": "timeout", "processed": i, "results": results}

    return {"status": "completed", "results": results}


# Revoking tasks
from celery.result import AsyncResult

def cancel_task(task_id: str):
    result = AsyncResult(task_id)
    result.revoke(terminate=True)
```

## FastAPI Integration

```python
# api/tasks.py
from fastapi import APIRouter, HTTPException
from celery.result import AsyncResult
from app.celery import app as celery_app
from app.tasks.orders import process_order

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.post("/orders/{order_id}/process")
async def start_order_processing(order_id: str) -> dict:
    task = process_order.delay(order_id)
    return {"task_id": task.id, "status": "started"}


@router.get("/{task_id}")
async def get_task_status(task_id: str) -> dict:
    result = AsyncResult(task_id, app=celery_app)

    if result.ready():
        if result.successful():
            return {"status": "completed", "result": result.get()}
        else:
            return {"status": "failed", "error": str(result.result)}

    return {
        "status": result.state,
        "progress": result.info if result.info else None,
    }


@router.delete("/{task_id}")
async def cancel_task(task_id: str) -> dict:
    result = AsyncResult(task_id, app=celery_app)
    result.revoke(terminate=True)
    return {"status": "cancelled", "task_id": task_id}
```

## Commands

```bash
# Start worker
celery -A app.celery worker --loglevel=info

# Start worker with queues
celery -A app.celery worker -Q high_priority,default --loglevel=info

# Start beat scheduler
celery -A app.celery beat --loglevel=info

# Start flower (monitoring)
celery -A app.celery flower --port=5555

# Inspect active tasks
celery -A app.celery inspect active

# Purge queue
celery -A app.celery purge
```

## Anti-patterns

```python
# BAD: Database connection in task without cleanup
@shared_task
def bad_task():
    db = SessionLocal()  # Never closed!
    db.query(...)


# GOOD: Use context manager
@shared_task
def good_task():
    with get_db() as db:
        db.query(...)


# BAD: Passing ORM objects
@shared_task
def bad_task(user: User):  # Can't serialize!
    pass


# GOOD: Pass IDs, fetch in task
@shared_task
def good_task(user_id: str):
    with get_db() as db:
        user = db.query(User).get(user_id)


# BAD: No retry limit
@shared_task(autoretry_for=(Exception,))  # Infinite retries!
def bad_task():
    pass


# GOOD: Set retry limits
@shared_task(autoretry_for=(Exception,), max_retries=3)
def good_task():
    pass


# BAD: Blocking synchronous calls
@shared_task
def bad_task():
    time.sleep(300)  # Blocks worker


# GOOD: Use appropriate timeouts
@shared_task(soft_time_limit=60, time_limit=120)
def good_task():
    pass
```
