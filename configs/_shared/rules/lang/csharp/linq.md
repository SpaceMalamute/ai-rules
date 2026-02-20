---
description: "LINQ query best practices"
paths:
  - "**/*.cs"
---

# LINQ Best Practices

## Method vs Query Syntax

```csharp
// Method syntax - preferred for simple queries
var activeUsers = users
    .Where(u => u.IsActive)
    .OrderBy(u => u.Name)
    .ToList();

// Query syntax - better for joins and complex queries
var orderDetails = from order in orders
                   join customer in customers
                       on order.CustomerId equals customer.Id
                   join product in products
                       on order.ProductId equals product.Id
                   where order.Status == OrderStatus.Completed
                   select new
                   {
                       OrderId = order.Id,
                       CustomerName = customer.Name,
                       ProductName = product.Name
                   };
```

## Deferred vs Immediate Execution

```csharp
// Deferred - query not executed until enumerated
var query = users.Where(u => u.IsActive);  // No DB call yet

// Immediate - forces execution
var list = users.Where(u => u.IsActive).ToList();      // Executes now
var array = users.Where(u => u.IsActive).ToArray();    // Executes now
var first = users.First(u => u.IsActive);              // Executes now
var count = users.Count(u => u.IsActive);              // Executes now

// BAD - multiple enumeration
IEnumerable<User> users = GetUsers();
if (users.Any())           // First enumeration
{
    var first = users.First();  // Second enumeration - might get different data!
}

// GOOD - materialize once
var users = GetUsers().ToList();
if (users.Count > 0)
{
    var first = users[0];
}
```

## Filtering

```csharp
// Chain Where for readability
var results = items
    .Where(x => x.IsActive)
    .Where(x => x.Category == "Electronics")
    .Where(x => x.Price > 100);

// Use Any/All for existence checks
if (users.Any(u => u.Role == Role.Admin))  // GOOD
if (users.Where(u => u.Role == Role.Admin).Count() > 0)  // BAD

// FirstOrDefault with predicate
var admin = users.FirstOrDefault(u => u.Role == Role.Admin);

// SingleOrDefault when expecting 0 or 1
var user = users.SingleOrDefault(u => u.Email == email);
```

## Projection

```csharp
// Select for transformation
var dtos = users.Select(u => new UserDto(u.Id, u.Name));

// SelectMany to flatten
var allOrders = customers.SelectMany(c => c.Orders);

// Anonymous types for intermediate results
var intermediate = users
    .Select(u => new { u.Id, FullName = $"{u.FirstName} {u.LastName}" })
    .Where(x => x.FullName.StartsWith("A"));
```

## Grouping

```csharp
// GroupBy
var usersByRole = users
    .GroupBy(u => u.Role)
    .Select(g => new
    {
        Role = g.Key,
        Count = g.Count(),
        Users = g.ToList()
    });

// ToLookup - immediate execution, allows multiple enumeration
var lookup = users.ToLookup(u => u.Role);
var admins = lookup[Role.Admin];
var managers = lookup[Role.Manager];
```

## Aggregation

```csharp
// Aggregate functions
var total = orders.Sum(o => o.Amount);
var average = orders.Average(o => o.Amount);
var max = orders.Max(o => o.Amount);
var min = orders.Min(o => o.Amount);

// Aggregate for custom accumulation
var concatenated = names.Aggregate((a, b) => $"{a}, {b}");

// With seed value
var total = items.Aggregate(
    seed: 0m,
    func: (sum, item) => sum + item.Price * item.Quantity);
```

## Set Operations

```csharp
// Distinct
var uniqueCategories = products.Select(p => p.Category).Distinct();

// DistinctBy (C# 10+)
var uniqueByName = products.DistinctBy(p => p.Name);

// Union, Intersect, Except
var allIds = list1.Select(x => x.Id).Union(list2.Select(x => x.Id));
var commonIds = list1.Select(x => x.Id).Intersect(list2.Select(x => x.Id));
var onlyInFirst = list1.Select(x => x.Id).Except(list2.Select(x => x.Id));
```

## Ordering

```csharp
// Multiple sort criteria
var sorted = users
    .OrderBy(u => u.LastName)
    .ThenBy(u => u.FirstName)
    .ThenByDescending(u => u.CreatedAt);

// Order vs OrderBy (C# 11+)
var ordered = items.Order();  // Uses default comparer
var orderedDesc = items.OrderDescending();
```

## Pagination

```csharp
// Skip/Take for pagination
var page = users
    .OrderBy(u => u.Id)
    .Skip((pageNumber - 1) * pageSize)
    .Take(pageSize)
    .ToList();

// Chunk for batching (C# 10+)
var batches = items.Chunk(100);
foreach (var batch in batches)
{
    await ProcessBatchAsync(batch);
}
```

## EF Core Specific

```csharp
// GOOD - let EF translate to SQL
var users = await _context.Users
    .Where(u => u.IsActive)
    .OrderBy(u => u.Name)
    .ToListAsync();

// BAD - client-side evaluation (throws in EF Core 3+)
var users = await _context.Users
    .Where(u => SomeLocalMethod(u))  // Can't translate
    .ToListAsync();

// GOOD - explicit client evaluation when needed
var users = await _context.Users
    .Where(u => u.IsActive)
    .AsEnumerable()  // Switch to client
    .Where(u => SomeLocalMethod(u))
    .ToList();

// Use AsNoTracking for read-only queries
var users = await _context.Users
    .AsNoTracking()
    .Where(u => u.IsActive)
    .ToListAsync();

// Projection to avoid over-fetching
var dtos = await _context.Users
    .Where(u => u.IsActive)
    .Select(u => new UserDto(u.Id, u.Name, u.Email))
    .ToListAsync();
```
