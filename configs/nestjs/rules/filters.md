---
description: "NestJS exception filters"
paths:
  - "**/*.filter.ts"
  - "**/filters/**/*.ts"
---

# NestJS Exception Filters

## Built-in Exceptions

```typescript
import {
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  GoneException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
  UnprocessableEntityException,
  InternalServerErrorException,
  NotImplementedException,
  BadGatewayException,
  ServiceUnavailableException,
  GatewayTimeoutException,
} from '@nestjs/common';

// Usage with message
throw new NotFoundException('User not found');

// Usage with object
throw new BadRequestException({
  message: 'Validation failed',
  errors: [{ field: 'email', message: 'Invalid email format' }],
});
```

## Global Exception Filter

```typescript
// filters/all-exceptions.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: typeof message === 'string' ? message : (message as Record<string, unknown>).message,
      ...(typeof message === 'object' && message !== null
        ? { details: message }
        : {}),
    };

    // Log error
    this.logger.error(
      `${request.method} ${request.url} ${status}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json(errorResponse);
  }
}
```

## HTTP Exception Filter

```typescript
// filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(typeof exceptionResponse === 'object'
        ? exceptionResponse
        : { message: exceptionResponse }),
    });
  }
}
```

## Custom Exception Classes

```typescript
// exceptions/business.exception.ts
import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super({ code, message }, status);
  }
}

// exceptions/domain-exceptions.ts
export class UserNotFoundException extends BusinessException {
  constructor(userId: string) {
    super('USER_NOT_FOUND', `User with ID ${userId} not found`, HttpStatus.NOT_FOUND);
  }
}

export class InsufficientCreditsException extends BusinessException {
  constructor(required: number, available: number) {
    super(
      'INSUFFICIENT_CREDITS',
      `Required ${required} credits but only ${available} available`,
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}

export class DuplicateEmailException extends BusinessException {
  constructor(email: string) {
    super('DUPLICATE_EMAIL', `Email ${email} is already registered`, HttpStatus.CONFLICT);
  }
}
```

## Domain Exception Filter

```typescript
// filters/business-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { Response } from 'express';
import { BusinessException } from '../exceptions/business.exception';

@Catch(BusinessException)
export class BusinessExceptionFilter implements ExceptionFilter {
  catch(exception: BusinessException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    response.status(status).json({
      type: `https://api.example.com/errors/${exception.code}`,
      title: exception.code.replace(/_/g, ' ').toLowerCase(),
      status,
      detail: exception.message,
    });
  }
}
```

## Database Exception Filter

```typescript
// filters/prisma-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    switch (exception.code) {
      case 'P2002': // Unique constraint violation
        const field = (exception.meta?.target as string[])?.[0] || 'field';
        response.status(HttpStatus.CONFLICT).json({
          statusCode: HttpStatus.CONFLICT,
          message: `Duplicate value for ${field}`,
          error: 'Conflict',
        });
        break;

      case 'P2025': // Record not found
        response.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Record not found',
          error: 'Not Found',
        });
        break;

      case 'P2003': // Foreign key constraint
        response.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Related record not found',
          error: 'Bad Request',
        });
        break;

      default:
        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database error',
          error: 'Internal Server Error',
        });
    }
  }
}
```

## Validation Exception Filter

```typescript
// filters/validation-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, BadRequestException } from '@nestjs/common';
import { Response } from 'express';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const exceptionResponse = exception.getResponse() as Record<string, unknown>;

    // Handle class-validator errors
    if (exceptionResponse.message && Array.isArray(exceptionResponse.message)) {
      response.status(400).json({
        statusCode: 400,
        error: 'Validation Error',
        message: 'Request validation failed',
        details: exceptionResponse.message.map((msg: string) => {
          const [field, ...rest] = msg.split(' ');
          return { field, message: rest.join(' ') };
        }),
      });
      return;
    }

    response.status(400).json(exceptionResponse);
  }
}
```

## Filter Binding

```typescript
// Method level
@Post()
@UseFilters(HttpExceptionFilter)
create(@Body() dto: CreateDto) {}

// Controller level
@Controller('users')
@UseFilters(AllExceptionsFilter)
export class UsersController {}

// Global level (main.ts)
app.useGlobalFilters(new AllExceptionsFilter());

// Global with DI
@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
```

## Filter Order

```typescript
// Filters are applied in reverse order (last registered = first executed)
@UseFilters(
  AllExceptionsFilter,      // Fallback (executed last)
  HttpExceptionFilter,      // HTTP exceptions
  BusinessExceptionFilter,  // Business exceptions (executed first)
)
export class AppController {}
```

## WebSocket Exception Filter

```typescript
// filters/ws-exception.filter.ts
import { Catch, ArgumentsHost } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';

@Catch()
export class WsExceptionsFilter extends BaseWsExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const client = host.switchToWs().getClient();

    const error =
      exception instanceof WsException
        ? exception.getError()
        : { message: 'Internal error' };

    client.emit('error', {
      event: 'error',
      data: error,
    });
  }
}
```

## Anti-patterns

```typescript
// BAD: Swallowing errors without logging
@Catch()
export class SilentFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    response.status(500).json({ error: 'Error' }); // No logging!
  }
}

// GOOD: Always log errors
this.logger.error(exception);

// BAD: Exposing internal details
catch(exception: Error, host: ArgumentsHost) {
  response.json({
    stack: exception.stack,    // Security risk!
    query: request.query,      // Leaking data!
  });
}

// GOOD: Sanitize response
response.json({
  statusCode: 500,
  message: 'Internal server error',
});

// BAD: Not handling specific exceptions
@Catch()
export class GenericFilter {}  // Catches everything the same way

// GOOD: Layer filters by specificity
@UseFilters(AllExceptionsFilter, HttpExceptionFilter, BusinessExceptionFilter)
```
