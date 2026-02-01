---
description: "AdonisJS 6+ project conventions and architecture"
alwaysApply: true
---

# AdonisJS Project Guidelines

## Stack

- AdonisJS 6+
- TypeScript strict mode
- Node.js 20+
- Japa (test framework)
- Lucid ORM

## Architecture

```
├── app/
│   ├── controllers/
│   ├── models/
│   ├── services/
│   ├── validators/
│   ├── middleware/
│   ├── exceptions/
│   └── mails/
├── config/
├── database/
│   ├── migrations/
│   ├── seeders/
│   └── factories/
├── resources/
│   └── views/
├── start/
│   ├── routes.ts
│   ├── kernel.ts
│   └── events.ts
├── tests/
└── adonisrc.ts
```

## Request Lifecycle

```
Request → Global Middleware → Route Middleware → Controller → Response
```

## Core Principles

### Layer Responsibilities

| Layer | Responsibility |
|-------|---------------|
| Controller | HTTP handling, delegates to services |
| Service | Business logic |
| Model | Data structure, relationships, hooks |
| Validator | Input validation with VineJS |

### Naming Conventions

- Controllers: `UsersController` (plural)
- Models: `User` (singular)
- Validators: `CreateUserValidator`
- Migrations: `TIMESTAMP_create_users_table`

### Dependency Injection

Use the IoC container:
```typescript
@inject()
export default class UsersController {
  constructor(private userService: UserService) {}
}
```

## Commands

```bash
node ace serve --watch     # Dev server
node ace build             # Production build
node ace test              # Run tests
node ace make:controller   # Generate controller
node ace make:model        # Generate model
node ace make:validator    # Generate validator
node ace make:service      # Generate service
node ace migration:run     # Run migrations
node ace migration:rollback
```

## Code Style

- Use `@inject()` decorator for DI
- Async methods return `Promise<T>`
- Use `HttpContext` for request/response
- Validators use VineJS schema
