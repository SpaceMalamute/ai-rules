---
paths:
  - "src/**/*.cs"
---

# Clean Architecture Rules

## Layer Dependencies

```
WebApi → Application → Domain
WebApi → Infrastructure → Application → Domain
```

### Domain Layer (src/Domain/)

- **ZERO external dependencies** (no NuGet packages except primitives)
- Contains: Entities, Value Objects, Enums, Domain Events, Interfaces
- No references to other projects

```csharp
// Good - Domain entity
namespace MyApp.Domain.Entities;

public class User
{
    public Guid Id { get; private set; }
    public string Email { get; private set; } = default!;
    public string PasswordHash { get; private set; } = default!;

    private User() { } // EF Core

    public static User Create(string email, string passwordHash)
    {
        return new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            PasswordHash = passwordHash
        };
    }
}
```

### Application Layer (src/Application/)

- References: Domain only
- Contains: Commands, Queries, DTOs, Interfaces, Validators, Mappings
- Allowed packages: MediatR, FluentValidation, AutoMapper

```csharp
// Command + Handler in same folder
namespace MyApp.Application.Users.Commands.CreateUser;

public record CreateUserCommand(string Email, string Password) : IRequest<Guid>;

public class CreateUserCommandHandler(
    IUserRepository userRepository,
    IPasswordHasher passwordHasher
) : IRequestHandler<CreateUserCommand, Guid>
{
    public async Task<Guid> Handle(CreateUserCommand request, CancellationToken cancellationToken)
    {
        var hashedPassword = passwordHasher.Hash(request.Password);
        var user = User.Create(request.Email, hashedPassword);
        await userRepository.AddAsync(user, cancellationToken);
        return user.Id;
    }
}
```

### Infrastructure Layer (src/Infrastructure/)

- References: Application, Domain
- Contains: DbContext, Repositories, External Services, Configurations
- Implements interfaces defined in Application/Domain

```csharp
// Repository implementation
namespace MyApp.Infrastructure.Repositories;

public class UserRepository(ApplicationDbContext context) : IUserRepository
{
    public async Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await context.Users.FindAsync([id], cancellationToken);
    }

    public async Task AddAsync(User user, CancellationToken cancellationToken = default)
    {
        await context.Users.AddAsync(user, cancellationToken);
        await context.SaveChangesAsync(cancellationToken);
    }
}
```

### Presentation Layer (src/WebApi/)

- References: Application, Infrastructure
- Contains: Controllers/Endpoints, Middleware, Filters
- Only layer that knows about HTTP

## CQRS Pattern

### Commands (Write Operations)

```csharp
// Commands modify state, return minimal data (ID or void)
public record CreateUserCommand(string Email, string Password) : IRequest<Guid>;
public record UpdateUserCommand(Guid Id, string Name) : IRequest;
public record DeleteUserCommand(Guid Id) : IRequest;
```

### Queries (Read Operations)

```csharp
// Queries return data, never modify state
public record GetUserQuery(Guid Id) : IRequest<UserDto?>;
public record GetUsersQuery(int Page, int PageSize) : IRequest<PaginatedList<UserDto>>;
```

### Validation

```csharp
// Validator in same folder as command
public class CreateUserCommandValidator : AbstractValidator<CreateUserCommand>
{
    public CreateUserCommandValidator(IUserRepository userRepository)
    {
        RuleFor(x => x.Email)
            .NotEmpty()
            .EmailAddress()
            .MustAsync(async (email, ct) => !await userRepository.ExistsAsync(email, ct))
            .WithMessage("Email already exists");

        RuleFor(x => x.Password)
            .NotEmpty()
            .MinimumLength(8)
            .Matches("[A-Z]").WithMessage("Must contain uppercase")
            .Matches("[a-z]").WithMessage("Must contain lowercase")
            .Matches("[0-9]").WithMessage("Must contain digit");
    }
}
```

## Value Objects

```csharp
// Immutable, equality by value
public record Email
{
    public string Value { get; }

    public Email(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException("Email cannot be empty");

        if (!value.Contains('@'))
            throw new ArgumentException("Invalid email format");

        Value = value.ToLowerInvariant();
    }

    public static implicit operator string(Email email) => email.Value;
}
```

## Domain Events

```csharp
// Domain event
public record UserCreatedEvent(Guid UserId, string Email) : INotification;

// In entity
public class User
{
    private readonly List<INotification> _domainEvents = [];
    public IReadOnlyCollection<INotification> DomainEvents => _domainEvents.AsReadOnly();

    public static User Create(string email, string passwordHash)
    {
        var user = new User { Id = Guid.NewGuid(), Email = email, PasswordHash = passwordHash };
        user._domainEvents.Add(new UserCreatedEvent(user.Id, user.Email));
        return user;
    }

    public void ClearDomainEvents() => _domainEvents.Clear();
}

// Handler
public class UserCreatedEventHandler(IEmailService emailService) : INotificationHandler<UserCreatedEvent>
{
    public async Task Handle(UserCreatedEvent notification, CancellationToken cancellationToken)
    {
        await emailService.SendWelcomeEmailAsync(notification.Email, cancellationToken);
    }
}
```
