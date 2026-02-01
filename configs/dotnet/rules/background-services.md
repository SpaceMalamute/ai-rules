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

        _logger.LogInformation("Health Check Worker stopping");
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

                _logger.LogDebug("Worker {WorkerId} processed item {ItemId}", workerId, item.Id);
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

## Timed Background Service

```csharp
// BackgroundServices/ReportGenerationWorker.cs
public class ReportGenerationWorker : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<ReportGenerationWorker> _logger;
    private Timer? _timer;

    public ReportGenerationWorker(
        IServiceProvider serviceProvider,
        ILogger<ReportGenerationWorker> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _timer = new Timer(
            DoWork,
            null,
            GetDelayUntilMidnight(),
            TimeSpan.FromDays(1));

        stoppingToken.Register(() => _timer?.Change(Timeout.Infinite, 0));

        return Task.CompletedTask;
    }

    private async void DoWork(object? state)
    {
        try
        {
            await using var scope = _serviceProvider.CreateAsyncScope();
            var reportService = scope.ServiceProvider.GetRequiredService<IReportService>();

            await reportService.GenerateDailyReportAsync();

            _logger.LogInformation("Daily report generated successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate daily report");
        }
    }

    private static TimeSpan GetDelayUntilMidnight()
    {
        var now = DateTime.UtcNow;
        var midnight = now.Date.AddDays(1);
        return midnight - now;
    }

    public override void Dispose()
    {
        _timer?.Dispose();
        base.Dispose();
    }
}
```

## Cron-Based Worker (with NCronTab)

```csharp
// BackgroundServices/ScheduledWorker.cs
public class ScheduledWorker : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<ScheduledWorker> _logger;
    private readonly CrontabSchedule _schedule;

    public ScheduledWorker(
        IServiceProvider serviceProvider,
        IOptions<SchedulerOptions> options,
        ILogger<ScheduledWorker> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        _schedule = CrontabSchedule.Parse(options.Value.CronExpression);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var now = DateTime.UtcNow;
            var nextRun = _schedule.GetNextOccurrence(now);
            var delay = nextRun - now;

            if (delay > TimeSpan.Zero)
            {
                await Task.Delay(delay, stoppingToken);
            }

            if (!stoppingToken.IsCancellationRequested)
            {
                await ExecuteJobAsync(stoppingToken);
            }
        }
    }

    private async Task ExecuteJobAsync(CancellationToken ct)
    {
        try
        {
            await using var scope = _serviceProvider.CreateAsyncScope();
            var job = scope.ServiceProvider.GetRequiredService<IScheduledJob>();

            await job.ExecuteAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Scheduled job failed");
        }
    }
}
```

## Message Queue Consumer (RabbitMQ)

```csharp
// BackgroundServices/RabbitMqConsumer.cs
public class RabbitMqConsumer : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<RabbitMqConsumer> _logger;
    private readonly IConnection _connection;
    private readonly IModel _channel;

    public RabbitMqConsumer(
        IServiceProvider serviceProvider,
        IOptions<RabbitMqOptions> options,
        ILogger<RabbitMqConsumer> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;

        var factory = new ConnectionFactory
        {
            HostName = options.Value.Host,
            UserName = options.Value.Username,
            Password = options.Value.Password,
            DispatchConsumersAsync = true
        };

        _connection = factory.CreateConnection();
        _channel = _connection.CreateModel();

        _channel.QueueDeclare(
            queue: options.Value.QueueName,
            durable: true,
            exclusive: false,
            autoDelete: false);
    }

    protected override Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var consumer = new AsyncEventingBasicConsumer(_channel);

        consumer.Received += async (model, ea) =>
        {
            try
            {
                var body = ea.Body.ToArray();
                var message = JsonSerializer.Deserialize<Message>(body);

                await ProcessMessageAsync(message!, stoppingToken);

                _channel.BasicAck(ea.DeliveryTag, false);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing message");
                _channel.BasicNack(ea.DeliveryTag, false, true);
            }
        };

        _channel.BasicConsume(queue: "orders", autoAck: false, consumer: consumer);

        return Task.CompletedTask;
    }

    private async Task ProcessMessageAsync(Message message, CancellationToken ct)
    {
        await using var scope = _serviceProvider.CreateAsyncScope();
        var handler = scope.ServiceProvider.GetRequiredService<IMessageHandler>();

        await handler.HandleAsync(message, ct);
    }

    public override void Dispose()
    {
        _channel?.Close();
        _connection?.Close();
        base.Dispose();
    }
}
```

## Startup/Shutdown Tasks

```csharp
// BackgroundServices/StartupTask.cs
public class DatabaseMigrationTask : IHostedService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<DatabaseMigrationTask> _logger;

    public DatabaseMigrationTask(
        IServiceProvider serviceProvider,
        ILogger<DatabaseMigrationTask> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Running database migrations");

        await using var scope = _serviceProvider.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        await dbContext.Database.MigrateAsync(cancellationToken);

        _logger.LogInformation("Database migrations completed");
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}

// Graceful shutdown
public class GracefulShutdownService : IHostedService
{
    private readonly ILogger<GracefulShutdownService> _logger;
    private readonly IHostApplicationLifetime _lifetime;

    public GracefulShutdownService(
        ILogger<GracefulShutdownService> logger,
        IHostApplicationLifetime lifetime)
    {
        _logger = logger;
        _lifetime = lifetime;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _lifetime.ApplicationStopping.Register(OnStopping);
        _lifetime.ApplicationStopped.Register(OnStopped);
        return Task.CompletedTask;
    }

    private void OnStopping()
    {
        _logger.LogInformation("Application is shutting down...");
        // Complete in-flight requests, close connections
    }

    private void OnStopped()
    {
        _logger.LogInformation("Application has stopped");
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
```

## Health Checks for Workers

```csharp
// Health/WorkerHealthCheck.cs
public class WorkerHealthCheck : IHealthCheck
{
    private readonly IWorkerStatusService _workerStatus;

    public WorkerHealthCheck(IWorkerStatusService workerStatus)
    {
        _workerStatus = workerStatus;
    }

    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        var status = _workerStatus.GetStatus();

        if (status.IsHealthy)
        {
            return Task.FromResult(HealthCheckResult.Healthy(
                $"Last run: {status.LastRunTime}, Items processed: {status.ItemsProcessed}"));
        }

        return Task.FromResult(HealthCheckResult.Unhealthy(
            $"Worker unhealthy: {status.ErrorMessage}"));
    }
}

// Registration
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

// BAD: No error handling
protected override async Task ExecuteAsync(CancellationToken ct)
{
    while (!ct.IsCancellationRequested)
    {
        await ProcessAsync(); // Exception kills the worker!
    }
}

// GOOD: Proper error handling
try
{
    await ProcessAsync();
}
catch (Exception ex)
{
    _logger.LogError(ex, "Processing failed");
    await Task.Delay(TimeSpan.FromSeconds(5), ct);
}

// BAD: Not respecting cancellation
protected override async Task ExecuteAsync(CancellationToken ct)
{
    while (true) // Never stops!
    {
        await Task.Delay(1000);
    }
}

// GOOD: Check cancellation token
while (!ct.IsCancellationRequested)
{
    await Task.Delay(1000, ct);
}

// BAD: Tight polling loop
while (!ct.IsCancellationRequested)
{
    var item = await GetNextItemAsync();
    if (item == null) continue; // CPU spinning!
}

// GOOD: Use delay or blocking read
while (!ct.IsCancellationRequested)
{
    var item = await GetNextItemAsync();
    if (item == null)
    {
        await Task.Delay(TimeSpan.FromSeconds(1), ct);
        continue;
    }
}
```
