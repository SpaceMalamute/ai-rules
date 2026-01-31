---
paths:
  - "app/**/*.tsx"
  - "app/**/*.ts"
  - "**/actions.ts"
  - "**/actions/*.ts"
---

# Data Fetching & Server Actions

## Server Components - Data Fetching

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

## Server Actions

```tsx
// app/users/actions.ts
'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

export async function createUser(formData: FormData) {
  // Validate
  const parsed = CreateUserSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
  });

  if (!parsed.success) {
    return { error: 'Invalid data' };
  }

  // Create
  await db.user.create({ data: parsed.data });

  // Revalidate and redirect
  revalidatePath('/users');
  redirect('/users');
}
```

## Form with Server Action

```tsx
// app/users/_components/user-form.tsx
'use client';

import { useActionState } from 'react';
import { createUser } from '../actions';

const initialState = { error: null };

export function UserForm() {
  const [state, formAction, isPending] = useActionState(
    createUser,
    initialState
  );

  return (
    <form action={formAction}>
      <input name="name" required disabled={isPending} />
      <input name="email" type="email" required disabled={isPending} />

      {state.error && <p className="error">{state.error}</p>}

      <button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create User'}
      </button>
    </form>
  );
}
```

## Optimistic Updates

```tsx
'use client';

import { useOptimistic } from 'react';
import { addItem } from './actions';

export function ItemList({ items }: { items: Item[] }) {
  const [optimisticItems, addOptimisticItem] = useOptimistic(
    items,
    (state, newItem: Item) => [...state, newItem]
  );

  async function handleAdd(formData: FormData) {
    const newItem = {
      id: crypto.randomUUID(),
      name: formData.get('name') as string,
      pending: true,
    };

    addOptimisticItem(newItem);
    await addItem(formData);
  }

  return (
    <>
      <form action={handleAdd}>
        <input name="name" />
        <button type="submit">Add</button>
      </form>

      <ul>
        {optimisticItems.map((item) => (
          <li key={item.id} style={{ opacity: item.pending ? 0.5 : 1 }}>
            {item.name}
          </li>
        ))}
      </ul>
    </>
  );
}
```

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

## Revalidation Patterns

```tsx
'use server';

// Path-based
revalidatePath('/users');           // Revalidate specific path
revalidatePath('/users', 'layout'); // Revalidate layout and children

// Tag-based
revalidateTag('users');             // Revalidate all with this tag

// Usage with tags
await fetch('/api/users', {
  next: { tags: ['users'] }
});
```

## Error Handling in Server Actions

```tsx
'use server';

export async function createUser(formData: FormData) {
  try {
    const user = await db.user.create({
      data: { name: formData.get('name') as string }
    });

    revalidatePath('/users');
    return { success: true, user };
  } catch (error) {
    // Log for debugging
    console.error('Failed to create user:', error);

    // Return user-friendly error
    return { success: false, error: 'Failed to create user' };
  }
}
```
