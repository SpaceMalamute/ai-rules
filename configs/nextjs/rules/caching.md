---
description: "Next.js 15 caching strategies and revalidation"
paths:
  - "**/app/**/*.ts"
  - "**/app/**/*.tsx"
  - "**/next.config.*"
---

# Caching & Revalidation

## Route Segment Config

```tsx
// Static (SSG) — fully cached at build time
export const dynamic = 'force-static';

// Dynamic (SSR) — never cached
export const dynamic = 'force-dynamic';

// ISR — revalidate every 60 seconds
export const revalidate = 60;
```

## Fetch Cache

### GOOD

```tsx
// Static — cached indefinitely (default)
const data = await fetch('https://api.example.com/config', {
  cache: 'force-cache',
});

// ISR — revalidate every 5 minutes
const data = await fetch('https://api.example.com/products', {
  next: { revalidate: 300 },
});

// Dynamic — always fresh
const data = await fetch('https://api.example.com/realtime', {
  cache: 'no-store',
});

// Tagged — for on-demand revalidation
const data = await fetch('https://api.example.com/users', {
  next: { tags: ['users'] },
});
```

## "use cache" Directive (Experimental)

Requires `dynamicIO` in `next.config.ts`. Replaces `unstable_cache` going forward.

### GOOD

```tsx
// Cache an entire page
import { cacheTag, cacheLife } from 'next/cache';

async function getProducts() {
  'use cache';
  cacheTag('products');
  cacheLife('hours');

  const products = await db.product.findMany();
  return products;
}

// Cache a component
async function ProductList() {
  'use cache';
  cacheTag('products');

  const products = await db.product.findMany();
  return (
    <ul>
      {products.map(p => <li key={p.id}>{p.name}</li>)}
    </ul>
  );
}
```

### cacheLife Profiles

| Profile | Stale | Revalidate | Expire |
|---------|-------|------------|--------|
| `'default'` | undefined | 15 min | indefinite |
| `'seconds'` | undefined | 1 sec | 1 min |
| `'minutes'` | 5 min | 1 min | 1 hour |
| `'hours'` | 5 min | 1 hour | 1 day |
| `'days'` | 5 min | 1 day | 1 week |
| `'weeks'` | 5 min | 1 week | 1 month |
| `'max'` | 5 min | 1 month | indefinite |

## unstable_cache (Current Stable API)

For granular server-side caching without `dynamicIO`.

### GOOD

```tsx
import { unstable_cache } from 'next/cache';
import { db } from '@/lib/db';

const getCachedUser = unstable_cache(
  async (id: string) => {
    return db.user.findUnique({ where: { id } });
  },
  ['user'],                      // Cache key prefix
  { tags: ['users'], revalidate: 3600 }  // 1 hour
);

export default async function UserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCachedUser(id);

  return <UserProfile user={user} />;
}
```

### BAD

```tsx
// Don't use unstable_cache without tags — can't revalidate on demand
const getCachedUser = unstable_cache(
  async (id: string) => db.user.findUnique({ where: { id } }),
  ['user']
  // Missing tags — only expires by time
);

// Don't cache mutations or side effects
const cachedCreateUser = unstable_cache(
  async (data) => db.user.create({ data }),  // Mutation in cache = bug
  ['create-user']
);
```

## Revalidation Strategies

### Tag-Based (Recommended)

```tsx
// 1. Tag your data
const users = await fetch('https://api.example.com/users', {
  next: { tags: ['users'] },
});

// 2. Revalidate after mutation
'use server';

import { revalidateTag } from 'next/cache';

export async function createUser(formData: FormData) {
  await db.user.create({ data: { name: formData.get('name') as string } });
  revalidateTag('users');
}
```

### Path-Based

```tsx
'use server';

import { revalidatePath } from 'next/cache';

export async function updateProfile(formData: FormData) {
  await db.user.update({ ... });

  revalidatePath('/profile');          // Revalidate one page
  revalidatePath('/users', 'layout');  // Revalidate layout + all children
}
```

### When to Use Each

| Strategy | Use Case |
|----------|----------|
| `revalidateTag('users')` | Data shared across pages (user list, products) |
| `revalidatePath('/profile')` | Single page update |
| `revalidatePath('/', 'layout')` | Global layout change (theme, auth state) |
| `next: { revalidate: 60 }` | Time-based freshness (dashboards, feeds) |

## Anti-patterns

```tsx
// BAD: Caching user-specific data without a key
const getCachedData = unstable_cache(
  async () => db.user.findUnique({ where: { id: getCurrentUserId() } }),
  ['user-data']  // Same key for all users — returns wrong data
);

// GOOD: Include user ID in cache key
const getCachedData = unstable_cache(
  async (userId: string) => db.user.findUnique({ where: { id: userId } }),
  ['user-data'],
  { tags: [`user-${userId}`] }
);

// BAD: Over-caching dynamic data
export const revalidate = 86400;  // 24h cache on a page showing live stock prices

// BAD: Under-caching static data
const config = await fetch('/api/config', { cache: 'no-store' });  // Config rarely changes
```
