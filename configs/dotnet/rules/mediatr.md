---
paths:
  - "**/src/**/*.cs"
  - "**/src/Application/**/*.cs"
---

# MediatR Patterns

## Command/Query Separation

```csharp
// Commands - modify state, return minimal data
public record CreateUserCommand(string Email, string Name) : IRequest<Guid>;
public record UpdateUserCommand(Guid Id, string Name) : IRequest;
public record DeleteUserCommand(Guid Id) : IRequest;

// Queries - read data, never modify state
public record GetUserQuery(Guid Id) : IRequest<UserDto?>;
public record GetUsersQuery(int Page, int PageSize) : IRequest<PaginatedList<UserDto>>;
```

## Command Handler

```csharp
public class CreateUserCommandHandler(
    IUserRepository userRepository,
    IPasswordHasher passwordHasher,
    IPublisher publisher
) : IRequestHandler<CreateUserCommand, Guid>
{
    public async Task<Guid> Handle(
        CreateUserCommand request,
        CancellationToken cancellationToken)
    {
        var user = User.Create(
            request.Email,
            request.Name,
            passwordHasher.Hash(request.Password)
        );

        await userRepository.AddAsync(user, cancellationToken);

        // Publish domain event
        await publisher.Publish(
            new UserCreatedEvent(user.Id, user.Email),
            cancellationToken
        );

        return user.Id;
    }
}
```

## Query Handler

```csharp
public class GetUserQueryHandler(
    IApplicationDbContext context
) : IRequestHandler<GetUserQuery, UserDto?>
{
    public async Task<UserDto?> Handle(
        GetUserQuery request,
        CancellationToken cancellationToken)
    {
        return await context.Users
            .Where(u => u.Id == request.Id)
            .Select(u => new UserDto(u.Id, u.Email, u.Name, u.CreatedAt))
            .FirstOrDefaultAsync(cancellationToken);
    }
}
```

## Validation Behavior (Pipeline)

```csharp
public class ValidationBehavior<TRequest, TResponse>(
    IEnumerable<IValidator<TRequest>> validators
) : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        if (!validators.Any())
        {
            return await next();
        }

        var context = new ValidationContext<TRequest>(request);

        var validationResults = await Task.WhenAll(
            validators.Select(v => v.ValidateAsync(context, cancellationToken))
        );

        var failures = validationResults
            .SelectMany(r => r.Errors)
            .Where(f => f != null)
            .ToList();

        if (failures.Count != 0)
        {
            throw new ValidationException(failures);
        }

        return await next();
    }
}
```

## Logging Behavior

```csharp
public class LoggingBehavior<TRequest, TResponse>(
    ILogger<LoggingBehavior<TRequest, TResponse>> logger
) : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        var requestName = typeof(TRequest).Name;

        logger.LogInformation(
            "Handling {RequestName} {@Request}",
            requestName,
            request
        );

        var stopwatch = Stopwatch.StartNew();

        try
        {
            var response = await next();

            stopwatch.Stop();

            logger.LogInformation(
                "Handled {RequestName} in {ElapsedMilliseconds}ms",
                requestName,
                stopwatch.ElapsedMilliseconds
            );

            return response;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();

            logger.LogError(
                ex,
                "Error handling {RequestName} after {ElapsedMilliseconds}ms",
                requestName,
                stopwatch.ElapsedMilliseconds
            );

            throw;
        }
    }
}
```

## Transaction Behavior

```csharp
public class TransactionBehavior<TRequest, TResponse>(
    IApplicationDbContext context,
    ILogger<TransactionBehavior<TRequest, TResponse>> logger
) : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        // Only wrap commands (not queries) in transaction
        if (!typeof(TRequest).Name.EndsWith("Command"))
        {
            return await next();
        }

        await using var transaction = await context.Database
            .BeginTransactionAsync(cancellationToken);

        try
        {
            var response = await next();
            await transaction.CommitAsync(cancellationToken);
            return response;
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }
}
```

## FluentValidation Validators

```csharp
public class CreateUserCommandValidator : AbstractValidator<CreateUserCommand>
{
    public CreateUserCommandValidator(IUserRepository userRepository)
    {
        RuleFor(x => x.Email)
            .NotEmpty()
            .EmailAddress()
            .MustAsync(async (email, ct) => !await userRepository.ExistsAsync(email, ct))
            .WithMessage("Email already exists");

        RuleFor(x => x.Name)
            .NotEmpty()
            .MaximumLength(100);

        RuleFor(x => x.Password)
            .NotEmpty()
            .MinimumLength(8)
            .Matches("[A-Z]").WithMessage("Must contain uppercase letter")
            .Matches("[a-z]").WithMessage("Must contain lowercase letter")
            .Matches("[0-9]").WithMessage("Must contain digit");
    }
}
```

## Domain Events (Notifications)

```csharp
// Event
public record UserCreatedEvent(Guid UserId, string Email) : INotification;

// Multiple handlers for same event
public class SendWelcomeEmailHandler(IEmailService emailService)
    : INotificationHandler<UserCreatedEvent>
{
    public async Task Handle(
        UserCreatedEvent notification,
        CancellationToken cancellationToken)
    {
        await emailService.SendWelcomeEmailAsync(
            notification.Email,
            cancellationToken
        );
    }
}

public class CreateUserAnalyticsHandler(IAnalyticsService analytics)
    : INotificationHandler<UserCreatedEvent>
{
    public async Task Handle(
        UserCreatedEvent notification,
        CancellationToken cancellationToken)
    {
        await analytics.TrackAsync(
            "user_created",
            new { notification.UserId },
            cancellationToken
        );
    }
}
```

## Registration (Program.cs)

```csharp
builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssemblyContaining<CreateUserCommand>();

    // Pipeline behaviors (order matters)
    cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(LoggingBehavior<,>));
    cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
    cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(TransactionBehavior<,>));
});

// Register FluentValidation validators
builder.Services.AddValidatorsFromAssemblyContaining<CreateUserCommandValidator>();
```

## Usage in Controller/Endpoint

```csharp
// Minimal API
app.MapPost("/api/users", async (CreateUserCommand command, ISender sender) =>
{
    var userId = await sender.Send(command);
    return Results.CreatedAtRoute("GetUser", new { id = userId }, new { id = userId });
});

app.MapGet("/api/users/{id:guid}", async (Guid id, ISender sender) =>
{
    var user = await sender.Send(new GetUserQuery(id));
    return user is not null ? Results.Ok(user) : Results.NotFound();
}).WithName("GetUser");

// Controller
[ApiController]
[Route("api/[controller]")]
public class UsersController(ISender sender) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Create(CreateUserCommand command)
    {
        var userId = await sender.Send(command);
        return CreatedAtAction(nameof(Get), new { id = userId }, new { id = userId });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var user = await sender.Send(new GetUserQuery(id));
        return user is not null ? Ok(user) : NotFound();
    }
}
```
