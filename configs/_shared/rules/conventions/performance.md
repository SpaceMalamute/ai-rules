---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
---

# Performance Rules

## Database

### N+1 Query Problem
```typescript
// Bad - N+1 queries
const users = await db.users.findAll();
for (const user of users) {
  user.posts = await db.posts.findByUserId(user.id); // N queries!
}

// Good - eager loading
const users = await db.users.findAll({
  include: [{ model: Post }],
});

// Good - batch loading
const users = await db.users.findAll();
const userIds = users.map(u => u.id);
const posts = await db.posts.findByUserIds(userIds);
```

### Missing Indexes
```sql
-- Add indexes for:
-- 1. Foreign keys
-- 2. Columns used in WHERE clauses
-- 3. Columns used in ORDER BY
-- 4. Columns used in JOIN conditions

CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_users_email ON users(email);
```

### Select Only Needed Fields
```typescript
// Bad - select *
const users = await db.query('SELECT * FROM users');

// Good - select specific fields
const users = await db.query('SELECT id, name, email FROM users');
```

### Pagination
```typescript
// Always paginate large datasets
const users = await db.users.findAll({
  limit: 20,
  offset: (page - 1) * 20,
});
```

## Caching

### Cache Expensive Operations
```typescript
// Cache database queries
const cacheKey = `user:${userId}`;
let user = await cache.get(cacheKey);
if (!user) {
  user = await db.users.findById(userId);
  await cache.set(cacheKey, user, { ttl: 3600 });
}

// Invalidate on update
await db.users.update(userId, data);
await cache.delete(`user:${userId}`);
```

### Memoization
```typescript
// Memoize pure functions
const memoize = <T, Args extends unknown[]>(fn: (...args: Args) => T): ((...args: Args) => T) => {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (!cache.has(key)) {
      cache.set(key, fn(...args));
    }
    return cache.get(key);
  };
};
```

## Frontend

### Avoid Unnecessary Re-renders
```typescript
// React - use memo for expensive components
const ExpensiveList = React.memo(({ items }) => {
  return items.map(item => <Item key={item.id} {...item} />);
});

// Use useMemo for expensive calculations
const sortedItems = useMemo(
  () => items.sort((a, b) => a.name.localeCompare(b.name)),
  [items]
);

// Use useCallback for stable function references
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);
```

### Angular - OnPush Change Detection
```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyComponent {
  // Only re-renders when inputs change
}
```

### Lazy Loading
```typescript
// React - lazy load routes
const Dashboard = React.lazy(() => import('./Dashboard'));

// Angular - lazy load modules
{ path: 'admin', loadChildren: () => import('./admin/admin.module') }
```

### Virtual Scrolling for Large Lists
```typescript
// Use virtualization for 100+ items
// React: react-window, react-virtualized
// Angular: @angular/cdk/scrolling
```

## Async Operations

### Don't Block the Event Loop
```typescript
// Bad - blocking in async context
async function processData() {
  const result = heavySyncComputation(); // Blocks!
  return result;
}

// Good - offload to worker or break up
async function processData() {
  return new Promise(resolve => {
    setImmediate(() => {
      const result = heavySyncComputation();
      resolve(result);
    });
  });
}
```

### Parallel Execution
```typescript
// Bad - sequential
const user = await getUser(id);
const posts = await getPosts(id);
const comments = await getComments(id);

// Good - parallel when independent
const [user, posts, comments] = await Promise.all([
  getUser(id),
  getPosts(id),
  getComments(id),
]);
```

### Streaming for Large Data
```typescript
// Bad - load all in memory
const allData = await db.query('SELECT * FROM huge_table');
res.json(allData);

// Good - stream
const stream = db.queryStream('SELECT * FROM huge_table');
stream.pipe(res);
```

## Memory

### Avoid Memory Leaks
```typescript
// Clean up subscriptions
useEffect(() => {
  const subscription = observable.subscribe();
  return () => subscription.unsubscribe(); // Cleanup!
}, []);

// Remove event listeners
useEffect(() => {
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
}, []);
```

### Limit Collection Sizes
```typescript
// Use LRU cache with max size
const cache = new LRUCache({ max: 500 });

// Limit array growth
if (items.length > MAX_ITEMS) {
  items.shift(); // Remove oldest
}
```

## Quick Checklist

- [ ] Database queries use indexes
- [ ] No N+1 queries
- [ ] Large lists are paginated
- [ ] Expensive operations cached
- [ ] Frontend components use memoization
- [ ] Change detection optimized (Angular OnPush)
- [ ] Large lists use virtual scrolling
- [ ] Async operations run in parallel when possible
- [ ] No memory leaks (subscriptions cleaned up)
