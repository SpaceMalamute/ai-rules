---
description: "NestJS common patterns and utilities"
paths:
  - "**/src/common/**/*.ts"
  - "**/src/**/*.decorator.ts"
  - "**/src/**/*.filter.ts"
  - "**/src/**/*.interceptor.ts"
  - "**/src/**/*.pipe.ts"
  - "**/src/main.ts"
---

# NestJS Common Patterns

## Global Setup (main.ts)

- DO enable `ValidationPipe` globally with `whitelist`, `forbidNonWhitelisted`, `transform`
- DO set `app.setGlobalPrefix('api/v1')`
- DO configure CORS from env: `app.enableCors({ origin: env.CORS_ORIGIN.split(',') })`
- DO enable Swagger only in non-production (`DocumentBuilder` + `SwaggerModule.setup`)
- DO apply global filters, interceptors, and pipes before `app.listen()`

## Environment Validation

- DO validate env vars at boot with a Zod schema passed to `ConfigModule.forRoot({ validate })`
- DO NOT access `process.env` in services — inject `ConfigService<Env, true>` and use `get()` with `{ infer: true }`

## Pagination — Canonical Pattern

- DO create a shared `PaginationQueryDto` (page, pageSize with defaults) and `PaginatedResponseDto<T>` (data + meta)
- DO NOT invent different pagination shapes per feature — reuse the canonical DTO everywhere
- Meta must include: `page`, `pageSize`, `total`, `totalPages`

## CQRS Pattern

- For complex domains, consider the CQRS pattern via `@nestjs/cqrs` (commands, queries, events)
- For the mediator/CQRS pattern, use `@nestjs/cqrs`
- NestJS 11: `@nestjs/cqrs` now supports request-scoped providers, strongly-typed handlers, and handler conflict detection
- DO separate write (command) and read (query) paths when the domain justifies it
- DO NOT apply CQRS to simple CRUD modules — it adds unnecessary indirection

## Custom Decorators

- `@CurrentUser(field?)` — `createParamDecorator` extracting from `request.user`
- `@Public()` — `SetMetadata('isPublic', true)` for opting out of global auth
- `@Roles(...roles)` — `SetMetadata('roles', roles)` for RBAC
- DO compose multiple decorators with `applyDecorators()` when stacking 3+ decorators

## Guards

- Use `Reflector.getAllAndOverride()` to read metadata in guards
- Register global guards via `APP_GUARD` provider — not `app.useGlobalGuards()` — to enable DI

## Anti-patterns

- DO NOT put business logic in controllers — delegate to services
- DO NOT register global providers via `main.ts` when they need DI — use `APP_*` tokens in a module
- DO NOT use `enableImplicitConversion` in ValidationPipe without understanding it converts all query strings automatically
