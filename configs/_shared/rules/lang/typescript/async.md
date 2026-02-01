---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# TypeScript Async Patterns

## Promise Basics

```typescript
// GOOD - explicit return type
async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.status}`);
  }
  return response.json();
}

// GOOD - type the promise result
const userPromise: Promise<User> = fetchUser('123');

// BAD - untyped promise
const data = await fetch(url).then(r => r.json()); // any!

// GOOD - typed fetch
const data: User = await fetch(url).then(r => r.json() as Promise<User>);
```

## Error Handling

```typescript
// GOOD - try/catch with typed error handling
async function fetchData<T>(url: string): Promise<T> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new HttpError(response.status, response.statusText);
    }
    return await response.json();
  } catch (error) {
    if (error instanceof HttpError) {
      // Handle HTTP errors specifically
      throw error;
    }
    if (error instanceof TypeError) {
      // Network error
      throw new NetworkError('Network request failed');
    }
    throw error;
  }
}

// Result pattern - avoid throwing for expected failures
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

async function safeFetch<T>(url: string): Promise<Result<T>> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { ok: false, error: new Error(`HTTP ${response.status}`) };
    }
    const data = await response.json();
    return { ok: true, value: data };
  } catch (error) {
    return { ok: false, error: error as Error };
  }
}

// Usage
const result = await safeFetch<User>('/api/users/1');
if (result.ok) {
  console.log(result.value.name);
} else {
  console.error(result.error.message);
}
```

## Parallel Execution

```typescript
// GOOD - parallel independent requests
async function fetchDashboard(userId: string): Promise<Dashboard> {
  const [user, posts, notifications] = await Promise.all([
    fetchUser(userId),
    fetchPosts(userId),
    fetchNotifications(userId),
  ]);

  return { user, posts, notifications };
}

// GOOD - parallel with error handling
async function fetchAllUsers(ids: string[]): Promise<(User | null)[]> {
  const results = await Promise.allSettled(
    ids.map(id => fetchUser(id))
  );

  return results.map(result =>
    result.status === 'fulfilled' ? result.value : null
  );
}

// BAD - sequential when parallel is possible
async function fetchDashboardSlow(userId: string) {
  const user = await fetchUser(userId);
  const posts = await fetchPosts(userId);         // Waits for user
  const notifications = await fetchNotifications(userId); // Waits for posts
  return { user, posts, notifications };
}

// GOOD - controlled concurrency
async function fetchWithLimit<T>(
  items: string[],
  fetcher: (id: string) => Promise<T>,
  limit = 5
): Promise<T[]> {
  const results: T[] = [];

  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit);
    const batchResults = await Promise.all(batch.map(fetcher));
    results.push(...batchResults);
  }

  return results;
}
```

## AbortController & Cancellation

```typescript
// GOOD - cancellable fetch
async function fetchWithTimeout<T>(
  url: string,
  timeoutMs: number
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

// GOOD - cancellable operation
async function searchUsers(
  query: string,
  signal?: AbortSignal
): Promise<User[]> {
  const response = await fetch(`/api/users?q=${query}`, { signal });

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  return response.json();
}

// Usage in React
function useSearch(query: string) {
  const [results, setResults] = useState<User[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    searchUsers(query, controller.signal)
      .then(setResults)
      .catch(error => {
        if (error.name !== 'AbortError') {
          console.error(error);
        }
      });

    return () => controller.abort();
  }, [query]);

  return results;
}

// Cancellation token pattern
class CancellationToken {
  private controller = new AbortController();

  get signal(): AbortSignal {
    return this.controller.signal;
  }

  get isCancelled(): boolean {
    return this.controller.signal.aborted;
  }

  cancel(): void {
    this.controller.abort();
  }

  throwIfCancelled(): void {
    if (this.isCancelled) {
      throw new DOMException('Cancelled', 'AbortError');
    }
  }
}
```

## Retry Logic

```typescript
interface RetryOptions {
  maxAttempts: number;
  delayMs: number;
  backoff?: 'linear' | 'exponential';
  shouldRetry?: (error: Error) => boolean;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { maxAttempts, delayMs, backoff = 'exponential', shouldRetry } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (shouldRetry && !shouldRetry(lastError)) {
        throw lastError;
      }

      if (attempt === maxAttempts) {
        throw lastError;
      }

      const delay = backoff === 'exponential'
        ? delayMs * Math.pow(2, attempt - 1)
        : delayMs * attempt;

      await sleep(delay);
    }
  }

  throw lastError!;
}

// Usage
const user = await withRetry(
  () => fetchUser('123'),
  {
    maxAttempts: 3,
    delayMs: 1000,
    backoff: 'exponential',
    shouldRetry: (error) => error instanceof NetworkError,
  }
);
```

## Debounce & Throttle

```typescript
// Debounce - wait for pause in calls
function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delayMs);
  };
}

// Debounce with promise
function debounceAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  let timeoutId: ReturnType<typeof setTimeout>;
  let pending: Promise<any> | null = null;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);

    pending = new Promise((resolve, reject) => {
      timeoutId = setTimeout(async () => {
        try {
          resolve(await fn(...args));
        } catch (error) {
          reject(error);
        }
      }, delayMs);
    });

    return pending;
  };
}

// Throttle - limit call frequency
function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limitMs: number
): (...args: Parameters<T>) => void {
  let lastRun = 0;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastRun >= limitMs) {
      lastRun = now;
      fn(...args);
    }
  };
}
```

## Async Iteration

```typescript
// Async generator
async function* fetchPages<T>(
  baseUrl: string,
  pageSize: number
): AsyncGenerator<T[]> {
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(`${baseUrl}?page=${page}&size=${pageSize}`);
    const data = await response.json();

    yield data.items;

    hasMore = data.items.length === pageSize;
    page++;
  }
}

// Usage
for await (const users of fetchPages<User>('/api/users', 100)) {
  console.log(`Fetched ${users.length} users`);
  await processUsers(users);
}

// Async iterable with cancellation
async function* fetchWithCancellation<T>(
  urls: string[],
  signal?: AbortSignal
): AsyncGenerator<T> {
  for (const url of urls) {
    signal?.throwIfAborted();

    const response = await fetch(url, { signal });
    yield await response.json();
  }
}
```

## Queue Pattern

```typescript
class AsyncQueue<T> {
  private queue: (() => Promise<T>)[] = [];
  private processing = false;
  private concurrency: number;

  constructor(concurrency = 1) {
    this.concurrency = concurrency;
  }

  async add(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          resolve(await task());
        } catch (error) {
          reject(error);
        }
      });
      this.process();
    });
  }

  private async process(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.concurrency);
      await Promise.all(batch.map(task => task()));
    }

    this.processing = false;
  }
}

// Usage
const queue = new AsyncQueue(3);

urls.forEach(url => {
  queue.add(() => fetch(url).then(r => r.json()));
});
```

## Utilities

```typescript
// Sleep
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Timeout wrapper
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message = 'Operation timed out'
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(message)), timeoutMs)
  );
  return Promise.race([promise, timeout]);
}

// First successful
async function firstSuccess<T>(
  promises: Promise<T>[]
): Promise<T> {
  const errors: Error[] = [];

  return new Promise((resolve, reject) => {
    promises.forEach(promise => {
      promise.then(resolve).catch(error => {
        errors.push(error);
        if (errors.length === promises.length) {
          reject(new AggregateError(errors, 'All promises failed'));
        }
      });
    });
  });
}
```
