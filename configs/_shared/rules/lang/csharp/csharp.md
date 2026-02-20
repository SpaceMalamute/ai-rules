---
description: "C# code style and naming conventions"
paths:
  - "**/*.cs"
  - "**/*.csproj"
---

# C# Code Style Rules

## Nullability

Enable nullable reference types in all projects:

```xml
<PropertyGroup>
  <Nullable>enable</Nullable>
</PropertyGroup>
```

```csharp
// GOOD - explicit nullability
public string Name { get; set; } = string.Empty;
public string? MiddleName { get; set; }

// BAD - ambiguous
public string Name { get; set; }  // Warning: non-nullable not initialized
```

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

```csharp
// GOOD
private readonly IUserRepository _userRepository;
public async Task<User?> GetUserByIdAsync(int id) { }

// BAD
private IUserRepository userRepository;  // Missing underscore
public async Task<User?> GetUserById(int id) { }  // Missing Async suffix
```

## Type Guidelines

### Use `var` When Type Is Obvious

```csharp
// GOOD - type is obvious
var user = new User();
var users = await _repository.GetAllAsync();
var count = items.Count;

// GOOD - type not obvious, be explicit
User user = GetUser();
IEnumerable<string> names = GetNames();

// BAD - redundant
User user = new User();
```

### Prefer Collection Expressions (C# 12+)

```csharp
// GOOD - collection expressions
int[] numbers = [1, 2, 3];
List<string> names = ["Alice", "Bob"];
Dictionary<string, int> ages = new() { ["Alice"] = 30 };

// BAD - verbose
int[] numbers = new int[] { 1, 2, 3 };
List<string> names = new List<string> { "Alice", "Bob" };
```

### Use Pattern Matching

```csharp
// GOOD - pattern matching
if (user is { IsActive: true, Role: "Admin" })
{
    // ...
}

return status switch
{
    OrderStatus.Pending => "Awaiting payment",
    OrderStatus.Shipped => "On the way",
    OrderStatus.Delivered => "Completed",
    _ => "Unknown"
};

// BAD - verbose checks
if (user != null && user.IsActive && user.Role == "Admin")
```

## Async/Await

### Always Use Async All The Way

```csharp
// GOOD - async all the way
public async Task<User> GetUserAsync(int id)
{
    return await _repository.GetByIdAsync(id);
}

// BAD - blocking on async
public User GetUser(int id)
{
    return _repository.GetByIdAsync(id).Result;  // Deadlock risk!
}

// BAD - async void (except event handlers)
public async void ProcessData()  // Can't await, exceptions lost
```

### ConfigureAwait in Libraries

```csharp
// In library code (not ASP.NET Core)
await SomeOperationAsync().ConfigureAwait(false);

// In ASP.NET Core controllers - not needed
await SomeOperationAsync();
```

### Cancellation Tokens

```csharp
// GOOD - propagate cancellation
public async Task<List<User>> GetUsersAsync(CancellationToken cancellationToken = default)
{
    return await _context.Users
        .Where(u => u.IsActive)
        .ToListAsync(cancellationToken);
}

// BAD - ignoring cancellation
public async Task<List<User>> GetUsersAsync()
{
    return await _context.Users.ToListAsync();
}
```

## LINQ Best Practices

```csharp
// GOOD - method syntax for complex queries
var activeAdmins = users
    .Where(u => u.IsActive)
    .Where(u => u.Role == Role.Admin)
    .OrderBy(u => u.Name)
    .Select(u => new UserDto(u.Id, u.Name))
    .ToList();

// GOOD - query syntax for joins
var result = from order in orders
             join customer in customers on order.CustomerId equals customer.Id
             select new { order.Id, customer.Name };

// BAD - multiple enumerations
var users = GetUsers();
var count = users.Count();      // First enumeration
var first = users.First();       // Second enumeration

// GOOD - materialize once
var users = GetUsers().ToList();
var count = users.Count;
var first = users[0];
```

## Records and Immutability

```csharp
// GOOD - immutable DTOs with records
public record UserDto(int Id, string Name, string Email);

public record CreateUserCommand(string Name, string Email)
{
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
}

// GOOD - with-expressions for modifications
var updated = user with { Name = "New Name" };

// BAD - mutable DTOs
public class UserDto
{
    public int Id { get; set; }
    public string Name { get; set; }
}
```

## Error Handling

### Specific Exceptions

```csharp
// GOOD - specific exceptions
public User GetUser(int id)
{
    return _repository.GetById(id)
        ?? throw new NotFoundException($"User {id} not found");
}

// BAD - generic exception
throw new Exception("User not found");
```

### Never Swallow Exceptions

```csharp
// BAD - silent failure
try
{
    await _service.ProcessAsync();
}
catch (Exception)
{
    // Swallowed
}

// GOOD - log and handle
try
{
    await _service.ProcessAsync();
}
catch (Exception ex)
{
    _logger.LogError(ex, "Failed to process");
    throw;
}
```

## Disposables

```csharp
// GOOD - using declaration (C# 8+)
await using var connection = new SqlConnection(connectionString);
await connection.OpenAsync();

// GOOD - using statement for limited scope
using (var stream = File.OpenRead(path))
{
    // ...
}
// Stream disposed here

// BAD - manual disposal
var connection = new SqlConnection(connectionString);
try
{
    await connection.OpenAsync();
}
finally
{
    connection.Dispose();
}
```

## File-Scoped Namespaces

```csharp
// GOOD - file-scoped (C# 10+)
namespace MyApp.Services;

public class UserService
{
    // ...
}

// BAD - block-scoped (unnecessary nesting)
namespace MyApp.Services
{
    public class UserService
    {
        // ...
    }
}
```

## Primary Constructors (C# 12+)

```csharp
// GOOD - primary constructor
public class UserService(IUserRepository repository, ILogger<UserService> logger)
{
    public async Task<User?> GetUserAsync(int id)
    {
        logger.LogInformation("Getting user {Id}", id);
        return await repository.GetByIdAsync(id);
    }
}

// Also valid - traditional constructor with readonly fields
public class UserService
{
    private readonly IUserRepository _repository;
    private readonly ILogger<UserService> _logger;

    public UserService(IUserRepository repository, ILogger<UserService> logger)
    {
        _repository = repository;
        _logger = logger;
    }
}
```
