---
description: "Async/await patterns, cancellation, and pitfalls"
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# TypeScript Async Patterns

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
// GOOD - cancellable fetch with timeout
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

// GOOD - pass signal for cancellation
async function searchUsers(
  query: string,
  signal?: AbortSignal
): Promise<User[]> {
  const response = await fetch(`/api/users?q=${query}`, { signal });
  return response.json();
}

// Usage in React — always abort on cleanup
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
```

## Common Async Pitfalls

```typescript
// BAD - floating promise (no await, no catch)
function handleClick() {
  saveData(formData); // Promise ignored!
}

// GOOD - always await or catch
async function handleClick() {
  await saveData(formData);
}

// BAD - async in constructor (can't await)
class UserService {
  constructor() {
    this.init(); // floating promise!
  }
  async init() { /* ... */ }
}

// GOOD - factory pattern
class UserService {
  static async create(): Promise<UserService> {
    const service = new UserService();
    await service.init();
    return service;
  }
  private async init() { /* ... */ }
}

// BAD - forEach with async (doesn't await)
items.forEach(async (item) => {
  await processItem(item); // Runs all in parallel, unhandled!
});

// GOOD - for...of for sequential
for (const item of items) {
  await processItem(item);
}

// GOOD - Promise.all for parallel
await Promise.all(items.map(item => processItem(item)));
```
