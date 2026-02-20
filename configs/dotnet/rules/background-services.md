---
paths:
  - "**/*Worker.cs"
  - "**/*Service.cs"
  - "**/BackgroundServices/**/*.cs"
  - "**/Workers/**/*.cs"
  - "**/Jobs/**/*.cs"
---

# .NET Background Services

## Basic Hosted Service

```csharp
// BackgroundServices/HealthCheckWorker.cs
public class HealthCheckWorker : BackgroundService
{
    private readonly ILogger<HealthCheckWorker> _logger;
    private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(1);

    public HealthCheckWorker(ILogger<HealthCheckWorker> logger)
    {
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Health Check Worker starting");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await PerformHealthCheckAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during health check");
            }

            await Task.Delay(_checkInterval, stoppingToken);
        }
    }

    private async Task PerformHealthCheckAsync(CancellationToken ct)
    {
        _logger.LogDebug("Performing health check");
        // Health check logic
    }
}

// Registration
builder.Services.AddHostedService<HealthCheckWorker>();
```

## Service with Scoped Dependencies

```csharp
// BackgroundServices/OrderProcessingWorker.cs
public class OrderProcessingWorker : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<OrderProcessingWorker> _logger;

    public OrderProcessingWorker(
        IServiceProvider serviceProvider,
        ILogger<OrderProcessingWorker> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await using var scope = _serviceProvider.CreateAsyncScope();
                var orderService = scope.ServiceProvider.GetRequiredService<IOrderService>();
                var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                await ProcessPendingOrdersAsync(orderService, dbContext, stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing orders");
            }

            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
        }
    }

    private async Task ProcessPendingOrdersAsync(
        IOrderService orderService,
        AppDbContext dbContext,
        CancellationToken ct)
    {
        var pendingOrders = await dbContext.Orders
            .Where(o => o.Status == OrderStatus.Pending)
            .Take(10)
            .ToListAsync(ct);

        foreach (var order in pendingOrders)
        {
            await orderService.ProcessAsync(order, ct);
        }
    }
}
```

## Queue Processing Worker

```csharp
// BackgroundServices/QueueWorker.cs
public class QueueWorker : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly Channel<WorkItem> _queue;
    private readonly ILogger<QueueWorker> _logger;
    private readonly int _maxConcurrency = 5;

    public QueueWorker(
        IServiceProvider serviceProvider,
        Channel<WorkItem> queue,
        ILogger<QueueWorker> logger)
    {
        _serviceProvider = serviceProvider;
        _queue = queue;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var tasks = new List<Task>();

        for (int i = 0; i < _maxConcurrency; i++)
        {
            tasks.Add(ProcessQueueAsync(i, stoppingToken));
        }

        await Task.WhenAll(tasks);
    }

    private async Task ProcessQueueAsync(int workerId, CancellationToken ct)
    {
        _logger.LogInformation("Worker {WorkerId} starting", workerId);

        await foreach (var item in _queue.Reader.ReadAllAsync(ct))
        {
            try
            {
                await using var scope = _serviceProvider.CreateAsyncScope();
                var handler = scope.ServiceProvider.GetRequiredService<IWorkItemHandler>();

                await handler.HandleAsync(item, ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Worker {WorkerId} failed to process item {ItemId}", workerId, item.Id);
            }
        }
    }
}

// Channel registration
builder.Services.AddSingleton(Channel.CreateUnbounded<WorkItem>(new UnboundedChannelOptions
{
    SingleReader = false,
    SingleWriter = false
}));
```

## Scheduled Worker (Timer or Cron)

```csharp
// Timer-based: run at fixed interval
public class ReportGenerationWorker : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<ReportGenerationWorker> _logger;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Wait until next midnight, then run daily
        await Task.Delay(GetDelayUntilMidnight(), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await using var scope = _serviceProvider.CreateAsyncScope();
                var reportService = scope.ServiceProvider.GetRequiredService<IReportService>();
                await reportService.GenerateDailyReportAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate daily report");
            }

            await Task.Delay(TimeSpan.FromDays(1), stoppingToken);
        }
    }

    private static TimeSpan GetDelayUntilMidnight()
    {
        var now = DateTime.UtcNow;
        return now.Date.AddDays(1) - now;
    }
}

// Cron-based (with NCronTab): run on cron schedule
public class ScheduledWorker : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly CrontabSchedule _schedule;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var nextRun = _schedule.GetNextOccurrence(DateTime.UtcNow);
            var delay = nextRun - DateTime.UtcNow;

            if (delay > TimeSpan.Zero)
                await Task.Delay(delay, stoppingToken);

            if (!stoppingToken.IsCancellationRequested)
            {
                await using var scope = _serviceProvider.CreateAsyncScope();
                var job = scope.ServiceProvider.GetRequiredService<IScheduledJob>();
                await job.ExecuteAsync(stoppingToken);
            }
        }
    }
}
```

## Startup/Shutdown Tasks

```csharp
// Run database migrations at startup
public class DatabaseMigrationTask : IHostedService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<DatabaseMigrationTask> _logger;

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Running database migrations");

        await using var scope = _serviceProvider.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await dbContext.Database.MigrateAsync(cancellationToken);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
```

## Health Checks for Workers

```csharp
public class WorkerHealthCheck : IHealthCheck
{
    private readonly IWorkerStatusService _workerStatus;

    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        var status = _workerStatus.GetStatus();

        return Task.FromResult(status.IsHealthy
            ? HealthCheckResult.Healthy($"Last run: {status.LastRunTime}")
            : HealthCheckResult.Unhealthy($"Worker unhealthy: {status.ErrorMessage}"));
    }
}

builder.Services.AddHealthChecks()
    .AddCheck<WorkerHealthCheck>("worker");
```

## Anti-patterns

```csharp
// BAD: Using scoped services without scope
public class BadWorker : BackgroundService
{
    private readonly IOrderService _orderService; // Scoped service!

    public BadWorker(IOrderService orderService)
    {
        _orderService = orderService; // Same instance forever!
    }
}

// GOOD: Create scope for scoped services
await using var scope = _serviceProvider.CreateAsyncScope();
var orderService = scope.ServiceProvider.GetRequiredService<IOrderService>();

// BAD: No error handling — exception kills the worker!
protected override async Task ExecuteAsync(CancellationToken ct)
{
    while (!ct.IsCancellationRequested)
    {
        await ProcessAsync();
    }
}

// GOOD: Wrap in try/catch with delay on error
try { await ProcessAsync(); }
catch (Exception ex)
{
    _logger.LogError(ex, "Processing failed");
    await Task.Delay(TimeSpan.FromSeconds(5), ct);
}

// BAD: Not respecting cancellation token
while (true) { await Task.Delay(1000); }

// GOOD: Check cancellation token
while (!ct.IsCancellationRequested) { await Task.Delay(1000, ct); }

// BAD: Tight polling loop without delay
var item = await GetNextItemAsync();
if (item == null) continue; // CPU spinning!

// GOOD: Delay when idle
if (item == null) { await Task.Delay(TimeSpan.FromSeconds(1), ct); continue; }
```
