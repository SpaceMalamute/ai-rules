---
paths:
  - "**/src/**/*.interceptor.ts"
  - "**/src/**/interceptors/**/*.ts"
  - "**/src/**/*.controller.ts"
  - "**/src/**/*.module.ts"
---

# NestJS Interceptors

## Interceptor Basics

Interceptors can:
- Transform response data
- Transform exceptions
- Extend/override function behavior
- Implement caching, logging, timeout

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const now = Date.now();

    console.log(`[${method}] ${url} - Started`);

    return next.handle().pipe(
      tap(() => {
        console.log(`[${method}] ${url} - ${Date.now() - now}ms`);
      }),
    );
  }
}
```

## Response Transform Interceptor

```typescript
// Wrap all responses in standard format
export interface ApiResponse<T> {
  data: T;
  meta: {
    timestamp: string;
    requestId: string;
  };
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      map((data) => ({
        data,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: request.id,
        },
      })),
    );
  }
}
```

## Timeout Interceptor

```typescript
import { Injectable, RequestTimeoutException } from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(private readonly timeoutMs: number = 30000) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      timeout(this.timeoutMs),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          return throwError(() => new RequestTimeoutException('Request timeout'));
        }
        return throwError(() => err);
      }),
    );
  }
}
```

## Caching Interceptor

```typescript
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();

    // Only cache GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    const cacheKey = `http:${request.url}`;
    const cachedResponse = await this.cacheManager.get(cacheKey);

    if (cachedResponse) {
      return of(cachedResponse);
    }

    return next.handle().pipe(
      tap(async (response) => {
        await this.cacheManager.set(cacheKey, response, 60000); // 60s TTL
      }),
    );
  }
}
```

## Error Mapping Interceptor

```typescript
@Injectable()
export class ErrorMappingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        // Map domain errors to HTTP errors
        if (error instanceof EntityNotFoundError) {
          return throwError(() => new NotFoundException(error.message));
        }
        if (error instanceof ValidationError) {
          return throwError(() => new BadRequestException(error.errors));
        }
        if (error instanceof UnauthorizedError) {
          return throwError(() => new UnauthorizedException(error.message));
        }

        // Re-throw unknown errors
        return throwError(() => error);
      }),
    );
  }
}
```

## Serialization Interceptor

```typescript
import { ClassSerializerInterceptor, PlainLiteralObject } from '@nestjs/common';
import { ClassTransformOptions, plainToClass } from 'class-transformer';

@Injectable()
export class CustomSerializerInterceptor extends ClassSerializerInterceptor {
  transformToPlain(
    data: object,
    options: ClassTransformOptions,
  ): PlainLiteralObject | PlainLiteralObject[] {
    // Add custom serialization logic
    return super.transformToPlain(data, {
      ...options,
      excludeExtraneousValues: true, // Only @Expose() fields
    });
  }
}

// DTO with explicit exposure
export class UserResponseDto {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  name: string;

  @Exclude()
  password: string; // Never exposed

  @Expose()
  @Transform(({ value }) => value.toISOString())
  createdAt: Date;
}
```

## Audit Log Interceptor

```typescript
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, body } = request;

    // Only audit mutating operations
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle().pipe(
        tap({
          next: (response) => {
            this.auditService.log({
              userId: user?.id,
              action: method,
              resource: url,
              input: this.sanitize(body),
              output: this.sanitize(response),
              timestamp: new Date(),
            });
          },
          error: (error) => {
            this.auditService.log({
              userId: user?.id,
              action: method,
              resource: url,
              input: this.sanitize(body),
              error: error.message,
              timestamp: new Date(),
            });
          },
        }),
      );
    }

    return next.handle();
  }

  private sanitize(data: Record<string, unknown> | null): Record<string, unknown> | null {
    if (!data) return data;
    const { password, token, secret, ...safe } = data;
    return safe;
  }
}
```

## Applying Interceptors

```typescript
// Global (main.ts)
app.useGlobalInterceptors(new LoggingInterceptor());

// Global with DI (module)
@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}

// Controller level
@UseInterceptors(LoggingInterceptor)
@Controller('users')
export class UsersController {}

// Method level
@UseInterceptors(CacheInterceptor)
@Get(':id')
findOne(@Param('id') id: string) {}

// Multiple interceptors (order matters: first to last)
@UseInterceptors(LoggingInterceptor, TransformInterceptor)
@Controller('users')
export class UsersController {}
```

## Custom Decorator for Interceptors

```typescript
// Skip certain interceptors conditionally
export const SKIP_TRANSFORM = 'skipTransform';
export const SkipTransform = () => SetMetadata(SKIP_TRANSFORM, true);

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const skipTransform = this.reflector.get<boolean>(
      SKIP_TRANSFORM,
      context.getHandler(),
    );

    if (skipTransform) {
      return next.handle();
    }

    return next.handle().pipe(map((data) => ({ data })));
  }
}

// Usage
@SkipTransform()
@Get('raw')
getRawData() {
  return { raw: true };
}
```
