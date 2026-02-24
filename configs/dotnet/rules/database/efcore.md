---
description: "Entity Framework Core patterns and migrations"
paths:
  - "**/src/Infrastructure/**/*.cs"
  - "**/*DbContext*.cs"
  - "**/*Repository*.cs"
  - "**/Configurations/**/*.cs"
---

# Entity Framework Core Rules

## DbContext

- Use `DbContextOptions<T>` via primary constructor
- Apply all configurations from assembly: `modelBuilder.ApplyConfigurationsFromAssembly()`
- Override `SaveChangesAsync` for audit timestamps (`CreatedAt`, `UpdatedAt`)

## Entity Configuration

- Use Fluent API in `IEntityTypeConfiguration<T>` classes -- not data annotations on entities
- For PostgreSQL, use snake_case naming (e.g., via UseSnakeCaseNamingConvention()). For SQL Server, PascalCase is conventional. Apply a consistent convention per project.
- Always set `HasMaxLength()` on string properties
- Use `ValueGeneratedNever()` for app-generated GUIDs
- Map enums with `.HasConversion<string>()`
- Map Value Objects with `OwnsOne()`

## Query Performance

- Use `AsNoTracking()` on all read-only queries -- any query where the result will not be modified and saved back
- Project to DTOs with `.Select()` instead of loading full entities for reads
- Use `AsSplitQuery()` when including multiple collections to avoid cartesian explosion
- Use `EF.CompileQuery()` for hot-path queries that execute frequently
- Use `ExecuteUpdateAsync()` / `ExecuteDeleteAsync()` for bulk operations -- avoids loading entities into memory

```csharp
// Bulk update without loading entities (.NET 7+)
await context.Users
    .Where(u => u.LastLogin < cutoff)
    .ExecuteUpdateAsync(s => s.SetProperty(u => u.IsActive, false));

// Bulk delete without loading entities
await context.Orders
    .Where(o => o.Status == OrderStatus.Expired)
    .ExecuteDeleteAsync();

// Compiled query for hot paths
private static readonly Func<AppDbContext, Guid, Task<UserDto?>> GetUserById =
    EF.CompileAsyncQuery((AppDbContext ctx, Guid id) =>
        ctx.Users.AsNoTracking()
            .Where(u => u.Id == id)
            .Select(u => new UserDto(u.Id, u.Email, u.Name))
            .FirstOrDefault());
```

## Repositories

- Define interfaces in Domain (`IRepository<T> where T : AggregateRoot`)
- Implement in Infrastructure
- DO NOT expose `IQueryable<T>` from repositories -- it leaks persistence details
- Use the Specification pattern for complex, reusable query filters

## Migrations

- Store migrations in `Infrastructure/Data/Migrations`
- Always provide both `Up()` and `Down()` methods
- Generate SQL scripts for production deployments: `dotnet ef migrations script`
- DO NOT use `EnsureCreated()` in production -- use `MigrateAsync()` only

## Soft Delete

- Use global query filters: `HasQueryFilter(e => e.DeletedAt == null)`
- Access deleted records with `IgnoreQueryFilters()` when needed

## Transactions

- Rely on `SaveChangesAsync()` implicit transaction for single aggregate changes
- Use explicit `BeginTransactionAsync()` only when spanning multiple aggregates or SaveChanges calls

## Anti-patterns

- DO NOT call `SaveChanges()` inside repository methods -- let Unit of Work control commit boundaries
- DO NOT use `Find()` for read queries -- it always tracks entities and may return locally cached entities that would be excluded by global query filters
- DO NOT lazy-load navigation properties -- use explicit `Include()` or projection
- DO NOT use `ToListAsync()` on unfiltered large tables -- always filter or paginate first
