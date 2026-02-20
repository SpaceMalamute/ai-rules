---
paths:
  - "**/src/Infrastructure/**/*.cs"
  - "**/*DbContext*.cs"
  - "**/*Repository*.cs"
  - "**/Configurations/**/*.cs"
---

# Entity Framework Core Rules

## DbContext Setup

```csharp
public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : DbContext(options), IApplicationDbContext
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Post> Posts => Set<Post>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Apply all configurations from assembly
        modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());

        base.OnModelCreating(modelBuilder);
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        // Audit timestamps
        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.CreatedAt = DateTime.UtcNow;
                    break;
                case EntityState.Modified:
                    entry.Entity.UpdatedAt = DateTime.UtcNow;
                    break;
            }
        }

        return await base.SaveChangesAsync(cancellationToken);
    }
}
```

## Entity Configuration

### Fluent Configuration (Preferred)

```csharp
// Configurations/UserConfiguration.cs
public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("users");

        builder.HasKey(u => u.Id);

        builder.Property(u => u.Id)
            .HasColumnName("id")
            .ValueGeneratedNever(); // Use app-generated GUIDs

        builder.Property(u => u.Email)
            .HasColumnName("email")
            .HasMaxLength(256)
            .IsRequired();

        builder.HasIndex(u => u.Email)
            .IsUnique();

        builder.Property(u => u.PasswordHash)
            .HasColumnName("password_hash")
            .HasMaxLength(256)
            .IsRequired();

        builder.Property(u => u.Name)
            .HasColumnName("name")
            .HasMaxLength(100);

        builder.Property(u => u.Role)
            .HasColumnName("role")
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(u => u.CreatedAt)
            .HasColumnName("created_at")
            .HasDefaultValueSql("GETUTCDATE()");

        builder.Property(u => u.UpdatedAt)
            .HasColumnName("updated_at");

        // Relationships
        builder.HasMany(u => u.Posts)
            .WithOne(p => p.Author)
            .HasForeignKey(p => p.AuthorId)
            .OnDelete(DeleteBehavior.Cascade);

        // Value Object
        builder.OwnsOne(u => u.Address, address =>
        {
            address.Property(a => a.Street).HasColumnName("address_street");
            address.Property(a => a.City).HasColumnName("address_city");
            address.Property(a => a.ZipCode).HasColumnName("address_zip");
        });
    }
}
```

### Naming Conventions

| C# | Database |
|----|----------|
| PascalCase properties | snake_case columns |
| PascalCase entities | snake_case tables |

```csharp
// Global snake_case convention
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    foreach (var entity in modelBuilder.Model.GetEntityTypes())
    {
        // Table name
        entity.SetTableName(ToSnakeCase(entity.GetTableName()!));

        // Column names
        foreach (var property in entity.GetProperties())
        {
            property.SetColumnName(ToSnakeCase(property.Name));
        }

        // Foreign keys
        foreach (var key in entity.GetForeignKeys())
        {
            key.SetConstraintName(ToSnakeCase(key.GetConstraintName()!));
        }
    }
}

private static string ToSnakeCase(string name)
{
    return string.Concat(name.Select((c, i) =>
        i > 0 && char.IsUpper(c) ? "_" + c : c.ToString()))
        .ToLower();
}
```

## Repository Pattern

```csharp
// Domain/Interfaces/IRepository.cs
public interface IRepository<T> where T : class
{
    Task<T?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<T>> GetAllAsync(CancellationToken cancellationToken = default);
    Task AddAsync(T entity, CancellationToken cancellationToken = default);
    void Update(T entity);
    void Remove(T entity);
}

// Infrastructure/Repositories/Repository.cs
public class Repository<T>(ApplicationDbContext context) : IRepository<T>
    where T : class
{
    protected readonly DbSet<T> DbSet = context.Set<T>();

    public virtual async Task<T?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await DbSet.FindAsync([id], cancellationToken);
    }

    public virtual async Task<IReadOnlyList<T>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await DbSet.ToListAsync(cancellationToken);
    }

    public async Task AddAsync(T entity, CancellationToken cancellationToken = default)
    {
        await DbSet.AddAsync(entity, cancellationToken);
        await context.SaveChangesAsync(cancellationToken);
    }

    public void Update(T entity)
    {
        DbSet.Update(entity);
    }

    public void Remove(T entity)
    {
        DbSet.Remove(entity);
    }
}
```

## Query Patterns

### Specification Pattern

```csharp
// Base specification
public abstract class Specification<T>
{
    public abstract Expression<Func<T, bool>> ToExpression();

    public bool IsSatisfiedBy(T entity)
    {
        return ToExpression().Compile()(entity);
    }
}

// Concrete specification
public class ActiveUsersSpecification : Specification<User>
{
    public override Expression<Func<User, bool>> ToExpression()
    {
        return user => user.IsActive && user.EmailVerified;
    }
}

// Usage in repository
public async Task<IReadOnlyList<User>> GetBySpecificationAsync(
    Specification<User> spec,
    CancellationToken cancellationToken = default)
{
    return await DbSet
        .Where(spec.ToExpression())
        .ToListAsync(cancellationToken);
}
```

### Pagination

```csharp
public async Task<PaginatedList<User>> GetPaginatedAsync(
    int page,
    int pageSize,
    CancellationToken cancellationToken = default)
{
    var query = DbSet.AsNoTracking();

    var totalCount = await query.CountAsync(cancellationToken);

    var items = await query
        .OrderBy(u => u.CreatedAt)
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .ToListAsync(cancellationToken);

    return new PaginatedList<User>(items, totalCount, page, pageSize);
}
```

### Efficient Queries

```csharp
// Use AsNoTracking for read-only queries
var users = await context.Users
    .AsNoTracking()
    .Where(u => u.IsActive)
    .ToListAsync();

// Project to DTO directly (avoid loading full entity)
var userDtos = await context.Users
    .AsNoTracking()
    .Where(u => u.IsActive)
    .Select(u => new UserDto(u.Id, u.Email, u.Name))
    .ToListAsync();

// Explicit loading for related data
var user = await context.Users.FindAsync(id);
await context.Entry(user)
    .Collection(u => u.Posts)
    .LoadAsync();

// Split queries for large includes
var users = await context.Users
    .Include(u => u.Posts)
    .Include(u => u.Comments)
    .AsSplitQuery()
    .ToListAsync();
```

## Migrations

```bash
# Create migration
dotnet ef migrations add AddUsersTable \
    -p src/Infrastructure \
    -s src/WebApi \
    -o Data/Migrations

# Apply migrations
dotnet ef database update -p src/Infrastructure -s src/WebApi

# Generate SQL script
dotnet ef migrations script -p src/Infrastructure -s src/WebApi -o migration.sql

# Revert last migration
dotnet ef migrations remove -p src/Infrastructure -s src/WebApi
```

### Migration Best Practices

```csharp
public partial class AddUsersTable : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "users",
            columns: table => new
            {
                id = table.Column<Guid>(nullable: false),
                email = table.Column<string>(maxLength: 256, nullable: false),
                created_at = table.Column<DateTime>(nullable: false, defaultValueSql: "GETUTCDATE()")
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_users", x => x.id);
            });

        migrationBuilder.CreateIndex(
            name: "ix_users_email",
            table: "users",
            column: "email",
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "users");
    }
}
```

## Transactions

```csharp
// Unit of Work pattern
public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    Task BeginTransactionAsync(CancellationToken cancellationToken = default);
    Task CommitTransactionAsync(CancellationToken cancellationToken = default);
    Task RollbackTransactionAsync(CancellationToken cancellationToken = default);
}

// Explicit transaction
await using var transaction = await context.Database.BeginTransactionAsync();
try
{
    await context.Users.AddAsync(user);
    await context.SaveChangesAsync();

    await context.AuditLogs.AddAsync(auditLog);
    await context.SaveChangesAsync();

    await transaction.CommitAsync();
}
catch
{
    await transaction.RollbackAsync();
    throw;
}
```

## Soft Delete

```csharp
// Base entity with soft delete
public abstract class SoftDeletableEntity
{
    public DateTime? DeletedAt { get; set; }
    public bool IsDeleted => DeletedAt.HasValue;
}

// Global query filter
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    foreach (var entityType in modelBuilder.Model.GetEntityTypes())
    {
        if (typeof(SoftDeletableEntity).IsAssignableFrom(entityType.ClrType))
        {
            var parameter = Expression.Parameter(entityType.ClrType, "e");
            var property = Expression.Property(parameter, nameof(SoftDeletableEntity.DeletedAt));
            var filter = Expression.Lambda(
                Expression.Equal(property, Expression.Constant(null, typeof(DateTime?))),
                parameter);

            modelBuilder.Entity(entityType.ClrType).HasQueryFilter(filter);
        }
    }
}

// Soft delete instead of hard delete
public void SoftDelete(SoftDeletableEntity entity)
{
    entity.DeletedAt = DateTime.UtcNow;
}

// Include deleted records when needed
var allUsers = await context.Users
    .IgnoreQueryFilters()
    .ToListAsync();
```
