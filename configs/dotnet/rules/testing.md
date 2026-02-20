---
description: ".NET testing with xUnit and NSubstitute"
paths:
  - "**/tests/**/*.cs"
  - "**/*.Tests/**/*.cs"
  - "**/*Tests.cs"
---

# .NET Testing Rules

## Test Project Structure

```
tests/
├── Domain.UnitTests/
│   └── Entities/
│       └── UserTests.cs
├── Application.UnitTests/
│   └── Users/
│       └── Commands/
│           └── CreateUserCommandHandlerTests.cs
├── Infrastructure.IntegrationTests/
│   └── Repositories/
│       └── UserRepositoryTests.cs
└── WebApi.IntegrationTests/
    └── Endpoints/
        └── UsersEndpointsTests.cs
```

## Unit Tests (xUnit + NSubstitute + FluentAssertions)

### Naming Convention

```csharp
// Method_Scenario_ExpectedResult
public class UserTests
{
    [Fact]
    public void Create_WithValidEmail_ReturnsUser()
    {
        // Arrange
        var email = "test@example.com";
        var passwordHash = "hashedPassword";

        // Act
        var user = User.Create(email, passwordHash);

        // Assert
        user.Should().NotBeNull();
        user.Email.Should().Be(email);
        user.Id.Should().NotBeEmpty();
    }

    [Fact]
    public void Create_WithEmptyEmail_ThrowsArgumentException()
    {
        // Arrange
        var email = "";
        var passwordHash = "hashedPassword";

        // Act
        var act = () => User.Create(email, passwordHash);

        // Assert
        act.Should().Throw<ArgumentException>()
            .WithMessage("*email*");
    }
}
```

### Testing Handlers with Mocks

```csharp
public class CreateUserCommandHandlerTests
{
    private readonly IUserRepository _userRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly CreateUserCommandHandler _sut;

    public CreateUserCommandHandlerTests()
    {
        _userRepository = Substitute.For<IUserRepository>();
        _passwordHasher = Substitute.For<IPasswordHasher>();
        _sut = new CreateUserCommandHandler(_userRepository, _passwordHasher);
    }

    [Fact]
    public async Task Handle_ValidCommand_CreatesUserAndReturnsId()
    {
        // Arrange
        var command = new CreateUserCommand("test@example.com", "Password123!");
        _passwordHasher.Hash(command.Password).Returns("hashedPassword");

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.Should().NotBeEmpty();
        await _userRepository.Received(1).AddAsync(
            Arg.Is<User>(u => u.Email == command.Email),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ExistingEmail_ThrowsValidationException()
    {
        // Arrange
        var command = new CreateUserCommand("existing@example.com", "Password123!");
        _userRepository.ExistsAsync(command.Email, Arg.Any<CancellationToken>())
            .Returns(true);

        // Act
        var act = () => _sut.Handle(command, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<ValidationException>();
    }
}
```

### Testing Validators

```csharp
public class CreateUserCommandValidatorTests
{
    private readonly CreateUserCommandValidator _sut;
    private readonly IUserRepository _userRepository;

    public CreateUserCommandValidatorTests()
    {
        _userRepository = Substitute.For<IUserRepository>();
        _sut = new CreateUserCommandValidator(_userRepository);
    }

    [Theory]
    [InlineData("")]
    [InlineData("invalid")]
    [InlineData("missing@")]
    public async Task Validate_InvalidEmail_ReturnsError(string email)
    {
        // Arrange
        var command = new CreateUserCommand(email, "Password123!");

        // Act
        var result = await _sut.ValidateAsync(command);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "Email");
    }

    [Theory]
    [InlineData("short")]
    [InlineData("nouppercase1")]
    [InlineData("NOLOWERCASE1")]
    [InlineData("NoDigitsHere")]
    public async Task Validate_WeakPassword_ReturnsError(string password)
    {
        // Arrange
        var command = new CreateUserCommand("test@example.com", password);

        // Act
        var result = await _sut.ValidateAsync(command);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "Password");
    }
}
```

## Integration Tests

### Database Tests with Test Containers

```csharp
public class UserRepositoryTests : IAsyncLifetime
{
    private readonly MsSqlContainer _sqlContainer = new MsSqlBuilder()
        .WithImage("mcr.microsoft.com/mssql/server:2022-latest")
        .Build();

    private ApplicationDbContext _context = null!;
    private UserRepository _sut = null!;

    public async Task InitializeAsync()
    {
        await _sqlContainer.StartAsync();

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlServer(_sqlContainer.GetConnectionString())
            .Options;

        _context = new ApplicationDbContext(options);
        await _context.Database.MigrateAsync();

        _sut = new UserRepository(_context);
    }

    public async Task DisposeAsync()
    {
        await _context.DisposeAsync();
        await _sqlContainer.DisposeAsync();
    }

    [Fact]
    public async Task AddAsync_ValidUser_PersistsToDatabase()
    {
        // Arrange
        var user = User.Create("test@example.com", "hashedPassword");

        // Act
        await _sut.AddAsync(user);

        // Assert
        var savedUser = await _context.Users.FindAsync(user.Id);
        savedUser.Should().NotBeNull();
        savedUser!.Email.Should().Be(user.Email);
    }
}
```

### API Integration Tests with WebApplicationFactory

```csharp
public class UsersEndpointsTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;
    private readonly WebApplicationFactory<Program> _factory;

    public UsersEndpointsTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                // Replace real DB with in-memory
                var descriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>));
                if (descriptor != null) services.Remove(descriptor);

                services.AddDbContext<ApplicationDbContext>(options =>
                    options.UseInMemoryDatabase("TestDb"));
            });
        });

        _client = _factory.CreateClient();
    }

    [Fact]
    public async Task CreateUser_ValidRequest_Returns201()
    {
        // Arrange
        var request = new { Email = "test@example.com", Password = "Password123!" };

        // Act
        var response = await _client.PostAsJsonAsync("/api/users", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        response.Headers.Location.Should().NotBeNull();
    }

    [Fact]
    public async Task CreateUser_InvalidEmail_Returns400WithProblemDetails()
    {
        // Arrange
        var request = new { Email = "invalid", Password = "Password123!" };

        // Act
        var response = await _client.PostAsJsonAsync("/api/users", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var problemDetails = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        problemDetails!.Errors.Should().ContainKey("Email");
    }

    [Fact]
    public async Task GetUser_NonExistent_Returns404()
    {
        // Act
        var response = await _client.GetAsync($"/api/users/{Guid.NewGuid()}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
```

### Authenticated Tests

```csharp
public class AuthenticatedEndpointsTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public AuthenticatedEndpointsTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                // Add test authentication
                services.AddAuthentication("Test")
                    .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("Test", null);
            });
        }).CreateClient();

        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Test");
    }

    [Fact]
    public async Task GetProfile_Authenticated_Returns200()
    {
        var response = await _client.GetAsync("/api/users/me");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}

// Test auth handler
public class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public TestAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : base(options, logger, encoder) { }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var claims = new[] { new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()) };
        var identity = new ClaimsIdentity(claims, "Test");
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, "Test");
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
```

## Test Data Builders

```csharp
public class UserBuilder
{
    private Guid _id = Guid.NewGuid();
    private string _email = "default@example.com";
    private string _passwordHash = "hashedPassword";
    private string _role = "User";

    public UserBuilder WithId(Guid id) { _id = id; return this; }
    public UserBuilder WithEmail(string email) { _email = email; return this; }
    public UserBuilder WithRole(string role) { _role = role; return this; }
    public UserBuilder AsAdmin() => WithRole("Admin");

    public User Build()
    {
        // Use reflection or internal setters for testing
        return new User
        {
            Id = _id,
            Email = _email,
            PasswordHash = _passwordHash,
            Role = _role
        };
    }
}

// Usage
var user = new UserBuilder()
    .WithEmail("admin@example.com")
    .AsAdmin()
    .Build();
```

## Code Coverage

```bash
# Run with coverage
dotnet test --collect:"XPlat Code Coverage"

# Generate HTML report (requires reportgenerator tool)
dotnet tool install -g dotnet-reportgenerator-globaltool
reportgenerator -reports:"**/coverage.cobertura.xml" -targetdir:"coveragereport" -reporttypes:Html
```

### Coverage Thresholds

Target: **80%+ coverage** on Application and Domain layers.
