---
description: "Next.js data fetching and caching"
paths:
  - "**/app/**/*.tsx"
  - "**/app/**/*.ts"
---

# Data Fetching (Server Components)

## Fetch in Server Components

```tsx
// app/users/page.tsx
async function getUsers(): Promise<User[]> {
  const response = await fetch('https://api.example.com/users', {
    cache: 'no-store',           // Dynamic - always fresh
    // cache: 'force-cache',     // Static (default)
    // next: { revalidate: 60 }, // ISR - revalidate every 60s
  });

  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }

  return response.json();
}

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

## Cache Options

| Option | Behavior |
|--------|----------|
| `cache: 'force-cache'` | Static, cached indefinitely (default) |
| `cache: 'no-store'` | Dynamic, never cached |
| `next: { revalidate: N }` | ISR, revalidate every N seconds |
| `next: { tags: ['users'] }` | Tagged for on-demand revalidation |

## Parallel Data Fetching

```tsx
// Parallel - faster
export default async function Page() {
  const [users, products] = await Promise.all([
    getUsers(),
    getProducts(),
  ]);

  return (/* ... */);
}

// Sequential - slower, avoid
export default async function Page() {
  const users = await getUsers();
  const products = await getProducts(); // Waits for users
  return (/* ... */);
}
```

## Data Fetching with Suspense

```tsx
import { Suspense } from 'react';

export default function Page() {
  return (
    <div>
      <h1>Dashboard</h1>

      <Suspense fallback={<UsersSkeleton />}>
        <UsersSection />
      </Suspense>

      <Suspense fallback={<ProductsSkeleton />}>
        <ProductsSection />
      </Suspense>
    </div>
  );
}

async function UsersSection() {
  const users = await getUsers();
  return <UserList users={users} />;
}
```
