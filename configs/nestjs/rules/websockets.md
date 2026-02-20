---
description: "NestJS WebSocket gateway patterns"
paths:
  - "**/*.gateway.ts"
  - "**/gateways/**/*.ts"
  - "**/websocket/**/*.ts"
---

# NestJS WebSockets

## Gateway Setup

```typescript
// gateways/events.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true,
  },
  namespace: '/events',
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  server: Server;

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('message')
  handleMessage(
    @MessageBody() data: { text: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`Message from ${client.id}: ${data.text}`);
    return { event: 'message', data: { received: true } };
  }
}
```

## Authentication

```typescript
// gateways/auth.gateway.ts
import { WebSocketGateway, OnGatewayConnection } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';

@WebSocketGateway()
export class AuthenticatedGateway implements OnGatewayConnection {
  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);

      if (!token) {
        throw new UnauthorizedException('No token provided');
      }

      const payload = await this.jwtService.verifyAsync(token);
      client.data.user = payload;

      // Join user-specific room
      client.join(`user:${payload.sub}`);
    } catch (error) {
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  private extractToken(client: Socket): string | null {
    // From auth header
    const authHeader = client.handshake.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.split(' ')[1];
    }

    // From query param
    return client.handshake.query.token as string | null;
  }
}
```

## Rooms and Broadcasting

```typescript
// gateways/chat.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ namespace: '/chat' })
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @MessageBody() roomId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`room:${roomId}`);

    // Notify room
    this.server.to(`room:${roomId}`).emit('userJoined', {
      userId: client.data.user.sub,
      roomId,
    });

    return { joined: roomId };
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(
    @MessageBody() roomId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`room:${roomId}`);

    this.server.to(`room:${roomId}`).emit('userLeft', {
      userId: client.data.user.sub,
      roomId,
    });

    return { left: roomId };
  }

  @SubscribeMessage('sendMessage')
  handleSendMessage(
    @MessageBody() data: { roomId: string; message: string },
    @ConnectedSocket() client: Socket,
  ) {
    const payload = {
      userId: client.data.user.sub,
      message: data.message,
      timestamp: new Date().toISOString(),
    };

    // Broadcast to room except sender
    client.to(`room:${data.roomId}`).emit('newMessage', payload);

    return { sent: true };
  }

  // Broadcast from service
  broadcastToRoom(roomId: string, event: string, data: unknown) {
    this.server.to(`room:${roomId}`).emit(event, data);
  }

  // Send to specific user
  sendToUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
  }
}
```

## Validation with DTOs

```typescript
// dto/message.dto.ts
import { IsString, IsNotEmpty, MaxLength, IsUUID } from 'class-validator';

export class SendMessageDto {
  @IsUUID()
  roomId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  message: string;
}

// gateways/validated.gateway.ts
import { UsePipes, ValidationPipe } from '@nestjs/common';

@WebSocketGateway()
@UsePipes(new ValidationPipe({ transform: true }))
export class ValidatedGateway {
  @SubscribeMessage('sendMessage')
  handleMessage(@MessageBody() data: SendMessageDto) {
    // data is validated
    return { success: true };
  }
}
```

## Guards for WebSockets

```typescript
// guards/ws-auth.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<Socket>();

    if (!client.data.user) {
      throw new WsException('Unauthorized');
    }

    return true;
  }
}

// guards/ws-role.guard.ts
@Injectable()
export class WsRoleGuard implements CanActivate {
  constructor(private readonly requiredRole: string) {}

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<Socket>();
    const user = client.data.user;

    if (user?.role !== this.requiredRole) {
      throw new WsException('Forbidden');
    }

    return true;
  }
}

// Usage
@WebSocketGateway()
@UseGuards(WsAuthGuard)
export class ProtectedGateway {
  @SubscribeMessage('adminAction')
  @UseGuards(new WsRoleGuard('admin'))
  handleAdminAction() {
    return { success: true };
  }
}
```

## Exception Handling

```typescript
// filters/ws-exception.filter.ts
import { Catch, ArgumentsHost } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Catch()
export class AllWsExceptionsFilter extends BaseWsExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<Socket>();

    const error =
      exception instanceof WsException
        ? exception.getError()
        : { message: 'Internal error', code: 'INTERNAL_ERROR' };

    client.emit('exception', {
      status: 'error',
      ...error,
    });
  }
}

// Apply globally in gateway
@WebSocketGateway()
@UseFilters(AllWsExceptionsFilter)
export class EventsGateway {}
```

## Interceptors

```typescript
// interceptors/ws-logging.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class WsLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(WsLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const client = context.switchToWs().getClient();
    const data = context.switchToWs().getData();
    const pattern = context.switchToWs().getPattern();

    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        this.logger.log(
          `WS ${pattern} - Client: ${client.id} - ${duration}ms`,
        );
      }),
    );
  }
}
```

## Redis Adapter (Scaling)

```typescript
// main.ts
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const pubClient = createClient({ url: process.env.REDIS_URL });
  const subClient = pubClient.duplicate();

  await Promise.all([pubClient.connect(), subClient.connect()]);

  const redisAdapter = createAdapter(pubClient, subClient);

  app.useWebSocketAdapter(new IoAdapter(app).createIOServer(3001, {
    adapter: redisAdapter,
  }));

  await app.listen(3000);
}
```

## Testing WebSockets

```typescript
// gateways/events.gateway.spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
import { EventsGateway } from './events.gateway';

describe('EventsGateway', () => {
  let app: INestApplication;
  let client: Socket;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [EventsGateway],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.listen(3001);
  });

  beforeEach((done) => {
    client = io('http://localhost:3001/events');
    client.on('connect', done);
  });

  afterEach(() => {
    client.disconnect();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should receive message response', (done) => {
    client.emit('message', { text: 'hello' }, (response: unknown) => {
      expect(response).toEqual({ event: 'message', data: { received: true } });
      done();
    });
  });
});
```

## Anti-patterns

```typescript
// BAD: Not handling disconnections
@WebSocketGateway()
export class LeakyGateway {
  private connections = new Map<string, Socket>();

  handleConnection(client: Socket) {
    this.connections.set(client.id, client);
    // Never cleaned up!
  }
}

// GOOD: Clean up on disconnect
handleDisconnect(client: Socket) {
  this.connections.delete(client.id);
}

// BAD: Blocking event handlers
@SubscribeMessage('data')
async handleData(@MessageBody() data: unknown) {
  await this.heavyOperation(data); // Blocks event loop
  return { done: true };
}

// GOOD: Offload to queue
@SubscribeMessage('data')
handleData(@MessageBody() data: unknown) {
  this.queue.add('process', data);
  return { queued: true };
}

// BAD: Not validating input
@SubscribeMessage('action')
handleAction(@MessageBody() data: any) {
  return this.service.doSomething(data.id); // Unsafe!
}

// GOOD: Use DTOs with validation
@UsePipes(ValidationPipe)
@SubscribeMessage('action')
handleAction(@MessageBody() data: ActionDto) {
  return this.service.doSomething(data.id);
}
```
