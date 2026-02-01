---
description: "NestJS 11+ project conventions and architecture"
alwaysApply: true
---

# NestJS Project Guidelines

## Stack

- NestJS 11+
- TypeScript strict mode
- Node.js 20+
- Vitest + Supertest
- Prisma or TypeORM

## Architecture - Modular Monolith

```
src/
├── modules/
│   ├── [feature]/
│   │   ├── [feature].module.ts
│   │   ├── [feature].controller.ts
│   │   ├── [feature].service.ts
│   │   ├── [feature].repository.ts
│   │   ├── dto/
│   │   └── entities/
│   └── auth/
│       ├── strategies/
│       └── guards/
├── common/
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   └── pipes/
├── config/
├── app.module.ts
└── main.ts
```

## Request Lifecycle

```
Request → Middleware → Guard → Interceptor (pre) → Pipe → Controller → Interceptor (post) → Response
```

## Core Principles

### Module Design

- **Single Responsibility**: One module = one domain
- **Clear Boundaries**: Communicate via exported services only
- **Barrel Exports**: Use `index.ts` for clean imports

### Layer Responsibilities

| Layer | Responsibility |
|-------|---------------|
| Controller | HTTP only, delegates to service |
| Service | All business logic |
| Repository | Data access only |
| DTO | Validation with class-validator |

### Exception Handling

Use built-in NestJS exceptions:
- `NotFoundException` - 404
- `BadRequestException` - 400
- `UnauthorizedException` - 401
- `ForbiddenException` - 403
- `ConflictException` - 409

### Validation (Global)

Enable global `ValidationPipe` in main.ts with:
- `whitelist: true` - Strip non-whitelisted properties
- `forbidNonWhitelisted: true` - Throw on extra properties
- `transform: true` - Auto-transform to DTO types

### DTOs

- Always use class-validator decorators
- `PartialType`, `PickType`, `OmitType` for variants
- Combine with Swagger decorators

## Authentication

- Passport.js + JWT strategy
- Global `JwtAuthGuard` with `@Public()` decorator for exceptions
- `@CurrentUser()` decorator for accessing user

## Commands

```bash
npm run start:dev       # Dev with watch
npm run build           # Production build
npm run test            # Unit tests
npm run test:e2e        # E2E tests
npm run test:cov        # Coverage
```

## Code Style

- Constructor injection (not property injection)
- `readonly` for injected dependencies
- Async methods return `Promise<T>`
- Use `ParseUUIDPipe`, `ParseIntPipe` for params
