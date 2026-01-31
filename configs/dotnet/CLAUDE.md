# .NET Project Guidelines

@../_shared/CLAUDE.md

## Stack

- .NET 9 / .NET 8 (LTS)
- ASP.NET Core Web API
- Entity Framework Core
- C# 13+
- xUnit + NSubstitute + FluentAssertions

## Architecture - Clean Architecture

```
src/
├── Domain/           # Entities, ValueObjects, Interfaces
│                     # ZERO external dependencies
├── Application/      # Commands, Queries, DTOs, Validators
│                     # MediatR, FluentValidation
├── Infrastructure/   # DbContext, Repositories, External services
│                     # EF Core, external APIs
└── WebApi/           # Controllers/Endpoints, Middleware
                      # Presentation layer
```

**Dependencies**:
- `WebApi → Application → Domain`
- `Infrastructure → Application → Domain`

## Core Principles

### CQRS with MediatR

- **Commands** (write): Modify state, return minimal data (ID or void)
- **Queries** (read): Return data, never modify state
- Commands and queries implement `IRequest<T>`

### C# 12 Style

- File-scoped namespaces
- Primary constructors for DI
- Records for DTOs
- Nullable reference types enabled
- Required members with `required` keyword

### Naming

| Element | Convention |
|---------|------------|
| Classes/Methods | PascalCase |
| Interfaces | IPascalCase |
| Private fields | _camelCase |
| Async methods | Suffix `Async` |
| Constants | PascalCase |

### API Patterns

- **Minimal APIs**: Preferred for new projects (93% less memory in .NET 9)
- **Controllers**: Only for complex model binding scenarios
- Use `ISender` from MediatR for dispatching commands/queries
- Return `TypedResults.Ok()`, `TypedResults.NotFound()`, etc.
- Built-in OpenAPI: `AddOpenApi()` + `MapOpenApi()`

### Validation

- FluentValidation for complex rules
- Data annotations for simple DTOs
- Validation in MediatR pipeline behavior

## Commands

```bash
dotnet run --project src/WebApi           # Dev
dotnet build                               # Build
dotnet test                                # Test
dotnet ef migrations add Name -p src/Infrastructure -s src/WebApi
dotnet ef database update -p src/Infrastructure -s src/WebApi
```

## Code Style

- `readonly` for immutable fields
- Expression-bodied members when simple
- Pattern matching over type checks
- `async`/`await` all the way down
