# Angular Project Guidelines

@../_shared/CLAUDE.md

## Stack

- Angular 21+ (latest)
- Nx monorepo
- NgRx (store, effects, entity)
- Vitest
- TypeScript strict mode

## Architecture - Nx Structure

```
apps/
  [app-name]/

libs/
  [domain]/                   # Ex: users, products, checkout
    feature/                  # Smart components, pages, routing (lazy-loaded)
    data-access/              # Services API + NgRx state
      src/lib/+state/         # Actions, reducers, effects, selectors
    ui/                       # Dumb/presentational components
    util/                     # Domain-specific helpers

  shared/
    ui/                       # Reusable UI components
    data-access/              # Shared services (auth, http interceptors)
    util/                     # Pure functions, helpers
```

### Dependency Rules (enforce via Nx tags)

| Type | Can import |
|------|------------|
| `feature` | Everything |
| `ui` | `ui`, `util` only |
| `data-access` | `data-access`, `util` only |
| `util` | `util` only |

## Angular 21 - Core Principles

### Zoneless by Default

- No zone.js - use signals for reactivity
- Use `ChangeDetectionStrategy.OnPush` on all components
- Never rely on zone.js for change detection

### Signals Everywhere

```typescript
// State
count = signal(0);
items = signal<Item[]>([]);

// Derived state
doubleCount = computed(() => this.count() * 2);
isEmpty = computed(() => this.items().length === 0);

// Effects for side effects
effect(() => {
  console.log('Count changed:', this.count());
});
```

### Signal Forms (experimental but preferred)

```typescript
// Use signal forms, NOT reactive forms
import { SignalForm } from '@angular/forms';

form = signalForm({
  name: '',
  email: '',
});

// Access values
form.value();        // { name: '', email: '' }
form.controls.name();  // ''
form.valid();        // boolean signal
```

### Standalone Components (Default)

- No NgModules for components
- `standalone: true` is the default - don't add it
- Import dependencies directly in component
- Always use separate template files (`.html`)

```typescript
@Component({
  selector: 'app-example',
  imports: [RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './example.component.html',
  styleUrl: './example.component.scss',
})
export class ExampleComponent {}
```

### Inject Function

```typescript
// Preferred
export class MyComponent {
  private readonly store = inject(Store);
  private readonly http = inject(HttpClient);
}

// Avoid constructor injection
```

### Signal Inputs/Outputs (not decorators)

```typescript
// Inputs - use input() function, NOT @Input() decorator
name = input<string>();              // Optional
name = input('default');             // With default
name = input.required<string>();     // Required

// Outputs - use output() function, NOT @Output() decorator
clicked = output<void>();
selected = output<Item>();

// Two-way binding - use model() function
value = model<string>('');           // Creates input + output pair
value = model.required<string>();    // Required two-way binding
```

## Component Architecture

### Smart Components (feature/)

- Located in `feature/` libs
- Inject store, dispatch actions
- Handle routing logic
- Pass data to UI components via inputs

```typescript
// user-list-page.component.ts
@Component({
  selector: 'app-user-list-page',
  imports: [UserListComponent],
  templateUrl: './user-list-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserListPageComponent {
  private readonly store = inject(Store);

  users = this.store.selectSignal(selectAllUsers);
  loading = this.store.selectSignal(selectUsersLoading);

  onUserSelect(user: User): void {
    this.store.dispatch(UserActions.selectUser({ user }));
  }
}
```

```html
<!-- user-list-page.component.html -->
<app-user-list
  [users]="users()"
  [loading]="loading()"
  (userSelected)="onUserSelect($event)"
/>
```

### UI Components (ui/)

- Located in `ui/` libs
- NO store injection - never!
- Pure inputs/outputs only
- Fully presentational

```typescript
// user-list.component.ts
@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserListComponent {
  users = input.required<User[]>();
  loading = input(false);
  userSelected = output<User>();
}
```

```html
<!-- user-list.component.html -->
@for (user of users(); track user.id) {
  <div class="user-item" (click)="userSelected.emit(user)">
    {{ user.name }}
  </div>
} @empty {
  <p>No users found</p>
}
```

## Build & Commands

```bash
# Development
nx serve [app-name]

# Build
nx build [app-name]
nx build [app-name] --configuration=production

# Test
nx test [lib-name]              # Single lib
nx run-many -t test             # All tests
nx affected -t test             # Only affected

# Lint
nx lint [project-name]
nx run-many -t lint

# Generate
nx g @nx/angular:component [name] --project=[lib]
nx g @nx/angular:library [name] --directory=libs/[domain]
```

## Code Style

- Prefix: configurable per project (default: `app`)
- File structure: folder-based (`user-list/user-list.component.ts`)
- Always explicit return types on public methods
- Use `readonly` for injected services
- Use `track` in `@for` loops

## RxJS Guidelines

- Prefer signals over observables when possible
- Use `toSignal()` to convert observables
- Clean subscriptions with `takeUntilDestroyed()`
- Avoid nested subscribes - use operators

```typescript
// Convert observable to signal
data = toSignal(this.http.get<Data[]>('/api/data'), { initialValue: [] });

// If you must use observables
private readonly destroyRef = inject(DestroyRef);

this.source$.pipe(
  takeUntilDestroyed(this.destroyRef)
).subscribe();
```
