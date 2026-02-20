---
description: "Domain-Driven Design patterns for .NET"
paths:
  - "**/src/Domain/**/*.cs"
  - "**/src/**/Entities/**/*.cs"
  - "**/src/**/ValueObjects/**/*.cs"
  - "**/src/**/Aggregates/**/*.cs"
---

# Domain-Driven Design (.NET)

## Entity Base Class

```csharp
// Domain/Common/Entity.cs
public abstract class Entity : IEquatable<Entity>
{
    protected Entity(Guid id) => Id = id;
    protected Entity() { } // For EF Core

    public Guid Id { get; protected init; }

    private readonly List<IDomainEvent> _domainEvents = [];
    public IReadOnlyList<IDomainEvent> DomainEvents => _domainEvents.AsReadOnly();

    public void AddDomainEvent(IDomainEvent domainEvent) =>
        _domainEvents.Add(domainEvent);

    public void ClearDomainEvents() =>
        _domainEvents.Clear();

    public override bool Equals(object? obj) =>
        obj is Entity entity && Equals(entity);

    public bool Equals(Entity? other) =>
        other is not null && Id == other.Id;

    public override int GetHashCode() =>
        Id.GetHashCode();

    public static bool operator ==(Entity? left, Entity? right) =>
        left?.Equals(right) ?? right is null;

    public static bool operator !=(Entity? left, Entity? right) =>
        !(left == right);
}
```

## Aggregate Root

```csharp
// Domain/Common/AggregateRoot.cs
public abstract class AggregateRoot : Entity
{
    protected AggregateRoot(Guid id) : base(id) { }
    protected AggregateRoot() { }

    // Aggregate roots control all access to child entities
    // Only aggregate roots are returned from repositories
}

// Domain/Orders/Order.cs (Aggregate Root)
public class Order : AggregateRoot
{
    private readonly List<OrderLine> _lines = [];

    private Order(Guid id, Guid customerId) : base(id)
    {
        CustomerId = customerId;
        Status = OrderStatus.Draft;
        CreatedAt = DateTime.UtcNow;
    }

    public Guid CustomerId { get; }
    public OrderStatus Status { get; private set; }
    public DateTime CreatedAt { get; }
    public DateTime? ConfirmedAt { get; private set; }
    public IReadOnlyList<OrderLine> Lines => _lines.AsReadOnly();

    public Money Total => _lines
        .Select(l => l.Subtotal)
        .Aggregate(Money.Zero, (acc, m) => acc + m);

    public static Result<Order> Create(Guid customerId)
    {
        if (customerId == Guid.Empty)
        {
            return Result.Failure<Order>(Error.Validation("CustomerId", "Invalid customer"));
        }

        return new Order(Guid.NewGuid(), customerId);
    }

    public Result AddLine(Product product, int quantity)
    {
        if (Status != OrderStatus.Draft)
        {
            return Result.Failure(OrderErrors.CannotModifyConfirmedOrder);
        }

        if (quantity <= 0)
        {
            return Result.Failure(Error.Validation("Quantity", "Quantity must be positive"));
        }

        var existingLine = _lines.FirstOrDefault(l => l.ProductId == product.Id);
        if (existingLine is not null)
        {
            existingLine.UpdateQuantity(existingLine.Quantity + quantity);
        }
        else
        {
            _lines.Add(OrderLine.Create(product, quantity));
        }

        return Result.Success();
    }

    public Result RemoveLine(Guid productId)
    {
        if (Status != OrderStatus.Draft)
        {
            return Result.Failure(OrderErrors.CannotModifyConfirmedOrder);
        }

        var line = _lines.FirstOrDefault(l => l.ProductId == productId);
        if (line is null)
        {
            return Result.Failure(Error.NotFound("OrderLine", productId));
        }

        _lines.Remove(line);
        return Result.Success();
    }

    public Result Confirm()
    {
        if (Status != OrderStatus.Draft)
        {
            return Result.Failure(OrderErrors.AlreadyConfirmed);
        }

        if (!_lines.Any())
        {
            return Result.Failure(OrderErrors.EmptyOrder);
        }

        Status = OrderStatus.Confirmed;
        ConfirmedAt = DateTime.UtcNow;

        AddDomainEvent(new OrderConfirmedEvent(Id, CustomerId, Total));

        return Result.Success();
    }
}
```

## Value Object

```csharp
// Domain/Common/ValueObject.cs
public abstract class ValueObject : IEquatable<ValueObject>
{
    protected abstract IEnumerable<object> GetAtomicValues();

    public override bool Equals(object? obj) =>
        obj is ValueObject other && Equals(other);

    public bool Equals(ValueObject? other) =>
        other is not null &&
        GetAtomicValues().SequenceEqual(other.GetAtomicValues());

    public override int GetHashCode() =>
        GetAtomicValues()
            .Aggregate(default(int), HashCode.Combine);

    public static bool operator ==(ValueObject? left, ValueObject? right) =>
        left?.Equals(right) ?? right is null;

    public static bool operator !=(ValueObject? left, ValueObject? right) =>
        !(left == right);
}

// Domain/Common/ValueObjects/Money.cs
public sealed class Money : ValueObject
{
    private Money(decimal amount, string currency)
    {
        Amount = amount;
        Currency = currency;
    }

    public decimal Amount { get; }
    public string Currency { get; }

    public static Money Zero => new(0, "USD");

    public static Result<Money> Create(decimal amount, string currency = "USD")
    {
        if (amount < 0)
        {
            return Result.Failure<Money>(Error.Validation("Amount", "Amount cannot be negative"));
        }

        if (string.IsNullOrWhiteSpace(currency) || currency.Length != 3)
        {
            return Result.Failure<Money>(Error.Validation("Currency", "Invalid currency code"));
        }

        return new Money(Math.Round(amount, 2), currency.ToUpperInvariant());
    }

    public static Money operator +(Money left, Money right)
    {
        if (left.Currency != right.Currency)
            throw new InvalidOperationException("Cannot add different currencies");

        return new Money(left.Amount + right.Amount, left.Currency);
    }

    public static Money operator *(Money money, int quantity) =>
        new(money.Amount * quantity, money.Currency);

    protected override IEnumerable<object> GetAtomicValues()
    {
        yield return Amount;
        yield return Currency;
    }
}

// Domain/Common/ValueObjects/Address.cs
public sealed class Address : ValueObject
{
    private Address(string street, string city, string postalCode, string country)
    {
        Street = street;
        City = city;
        PostalCode = postalCode;
        Country = country;
    }

    public string Street { get; }
    public string City { get; }
    public string PostalCode { get; }
    public string Country { get; }

    public static Result<Address> Create(
        string street, string city, string postalCode, string country)
    {
        if (string.IsNullOrWhiteSpace(street))
            return Result.Failure<Address>(Error.Validation("Street", "Street is required"));

        if (string.IsNullOrWhiteSpace(city))
            return Result.Failure<Address>(Error.Validation("City", "City is required"));

        if (string.IsNullOrWhiteSpace(postalCode))
            return Result.Failure<Address>(Error.Validation("PostalCode", "Postal code is required"));

        if (string.IsNullOrWhiteSpace(country))
            return Result.Failure<Address>(Error.Validation("Country", "Country is required"));

        return new Address(street.Trim(), city.Trim(), postalCode.Trim(), country.Trim().ToUpperInvariant());
    }

    protected override IEnumerable<object> GetAtomicValues()
    {
        yield return Street;
        yield return City;
        yield return PostalCode;
        yield return Country;
    }
}
```

## Domain Events

```csharp
// Domain/Common/IDomainEvent.cs
public interface IDomainEvent
{
    Guid Id { get; }
    DateTime OccurredAt { get; }
}

public abstract record DomainEvent : IDomainEvent
{
    public Guid Id { get; } = Guid.NewGuid();
    public DateTime OccurredAt { get; } = DateTime.UtcNow;
}

// Domain/Orders/Events/OrderConfirmedEvent.cs
public sealed record OrderConfirmedEvent(
    Guid OrderId,
    Guid CustomerId,
    Money Total
) : DomainEvent;

// Publish events via MediatR after SaveChanges
public class DomainEventDispatcher(IPublisher publisher)
{
    public async Task DispatchEventsAsync(IEnumerable<Entity> entities, CancellationToken ct)
    {
        var domainEvents = entities
            .SelectMany(e => e.DomainEvents)
            .ToList();

        foreach (var entity in entities)
        {
            entity.ClearDomainEvents();
        }

        foreach (var domainEvent in domainEvents)
        {
            await publisher.Publish(domainEvent, ct);
        }
    }
}
```

## Repository Interface (Domain Layer)

```csharp
// Domain/Common/IRepository.cs
public interface IRepository<T> where T : AggregateRoot
{
    Task<T?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task AddAsync(T entity, CancellationToken ct = default);
    void Update(T entity);
    void Remove(T entity);
}

// Domain/Orders/IOrderRepository.cs
public interface IOrderRepository : IRepository<Order>
{
    Task<IReadOnlyList<Order>> GetByCustomerIdAsync(Guid customerId, CancellationToken ct = default);
    Task<Order?> GetWithLinesAsync(Guid orderId, CancellationToken ct = default);
}

// Implementation in Infrastructure layer
public class OrderRepository(ApplicationDbContext context) : IOrderRepository
{
    public async Task<Order?> GetByIdAsync(Guid id, CancellationToken ct) =>
        await context.Orders.FindAsync([id], ct);

    public async Task<Order?> GetWithLinesAsync(Guid orderId, CancellationToken ct) =>
        await context.Orders
            .Include(o => o.Lines)
            .FirstOrDefaultAsync(o => o.Id == orderId, ct);

    public async Task AddAsync(Order entity, CancellationToken ct) =>
        await context.Orders.AddAsync(entity, ct);

    public void Update(Order entity) =>
        context.Orders.Update(entity);

    public void Remove(Order entity) =>
        context.Orders.Remove(entity);

    public async Task<IReadOnlyList<Order>> GetByCustomerIdAsync(Guid customerId, CancellationToken ct) =>
        await context.Orders
            .Where(o => o.CustomerId == customerId)
            .ToListAsync(ct);
}
```

## Domain Service

```csharp
// Domain/Orders/Services/OrderPricingService.cs
public class OrderPricingService
{
    public Result<Money> CalculateDiscount(Order order, Customer customer)
    {
        var total = order.Total;
        var discountPercent = customer.Tier switch
        {
            CustomerTier.Gold => 10,
            CustomerTier.Silver => 5,
            CustomerTier.Bronze => 2,
            _ => 0
        };

        if (total.Amount > 1000)
        {
            discountPercent += 5; // Additional bulk discount
        }

        var discountAmount = total.Amount * discountPercent / 100;
        return Money.Create(discountAmount, total.Currency);
    }
}
```

## Anti-Patterns

```csharp
// BAD: Anemic domain model
public class Order
{
    public Guid Id { get; set; }
    public OrderStatus Status { get; set; }  // Public setter!
    public List<OrderLine> Lines { get; set; } = [];  // Exposed collection!
}

// Service with all logic
public class OrderService
{
    public void Confirm(Order order)
    {
        if (order.Status != OrderStatus.Draft) throw new Exception("...");
        order.Status = OrderStatus.Confirmed;  // Logic outside entity!
    }
}


// GOOD: Rich domain model
public class Order
{
    private readonly List<OrderLine> _lines = [];

    public OrderStatus Status { get; private set; }  // Private setter
    public IReadOnlyList<OrderLine> Lines => _lines.AsReadOnly();  // Encapsulated

    public Result Confirm()  // Behavior inside entity
    {
        if (Status != OrderStatus.Draft)
            return Result.Failure(OrderErrors.AlreadyConfirmed);

        Status = OrderStatus.Confirmed;
        AddDomainEvent(new OrderConfirmedEvent(Id));
        return Result.Success();
    }
}


// BAD: Exposing IQueryable from repository
public interface IOrderRepository
{
    IQueryable<Order> GetAll();  // Leaks persistence!
}

// GOOD: Specific query methods
public interface IOrderRepository
{
    Task<Order?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<IReadOnlyList<Order>> GetByStatusAsync(OrderStatus status, CancellationToken ct);
}
```
