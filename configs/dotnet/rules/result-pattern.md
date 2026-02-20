---
paths:
  - "**/src/**/*.cs"
  - "**/src/Application/**/*.cs"
  - "**/src/Domain/**/*.cs"
---

# Result Pattern

## Result Type

```csharp
// Domain/Common/Result.cs
public class Result
{
    protected Result(bool isSuccess, Error error)
    {
        if (isSuccess && error != Error.None ||
            !isSuccess && error == Error.None)
        {
            throw new ArgumentException("Invalid error state", nameof(error));
        }

        IsSuccess = isSuccess;
        Error = error;
    }

    public bool IsSuccess { get; }
    public bool IsFailure => !IsSuccess;
    public Error Error { get; }

    public static Result Success() => new(true, Error.None);
    public static Result Failure(Error error) => new(false, error);

    public static Result<T> Success<T>(T value) => new(value, true, Error.None);
    public static Result<T> Failure<T>(Error error) => new(default!, false, error);
}

public class Result<T> : Result
{
    private readonly T _value;

    protected internal Result(T value, bool isSuccess, Error error)
        : base(isSuccess, error)
    {
        _value = value;
    }

    public T Value => IsSuccess
        ? _value
        : throw new InvalidOperationException("Cannot access value of failed result");

    public static implicit operator Result<T>(T value) => Success(value);
}
```

## Error Type

```csharp
// Domain/Common/Error.cs
public sealed record Error(string Code, string Description)
{
    public static readonly Error None = new(string.Empty, string.Empty);
    public static readonly Error NullValue = new("Error.NullValue", "A null value was provided");

    public static Error NotFound(string entityName, object id) =>
        new($"{entityName}.NotFound", $"{entityName} with id {id} was not found");

    public static Error Validation(string propertyName, string message) =>
        new($"Validation.{propertyName}", message);

    public static Error Conflict(string entityName, string details) =>
        new($"{entityName}.Conflict", details);

    public static Error Unauthorized(string message = "Unauthorized access") =>
        new("Auth.Unauthorized", message);

    public static Error Forbidden(string message = "Access denied") =>
        new("Auth.Forbidden", message);
}

// Domain-specific errors
public static class UserErrors
{
    public static Error NotFound(Guid id) =>
        Error.NotFound("User", id);

    public static Error EmailAlreadyExists(string email) =>
        Error.Conflict("User", $"Email {email} is already registered");

    public static Error InvalidPassword =>
        Error.Validation("Password", "Password does not meet requirements");

    public static Error AccountLocked =>
        new("User.AccountLocked", "Account has been locked due to too many failed attempts");
}
```

## Usage in Handlers

```csharp
// Application/Users/Commands/CreateUserCommandHandler.cs
public class CreateUserCommandHandler(
    IUserRepository userRepository,
    IUnitOfWork unitOfWork
) : IRequestHandler<CreateUserCommand, Result<Guid>>
{
    public async Task<Result<Guid>> Handle(
        CreateUserCommand request,
        CancellationToken cancellationToken)
    {
        // Check for existing user
        if (await userRepository.ExistsByEmailAsync(request.Email, cancellationToken))
        {
            return Result.Failure<Guid>(UserErrors.EmailAlreadyExists(request.Email));
        }

        // Create user (factory method returns Result)
        var userResult = User.Create(request.Email, request.Name, request.Password);
        if (userResult.IsFailure)
        {
            return Result.Failure<Guid>(userResult.Error);
        }

        await userRepository.AddAsync(userResult.Value, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return userResult.Value.Id;
    }
}
```

## Domain Entity with Result

```csharp
// Domain/Users/User.cs
public class User : Entity
{
    private User(Guid id, Email email, string name, PasswordHash passwordHash)
    {
        Id = id;
        Email = email;
        Name = name;
        PasswordHash = passwordHash;
        CreatedAt = DateTime.UtcNow;
    }

    public Email Email { get; private set; }
    public string Name { get; private set; }
    public PasswordHash PasswordHash { get; private set; }
    public DateTime CreatedAt { get; }
    public bool IsActive { get; private set; } = true;

    public static Result<User> Create(string email, string name, string password)
    {
        // Validate email
        var emailResult = Email.Create(email);
        if (emailResult.IsFailure)
        {
            return Result.Failure<User>(emailResult.Error);
        }

        // Validate name
        if (string.IsNullOrWhiteSpace(name) || name.Length > 100)
        {
            return Result.Failure<User>(Error.Validation("Name", "Name is required and max 100 chars"));
        }

        // Validate and hash password
        var passwordResult = PasswordHash.Create(password);
        if (passwordResult.IsFailure)
        {
            return Result.Failure<User>(passwordResult.Error);
        }

        return new User(Guid.NewGuid(), emailResult.Value, name, passwordResult.Value);
    }

    public Result UpdateName(string newName)
    {
        if (string.IsNullOrWhiteSpace(newName) || newName.Length > 100)
        {
            return Result.Failure(Error.Validation("Name", "Name is required and max 100 chars"));
        }

        Name = newName;
        return Result.Success();
    }

    public Result Deactivate()
    {
        if (!IsActive)
        {
            return Result.Failure(new Error("User.AlreadyDeactivated", "User is already deactivated"));
        }

        IsActive = false;
        return Result.Success();
    }
}
```

## Value Objects with Result

```csharp
// Domain/Users/ValueObjects/Email.cs
public sealed class Email : ValueObject
{
    private Email(string value) => Value = value;

    public string Value { get; }

    public static Result<Email> Create(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return Result.Failure<Email>(Error.Validation("Email", "Email is required"));
        }

        email = email.Trim().ToLowerInvariant();

        if (email.Length > 256)
        {
            return Result.Failure<Email>(Error.Validation("Email", "Email is too long"));
        }

        if (!IsValidEmail(email))
        {
            return Result.Failure<Email>(Error.Validation("Email", "Email format is invalid"));
        }

        return new Email(email);
    }

    private static bool IsValidEmail(string email) =>
        Regex.IsMatch(email, @"^[^@\s]+@[^@\s]+\.[^@\s]+$");

    protected override IEnumerable<object> GetAtomicValues()
    {
        yield return Value;
    }
}
```

## API Response Mapping

```csharp
// WebApi/Extensions/ResultExtensions.cs
public static class ResultExtensions
{
    public static IResult ToApiResult(this Result result) =>
        result.IsSuccess
            ? Results.Ok()
            : result.ToProblemDetails();

    public static IResult ToApiResult<T>(this Result<T> result) =>
        result.IsSuccess
            ? Results.Ok(result.Value)
            : result.ToProblemDetails();

    public static IResult ToCreatedResult<T>(
        this Result<T> result,
        string routeName,
        Func<T, object> routeValues)
    {
        return result.IsSuccess
            ? Results.CreatedAtRoute(routeName, routeValues(result.Value), result.Value)
            : result.ToProblemDetails();
    }

    private static IResult ToProblemDetails(this Result result)
    {
        var statusCode = result.Error.Code switch
        {
            var code when code.Contains("NotFound") => StatusCodes.Status404NotFound,
            var code when code.Contains("Validation") => StatusCodes.Status400BadRequest,
            var code when code.Contains("Conflict") => StatusCodes.Status409Conflict,
            var code when code.Contains("Unauthorized") => StatusCodes.Status401Unauthorized,
            var code when code.Contains("Forbidden") => StatusCodes.Status403Forbidden,
            _ => StatusCodes.Status400BadRequest
        };

        return Results.Problem(
            title: result.Error.Code,
            detail: result.Error.Description,
            statusCode: statusCode);
    }
}

// Usage in Minimal API
app.MapPost("/api/users", async (CreateUserCommand command, ISender sender) =>
{
    var result = await sender.Send(command);
    return result.ToCreatedResult("GetUser", id => new { id });
});

app.MapGet("/api/users/{id:guid}", async (Guid id, ISender sender) =>
{
    var result = await sender.Send(new GetUserQuery(id));
    return result.ToApiResult();
});
```

## Match Pattern (Functional)

```csharp
// Extensions for functional-style handling
public static class ResultMatchExtensions
{
    public static T Match<T>(
        this Result result,
        Func<T> onSuccess,
        Func<Error, T> onFailure) =>
        result.IsSuccess ? onSuccess() : onFailure(result.Error);

    public static TOut Match<TIn, TOut>(
        this Result<TIn> result,
        Func<TIn, TOut> onSuccess,
        Func<Error, TOut> onFailure) =>
        result.IsSuccess ? onSuccess(result.Value) : onFailure(result.Error);
}

// Usage
var response = result.Match(
    onSuccess: user => Results.Ok(user),
    onFailure: error => Results.Problem(error.Description)
);
```

## Anti-Patterns

```csharp
// BAD: Throwing exceptions for business logic
public User GetUser(Guid id)
{
    var user = _repository.GetById(id);
    if (user is null)
        throw new NotFoundException($"User {id} not found");  // Exception for flow control!
    return user;
}

// GOOD: Return Result
public Result<User> GetUser(Guid id)
{
    var user = _repository.GetById(id);
    return user is null
        ? Result.Failure<User>(UserErrors.NotFound(id))
        : Result.Success(user);
}


// BAD: Ignoring Result
var result = await CreateUserAsync(command);
return result.Value;  // Throws if failure!

// GOOD: Handle Result properly
var result = await CreateUserAsync(command);
if (result.IsFailure)
{
    return Results.Problem(result.Error.Description);
}
return Results.Ok(result.Value);
```
