---
paths:
  - "src/WebApi/**/*.cs"
  - "src/**/Controllers/**/*.cs"
  - "src/**/Endpoints/**/*.cs"
---

# ASP.NET Core API Rules

## Minimal APIs vs Controllers

### Minimal APIs (Recommended for .NET 8+)

```csharp
// Organized by feature in extension methods
public static class UserEndpoints
{
    public static IEndpointRouteBuilder MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users")
            .WithTags("Users")
            .RequireAuthorization();

        group.MapGet("/", GetUsers);
        group.MapGet("/{id:guid}", GetUser).WithName("GetUser");
        group.MapPost("/", CreateUser);
        group.MapPut("/{id:guid}", UpdateUser);
        group.MapDelete("/{id:guid}", DeleteUser);

        return app;
    }

    private static async Task<IResult> GetUsers(
        [AsParameters] GetUsersQuery query,
        ISender sender)
    {
        var result = await sender.Send(query);
        return Results.Ok(result);
    }

    private static async Task<IResult> GetUser(
        Guid id,
        ISender sender)
    {
        var result = await sender.Send(new GetUserQuery(id));
        return result is not null ? Results.Ok(result) : Results.NotFound();
    }

    private static async Task<IResult> CreateUser(
        CreateUserCommand command,
        ISender sender)
    {
        var id = await sender.Send(command);
        return Results.CreatedAtRoute("GetUser", new { id }, new { id });
    }

    private static async Task<IResult> UpdateUser(
        Guid id,
        UpdateUserCommand command,
        ISender sender)
    {
        if (id != command.Id) return Results.BadRequest();
        await sender.Send(command);
        return Results.NoContent();
    }

    private static async Task<IResult> DeleteUser(
        Guid id,
        ISender sender)
    {
        await sender.Send(new DeleteUserCommand(id));
        return Results.NoContent();
    }
}

// Program.cs
app.MapUserEndpoints();
```

### Controllers (When More Control Needed)

```csharp
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class UsersController(ISender sender) : ControllerBase
{
    /// <summary>
    /// Get all users with pagination
    /// </summary>
    [HttpGet]
    [ProducesResponseType<PaginatedList<UserDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll([FromQuery] GetUsersQuery query)
    {
        return Ok(await sender.Send(query));
    }

    /// <summary>
    /// Get a user by ID
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType<UserDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(Guid id)
    {
        var user = await sender.Send(new GetUserQuery(id));
        return user is not null ? Ok(user) : NotFound();
    }

    /// <summary>
    /// Create a new user
    /// </summary>
    [HttpPost]
    [ProducesResponseType<Guid>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create(CreateUserCommand command)
    {
        var id = await sender.Send(command);
        return CreatedAtAction(nameof(Get), new { id }, new { id });
    }

    /// <summary>
    /// Update an existing user
    /// </summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(Guid id, UpdateUserCommand command)
    {
        if (id != command.Id) return BadRequest();
        await sender.Send(command);
        return NoContent();
    }

    /// <summary>
    /// Delete a user
    /// </summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(Guid id)
    {
        await sender.Send(new DeleteUserCommand(id));
        return NoContent();
    }
}
```

## Request/Response Patterns

### Pagination

```csharp
// Query with pagination
public record GetUsersQuery(int Page = 1, int PageSize = 10) : IRequest<PaginatedList<UserDto>>;

// Paginated response
public class PaginatedList<T>
{
    public IReadOnlyList<T> Items { get; }
    public int Page { get; }
    public int PageSize { get; }
    public int TotalCount { get; }
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
    public bool HasPreviousPage => Page > 1;
    public bool HasNextPage => Page < TotalPages;

    public PaginatedList(IReadOnlyList<T> items, int count, int page, int pageSize)
    {
        Items = items;
        TotalCount = count;
        Page = page;
        PageSize = pageSize;
    }
}
```

### Error Responses (Problem Details)

```csharp
// Always use ProblemDetails for errors (RFC 7807)
app.UseExceptionHandler(exceptionApp =>
{
    exceptionApp.Run(async context =>
    {
        var exception = context.Features.Get<IExceptionHandlerFeature>()?.Error;

        var problemDetails = exception switch
        {
            ValidationException ex => new ValidationProblemDetails(
                ex.Errors.GroupBy(e => e.PropertyName)
                    .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray()))
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Validation Error"
            },
            NotFoundException ex => new ProblemDetails
            {
                Status = StatusCodes.Status404NotFound,
                Title = "Not Found",
                Detail = ex.Message
            },
            UnauthorizedAccessException => new ProblemDetails
            {
                Status = StatusCodes.Status401Unauthorized,
                Title = "Unauthorized"
            },
            _ => new ProblemDetails
            {
                Status = StatusCodes.Status500InternalServerError,
                Title = "Server Error"
            }
        };

        context.Response.StatusCode = problemDetails.Status ?? 500;
        await context.Response.WriteAsJsonAsync(problemDetails);
    });
});
```

## OpenAPI / Swagger

```csharp
// Program.cs
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "My API",
        Version = "v1",
        Description = "API Description"
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });

    // Include XML comments
    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    options.IncludeXmlComments(Path.Combine(AppContext.BaseDirectory, xmlFile));
});

// Enable only in development
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
```

## Authentication

### JWT Bearer

```csharp
// Program.cs
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
        };
    });

builder.Services.AddAuthorization();

// Middleware order matters!
app.UseAuthentication();
app.UseAuthorization();
```

### Policy-Based Authorization

```csharp
// Define policies
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));
    options.AddPolicy("CanManageUsers", policy =>
        policy.RequireClaim("permission", "users:manage"));
});

// Use on endpoints
app.MapDelete("/api/users/{id}", DeleteUser)
    .RequireAuthorization("AdminOnly");

// Or on controllers
[Authorize(Policy = "AdminOnly")]
public class AdminController : ControllerBase { }
```

## Versioning

```csharp
builder.Services.AddApiVersioning(options =>
{
    options.DefaultApiVersion = new ApiVersion(1, 0);
    options.AssumeDefaultVersionWhenUnspecified = true;
    options.ReportApiVersions = true;
    options.ApiVersionReader = ApiVersionReader.Combine(
        new UrlSegmentApiVersionReader(),
        new HeaderApiVersionReader("X-Api-Version"));
}).AddApiExplorer(options =>
{
    options.GroupNameFormat = "'v'VVV";
    options.SubstituteApiVersionInUrl = true;
});

// Usage
app.MapGroup("/api/v{version:apiVersion}/users")
    .MapUserEndpoints()
    .HasApiVersion(1.0)
    .HasApiVersion(2.0);
```

## Rate Limiting

```csharp
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("fixed", config =>
    {
        config.Window = TimeSpan.FromMinutes(1);
        config.PermitLimit = 100;
        config.QueueLimit = 0;
    });

    options.AddTokenBucketLimiter("token", config =>
    {
        config.TokenLimit = 100;
        config.ReplenishmentPeriod = TimeSpan.FromSeconds(10);
        config.TokensPerPeriod = 10;
    });

    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

app.UseRateLimiter();

// Apply to endpoints
app.MapGet("/api/users", GetUsers).RequireRateLimiting("fixed");
```
