---
description: ".NET configuration and options pattern"
paths:
  - "**/appsettings*.json"
  - "**/Options/**/*.cs"
  - "**/*Options.cs"
  - "**/*Settings.cs"
---

# .NET Configuration

## Options Pattern

```csharp
// Options/DatabaseOptions.cs
public class DatabaseOptions
{
    public const string SectionName = "Database";

    public string ConnectionString { get; set; } = string.Empty;
    public int CommandTimeout { get; set; } = 30;
    public int MaxRetryCount { get; set; } = 3;
    public bool EnableSensitiveDataLogging { get; set; } = false;
}

// Options/JwtOptions.cs
public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Secret { get; set; } = string.Empty;
    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    public int ExpirationMinutes { get; set; } = 60;
    public int RefreshExpirationDays { get; set; } = 7;
}

// Options/CacheOptions.cs
public class CacheOptions
{
    public const string SectionName = "Cache";

    public string RedisConnectionString { get; set; } = string.Empty;
    public int DefaultExpirationMinutes { get; set; } = 5;
    public string InstanceName { get; set; } = "app";
}
```

## Options Validation

```csharp
// Options/DatabaseOptionsValidator.cs
using FluentValidation;

public class DatabaseOptionsValidator : AbstractValidator<DatabaseOptions>
{
    public DatabaseOptionsValidator()
    {
        RuleFor(x => x.ConnectionString)
            .NotEmpty().WithMessage("Database connection string is required");

        RuleFor(x => x.CommandTimeout)
            .InclusiveBetween(1, 300);

        RuleFor(x => x.MaxRetryCount)
            .InclusiveBetween(0, 10);
    }
}

// Using Data Annotations
public class JwtOptions
{
    public const string SectionName = "Jwt";

    [Required]
    [MinLength(32)]
    public string Secret { get; set; } = string.Empty;

    [Required]
    [Url]
    public string Issuer { get; set; } = string.Empty;

    [Required]
    public string Audience { get; set; } = string.Empty;

    [Range(1, 1440)]
    public int ExpirationMinutes { get; set; } = 60;
}
```

## Registration

```csharp
// Program.cs
builder.Services.AddOptions<DatabaseOptions>()
    .Bind(builder.Configuration.GetSection(DatabaseOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();

builder.Services.AddOptions<JwtOptions>()
    .Bind(builder.Configuration.GetSection(JwtOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();

// With FluentValidation
builder.Services.AddOptions<DatabaseOptions>()
    .Bind(builder.Configuration.GetSection(DatabaseOptions.SectionName))
    .Validate(options =>
    {
        var validator = new DatabaseOptionsValidator();
        var result = validator.Validate(options);
        return result.IsValid;
    })
    .ValidateOnStart();

// Named options
builder.Services.AddOptions<StorageOptions>("primary")
    .Bind(builder.Configuration.GetSection("Storage:Primary"));
builder.Services.AddOptions<StorageOptions>("backup")
    .Bind(builder.Configuration.GetSection("Storage:Backup"));
```

## Consuming Options

```csharp
// Using IOptions<T> (singleton, no reload)
public class UserService
{
    private readonly JwtOptions _jwtOptions;

    public UserService(IOptions<JwtOptions> options)
    {
        _jwtOptions = options.Value;
    }
}

// Using IOptionsSnapshot<T> (scoped, reloads on request)
public class AuthService
{
    private readonly JwtOptions _jwtOptions;

    public AuthService(IOptionsSnapshot<JwtOptions> options)
    {
        _jwtOptions = options.Value;
    }
}

// Using IOptionsMonitor<T> (singleton, live reload)
public class CacheService
{
    private readonly IOptionsMonitor<CacheOptions> _optionsMonitor;

    public CacheService(IOptionsMonitor<CacheOptions> optionsMonitor)
    {
        _optionsMonitor = optionsMonitor;

        // React to changes
        _optionsMonitor.OnChange(options =>
        {
            _logger.LogInformation("Cache options changed");
        });
    }

    public void DoWork()
    {
        var options = _optionsMonitor.CurrentValue;
    }
}

// Named options
public class StorageService
{
    private readonly StorageOptions _primaryOptions;
    private readonly StorageOptions _backupOptions;

    public StorageService(IOptionsSnapshot<StorageOptions> options)
    {
        _primaryOptions = options.Get("primary");
        _backupOptions = options.Get("backup");
    }
}
```

## appsettings.json Structure

```json
{
  "Database": {
    "ConnectionString": "Host=localhost;Database=app;Username=user;Password=pass",
    "CommandTimeout": 30,
    "MaxRetryCount": 3
  },
  "Jwt": {
    "Secret": "your-256-bit-secret-key-here-at-least-32-chars",
    "Issuer": "https://api.example.com",
    "Audience": "https://app.example.com",
    "ExpirationMinutes": 60
  },
  "Cache": {
    "RedisConnectionString": "localhost:6379",
    "DefaultExpirationMinutes": 5,
    "InstanceName": "myapp"
  },
  "Storage": {
    "Primary": {
      "Provider": "S3",
      "BucketName": "primary-bucket"
    },
    "Backup": {
      "Provider": "Azure",
      "ContainerName": "backup-container"
    }
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  }
}
```

## Environment-Specific Configuration

```json
// appsettings.Development.json
{
  "Database": {
    "ConnectionString": "Host=localhost;Database=app_dev",
    "EnableSensitiveDataLogging": true
  }
}

// appsettings.Production.json
{
  "Database": {
    "CommandTimeout": 60,
    "MaxRetryCount": 5
  },
  "Logging": {
    "LogLevel": {
      "Default": "Warning"
    }
  }
}
```

## User Secrets (Development)

```bash
# Initialize
dotnet user-secrets init

# Set secrets
dotnet user-secrets set "Database:ConnectionString" "Host=localhost;Database=app;Password=secret"
dotnet user-secrets set "Jwt:Secret" "my-super-secret-key-for-development"

# List secrets
dotnet user-secrets list
```

## Environment Variables

```csharp
// Program.cs
builder.Configuration
    .AddJsonFile("appsettings.json", optional: false)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true)
    .AddEnvironmentVariables()
    .AddUserSecrets<Program>(optional: true);

// Environment variables override JSON
// Database__ConnectionString -> Database:ConnectionString
// Use double underscore for nested keys
```

## Configuration Providers

```csharp
// Azure Key Vault
builder.Configuration.AddAzureKeyVault(
    new Uri($"https://{vaultName}.vault.azure.net/"),
    new DefaultAzureCredential());

// AWS Secrets Manager
builder.Configuration.AddSecretsManager(configurator: options =>
{
    options.SecretFilter = entry => entry.Name.StartsWith("myapp/");
    options.KeyGenerator = (entry, key) => key.Replace("myapp/", "").Replace("/", ":");
});

// HashiCorp Vault
builder.Configuration.AddVault(options =>
{
    options.Address = "https://vault.example.com";
    options.Token = Environment.GetEnvironmentVariable("VAULT_TOKEN");
});
```

## Feature Flags

```csharp
// Options/FeatureFlags.cs
public class FeatureFlags
{
    public const string SectionName = "Features";

    public bool EnableNewDashboard { get; set; }
    public bool EnableBetaFeatures { get; set; }
    public bool EnableAnalytics { get; set; }
}

// Usage
public class DashboardController
{
    private readonly FeatureFlags _features;

    public DashboardController(IOptions<FeatureFlags> options)
    {
        _features = options.Value;
    }

    [HttpGet]
    public IActionResult Get()
    {
        if (_features.EnableNewDashboard)
        {
            return View("NewDashboard");
        }

        return View("Dashboard");
    }
}
```

## Configuration Extension Methods

```csharp
// Extensions/ConfigurationExtensions.cs
public static class ConfigurationExtensions
{
    public static T GetRequiredOptions<T>(this IConfiguration configuration, string sectionName)
        where T : new()
    {
        var options = new T();
        var section = configuration.GetSection(sectionName);

        if (!section.Exists())
        {
            throw new InvalidOperationException($"Configuration section '{sectionName}' not found");
        }

        section.Bind(options);
        return options;
    }
}

// Extensions/ServiceCollectionExtensions.cs
public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddAppOptions(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddOptions<DatabaseOptions>()
            .Bind(configuration.GetSection(DatabaseOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.AddOptions<JwtOptions>()
            .Bind(configuration.GetSection(JwtOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.AddOptions<CacheOptions>()
            .Bind(configuration.GetSection(CacheOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        return services;
    }
}

// Program.cs
builder.Services.AddAppOptions(builder.Configuration);
```

## Anti-patterns

```csharp
// BAD: Accessing configuration directly
public class UserService
{
    public UserService(IConfiguration configuration)
    {
        var connectionString = configuration["Database:ConnectionString"]; // No type safety!
    }
}

// GOOD: Use Options pattern
public UserService(IOptions<DatabaseOptions> options)
{
    var connectionString = options.Value.ConnectionString;
}

// BAD: Hardcoding secrets
public class JwtService
{
    private readonly string _secret = "hardcoded-secret"; // Security risk!
}

// GOOD: Use configuration/secrets
public JwtService(IOptions<JwtOptions> options)
{
    _secret = options.Value.Secret;
}

// BAD: Not validating options
builder.Services.Configure<DatabaseOptions>(config.GetSection("Database"));
// Missing validation - could fail at runtime

// GOOD: Validate on start
builder.Services.AddOptions<DatabaseOptions>()
    .Bind(config.GetSection("Database"))
    .ValidateDataAnnotations()
    .ValidateOnStart(); // Fails fast if invalid
```
