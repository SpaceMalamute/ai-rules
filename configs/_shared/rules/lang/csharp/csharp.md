---
description: "C# code style and naming conventions"
paths:
  - "**/*.cs"
  - "**/*.csproj"
---

# C# Code Style Rules

## Nullability

- Enable `<Nullable>enable</Nullable>` in all projects
- Initialize non-nullable properties: `string Name { get; set; } = string.Empty;`
- Use `?` suffix for nullable types: `string? MiddleName`

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Classes | PascalCase | `UserService` |
| Interfaces | IPascalCase | `IUserRepository` |
| Methods | PascalCase | `GetUserById` |
| Properties | PascalCase | `FirstName` |
| Private fields | _camelCase | `_userRepository` |
| Local variables | camelCase | `currentUser` |
| Constants | PascalCase | `MaxRetryCount` |
| Async methods | Suffix `Async` | `GetUserAsync` |

## Modern C# Features (Prefer These)

- Use `var` when type is obvious from the right side; be explicit when not obvious
- Use collection expressions (C# 12+): `int[] numbers = [1, 2, 3];`
- Use pattern matching: `if (user is { IsActive: true, Role: "Admin" })`
- Use switch expressions for mapping
- Use records for immutable DTOs: `public record UserDto(int Id, string Name);`
- Use `with` expressions for record modifications
- Use file-scoped namespaces (C# 10+): `namespace MyApp.Services;`
- Use primary constructors (C# 12+) for DI in services
- Use `using` declarations over `using` blocks when scope matches method lifetime

## Async Rules

- Async all the way — never block with `.Result` or `.Wait()`
- Use `ConfigureAwait(false)` in library code, not in ASP.NET Core controllers
- Always propagate `CancellationToken`

## LINQ

- Use method syntax for simple queries, query syntax for joins
- DO NOT enumerate an `IEnumerable` multiple times — materialize with `.ToList()` first
- Use `AsNoTracking()` for read-only EF Core queries

## Error Handling

- Throw specific exceptions, not `new Exception("...")`
- Never swallow exceptions — log and rethrow
- Use `?? throw new NotFoundException(...)` pattern for null checks

## Anti-patterns

- DO NOT use `new User()` class-based DTOs with mutable setters — use records
- DO NOT use block-scoped namespaces — use file-scoped
- DO NOT ignore cancellation tokens in async methods
