---
paths:
  - "**/*.cs"
---

# C# Async Patterns

## Task vs ValueTask

```csharp
// Use Task for most async operations
public async Task<User> GetUserAsync(int id)

// Use ValueTask when:
// 1. Method often completes synchronously
// 2. Hot path with many allocations
public async ValueTask<User?> GetCachedUserAsync(int id)
{
    if (_cache.TryGetValue(id, out var user))
        return user;  // Synchronous path - no allocation

    return await _repository.GetByIdAsync(id);
}

// BAD - ValueTask misuse (awaiting multiple times)
var task = GetValueTaskAsync();
await task;
await task;  // Undefined behavior!
```

## Parallel Execution

```csharp
// GOOD - parallel independent operations
var userTask = _userService.GetUserAsync(userId);
var ordersTask = _orderService.GetOrdersAsync(userId);
var prefsTask = _prefService.GetPreferencesAsync(userId);

await Task.WhenAll(userTask, ordersTask, prefsTask);

var user = await userTask;
var orders = await ordersTask;
var prefs = await prefsTask;

// BAD - sequential when parallel is possible
var user = await _userService.GetUserAsync(userId);
var orders = await _orderService.GetOrdersAsync(userId);
var prefs = await _prefService.GetPreferencesAsync(userId);
```

## Task.WhenAll Error Handling

```csharp
// Handle all exceptions from parallel tasks
try
{
    await Task.WhenAll(task1, task2, task3);
}
catch (Exception)
{
    // Only first exception is thrown
    // Check individual tasks for all errors
    var exceptions = new[] { task1, task2, task3 }
        .Where(t => t.IsFaulted)
        .SelectMany(t => t.Exception!.InnerExceptions);

    foreach (var ex in exceptions)
    {
        _logger.LogError(ex, "Task failed");
    }
    throw;
}
```

## Cancellation

```csharp
// GOOD - check cancellation in loops
public async Task ProcessBatchAsync(
    IEnumerable<Item> items,
    CancellationToken cancellationToken)
{
    foreach (var item in items)
    {
        cancellationToken.ThrowIfCancellationRequested();
        await ProcessItemAsync(item, cancellationToken);
    }
}

// GOOD - cancellation with timeout
using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
try
{
    await LongOperationAsync(cts.Token);
}
catch (OperationCanceledException)
{
    _logger.LogWarning("Operation timed out");
}

// Link multiple cancellation tokens
using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(
    requestToken,
    applicationStoppingToken);
```

## Async Streams

```csharp
// GOOD - IAsyncEnumerable for streaming data
public async IAsyncEnumerable<User> GetUsersStreamAsync(
    [EnumeratorCancellation] CancellationToken cancellationToken = default)
{
    await foreach (var user in _context.Users.AsAsyncEnumerable()
        .WithCancellation(cancellationToken))
    {
        yield return user;
    }
}

// Consuming async stream
await foreach (var user in GetUsersStreamAsync(cancellationToken))
{
    await ProcessUserAsync(user);
}
```

## Avoid Async Pitfalls

```csharp
// BAD - async void (except event handlers)
public async void ProcessAsync()  // Exceptions lost, can't await
{
    await Task.Delay(1000);
}

// GOOD - return Task
public async Task ProcessAsync()
{
    await Task.Delay(1000);
}

// BAD - blocking on async (.Result, .Wait())
public void Process()
{
    var result = GetDataAsync().Result;  // Deadlock risk!
}

// BAD - unnecessary async/await
public async Task<int> GetCountAsync()
{
    return await _repository.CountAsync();  // Just return the task
}

// GOOD - return task directly when no additional await needed
public Task<int> GetCountAsync()
{
    return _repository.CountAsync();
}
```

## Thread Safety

```csharp
// GOOD - use concurrent collections
private readonly ConcurrentDictionary<int, User> _cache = new();

// GOOD - SemaphoreSlim for async locking
private readonly SemaphoreSlim _semaphore = new(1, 1);

public async Task<User> GetOrCreateUserAsync(int id)
{
    await _semaphore.WaitAsync();
    try
    {
        if (!_cache.TryGetValue(id, out var user))
        {
            user = await _repository.GetByIdAsync(id);
            _cache[id] = user;
        }
        return user;
    }
    finally
    {
        _semaphore.Release();
    }
}

// BAD - lock with async (will not compile correctly)
lock (_syncObject)
{
    await SomeAsyncOperation();  // Can't await inside lock
}
```

## Channel for Producer/Consumer

```csharp
public class BackgroundProcessor
{
    private readonly Channel<WorkItem> _channel =
        Channel.CreateBounded<WorkItem>(new BoundedChannelOptions(100)
        {
            FullMode = BoundedChannelFullMode.Wait
        });

    public async ValueTask QueueWorkAsync(WorkItem item)
    {
        await _channel.Writer.WriteAsync(item);
    }

    public async Task ProcessAsync(CancellationToken stoppingToken)
    {
        await foreach (var item in _channel.Reader.ReadAllAsync(stoppingToken))
        {
            await ProcessItemAsync(item);
        }
    }
}
```
