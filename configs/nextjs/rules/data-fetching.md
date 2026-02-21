---
description: "Next.js data fetching patterns in Server Components"
paths:
  - "**/app/**/*.tsx"
  - "**/app/**/*.ts"
---

# Data Fetching (Server Components)

## Fetch in Server Components

### GOOD

```tsx
// app/users/page.tsx
async function getUsers(): Promise<User[]> {
  const response = await fetch('https://api.example.com/users', {
    next: { tags: ['users'] },
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

### BAD

```tsx
// Don't fetch in client components with useEffect
'use client';

export default function UsersPage() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(setUsers);
  }, []);
}
```

## Cache Options

| Option | Behavior |
|--------|----------|
| `cache: 'force-cache'` | Static — cached indefinitely (default) |
| `cache: 'no-store'` | Dynamic — never cached |
| `next: { revalidate: N }` | ISR — revalidate every N seconds |
| `next: { tags: ['users'] }` | Tagged — for on-demand revalidation |

## Parallel Data Fetching

### GOOD

```tsx
// Parallel — faster
export default async function DashboardPage() {
  const [users, products, stats] = await Promise.all([
    getUsers(),
    getProducts(),
    getStats(),
  ]);

  return (
    <div>
      <UsersSection users={users} />
      <ProductsSection products={products} />
      <StatsSection stats={stats} />
    </div>
  );
}
```

### BAD

```tsx
// Sequential — creates waterfall
export default async function DashboardPage() {
  const users = await getUsers();
  const products = await getProducts(); // Waits for users to finish
  const stats = await getStats();       // Waits for products to finish
}
```

## Suspense Streaming

### GOOD

```tsx
import { Suspense } from 'react';

// Each Suspense boundary streams independently
export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>

      {/* Fast — shows first */}
      <Suspense fallback={<StatsSkeleton />}>
        <StatsSection />
      </Suspense>

      {/* Slow — streams when ready */}
      <Suspense fallback={<ActivitySkeleton />}>
        <RecentActivity />
      </Suspense>
    </div>
  );
}

async function StatsSection() {
  const stats = await getStats();
  return <StatsGrid stats={stats} />;
}

async function RecentActivity() {
  const activity = await getRecentActivity(); // Slow query
  return <ActivityList items={activity} />;
}
```

### BAD

```tsx
// Don't wrap everything in one Suspense — defeats streaming
export default function DashboardPage() {
  return (
    <Suspense fallback={<FullPageSkeleton />}>
      <AllDashboardContent />
    </Suspense>
  );
}
```

## On-Demand Revalidation

### GOOD

```tsx
// Tag-based — revalidate specific data
// In your fetch:
const users = await fetch('https://api.example.com/users', {
  next: { tags: ['users'] },
});

// In a Server Action:
'use server';

import { revalidateTag, revalidatePath } from 'next/cache';

export async function createUser(formData: FormData) {
  await db.user.create({ data: { name: formData.get('name') as string } });

  // Revalidate all fetches tagged 'users'
  revalidateTag('users');
}

export async function updateProfile(formData: FormData) {
  await db.user.update({ where: { id: userId }, data: { ... } });

  // Revalidate a specific page
  revalidatePath('/profile');
}
```

### BAD

```tsx
// Don't use router.refresh() in Server Actions — use revalidateTag/revalidatePath
'use server';

export async function createUser(formData: FormData) {
  await db.user.create({ ... });
  // No revalidation — stale data will show
}
```

## Error Handling

### GOOD

```tsx
// Fetch functions throw on error — caught by error.tsx
async function getUser(id: string): Promise<User> {
  const response = await fetch(`https://api.example.com/users/${id}`, {
    next: { tags: [`user-${id}`] },
  });

  if (response.status === 404) {
    notFound(); // Triggers not-found.tsx
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.statusText}`);
  }

  return response.json();
}
```

```tsx
// app/users/[id]/not-found.tsx
export default function UserNotFound() {
  return (
    <div>
      <h2>User Not Found</h2>
      <p>The requested user does not exist.</p>
    </div>
  );
}
```

### BAD

```tsx
// Don't silently swallow errors
async function getUser(id: string) {
  try {
    const res = await fetch(`/api/users/${id}`);
    return res.json();
  } catch {
    return null; // Error is hidden, UI shows empty state
  }
}
```

## Database Queries (No Fetch)

### GOOD

```tsx
// Direct DB access in Server Components — no fetch needed
import { db } from '@/lib/db';

export default async function UsersPage() {
  const users = await db.user.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return <UserList users={users} />;
}
```

### BAD

```tsx
// Don't create an API route just to call it from a Server Component
// app/api/users/route.ts + fetch('/api/users') in page.tsx
// Instead: query the DB directly in the Server Component
```

## Dynamic Params

### GOOD

```tsx
// Next.js 15: params is a Promise
export default async function UserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUser(id);

  return <UserProfile user={user} />;
}
```

### BAD

```tsx
// Next.js 14 style — params is no longer synchronous in Next.js 15
export default async function UserPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getUser(params.id);
}
```
