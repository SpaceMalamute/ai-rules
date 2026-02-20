---
description: "FastAPI background task patterns"
paths:
  - "**/*.py"
---

# FastAPI Background Tasks

## Simple Background Tasks

```python
from fastapi import BackgroundTasks

def write_log(message: str):
    with open("log.txt", "a") as f:
        f.write(f"{datetime.now()}: {message}\n")

@router.post("/items")
async def create_item(
    item: ItemCreate,
    background_tasks: BackgroundTasks,
) -> ItemResponse:
    # Process item
    created_item = await item_service.create(item)

    # Queue background task
    background_tasks.add_task(write_log, f"Item created: {created_item.id}")

    # Return immediately
    return created_item
```

## Async Background Tasks

```python
async def send_notification(user_id: int, message: str):
    async with httpx.AsyncClient() as client:
        await client.post(
            "https://notification-service/send",
            json={"user_id": user_id, "message": message},
        )

@router.post("/orders")
async def create_order(
    order: OrderCreate,
    background_tasks: BackgroundTasks,
    db: DbSession,
) -> OrderResponse:
    created_order = await order_service.create(db, order)

    # Async task
    background_tasks.add_task(
        send_notification,
        order.user_id,
        f"Order {created_order.id} confirmed",
    )

    return created_order
```

## Multiple Background Tasks

```python
@router.post("/signup")
async def signup(
    user: UserCreate,
    background_tasks: BackgroundTasks,
) -> UserResponse:
    created_user = await user_service.create(user)

    # Queue multiple tasks
    background_tasks.add_task(send_welcome_email, created_user.email)
    background_tasks.add_task(notify_admin, created_user.id)
    background_tasks.add_task(update_analytics, "new_signup")

    return created_user
```

## Background Tasks in Dependencies

```python
async def log_request(
    request: Request,
    background_tasks: BackgroundTasks,
):
    background_tasks.add_task(
        log_to_database,
        path=request.url.path,
        method=request.method,
        timestamp=datetime.now(),
    )

@router.get("/data", dependencies=[Depends(log_request)])
async def get_data() -> dict:
    return {"data": "value"}
```

## Long-Running Tasks with Celery

```python
# tasks.py
from celery import Celery

celery_app = Celery(
    "tasks",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0",
)

@celery_app.task
def process_large_file(file_path: str) -> dict:
    # Long-running process
    result = heavy_computation(file_path)
    return {"status": "completed", "result": result}

# router.py
from tasks import process_large_file

@router.post("/process")
async def process_file(file: UploadFile) -> dict:
    # Save file
    file_path = f"/tmp/{file.filename}"
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(await file.read())

    # Queue Celery task
    task = process_large_file.delay(file_path)

    return {"task_id": task.id, "status": "processing"}

@router.get("/process/{task_id}")
async def get_task_status(task_id: str) -> dict:
    task = process_large_file.AsyncResult(task_id)

    if task.ready():
        return {"status": "completed", "result": task.result}

    return {"status": task.status}
```

## ARQ (Async Redis Queue)

```python
# tasks.py
from arq import create_pool
from arq.connections import RedisSettings

async def send_email_task(ctx, email: str, subject: str, body: str):
    await email_service.send(email, subject, body)

class WorkerSettings:
    functions = [send_email_task]
    redis_settings = RedisSettings()

# router.py
from arq import create_pool

@router.post("/send-email")
async def send_email(email: EmailSchema) -> dict:
    redis = await create_pool(RedisSettings())

    job = await redis.enqueue_job(
        "send_email_task",
        email.to,
        email.subject,
        email.body,
    )

    return {"job_id": job.job_id, "status": "queued"}
```

## Periodic Tasks

```python
# Using APScheduler
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()

async def cleanup_expired_sessions():
    async with async_session() as db:
        await db.execute(
            delete(Session).where(Session.expires_at < datetime.utcnow())
        )
        await db.commit()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start scheduler
    scheduler.add_job(
        cleanup_expired_sessions,
        "interval",
        hours=1,
    )
    scheduler.start()
    yield
    # Shutdown
    scheduler.shutdown()

app = FastAPI(lifespan=lifespan)
```

## Task Status Tracking

```python
from enum import Enum
import uuid

class TaskStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

# In-memory store (use Redis in production)
tasks_store: dict[str, dict] = {}

async def process_with_tracking(task_id: str, data: dict):
    tasks_store[task_id]["status"] = TaskStatus.RUNNING

    try:
        result = await heavy_process(data)
        tasks_store[task_id].update({
            "status": TaskStatus.COMPLETED,
            "result": result,
        })
    except Exception as e:
        tasks_store[task_id].update({
            "status": TaskStatus.FAILED,
            "error": str(e),
        })

@router.post("/process")
async def start_processing(
    data: ProcessData,
    background_tasks: BackgroundTasks,
) -> dict:
    task_id = str(uuid.uuid4())

    tasks_store[task_id] = {
        "status": TaskStatus.PENDING,
        "created_at": datetime.utcnow(),
    }

    background_tasks.add_task(process_with_tracking, task_id, data.dict())

    return {"task_id": task_id}

@router.get("/process/{task_id}")
async def get_status(task_id: str) -> dict:
    if task_id not in tasks_store:
        raise HTTPException(404, "Task not found")

    return tasks_store[task_id]
```
