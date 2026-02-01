---
paths:
  - "**/*store*.ts"
  - "**/*store*.tsx"
  - "**/stores/**/*.ts"
---

# Zustand State Management

Use Zustand for lightweight client-side state management.

## When to Use

- Small to medium projects
- Simple state logic
- When you want minimal boilerplate
- Quick prototyping

## Store Structure

```
libs/
  [domain]/
    data-access/
      stores/
        user-store.ts
        cart-store.ts
      index.ts
```

## Creating a Store

### Basic Store

```typescript
// stores/user-store.ts
import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
}

interface UserState {
  // State
  user: User | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  fetchUser: (id: string) => Promise<void>;
  logout: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  // Initial state
  user: null,
  isLoading: false,
  error: null,

  // Actions
  setUser: (user) => set({ user }),

  fetchUser: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/users/${id}`);
      const user = await response.json();
      set({ user, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch user', isLoading: false });
    }
  },

  logout: () => set({ user: null }),
}));
```

### Store with Slices (Large Stores)

```typescript
// stores/app-store.ts
import { create, StateCreator } from 'zustand';

// User slice
interface UserSlice {
  user: User | null;
  setUser: (user: User | null) => void;
}

const createUserSlice: StateCreator<AppStore, [], [], UserSlice> = (set) => ({
  user: null,
  setUser: (user) => set({ user }),
});

// Cart slice
interface CartSlice {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
}

const createCartSlice: StateCreator<AppStore, [], [], CartSlice> = (set) => ({
  items: [],
  addItem: (item) => set((state) => ({
    items: [...state.items, item]
  })),
  removeItem: (id) => set((state) => ({
    items: state.items.filter((item) => item.id !== id)
  })),
  clearCart: () => set({ items: [] }),
});

// Combined store
type AppStore = UserSlice & CartSlice;

export const useAppStore = create<AppStore>((...args) => ({
  ...createUserSlice(...args),
  ...createCartSlice(...args),
}));
```

### Store with Persistence

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'light',
      toggleTheme: () => set((state) => ({
        theme: state.theme === 'light' ? 'dark' : 'light'
      })),
    }),
    {
      name: 'theme-storage', // localStorage key
    }
  )
);
```

### Store with Immer (Complex Updates)

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface TodoState {
  todos: Todo[];
  addTodo: (text: string) => void;
  toggleTodo: (id: string) => void;
  updateTodo: (id: string, text: string) => void;
}

export const useTodoStore = create<TodoState>()(
  immer((set) => ({
    todos: [],

    addTodo: (text) => set((state) => {
      state.todos.push({ id: Date.now().toString(), text, done: false });
    }),

    toggleTodo: (id) => set((state) => {
      const todo = state.todos.find((todo) => todo.id === id);
      if (todo) {
        todo.done = !todo.done;
      }
    }),

    updateTodo: (id, text) => set((state) => {
      const todo = state.todos.find((todo) => todo.id === id);
      if (todo) {
        todo.text = text;
      }
    }),
  }))
);
```

## Using in Components

### Basic Usage

```tsx
'use client';

import { useUserStore } from '@/stores/user-store';

export function UserProfile() {
  const { user, isLoading, error, fetchUser, logout } = useUserStore();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!user) return <div>Not logged in</div>;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Selecting State (Performance)

```tsx
'use client';

import { useUserStore } from '@/stores/user-store';

export function UserName() {
  // Only re-render when user.name changes
  const userName = useUserStore((state) => state.user?.name);

  return <span>{userName}</span>;
}
```

### Shallow Comparison for Objects

```tsx
'use client';

import { useShallow } from 'zustand/react/shallow';
import { useUserStore } from '@/stores/user-store';

export function UserInfo() {
  // Prevent re-render if object reference changes but content is same
  const { name, email } = useUserStore(
    useShallow((state) => ({
      name: state.user?.name,
      email: state.user?.email
    }))
  );

  return (
    <div>
      <p>{name}</p>
      <p>{email}</p>
    </div>
  );
}
```

## Testing

```typescript
import { act, renderHook } from '@testing-library/react';
import { useUserStore } from './user-store';

describe('useUserStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useUserStore.setState({ user: null, isLoading: false, error: null });
  });

  it('should set user', () => {
    const { result } = renderHook(() => useUserStore());

    act(() => {
      result.current.setUser({ id: '1', name: 'John', email: 'john@test.com' });
    });

    expect(result.current.user?.name).toBe('John');
  });

  it('should logout', () => {
    useUserStore.setState({ user: { id: '1', name: 'John', email: 'john@test.com' } });

    const { result } = renderHook(() => useUserStore());

    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
  });
});
```

## Best Practices

- Keep stores small and focused
- Use selectors for performance
- Don't put Server Component data in stores
- Use `immer` middleware for complex nested updates
- Use `persist` middleware for data that should survive page refresh
