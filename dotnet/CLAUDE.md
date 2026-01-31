# .NET Project Guidelines

@../_shared/CLAUDE.md

## Stack

- .NET 8+ (latest LTS)
- ASP.NET Core Web API
- Entity Framework Core
- C# 12+ features
- xUnit for testing

## Architecture

### Clean Architecture (Recommended)

```
src/
├── Domain/                        # Core business logic (no dependencies)
│   ├── Entities/
│   │   └── User.cs
│   ├── ValueObjects/
│   │   └── Email.cs
│   ├── Enums/
│   ├── Exceptions/
│   │   └── DomainException.cs
│   └── Interfaces/
│       └── IUserRepository.cs
│
├── Application/                   # Use cases, CQRS, DTOs
│   ├── Common/
│   │   ├── Behaviors/
│   │   │   ├── ValidationBehavior.cs
│   │   │   └── LoggingBehavior.cs
│   │   ├── Interfaces/
│   │   │   └── IApplicationDbContext.cs
│   │   └── Mappings/
│   │       └── MappingProfile.cs
│   ├── Users/
│   │   ├── Commands/
│   │   │   ├── CreateUser/
│   │   │   │   ├── CreateUserCommand.cs
│   │   │   │   ├── CreateUserCommandHandler.cs
│   │   │   │   └── CreateUserCommandValidator.cs
│   │   │   └── UpdateUser/
│   │   └── Queries/
│   │       ├── GetUser/
│   │       │   ├── GetUserQuery.cs
│   │       │   ├── GetUserQueryHandler.cs
│   │       │   └── UserDto.cs
│   │       └── GetUsers/
│   └── DependencyInjection.cs
│
├── Infrastructure/                # External concerns
│   ├── Data/
│   │   ├── ApplicationDbContext.cs
│   │   ├── Configurations/
│   │   │   └── UserConfiguration.cs
│   │   └── Migrations/
│   ├── Repositories/
│   │   └── UserRepository.cs
│   ├── Services/
│   │   └── DateTimeService.cs
│   └── DependencyInjection.cs
│
└── WebApi/                        # Presentation layer
    ├── Controllers/
    │   └── UsersController.cs
    ├── Filters/
    │   └── ApiExceptionFilterAttribute.cs
    ├── Middleware/
    │   └── ExceptionHandlingMiddleware.cs
    ├── Program.cs
    └── appsettings.json
```

### Project References

```
WebApi → Application → Domain
WebApi → Infrastructure → Application → Domain
```

**Key rule**: Domain has ZERO external dependencies.

## Code Style

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Classes | PascalCase | `UserService` |
| Interfaces | IPascalCase | `IUserRepository` |
| Methods | PascalCase | `GetUserById` |
| Properties | PascalCase | `FirstName` |
| Private fields | _camelCase | `_userRepository` |
| Parameters | camelCase | `userId` |
| Constants | PascalCase | `MaxRetryCount` |
| Async methods | Suffix Async | `GetUserAsync` |

### File-Scoped Namespaces

```csharp
// Good - C# 10+
namespace MyApp.Domain.Entities;

public class User { }

// Avoid
namespace MyApp.Domain.Entities
{
    public class User { }
}
```

### Primary Constructors (C# 12)

```csharp
// Good - for simple DI
public class UserService(IUserRepository userRepository, ILogger<UserService> logger)
{
    public async Task<User?> GetByIdAsync(Guid id)
    {
        logger.LogInformation("Getting user {UserId}", id);
        return await userRepository.GetByIdAsync(id);
    }
}

// Use traditional constructors when you need field assignment or validation
```

### Records for DTOs

```csharp
// Immutable DTOs
public record UserDto(Guid Id, string Email, string Name);

public record CreateUserRequest(string Email, string Password, string Name);

// With validation attributes
public record CreateUserCommand(
    [Required][EmailAddress] string Email,
    [Required][MinLength(8)] string Password,
    [Required] string Name
) : IRequest<Guid>;
```

### Nullable Reference Types

```csharp
// Enable in .csproj
<Nullable>enable</Nullable>

// Be explicit about nullability
public async Task<User?> GetByIdAsync(Guid id);  // Can return null
public async Task<User> GetByIdOrThrowAsync(Guid id);  // Never null
```

## Commands

```bash
# Development
dotnet run --project src/WebApi

# Build
dotnet build
dotnet publish -c Release

# Tests
dotnet test
dotnet test --filter "Category=Unit"
dotnet test --collect:"XPlat Code Coverage"

# EF Core migrations
dotnet ef migrations add InitialCreate -p src/Infrastructure -s src/WebApi
dotnet ef database update -p src/Infrastructure -s src/WebApi

# Format
dotnet format
```

## Common Patterns

### Minimal API Endpoints

```csharp
// Program.cs or endpoint extension
app.MapGet("/users/{id:guid}", async (Guid id, ISender sender) =>
{
    var user = await sender.Send(new GetUserQuery(id));
    return user is not null ? Results.Ok(user) : Results.NotFound();
})
.WithName("GetUser")
.WithOpenApi()
.RequireAuthorization();

app.MapPost("/users", async (CreateUserCommand command, ISender sender) =>
{
    var id = await sender.Send(command);
    return Results.CreatedAtRoute("GetUser", new { id }, id);
})
.WithName("CreateUser")
.WithOpenApi();
```

### Controller-Based API

```csharp
[ApiController]
[Route("api/[controller]")]
public class UsersController(ISender sender) : ControllerBase
{
    [HttpGet("{id:guid}")]
    [ProducesResponseType<UserDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(Guid id)
    {
        var user = await sender.Send(new GetUserQuery(id));
        return user is not null ? Ok(user) : NotFound();
    }

    [HttpPost]
    [ProducesResponseType<Guid>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create(CreateUserCommand command)
    {
        var id = await sender.Send(command);
        return CreatedAtAction(nameof(Get), new { id }, id);
    }
}
```

### Global Exception Handling

```csharp
public class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (ValidationException ex)
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await context.Response.WriteAsJsonAsync(new ProblemDetails
            {
                Status = 400,
                Title = "Validation Error",
                Detail = string.Join(", ", ex.Errors.Select(e => e.ErrorMessage))
            });
        }
        catch (NotFoundException ex)
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            await context.Response.WriteAsJsonAsync(new ProblemDetails
            {
                Status = 404,
                Title = "Not Found",
                Detail = ex.Message
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception");
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await context.Response.WriteAsJsonAsync(new ProblemDetails
            {
                Status = 500,
                Title = "Server Error"
            });
        }
    }
}
```

### Dependency Injection Setup

```csharp
// Application/DependencyInjection.cs
public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddMediatR(cfg => {
            cfg.RegisterServicesFromAssembly(Assembly.GetExecutingAssembly());
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(LoggingBehavior<,>));
        });

        services.AddValidatorsFromAssembly(Assembly.GetExecutingAssembly());
        services.AddAutoMapper(Assembly.GetExecutingAssembly());

        return services;
    }
}

// Infrastructure/DependencyInjection.cs
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseSqlServer(configuration.GetConnectionString("DefaultConnection")));

        services.AddScoped<IApplicationDbContext>(sp =>
            sp.GetRequiredService<ApplicationDbContext>());

        services.AddScoped<IUserRepository, UserRepository>();

        return services;
    }
}

// Program.cs
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
```
