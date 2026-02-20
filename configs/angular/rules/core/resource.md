---
description: "Angular Resource API for async data"
paths:
  - "**/*.component.ts"
  - "**/*.store.ts"
  - "**/services/**/*.ts"
  - "**/data-access/**/*.ts"
---

# Angular Resource API

The `resource()` and `rxResource()` APIs provide declarative data fetching with signals.

## Basic Resource

```typescript
import { resource, Signal } from '@angular/core';

@Component({
  selector: 'app-user-profile',
  template: `
    @if (userResource.isLoading()) {
      <app-spinner />
    } @else if (userResource.error()) {
      <app-error [message]="userResource.error()?.message" />
    } @else if (userResource.hasValue()) {
      <app-user-card [user]="userResource.value()!" />
    }
  `,
})
export class UserProfileComponent {
  private readonly userService = inject(UserService);

  public readonly userId = input.required<string>();

  // Resource automatically refetches when userId changes
  protected readonly userResource = resource({
    request: () => this.userId(),
    loader: ({ request: userId }) => this.userService.getById(userId),
  });
}
```

## Resource Properties

```typescript
const userResource = resource({
  request: () => this.userId(),
  loader: ({ request }) => this.userService.getById(request),
});

// Signals exposed by resource
userResource.value();      // T | undefined - the loaded data
userResource.isLoading();  // boolean - true while loading
userResource.error();      // unknown | undefined - error if failed
userResource.status();     // ResourceStatus - 'idle' | 'loading' | 'resolved' | 'error'

// Type guard
userResource.hasValue();   // boolean - true if value is available

// Manual control
userResource.reload();     // Force refetch with current request
```

## Resource with Multiple Dependencies

```typescript
@Component({ ... })
export class ProductListComponent {
  protected readonly category = signal<string>('all');
  protected readonly sortBy = signal<'name' | 'price'>('name');
  protected readonly page = signal(1);

  // Refetches when ANY dependency changes
  protected readonly productsResource = resource({
    request: () => ({
      category: this.category(),
      sortBy: this.sortBy(),
      page: this.page(),
    }),
    loader: ({ request }) => this.productService.search(request),
  });
}
```

## rxResource - RxJS Integration

Use `rxResource` when your service returns Observables:

```typescript
import { rxResource } from '@angular/core/rxjs-interop';

@Component({ ... })
export class UserListComponent {
  private readonly userService = inject(UserService);

  protected readonly searchQuery = signal('');

  // Works with Observable-returning services
  protected readonly usersResource = rxResource({
    request: () => this.searchQuery(),
    loader: ({ request: query }) => this.userService.search(query),
  });
}
```

## Conditional Loading

```typescript
@Component({ ... })
export class UserDetailComponent {
  public readonly userId = input<string | null>(null);

  protected readonly userResource = resource({
    // Only fetch when userId is provided
    request: () => {
      const id = this.userId();
      return id ? { id } : undefined;  // undefined = don't load
    },
    loader: ({ request }) => this.userService.getById(request.id),
  });
}
```

## Resource with AbortSignal

Handle cancellation for long-running requests:

```typescript
protected readonly searchResource = resource({
  request: () => this.query(),
  loader: async ({ request, abortSignal }) => {
    const response = await fetch(`/api/search?q=${request}`, {
      signal: abortSignal,  // Automatically cancelled on new request
    });
    return response.json();
  },
});
```

## Local State with Resource

Combine resource with local state for optimistic updates:

```typescript
@Component({ ... })
export class TodoListComponent {
  protected readonly todosResource = resource({
    request: () => ({}),
    loader: () => this.todoService.getAll(),
  });

  // Local state for optimistic updates
  protected readonly localTodos = linkedSignal(() => this.todosResource.value() ?? []);

  public async addTodo(text: string): Promise<void> {
    const tempTodo = { id: crypto.randomUUID(), text, completed: false };

    // Optimistic update
    this.localTodos.update(todos => [...todos, tempTodo]);

    try {
      const saved = await this.todoService.create({ text });
      // Replace temp with saved
      this.localTodos.update(todos =>
        todos.map(t => t.id === tempTodo.id ? saved : t)
      );
    } catch {
      // Rollback on error
      this.localTodos.update(todos =>
        todos.filter(t => t.id !== tempTodo.id)
      );
    }
  }
}
```

## Error Handling

```typescript
@Component({
  template: `
    @switch (usersResource.status()) {
      @case ('idle') {
        <p>Enter a search term</p>
      }
      @case ('loading') {
        <app-spinner />
      }
      @case ('error') {
        <div class="error">
          <p>Failed to load users</p>
          <button (click)="usersResource.reload()">Retry</button>
        </div>
      }
      @case ('resolved') {
        @for (user of usersResource.value(); track user.id) {
          <app-user-card [user]="user" />
        } @empty {
          <p>No users found</p>
        }
      }
    }
  `,
})
export class UserSearchComponent {
  protected readonly query = signal('');

  protected readonly usersResource = resource({
    request: () => {
      const q = this.query();
      return q.length >= 3 ? q : undefined;
    },
    loader: ({ request }) => this.userService.search(request),
  });
}
```

## Prefetching Data

```typescript
@Component({ ... })
export class ProductPageComponent {
  public readonly productId = input.required<string>();

  // Main product data
  protected readonly productResource = resource({
    request: () => this.productId(),
    loader: ({ request }) => this.productService.getById(request),
  });

  // Prefetch related products (starts loading immediately)
  protected readonly relatedResource = resource({
    request: () => this.productId(),
    loader: ({ request }) => this.productService.getRelated(request),
  });
}
```

## Anti-patterns

```typescript
// BAD: Using resource for mutations
const saveResource = resource({
  request: () => this.formData(),
  loader: ({ request }) => this.service.save(request),  // Mutating!
});

// GOOD: Use resource for reads, methods for mutations
protected readonly userResource = resource({ ... });

public async save(): Promise<void> {
  await this.userService.save(this.formData());
  this.userResource.reload();  // Refresh after mutation
}


// BAD: Not handling loading state
@if (userResource.value()) {
  <app-user [user]="userResource.value()!" />
}
// Missing loading and error states!

// GOOD: Handle all states
@if (userResource.isLoading()) {
  <app-spinner />
} @else if (userResource.error()) {
  <app-error />
} @else if (userResource.hasValue()) {
  <app-user [user]="userResource.value()!" />
}


// BAD: Subscribing to service in component
ngOnInit() {
  this.userService.getById(this.userId()).subscribe(user => {
    this.user = user;
  });
}

// GOOD: Use resource for declarative data fetching
protected readonly userResource = resource({
  request: () => this.userId(),
  loader: ({ request }) => this.userService.getById(request),
});
```
