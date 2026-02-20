---
description: ".NET dependency injection and service lifetimes"
paths:
  - "**/src/**/*.cs"
  - "**/src/**/Program.cs"
  - "**/src/**/Startup.cs"
  - "**/src/**/DependencyInjection.cs"
---

# Dependency Injection (.NET)

## Service Registration

```csharp
// Application/DependencyInjection.cs
public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        // MediatR
        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(typeof(DependencyInjection).Assembly);
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(LoggingBehavior<,>));
        });

        // FluentValidation
        services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly);

        // Application services
        services.AddScoped<IOrderPricingService, OrderPricingService>();

        return services;
    }
}

// Infrastructure/DependencyInjection.cs
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Database
        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseNpgsql(configuration.GetConnectionString("Database")));

        // Repositories
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IOrderRepository, OrderRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        // External services
        services.AddScoped<IEmailService, SendGridEmailService>();
        services.AddHttpClient<IPaymentGateway, StripePaymentGateway>();

        // Caching
        services.AddStackExchangeRedisCache(options =>
            options.Configuration = configuration.GetConnectionString("Redis"));

        return services;
    }
}

// Program.cs
var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddApplication()
    .AddInfrastructure(builder.Configuration);
```

## Primary Constructor Injection (C# 12)

```csharp
// Preferred: Primary constructor
public class UserService(
    IUserRepository userRepository,
    IPasswordHasher passwordHasher,
    ILogger<UserService> logger)
{
    public async Task<Result<User>> CreateAsync(CreateUserCommand command, CancellationToken ct)
    {
        logger.LogInformation("Creating user {Email}", command.Email);
        // Use injected dependencies directly
    }
}

// Also valid: Constructor injection
public class UserService
{
    private readonly IUserRepository _userRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ILogger<UserService> _logger;

    public UserService(
        IUserRepository userRepository,
        IPasswordHasher passwordHasher,
        ILogger<UserService> logger)
    {
        _userRepository = userRepository;
        _passwordHasher = passwordHasher;
        _logger = logger;
    }
}
```

## Lifetimes

```csharp
// Singleton - One instance for the entire app
// Use for: Stateless services, caches, configuration
services.AddSingleton<IDateTimeProvider, DateTimeProvider>();
services.AddSingleton<ICacheService, RedisCacheService>();

// Scoped - One instance per request
// Use for: DbContext, repositories, unit of work, user context
services.AddScoped<ApplicationDbContext>();
services.AddScoped<IUserRepository, UserRepository>();
services.AddScoped<ICurrentUserService, CurrentUserService>();

// Transient - New instance every time
// Use for: Lightweight, stateless services
services.AddTransient<IEmailBuilder, EmailBuilder>();
services.AddTransient<IPdfGenerator, PdfGenerator>();
```

## Options Pattern

```csharp
// Settings class
public class JwtSettings
{
    public const string SectionName = "Jwt";

    public required string Secret { get; init; }
    public required string Issuer { get; init; }
    public required string Audience { get; init; }
    public int ExpiryMinutes { get; init; } = 60;
}

// Registration
services.Configure<JwtSettings>(configuration.GetSection(JwtSettings.SectionName));

// Or with validation
services.AddOptions<JwtSettings>()
    .Bind(configuration.GetSection(JwtSettings.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();

// Usage - IOptions (singleton-like, read once at startup)
public class JwtService(IOptions<JwtSettings> options)
{
    private readonly JwtSettings _settings = options.Value;
}

// Usage - IOptionsSnapshot (scoped, can reload)
public class JwtService(IOptionsSnapshot<JwtSettings> options)
{
    private readonly JwtSettings _settings = options.Value;
}

// Usage - IOptionsMonitor (singleton, live updates)
public class JwtService(IOptionsMonitor<JwtSettings> options)
{
    public void DoSomething()
    {
        var settings = options.CurrentValue; // Always current
    }
}
```

## Keyed Services (.NET 8+)

```csharp
// Registration
services.AddKeyedScoped<IPaymentGateway, StripeGateway>("stripe");
services.AddKeyedScoped<IPaymentGateway, PayPalGateway>("paypal");
services.AddKeyedScoped<IPaymentGateway, BraintreeGateway>("braintree");

// Injection
public class PaymentService([FromKeyedServices("stripe")] IPaymentGateway gateway)
{
    public async Task ProcessAsync(Payment payment)
    {
        await gateway.ChargeAsync(payment);
    }
}

// Dynamic resolution
public class PaymentService(IServiceProvider serviceProvider)
{
    public async Task ProcessAsync(Payment payment)
    {
        var gateway = serviceProvider.GetRequiredKeyedService<IPaymentGateway>(
            payment.GatewayType);
        await gateway.ChargeAsync(payment);
    }
}
```

## Factory Pattern

```csharp
// When you need runtime parameters
public interface IReportGeneratorFactory
{
    IReportGenerator Create(ReportType type);
}

public class ReportGeneratorFactory(IServiceProvider serviceProvider) : IReportGeneratorFactory
{
    public IReportGenerator Create(ReportType type) => type switch
    {
        ReportType.Pdf => serviceProvider.GetRequiredService<PdfReportGenerator>(),
        ReportType.Excel => serviceProvider.GetRequiredService<ExcelReportGenerator>(),
        ReportType.Csv => serviceProvider.GetRequiredService<CsvReportGenerator>(),
        _ => throw new ArgumentOutOfRangeException(nameof(type))
    };
}

// Registration
services.AddScoped<IReportGeneratorFactory, ReportGeneratorFactory>();
services.AddScoped<PdfReportGenerator>();
services.AddScoped<ExcelReportGenerator>();
services.AddScoped<CsvReportGenerator>();
```

## Decorator Pattern

```csharp
// Interface
public interface IUserRepository
{
    Task<User?> GetByIdAsync(Guid id, CancellationToken ct);
}

// Base implementation
public class UserRepository(ApplicationDbContext context) : IUserRepository
{
    public async Task<User?> GetByIdAsync(Guid id, CancellationToken ct) =>
        await context.Users.FindAsync([id], ct);
}

// Caching decorator
public class CachedUserRepository(
    IUserRepository inner,
    IDistributedCache cache) : IUserRepository
{
    public async Task<User?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        var cacheKey = $"user:{id}";
        var cached = await cache.GetStringAsync(cacheKey, ct);

        if (cached is not null)
        {
            return JsonSerializer.Deserialize<User>(cached);
        }

        var user = await inner.GetByIdAsync(id, ct);

        if (user is not null)
        {
            await cache.SetStringAsync(
                cacheKey,
                JsonSerializer.Serialize(user),
                new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5) },
                ct);
        }

        return user;
    }
}

// Registration with Scrutor
services.AddScoped<UserRepository>();
services.AddScoped<IUserRepository, UserRepository>();
services.Decorate<IUserRepository, CachedUserRepository>();

// Or manual decoration
services.AddScoped<UserRepository>();
services.AddScoped<IUserRepository>(sp =>
    new CachedUserRepository(
        sp.GetRequiredService<UserRepository>(),
        sp.GetRequiredService<IDistributedCache>()));
```

## Anti-Patterns

```csharp
// BAD: Service locator pattern
public class UserService(IServiceProvider serviceProvider)
{
    public async Task DoSomething()
    {
        var repo = serviceProvider.GetRequiredService<IUserRepository>();
        // Hidden dependency!
    }
}

// GOOD: Explicit dependencies
public class UserService(IUserRepository userRepository)
{
    public async Task DoSomething()
    {
        // Dependency is visible in constructor
    }
}


// BAD: Captive dependency (scoped inside singleton)
services.AddSingleton<MySingletonService>();  // Singleton
services.AddScoped<ApplicationDbContext>();   // Scoped

public class MySingletonService(ApplicationDbContext context)  // DbContext captured!
{
    // This DbContext will live forever, causing memory leaks
}

// GOOD: Use IServiceScopeFactory for scoped dependencies in singletons
public class MySingletonService(IServiceScopeFactory scopeFactory)
{
    public async Task DoSomething()
    {
        using var scope = scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        // Properly scoped
    }
}


// BAD: New-ing up dependencies
public class UserService
{
    private readonly UserRepository _repo = new UserRepository();  // Hard to test!
}

// GOOD: Inject dependencies
public class UserService(IUserRepository repo)
{
    // Easy to mock in tests
}
```
