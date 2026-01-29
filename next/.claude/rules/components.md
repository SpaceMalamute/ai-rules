---
paths:
  - "apps/**/*.tsx"
  - "libs/**/*.tsx"
---

# Component Rules (Next.js 15 / React 19)

## Server vs Client Components

### Server Components (Default)

No directive needed. Use for:
- Data fetching
- Database access
- Accessing secrets/environment variables
- Heavy dependencies that don't need to ship to client

```tsx
// app/users/page.tsx
// This is a Server Component by default
import { db } from '@/lib/db';

export default async function UsersPage() {
  const users = await db.user.findMany();

  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

### Client Components

Add `'use client'` at the top. Use for:
- Interactivity (onClick, onChange, etc.)
- React hooks (useState, useEffect, useContext)
- Browser APIs (localStorage, window, etc.)

```tsx
'use client';

import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}
```

### Decision Tree

```
Need hooks or interactivity?
├── YES → 'use client'
└── NO → Server Component (default)
         └── Fetching data? → async component
```

## Component Patterns

### Props Interface

Always define props interface above component:

```tsx
interface UserCardProps {
  user: User;
  isSelected?: boolean;
  onSelect: (user: User) => void;
}

export function UserCard({ user, isSelected = false, onSelect }: UserCardProps) {
  return (/* ... */);
}
```

### Composition over Props

```tsx
// BAD - prop drilling
<Card
  title="User Profile"
  subtitle="Details"
  icon={<UserIcon />}
  footer={<Button>Edit</Button>}
/>

// GOOD - composition
<Card>
  <CardHeader>
    <UserIcon />
    <CardTitle>User Profile</CardTitle>
    <CardDescription>Details</CardDescription>
  </CardHeader>
  <CardFooter>
    <Button>Edit</Button>
  </CardFooter>
</Card>
```

### Async Server Components

```tsx
// Server Component can be async
export default async function UsersPage() {
  const users = await getUsers(); // Direct await

  return <UserList users={users} />;
}
```

### Client Component with Server Data

```tsx
// page.tsx (Server)
export default async function Page() {
  const data = await fetchData();
  return <InteractiveComponent initialData={data} />;
}

// interactive-component.tsx (Client)
'use client';

export function InteractiveComponent({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  // Can now use hooks with server-fetched data
}
```

## File Organization

### Co-located Components

```
app/
  users/
    page.tsx              # Route
    _components/          # Private folder (underscore prefix)
      user-list.tsx       # Only used in /users
      user-card.tsx
      user-form.tsx
    actions.ts            # Server Actions
    loading.tsx           # Loading UI
    error.tsx             # Error UI
```

### Shared Components

```
libs/
  shared/
    ui/
      button.tsx
      input.tsx
      card.tsx
      index.ts            # Barrel export
```

## Naming Conventions

```tsx
// Component files: kebab-case
user-card.tsx
user-list.tsx

// Components: PascalCase
export function UserCard() {}
export function UserList() {}

// Hooks: camelCase with 'use' prefix
export function useUserData() {}

// Event handlers: handle + Event
const handleClick = () => {};
const handleSubmit = () => {};
const handleUserSelect = (user: User) => {};
```

## Exports

```tsx
// Named exports for reusable components
export function Button() {}
export function Input() {}

// Default export ONLY for:
// - page.tsx
// - layout.tsx
// - loading.tsx
// - error.tsx
// - not-found.tsx
export default function Page() {}
```

## Avoid

- `useEffect` for data fetching (use Server Components)
- Default exports for library components
- Inline styles (use CSS modules or Tailwind)
- Anonymous components
- Props spreading without type safety
