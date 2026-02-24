---
description: ".NET 9 project conventions and architecture"
alwaysApply: true
---

# .NET Project Guidelines

## Stack

- .NET 9, ASP.NET Core, Entity Framework Core, C# 13+
- xUnit + NSubstitute + FluentAssertions

## Architecture

Use Clean Architecture with strict layer dependencies:
- `WebApi -> Application -> Domain`
- `Infrastructure -> Application -> Domain`

| Layer | Contains | References |
|-------|----------|------------|
| Domain | Entities, Value Objects, Interfaces | Nothing (zero NuGet deps) |
| Application | Commands, Queries, DTOs, Validators | Domain only |
| Infrastructure | DbContext, Repos, External Services | Application, Domain |
| WebApi | Endpoints, Middleware | Application, Infrastructure |

## API Style

- Use Minimal APIs by default for new endpoints (lower overhead than controllers)
- Use `TypedResults` for compile-time response type safety
- Use `AddOpenApi()` + `MapOpenApi()` for built-in OpenAPI support (no Swashbuckle needed in .NET 9)
- Reserve Controllers only for complex model binding or content negotiation scenarios

## C# 12+ Conventions

- File-scoped namespaces everywhere
- Primary constructors for DI injection
- Records for DTOs and commands/queries
- Nullable reference types enabled project-wide
- `required` keyword for mandatory init properties

## Naming

| Element | Convention |
|---------|------------|
| Classes, Methods, Constants | PascalCase |
| Interfaces | `I` + PascalCase |
| Private fields | `_camelCase` |
| Async methods | Suffix with `Async` |

## Commands

```bash
dotnet run --project src/WebApi
dotnet test
dotnet ef migrations add Name -p src/Infrastructure -s src/WebApi
dotnet ef database update -p src/Infrastructure -s src/WebApi
```

## Code Style

- Mark fields `readonly` when not reassigned
- Prefer expression-bodied members for single-line logic
- Use pattern matching over `is`/`as` type checks
- Propagate `async`/`await` all the way down -- never `.Result` or `.Wait()`
