---
paths:
  - "**/*Middleware.cs"
  - "**/Middleware/**/*.cs"
---

# .NET Middleware

## Basic Middleware

```csharp
// Middleware/RequestLoggingMiddleware.cs
public class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;

    public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var stopwatch = Stopwatch.StartNew();

        try
        {
            await _next(context);
        }
        finally
        {
            stopwatch.Stop();

            _logger.LogInformation(
                "{Method} {Path} responded {StatusCode} in {ElapsedMs}ms",
                context.Request.Method,
                context.Request.Path,
                context.Response.StatusCode,
                stopwatch.ElapsedMilliseconds);
        }
    }
}

// Extension method
public static class RequestLoggingMiddlewareExtensions
{
    public static IApplicationBuilder UseRequestLogging(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<RequestLoggingMiddleware>();
    }
}
```

## Correlation ID Middleware

```csharp
// Middleware/CorrelationIdMiddleware.cs
public class CorrelationIdMiddleware
{
    private const string CorrelationIdHeader = "X-Correlation-ID";
    private readonly RequestDelegate _next;

    public CorrelationIdMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var correlationId = GetOrCreateCorrelationId(context);

        // Add to response headers
        context.Response.OnStarting(() =>
        {
            context.Response.Headers.TryAdd(CorrelationIdHeader, correlationId);
            return Task.CompletedTask;
        });

        // Store in Items for access throughout request
        context.Items["CorrelationId"] = correlationId;

        // Add to logging scope
        using (_logger.BeginScope(new Dictionary<string, object>
        {
            ["CorrelationId"] = correlationId
        }))
        {
            await _next(context);
        }
    }

    private static string GetOrCreateCorrelationId(HttpContext context)
    {
        if (context.Request.Headers.TryGetValue(CorrelationIdHeader, out var existingId))
        {
            return existingId.ToString();
        }

        return Guid.NewGuid().ToString();
    }
}
```

## Exception Handling Middleware

```csharp
// Middleware/ExceptionHandlingMiddleware.cs
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;
    private readonly IHostEnvironment _env;

    public ExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ExceptionHandlingMiddleware> logger,
        IHostEnvironment env)
    {
        _next = next;
        _logger = logger;
        _env = env;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (statusCode, title, detail) = exception switch
        {
            ValidationException ex => (
                StatusCodes.Status400BadRequest,
                "Validation Error",
                string.Join("; ", ex.Errors.Select(e => e.ErrorMessage))),

            NotFoundException ex => (
                StatusCodes.Status404NotFound,
                "Not Found",
                ex.Message),

            UnauthorizedAccessException => (
                StatusCodes.Status401Unauthorized,
                "Unauthorized",
                "Authentication required"),

            ForbiddenException => (
                StatusCodes.Status403Forbidden,
                "Forbidden",
                "Insufficient permissions"),

            ConflictException ex => (
                StatusCodes.Status409Conflict,
                "Conflict",
                ex.Message),

            _ => (
                StatusCodes.Status500InternalServerError,
                "Internal Server Error",
                _env.IsDevelopment() ? exception.Message : "An error occurred")
        };

        _logger.LogError(exception, "Exception occurred: {Message}", exception.Message);

        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/problem+json";

        var problemDetails = new ProblemDetails
        {
            Status = statusCode,
            Title = title,
            Detail = detail,
            Instance = context.Request.Path
        };

        if (_env.IsDevelopment())
        {
            problemDetails.Extensions["stackTrace"] = exception.StackTrace;
        }

        await context.Response.WriteAsJsonAsync(problemDetails);
    }
}
```

## Rate Limiting Middleware

```csharp
// Middleware/RateLimitingMiddleware.cs
public class RateLimitingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IDistributedCache _cache;
    private readonly RateLimitOptions _options;

    public RateLimitingMiddleware(
        RequestDelegate next,
        IDistributedCache cache,
        IOptions<RateLimitOptions> options)
    {
        _next = next;
        _cache = cache;
        _options = options.Value;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var clientId = GetClientIdentifier(context);
        var key = $"rate-limit:{clientId}";

        var currentCount = await GetRequestCountAsync(key);

        if (currentCount >= _options.MaxRequests)
        {
            context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
            context.Response.Headers.RetryAfter = _options.WindowSeconds.ToString();
            await context.Response.WriteAsJsonAsync(new
            {
                error = "Too many requests",
                retryAfter = _options.WindowSeconds
            });
            return;
        }

        await IncrementRequestCountAsync(key);

        context.Response.Headers.Append("X-RateLimit-Limit", _options.MaxRequests.ToString());
        context.Response.Headers.Append("X-RateLimit-Remaining", (options.MaxRequests - currentCount - 1).ToString());

        await _next(context);
    }

    private string GetClientIdentifier(HttpContext context)
    {
        // Prefer authenticated user ID, fallback to IP
        return context.User.Identity?.IsAuthenticated == true
            ? context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? context.Connection.RemoteIpAddress?.ToString() ?? "anonymous"
            : context.Connection.RemoteIpAddress?.ToString() ?? "anonymous";
    }

    private async Task<int> GetRequestCountAsync(string key)
    {
        var value = await _cache.GetStringAsync(key);
        return int.TryParse(value, out var count) ? count : 0;
    }

    private async Task IncrementRequestCountAsync(string key)
    {
        var count = await GetRequestCountAsync(key) + 1;
        await _cache.SetStringAsync(
            key,
            count.ToString(),
            new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(_options.WindowSeconds)
            });
    }
}

public class RateLimitOptions
{
    public int MaxRequests { get; set; } = 100;
    public int WindowSeconds { get; set; } = 60;
}
```

## Security Headers Middleware

```csharp
// Middleware/SecurityHeadersMiddleware.cs
public class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;

    public SecurityHeadersMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Security headers
        context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
        context.Response.Headers.Append("X-Frame-Options", "DENY");
        context.Response.Headers.Append("X-XSS-Protection", "1; mode=block");
        context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
        context.Response.Headers.Append(
            "Content-Security-Policy",
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';");
        context.Response.Headers.Append(
            "Permissions-Policy",
            "camera=(), microphone=(), geolocation=()");

        // Remove server header
        context.Response.Headers.Remove("Server");
        context.Response.Headers.Remove("X-Powered-By");

        await _next(context);
    }
}
```

## Request Timeout Middleware

```csharp
// Middleware/RequestTimeoutMiddleware.cs
public class RequestTimeoutMiddleware
{
    private readonly RequestDelegate _next;
    private readonly TimeSpan _timeout;

    public RequestTimeoutMiddleware(RequestDelegate next, TimeSpan timeout)
    {
        _next = next;
        _timeout = timeout;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(context.RequestAborted);
        cts.CancelAfter(_timeout);

        context.RequestAborted = cts.Token;

        try
        {
            await _next(context);
        }
        catch (OperationCanceledException) when (cts.IsCancellationRequested)
        {
            context.Response.StatusCode = StatusCodes.Status408RequestTimeout;
            await context.Response.WriteAsJsonAsync(new { error = "Request timeout" });
        }
    }
}
```

## Tenant Resolution Middleware

```csharp
// Middleware/TenantMiddleware.cs
public class TenantMiddleware
{
    private readonly RequestDelegate _next;

    public TenantMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, ITenantResolver tenantResolver)
    {
        var tenantId = ResolveTenantId(context);

        if (string.IsNullOrEmpty(tenantId))
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await context.Response.WriteAsJsonAsync(new { error = "Tenant not specified" });
            return;
        }

        var tenant = await tenantResolver.ResolveAsync(tenantId);

        if (tenant == null)
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            await context.Response.WriteAsJsonAsync(new { error = "Tenant not found" });
            return;
        }

        context.Items["Tenant"] = tenant;
        context.Items["TenantId"] = tenant.Id;

        await _next(context);
    }

    private static string? ResolveTenantId(HttpContext context)
    {
        // From header
        if (context.Request.Headers.TryGetValue("X-Tenant-ID", out var headerValue))
        {
            return headerValue.ToString();
        }

        // From subdomain
        var host = context.Request.Host.Host;
        var subdomain = host.Split('.').FirstOrDefault();
        if (!string.IsNullOrEmpty(subdomain) && subdomain != "www")
        {
            return subdomain;
        }

        // From claim
        return context.User.FindFirst("tenant_id")?.Value;
    }
}
```

## Middleware Registration Order

```csharp
// Program.cs
var app = builder.Build();

// 1. Exception handling (first to catch all)
app.UseMiddleware<ExceptionHandlingMiddleware>();

// 2. Security headers
app.UseMiddleware<SecurityHeadersMiddleware>();

// 3. Correlation ID (before logging)
app.UseMiddleware<CorrelationIdMiddleware>();

// 4. Request logging
app.UseMiddleware<RequestLoggingMiddleware>();

// 5. Rate limiting
app.UseMiddleware<RateLimitingMiddleware>();

// 6. Built-in middleware
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

// 7. Tenant resolution (after auth)
app.UseMiddleware<TenantMiddleware>();

// 8. Endpoints
app.MapControllers();

app.Run();
```

## Anti-patterns

```csharp
// BAD: Middleware with scoped dependencies in constructor
public class BadMiddleware
{
    private readonly IDbContext _context; // Scoped service!

    public BadMiddleware(RequestDelegate next, IDbContext context)
    {
        _context = context; // Will use same instance for all requests!
    }
}

// GOOD: Inject scoped services in InvokeAsync
public async Task InvokeAsync(HttpContext context, IDbContext dbContext)
{
    // dbContext is resolved per request
}

// BAD: Blocking in middleware
public async Task InvokeAsync(HttpContext context)
{
    var result = _service.GetData().Result; // Deadlock risk!
}

// GOOD: Use async/await
public async Task InvokeAsync(HttpContext context)
{
    var result = await _service.GetDataAsync();
}

// BAD: Modifying response after body written
public async Task InvokeAsync(HttpContext context)
{
    await _next(context);
    context.Response.Headers.Add("X-Custom", "value"); // May fail!
}

// GOOD: Use OnStarting callback
context.Response.OnStarting(() =>
{
    context.Response.Headers.Add("X-Custom", "value");
    return Task.CompletedTask;
});
```
