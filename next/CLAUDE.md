# Next.js Project Guidelines

@../_shared/CLAUDE.md

## Stack

- Next.js 15+ (App Router)
- React 19+
- TypeScript strict mode
- Nx monorepo

## Architecture - Nx Structure

```
apps/
  [app-name]/
    app/                        # App Router
      (routes)/                 # Route groups
        users/
          page.tsx
          _components/          # Private (co-located)
            user-list.tsx
        products/
          page.tsx
          _components/
      layout.tsx
      error.tsx
      loading.tsx

libs/
  [domain]/
    feature/                    # Feature-specific logic
    ui/                         # Presentational components
    data-access/                # API calls, server actions
    util/                       # Helpers

  shared/
    ui/                         # Design system components
    util/                       # Shared utilities
```

### Folder Conventions

| Pattern | Meaning |
|---------|---------|
| `_folder/` | Private - not a route, co-located components |
| `(folder)/` | Route group - organizational, not in URL |
| `[param]/` | Dynamic segment |
| `[...param]/` | Catch-all segment |
| `[[...param]]/` | Optional catch-all |

## React 19 / Next.js 15 - Core Principles

### Server Components by Default

Components are Server Components unless marked with `'use client'`.

```tsx
// Server Component (default) - runs on server
// Can: fetch data, access DB, use secrets
// Cannot: use hooks, browser APIs, event handlers
export default async function UsersPage() {
  const users = await fetchUsers();
  return <UserList users={users} />;
}
```

### Client Components

Add `'use client'` directive for interactivity:

```tsx
'use client';

// Client Component - runs in browser
// Can: use hooks, event handlers, browser APIs
// Cannot: directly access DB, use secrets
import { useState } from 'react';

export function SearchInput({ onSearch }: Props) {
  const [query, setQuery] = useState('');

  return (
    <input
      value={query}
      onChange={(event) => setQuery(event.target.value)}
      onKeyDown={(event) => event.key === 'Enter' && onSearch(query)}
    />
  );
}
```

### When to Use Client Components

| Use Client Component | Use Server Component |
|---------------------|---------------------|
| `useState`, `useEffect`, hooks | Data fetching |
| Event handlers (`onClick`, etc.) | Database access |
| Browser APIs | Sensitive operations |
| Interactive UI (forms, modals) | Static content |

## Data Fetching

### Server Components (Preferred)

```tsx
// app/users/page.tsx
async function getUsers(): Promise<User[]> {
  const response = await fetch('https://api.example.com/users', {
    cache: 'no-store', // Dynamic data
    // cache: 'force-cache', // Static data (default)
    // next: { revalidate: 60 }, // ISR - revalidate every 60s
  });
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

### Server Actions (Mutations)

```tsx
// app/users/actions.ts
'use server';

import { revalidatePath } from 'next/cache';

export async function createUser(formData: FormData): Promise<void> {
  const name = formData.get('name') as string;

  await db.user.create({ data: { name } });

  revalidatePath('/users');
}
```

```tsx
// app/users/_components/user-form.tsx
'use client';

import { createUser } from '../actions';

export function UserForm() {
  return (
    <form action={createUser}>
      <input name="name" required />
      <button type="submit">Create User</button>
    </form>
  );
}
```

### React 19 Hooks for Data

```tsx
'use client';

import { useActionState, useOptimistic } from 'react';

// useActionState - form submission state
const [state, formAction, isPending] = useActionState(createUser, initialState);

// useOptimistic - optimistic UI updates
const [optimisticItems, addOptimistic] = useOptimistic(
  items,
  (state, newItem) => [...state, newItem]
);
```

## Component Patterns

### Page Components (Server)

```tsx
// app/users/page.tsx
import { UserList } from './_components/user-list';
import { getUsers } from '@/lib/api';

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <main>
      <h1>Users</h1>
      <UserList users={users} />
    </main>
  );
}
```

### Interactive Components (Client)

```tsx
// app/users/_components/user-list.tsx
'use client';

import { useState } from 'react';
import { UserCard } from './user-card';

interface UserListProps {
  users: User[];
}

export function UserList({ users }: UserListProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <ul>
      {users.map((user) => (
        <UserCard
          key={user.id}
          user={user}
          isSelected={user.id === selectedId}
          onSelect={() => setSelectedId(user.id)}
        />
      ))}
    </ul>
  );
}
```

### Shared UI Components

```tsx
// libs/shared/ui/button.tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  isLoading?: boolean;
}

export function Button({
  variant = 'primary',
  isLoading,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? 'Loading...' : children}
    </button>
  );
}
```

## Build & Commands

```bash
# Development
nx serve [app-name]
nx dev [app-name]

# Build
nx build [app-name]
nx build [app-name] --configuration=production

# Test
nx test [lib-name]
nx run-many -t test
nx affected -t test

# Lint
nx lint [project-name]
nx run-many -t lint

# Generate
nx g @nx/next:component [name] --project=[app]
nx g @nx/react:component [name] --project=[lib]
nx g @nx/next:page [name] --project=[app]
```

## Code Style

### Component Files

- One component per file
- Named exports (not default) for reusable components
- Default export only for pages (`page.tsx`)
- Props interface above component

```tsx
// Good
interface UserCardProps {
  user: User;
  onSelect: () => void;
}

export function UserCard({ user, onSelect }: UserCardProps) {
  return (/* ... */);
}
```

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Components | PascalCase | `UserCard` |
| Files | kebab-case | `user-card.tsx` |
| Hooks | camelCase with `use` | `useUserData` |
| Server Actions | camelCase | `createUser` |
| Route folders | kebab-case | `user-profile/` |

### Imports Order

```tsx
// 1. React/Next
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// 2. External libraries
import { z } from 'zod';

// 3. Internal libs (@/)
import { Button } from '@/components/ui/button';
import { getUsers } from '@/lib/api';

// 4. Relative imports
import { UserCard } from './user-card';

// 5. Types
import type { User } from '@/types';
```

## Error Handling

### Error Boundaries

```tsx
// app/users/error.tsx
'use client';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

### Loading States

```tsx
// app/users/loading.tsx
export default function Loading() {
  return <div>Loading...</div>;
}
```

## Performance

- Use Server Components for data-heavy UI
- Lazy load heavy Client Components with `next/dynamic`
- Use `<Image>` from `next/image` for optimized images
- Use `<Link>` from `next/link` for client-side navigation
- Avoid `useEffect` for data fetching - use Server Components or `use()`
