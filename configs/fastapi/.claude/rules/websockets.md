---
paths:
  - "**/*.py"
---

# FastAPI WebSocket Patterns

## Basic WebSocket

```python
from fastapi import WebSocket, WebSocketDisconnect

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f"Echo: {data}")
    except WebSocketDisconnect:
        print("Client disconnected")
```

## Connection Manager

```python
from typing import List

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket)

    try:
        while True:
            data = await websocket.receive_text()
            await manager.broadcast(f"Client {client_id}: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        await manager.broadcast(f"Client {client_id} left")
```

## Room-Based Connections

```python
from collections import defaultdict

class RoomManager:
    def __init__(self):
        self.rooms: dict[str, list[WebSocket]] = defaultdict(list)

    async def join_room(self, room: str, websocket: WebSocket):
        await websocket.accept()
        self.rooms[room].append(websocket)

    def leave_room(self, room: str, websocket: WebSocket):
        if websocket in self.rooms[room]:
            self.rooms[room].remove(websocket)
        if not self.rooms[room]:
            del self.rooms[room]

    async def broadcast_to_room(self, room: str, message: str, exclude: WebSocket = None):
        for connection in self.rooms[room]:
            if connection != exclude:
                await connection.send_text(message)

room_manager = RoomManager()

@app.websocket("/ws/room/{room_id}")
async def room_websocket(websocket: WebSocket, room_id: str):
    await room_manager.join_room(room_id, websocket)

    try:
        while True:
            data = await websocket.receive_text()
            await room_manager.broadcast_to_room(room_id, data, exclude=websocket)
    except WebSocketDisconnect:
        room_manager.leave_room(room_id, websocket)
```

## Authentication

```python
from fastapi import Query, status

async def get_user_from_token(token: str) -> User | None:
    # Verify JWT token
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return await get_user(payload["sub"])
    except JWTError:
        return None

@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
):
    user = await get_user_from_token(token)

    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept()

    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f"Hello {user.name}: {data}")
    except WebSocketDisconnect:
        pass
```

## JSON Messages

```python
from pydantic import BaseModel

class WSMessage(BaseModel):
    type: str
    payload: dict

class WSResponse(BaseModel):
    type: str
    data: dict

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    try:
        while True:
            raw_data = await websocket.receive_json()
            message = WSMessage(**raw_data)

            if message.type == "ping":
                response = WSResponse(type="pong", data={})
            elif message.type == "subscribe":
                # Handle subscription
                response = WSResponse(type="subscribed", data=message.payload)
            else:
                response = WSResponse(type="error", data={"message": "Unknown type"})

            await websocket.send_json(response.model_dump())
    except WebSocketDisconnect:
        pass
```

## Pub/Sub with Redis

```python
import aioredis
import asyncio

class PubSubManager:
    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self.pubsub = None
        self.redis = None

    async def connect(self):
        self.redis = await aioredis.from_url(self.redis_url)
        self.pubsub = self.redis.pubsub()

    async def subscribe(self, channel: str):
        await self.pubsub.subscribe(channel)

    async def publish(self, channel: str, message: str):
        await self.redis.publish(channel, message)

    async def listen(self):
        async for message in self.pubsub.listen():
            if message["type"] == "message":
                yield message["data"].decode()

pubsub = PubSubManager("redis://localhost")

@app.websocket("/ws/subscribe/{channel}")
async def subscribe_websocket(websocket: WebSocket, channel: str):
    await websocket.accept()
    await pubsub.connect()
    await pubsub.subscribe(channel)

    try:
        # Task to receive from WebSocket
        async def receive():
            while True:
                data = await websocket.receive_text()
                await pubsub.publish(channel, data)

        # Task to send from Redis
        async def send():
            async for message in pubsub.listen():
                await websocket.send_text(message)

        await asyncio.gather(receive(), send())
    except WebSocketDisconnect:
        pass
```

## Heartbeat / Keep-Alive

```python
import asyncio

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    async def send_heartbeat():
        while True:
            try:
                await asyncio.sleep(30)
                await websocket.send_json({"type": "ping"})
            except:
                break

    heartbeat_task = asyncio.create_task(send_heartbeat())

    try:
        while True:
            data = await websocket.receive_json()

            if data.get("type") == "pong":
                continue  # Heartbeat response

            # Handle other messages
            await process_message(data)
    except WebSocketDisconnect:
        heartbeat_task.cancel()
```

## Rate Limiting WebSocket

```python
from collections import defaultdict
import time

class WebSocketRateLimiter:
    def __init__(self, max_messages: int = 10, window: int = 1):
        self.max_messages = max_messages
        self.window = window
        self.messages: dict[WebSocket, list[float]] = defaultdict(list)

    def is_allowed(self, websocket: WebSocket) -> bool:
        now = time.time()

        # Clean old messages
        self.messages[websocket] = [
            t for t in self.messages[websocket]
            if now - t < self.window
        ]

        if len(self.messages[websocket]) >= self.max_messages:
            return False

        self.messages[websocket].append(now)
        return True

rate_limiter = WebSocketRateLimiter(max_messages=10, window=1)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    try:
        while True:
            data = await websocket.receive_text()

            if not rate_limiter.is_allowed(websocket):
                await websocket.send_json({"error": "Rate limit exceeded"})
                continue

            await process_and_respond(websocket, data)
    except WebSocketDisconnect:
        pass
```
