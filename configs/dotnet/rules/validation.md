---
paths:
  - "**/*.Validator.cs"
  - "**/Validators/**/*.cs"
  - "**/Validation/**/*.cs"
---

# .NET Validation (FluentValidation)

## Basic Validator

```csharp
// Validators/CreateUserRequestValidator.cs
using FluentValidation;

public class CreateUserRequestValidator : AbstractValidator<CreateUserRequest>
{
    public CreateUserRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required")
            .EmailAddress().WithMessage("Invalid email format")
            .MaximumLength(255);

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Name is required")
            .Length(2, 100).WithMessage("Name must be between 2 and 100 characters")
            .Matches(@"^[a-zA-Z\s'-]+$").WithMessage("Name contains invalid characters");

        RuleFor(x => x.Password)
            .NotEmpty()
            .MinimumLength(8)
            .Matches(@"[A-Z]").WithMessage("Password must contain uppercase letter")
            .Matches(@"[a-z]").WithMessage("Password must contain lowercase letter")
            .Matches(@"[0-9]").WithMessage("Password must contain digit")
            .Matches(@"[^a-zA-Z0-9]").WithMessage("Password must contain special character");

        RuleFor(x => x.ConfirmPassword)
            .Equal(x => x.Password).WithMessage("Passwords do not match");

        RuleFor(x => x.DateOfBirth)
            .NotEmpty()
            .LessThan(DateTime.Today).WithMessage("Date of birth must be in the past")
            .Must(BeAtLeast18).WithMessage("Must be at least 18 years old");
    }

    private bool BeAtLeast18(DateTime dateOfBirth)
    {
        return dateOfBirth <= DateTime.Today.AddYears(-18);
    }
}
```

## Async Validation

```csharp
public class CreateUserRequestValidator : AbstractValidator<CreateUserRequest>
{
    private readonly IUserRepository _userRepository;

    public CreateUserRequestValidator(IUserRepository userRepository)
    {
        _userRepository = userRepository;

        RuleFor(x => x.Email)
            .NotEmpty()
            .EmailAddress()
            .MustAsync(BeUniqueEmail).WithMessage("Email already exists");

        RuleFor(x => x.Username)
            .NotEmpty()
            .MustAsync(BeUniqueUsername).WithMessage("Username is taken");
    }

    private async Task<bool> BeUniqueEmail(string email, CancellationToken ct)
    {
        return !await _userRepository.ExistsAsync(u => u.Email == email, ct);
    }

    private async Task<bool> BeUniqueUsername(string username, CancellationToken ct)
    {
        return !await _userRepository.ExistsAsync(u => u.Username == username, ct);
    }
}
```

## Conditional Validation

```csharp
public class OrderValidator : AbstractValidator<CreateOrderRequest>
{
    public OrderValidator()
    {
        RuleFor(x => x.ShippingAddress)
            .NotEmpty()
            .When(x => x.DeliveryMethod == DeliveryMethod.Shipping);

        RuleFor(x => x.PickupLocation)
            .NotEmpty()
            .When(x => x.DeliveryMethod == DeliveryMethod.Pickup);

        // Complex condition
        When(x => x.PaymentMethod == PaymentMethod.CreditCard, () =>
        {
            RuleFor(x => x.CardNumber).NotEmpty().CreditCard();
            RuleFor(x => x.ExpiryDate).NotEmpty().Must(BeValidExpiryDate);
            RuleFor(x => x.Cvv).NotEmpty().Length(3, 4);
        });

        // Otherwise
        Otherwise(() =>
        {
            RuleFor(x => x.BankAccountNumber).NotEmpty();
        });
    }
}
```

## Collection Validation

```csharp
public class OrderValidator : AbstractValidator<CreateOrderRequest>
{
    public OrderValidator()
    {
        RuleFor(x => x.Items)
            .NotEmpty().WithMessage("Order must contain at least one item");

        RuleForEach(x => x.Items)
            .SetValidator(new OrderItemValidator());

        // Custom collection rules
        RuleFor(x => x.Items)
            .Must(items => items.Sum(i => i.Quantity) <= 100)
            .WithMessage("Maximum 100 items per order");
    }
}

public class OrderItemValidator : AbstractValidator<OrderItem>
{
    public OrderItemValidator()
    {
        RuleFor(x => x.ProductId).NotEmpty();
        RuleFor(x => x.Quantity).GreaterThan(0).LessThanOrEqualTo(10);
        RuleFor(x => x.Price).GreaterThan(0);
    }
}
```

## Nested Objects

```csharp
public class CustomerValidator : AbstractValidator<Customer>
{
    public CustomerValidator()
    {
        RuleFor(x => x.Name).NotEmpty();

        RuleFor(x => x.Address)
            .NotNull()
            .SetValidator(new AddressValidator());

        // Inline nested validation
        RuleFor(x => x.Contact)
            .ChildRules(contact =>
            {
                contact.RuleFor(c => c.Phone).NotEmpty();
                contact.RuleFor(c => c.Email).EmailAddress();
            });
    }
}

public class AddressValidator : AbstractValidator<Address>
{
    public AddressValidator()
    {
        RuleFor(x => x.Street).NotEmpty().MaximumLength(200);
        RuleFor(x => x.City).NotEmpty().MaximumLength(100);
        RuleFor(x => x.PostalCode).NotEmpty().Matches(@"^\d{5}(-\d{4})?$");
        RuleFor(x => x.Country).NotEmpty().Length(2);
    }
}
```

## Custom Validators

```csharp
// Extensions/ValidationExtensions.cs
public static class ValidationExtensions
{
    public static IRuleBuilderOptions<T, string> PhoneNumber<T>(
        this IRuleBuilder<T, string> ruleBuilder)
    {
        return ruleBuilder
            .Matches(@"^\+?[1-9]\d{1,14}$")
            .WithMessage("Invalid phone number format");
    }

    public static IRuleBuilderOptions<T, string> Slug<T>(
        this IRuleBuilder<T, string> ruleBuilder)
    {
        return ruleBuilder
            .Matches(@"^[a-z0-9]+(?:-[a-z0-9]+)*$")
            .WithMessage("Invalid slug format");
    }

    public static IRuleBuilderOptions<T, decimal> Currency<T>(
        this IRuleBuilder<T, decimal> ruleBuilder)
    {
        return ruleBuilder
            .GreaterThanOrEqualTo(0)
            .PrecisionScale(18, 2, true)
            .WithMessage("Invalid currency format");
    }
}

// Usage
RuleFor(x => x.Phone).PhoneNumber();
RuleFor(x => x.Slug).Slug();
RuleFor(x => x.Price).Currency();
```

## Reusable Property Validators

```csharp
// Validators/PropertyValidators/UniqueEmailValidator.cs
public class UniqueEmailValidator<T> : AsyncPropertyValidator<T, string>
{
    private readonly IUserRepository _userRepository;
    private readonly Guid? _excludeUserId;

    public UniqueEmailValidator(IUserRepository userRepository, Guid? excludeUserId = null)
    {
        _userRepository = userRepository;
        _excludeUserId = excludeUserId;
    }

    public override string Name => "UniqueEmailValidator";

    public override async Task<bool> IsValidAsync(
        ValidationContext<T> context,
        string value,
        CancellationToken ct)
    {
        if (string.IsNullOrEmpty(value)) return true;

        var existingUser = await _userRepository.FindByEmailAsync(value, ct);

        if (existingUser == null) return true;

        return _excludeUserId.HasValue && existingUser.Id == _excludeUserId.Value;
    }

    protected override string GetDefaultMessageTemplate(string errorCode)
        => "Email is already in use";
}

// Usage
RuleFor(x => x.Email).SetAsyncValidator(new UniqueEmailValidator<Request>(_userRepository));
```

## Registration

```csharp
// Program.cs or Startup.cs
builder.Services.AddValidatorsFromAssemblyContaining<CreateUserRequestValidator>();

// With pipeline behavior for MediatR
builder.Services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
```

## MediatR Validation Behavior

```csharp
// Behaviors/ValidationBehavior.cs
public class ValidationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    private readonly IEnumerable<IValidator<TRequest>> _validators;

    public ValidationBehavior(IEnumerable<IValidator<TRequest>> validators)
    {
        _validators = validators;
    }

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        if (!_validators.Any())
        {
            return await next();
        }

        var context = new ValidationContext<TRequest>(request);

        var validationResults = await Task.WhenAll(
            _validators.Select(v => v.ValidateAsync(context, cancellationToken)));

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

## API Endpoint Integration

```csharp
// Using Minimal APIs
app.MapPost("/users", async (
    CreateUserRequest request,
    IValidator<CreateUserRequest> validator,
    IMediator mediator) =>
{
    var result = await validator.ValidateAsync(request);

    if (!result.IsValid)
    {
        return Results.ValidationProblem(result.ToDictionary());
    }

    var user = await mediator.Send(new CreateUserCommand(request));
    return Results.Created($"/users/{user.Id}", user);
});

// Extension for automatic validation
public static class ValidationExtensions
{
    public static async Task<IResult> ValidateAndExecute<T>(
        this T request,
        IValidator<T> validator,
        Func<Task<IResult>> onValid)
    {
        var result = await validator.ValidateAsync(request);

        return result.IsValid
            ? await onValid()
            : Results.ValidationProblem(result.ToDictionary());
    }
}
```

## Anti-patterns

```csharp
// BAD: Business logic in validators
public class OrderValidator : AbstractValidator<Order>
{
    public OrderValidator(IInventoryService inventory)
    {
        RuleFor(x => x.Items)
            .MustAsync(async (items, ct) =>
            {
                await inventory.ReserveItems(items); // Side effect!
                return true;
            });
    }
}

// GOOD: Validators only validate, services handle business logic

// BAD: Catching exceptions in validators
RuleFor(x => x.Value)
    .Must(v =>
    {
        try { return Parse(v); }
        catch { return false; } // Silent failure
    });

// GOOD: Clear validation
RuleFor(x => x.Value).Must(BeValidFormat).WithMessage("Invalid format");

// BAD: Overly specific error messages exposing internals
.WithMessage($"Query failed: {exception.Message}");

// GOOD: User-friendly messages
.WithMessage("Email validation failed. Please try again.");
```
