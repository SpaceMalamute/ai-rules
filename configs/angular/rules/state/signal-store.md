---
description: "NgRx SignalStore state management"
paths:
  - "**/libs/**/data-access/**/*.ts"
  - "**/*.store.ts"
  - "**/+state/**/*.ts"
---

# NgRx SignalStore

The `@ngrx/signals` package provides a modern, signal-based state management solution.

## When to Use SignalStore vs Classic NgRx

| Use SignalStore | Use Classic NgRx |
|-----------------|------------------|
| New projects | Existing NgRx codebase |
| Feature-level state | App-wide state with DevTools |
| Simpler mental model | Complex async orchestration |
| Less boilerplate | Redux pattern familiarity |

## Basic SignalStore

```typescript
// stores/counter.store.ts
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';

export const CounterStore = signalStore(
  withState({
    count: 0,
  }),
  withMethods((store) => ({
    increment(): void {
      patchState(store, { count: store.count() + 1 });
    },
    decrement(): void {
      patchState(store, { count: store.count() - 1 });
    },
    reset(): void {
      patchState(store, { count: 0 });
    },
  })),
);
```

```typescript
// Usage in component
@Component({
  selector: 'app-counter',
  providers: [CounterStore],  // Provide at component level
  template: `
    <p>Count: {{ store.count() }}</p>
    <button (click)="store.increment()">+</button>
    <button (click)="store.decrement()">-</button>
  `,
})
export class CounterComponent {
  protected readonly store = inject(CounterStore);
}
```

## SignalStore with Computed

```typescript
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { computed } from '@angular/core';

interface TodoState {
  todos: Todo[];
  filter: 'all' | 'active' | 'completed';
}

export const TodoStore = signalStore(
  withState<TodoState>({
    todos: [],
    filter: 'all',
  }),
  withComputed(({ todos, filter }) => ({
    filteredTodos: computed(() => {
      const allTodos = todos();
      switch (filter()) {
        case 'active':
          return allTodos.filter(t => !t.completed);
        case 'completed':
          return allTodos.filter(t => t.completed);
        default:
          return allTodos;
      }
    }),
    completedCount: computed(() => todos().filter(t => t.completed).length),
    activeCount: computed(() => todos().filter(t => !t.completed).length),
  })),
  withMethods((store) => ({
    addTodo(text: string): void {
      patchState(store, {
        todos: [...store.todos(), { id: crypto.randomUUID(), text, completed: false }],
      });
    },
    toggleTodo(id: string): void {
      patchState(store, {
        todos: store.todos().map(t =>
          t.id === id ? { ...t, completed: !t.completed } : t
        ),
      });
    },
    setFilter(filter: TodoState['filter']): void {
      patchState(store, { filter });
    },
  })),
);
```

## SignalStore with Entity Adapter

```typescript
import { signalStore, withMethods, patchState } from '@ngrx/signals';
import { withEntities, addEntity, updateEntity, removeEntity, setAllEntities } from '@ngrx/signals/entities';

interface User {
  id: string;
  name: string;
  email: string;
}

export const UserStore = signalStore(
  { providedIn: 'root' },  // Singleton store
  withEntities<User>(),
  withMethods((store) => ({
    setUsers(users: User[]): void {
      patchState(store, setAllEntities(users));
    },
    addUser(user: User): void {
      patchState(store, addEntity(user));
    },
    updateUser(id: string, changes: Partial<User>): void {
      patchState(store, updateEntity({ id, changes }));
    },
    removeUser(id: string): void {
      patchState(store, removeEntity(id));
    },
  })),
);

// Exposes: store.entities(), store.ids(), store.entityMap()
```

## SignalStore with Async Methods

```typescript
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

interface ProductState {
  products: Product[];
  loading: boolean;
  error: string | null;
}

export const ProductStore = signalStore(
  { providedIn: 'root' },
  withState<ProductState>({
    products: [],
    loading: false,
    error: null,
  }),
  withMethods((store, productService = inject(ProductService)) => ({
    async loadProducts(): Promise<void> {
      patchState(store, { loading: true, error: null });

      try {
        const products = await firstValueFrom(productService.getAll());
        patchState(store, { products, loading: false });
      } catch (error) {
        patchState(store, {
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load products',
        });
      }
    },

    async addProduct(data: CreateProductDto): Promise<void> {
      const product = await firstValueFrom(productService.create(data));
      patchState(store, { products: [...store.products(), product] });
    },

    async deleteProduct(id: string): Promise<void> {
      await firstValueFrom(productService.delete(id));
      patchState(store, {
        products: store.products().filter(p => p.id !== id),
      });
    },
  })),
);
```

## SignalStore with Hooks

```typescript
import { signalStore, withState, withMethods, withHooks, patchState } from '@ngrx/signals';

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState({
    user: null as User | null,
    token: null as string | null,
    initialized: false,
  }),
  withMethods((store, authService = inject(AuthService)) => ({
    async initialize(): Promise<void> {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const user = await firstValueFrom(authService.validateToken(token));
          patchState(store, { user, token, initialized: true });
        } catch {
          localStorage.removeItem('token');
          patchState(store, { initialized: true });
        }
      } else {
        patchState(store, { initialized: true });
      }
    },
    logout(): void {
      localStorage.removeItem('token');
      patchState(store, { user: null, token: null });
    },
  })),
  withHooks({
    onInit(store) {
      // Called when store is first injected
      store.initialize();
    },
    onDestroy(store) {
      // Called when store is destroyed (component-level stores)
      console.log('Auth store destroyed');
    },
  }),
);
```

## SignalStore with Custom Features

Create reusable store features:

```typescript
// features/with-loading.ts
import { signalStoreFeature, withState, withMethods, patchState } from '@ngrx/signals';

export function withLoading() {
  return signalStoreFeature(
    withState({
      loading: false,
      error: null as string | null,
    }),
    withMethods((store) => ({
      setLoading(loading: boolean): void {
        patchState(store, { loading, error: null });
      },
      setError(error: string): void {
        patchState(store, { loading: false, error });
      },
    })),
  );
}

// Usage
export const ProductStore = signalStore(
  withLoading(),  // Adds loading and error state + methods
  withState({ products: [] as Product[] }),
  withMethods((store, productService = inject(ProductService)) => ({
    async loadProducts(): Promise<void> {
      store.setLoading(true);
      try {
        const products = await productService.getAll();
        patchState(store, { products });
        store.setLoading(false);
      } catch (e) {
        store.setError('Failed to load');
      }
    },
  })),
);
```

## SignalStore with RxJS

```typescript
import { signalStore, withMethods } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import { tapResponse } from '@ngrx/operators';

export const SearchStore = signalStore(
  withState({
    results: [] as SearchResult[],
    loading: false,
  }),
  withMethods((store, searchService = inject(SearchService)) => ({
    search: rxMethod<string>(
      pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap(() => patchState(store, { loading: true })),
        switchMap((query) =>
          searchService.search(query).pipe(
            tapResponse({
              next: (results) => patchState(store, { results, loading: false }),
              error: () => patchState(store, { results: [], loading: false }),
            }),
          ),
        ),
      ),
    ),
  })),
);

// Usage
store.search(this.query);  // Can pass signal or value
store.search(this.query$); // Can pass observable
```

## File Structure

```
libs/[domain]/data-access/
  src/lib/
    stores/
      [feature].store.ts       # SignalStore definition
      [feature].store.spec.ts  # Store tests
    features/
      with-loading.ts          # Reusable features
      with-pagination.ts
    index.ts                   # Public API
```

## Component vs Root-Level Stores

```typescript
// Root-level store (singleton)
export const AuthStore = signalStore(
  { providedIn: 'root' },  // Singleton for entire app
  withState({ ... }),
);

// Component-level store (instance per component)
export const FormStore = signalStore(
  // No providedIn - must be added to component providers
  withState({ ... }),
);

@Component({
  providers: [FormStore],  // New instance for each component
})
export class MyFormComponent {
  private readonly store = inject(FormStore);
}
```

## Anti-patterns

```typescript
// BAD: Mutating state directly
store.users().push(newUser);  // Direct mutation!

// GOOD: Use patchState with new array
patchState(store, { users: [...store.users(), newUser] });


// BAD: Complex logic in computed
withComputed(({ users }) => ({
  report: computed(() => {
    // Complex async or side-effect logic here
    fetch('/api/report');  // WRONG!
    return users();
  }),
})),

// GOOD: Computed should be pure, use methods for side effects
withComputed(({ users }) => ({
  userCount: computed(() => users().length),  // Pure derivation
})),
withMethods((store) => ({
  async generateReport(): Promise<void> { ... },
})),


// BAD: Accessing store outside Angular context
const store = new ProductStore();  // Won't work!

// GOOD: Always inject
protected readonly store = inject(ProductStore);


// BAD: Providing root store at component level
export const AuthStore = signalStore({ providedIn: 'root' }, ...);

@Component({
  providers: [AuthStore],  // Creates duplicate instance!
})

// GOOD: Root stores should not be in component providers
@Component({
  // AuthStore is providedIn: 'root', no need to provide
})
export class MyComponent {
  protected readonly auth = inject(AuthStore);
}
```
