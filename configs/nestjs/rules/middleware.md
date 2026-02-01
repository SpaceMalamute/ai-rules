---
paths:
  - "**/*.middleware.ts"
  - "**/middleware/**/*.ts"
---

# NestJS Middleware

## Functional Middleware

```typescript
// middleware/logger.middleware.ts
import { Request, Response, NextFunction } from 'express';

export function loggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
  });

  next();
}

// Apply in module
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(loggerMiddleware).forRoutes('*');
  }
}
```

## Class Middleware

```typescript
// middleware/auth.middleware.ts
import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }

    const token = authHeader.split(' ')[1];

    try {
      const payload = await this.jwtService.verifyAsync(token);
      req['user'] = payload;
      next();
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
```

## Correlation ID Middleware

```typescript
// middleware/correlation-id.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId = req.headers['x-correlation-id'] as string || randomUUID();

    req['correlationId'] = correlationId;
    res.setHeader('x-correlation-id', correlationId);

    next();
  }
}
```

## Request Validation Middleware

```typescript
// middleware/content-type.middleware.ts
import { Injectable, NestMiddleware, UnsupportedMediaTypeException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class JsonContentTypeMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const contentType = req.headers['content-type'];

      if (!contentType?.includes('application/json')) {
        throw new UnsupportedMediaTypeException('Content-Type must be application/json');
      }
    }

    next();
  }
}
```

## Rate Limiting Middleware

```typescript
// middleware/rate-limit.middleware.ts
import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly windowMs = 60 * 1000; // 1 minute
  private readonly maxRequests = 100;

  constructor(private readonly redis: Redis) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const key = `rate-limit:${req.ip}`;
    const current = await this.redis.incr(key);

    if (current === 1) {
      await this.redis.pexpire(key, this.windowMs);
    }

    const remaining = Math.max(0, this.maxRequests - current);
    const ttl = await this.redis.pttl(key);

    res.setHeader('X-RateLimit-Limit', this.maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(Date.now() / 1000 + ttl / 1000));

    if (current > this.maxRequests) {
      throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
    }

    next();
  }
}
```

## Request Sanitization Middleware

```typescript
// middleware/sanitize.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as sanitizeHtml from 'sanitize-html';

@Injectable()
export class SanitizeMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (req.body) {
      req.body = this.sanitizeObject(req.body);
    }

    next();
  }

  private sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeHtml(value, {
          allowedTags: [],
          allowedAttributes: {},
        });
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}
```

## Applying Middleware

```typescript
// app.module.ts
import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';

@Module({})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply to all routes
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');

    // Apply to specific path
    consumer.apply(AuthMiddleware).forRoutes('api/protected');

    // Apply to specific controller
    consumer.apply(LoggerMiddleware).forRoutes(UsersController);

    // Apply with method filter
    consumer
      .apply(JsonContentTypeMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.POST });

    // Exclude routes
    consumer
      .apply(AuthMiddleware)
      .exclude(
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'auth/register', method: RequestMethod.POST },
        { path: 'health', method: RequestMethod.GET },
      )
      .forRoutes('*');

    // Chain multiple middleware
    consumer
      .apply(CorrelationIdMiddleware, LoggerMiddleware, AuthMiddleware)
      .forRoutes('api');
  }
}
```

## Global Middleware (Express)

```typescript
// main.ts
import * as helmet from 'helmet';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(helmet());

  // Compression
  app.use(compression());

  // Cookie parsing
  app.use(cookieParser());

  // CORS
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true,
  });

  // Body parsing limits
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  await app.listen(3000);
}
```

## Middleware vs Guards vs Interceptors

| Feature | Middleware | Guards | Interceptors |
|---------|------------|--------|--------------|
| Execution Order | First | After middleware | After guards |
| Access to ExecutionContext | No | Yes | Yes |
| Can transform response | No | No | Yes |
| DI support | Class only | Yes | Yes |
| Use case | Request processing | Authorization | Transform/logging |

## Anti-patterns

```typescript
// BAD: Heavy operations in middleware
@Injectable()
export class HeavyMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    await this.db.query('SELECT * FROM logs'); // Blocks every request!
    next();
  }
}

// GOOD: Keep middleware lightweight

// BAD: Not calling next()
use(req: Request, res: Response, next: NextFunction) {
  if (someCondition) {
    return; // Request hangs!
  }
  next();
}

// GOOD: Always call next() or send response
use(req: Request, res: Response, next: NextFunction) {
  if (someCondition) {
    res.status(400).json({ error: 'Bad request' });
    return;
  }
  next();
}

// BAD: Modifying response after next()
async use(req: Request, res: Response, next: NextFunction) {
  next();
  res.setHeader('X-Custom', 'value'); // May not work!
}

// GOOD: Modify before next() or use interceptor
use(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Custom', 'value');
  next();
}

// BAD: Using middleware for auth when guards exist
// Middleware can't access ExecutionContext

// GOOD: Use guards for authorization
@UseGuards(AuthGuard)
```
