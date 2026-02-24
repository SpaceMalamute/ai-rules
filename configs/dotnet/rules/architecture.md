---
description: "Clean Architecture layers and dependencies"
paths:
  - "**/src/**/*.cs"
---

# Architecture Rules

## Clean Architecture (Default)

Strict dependency rule -- inner layers never reference outer layers:

| Layer | Allowed dependencies | Forbidden |
|-------|---------------------|-----------|
| Domain | None | EF Core, MediatR, any NuGet |
| Application | Domain | Infrastructure, WebApi |
| Infrastructure | Application, Domain | WebApi |
| WebApi | Application, Infrastructure | -- |

## Vertical Slice Architecture (Alternative)

Use Vertical Slices for smaller projects or bounded contexts where Clean Architecture adds unnecessary ceremony:
- One folder per feature containing endpoint, handler, validator, and DTO
- Still enforce domain logic isolation (no DB access in domain entities)
- Choose one approach per bounded context -- do not mix within the same context

## CQRS

- Commands (write): modify state, return minimal data (ID, void, or Result)
- Queries (read): return data, never modify state
- Separate read models (DTOs projected via `Select`) from write models (domain entities)

## Domain Layer Constraints

- Entities use private setters and factory methods (`Create`, `Update`)
- Expose collections as `IReadOnlyList<T>` backed by private `List<T>`
- Domain events raised inside entity methods, dispatched after `SaveChanges`
- Value Objects use `record` or override equality via `GetAtomicValues()`

## Application Layer Constraints

- One handler per command/query (Single Responsibility)
- Colocate command + handler + validator in the same folder
- Use `ISender` (not `IMediator`) for dispatching -- narrower interface

## Infrastructure Layer Constraints

- All repository interfaces defined in Domain, implemented in Infrastructure
- `DbContext` only in Infrastructure
- External service wrappers implement interfaces from Application

## Anti-patterns

- DO NOT reference `Infrastructure` from `Application` -- invert with interfaces
- DO NOT expose `IQueryable` from repositories -- it leaks persistence concerns
- DO NOT put domain logic in handlers -- push it into entities/domain services
- DO NOT create a "Common" or "Shared" project that everything references -- it becomes a dumping ground
