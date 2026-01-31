---
paths:
  - "**/*.ts"
  - "**/*.html"
---

# Angular Signals & Reactivity

## Signals - State Management

```typescript
// Writable signal - use protected for template-bound, private for internal
protected readonly count = signal(0);
protected readonly items = signal<Item[]>([]);

// Read value
const current = this.count();

// Update value
this.count.set(10);
this.count.update(v => v + 1);
this.items.update(items => [...items, newItem]);
```

## Computed - Derived State

```typescript
// Automatically updates when dependencies change
protected readonly doubleCount = computed(() => this.count() * 2);
protected readonly isEmpty = computed(() => this.items().length === 0);
protected readonly filteredItems = computed(() =>
  this.items().filter(item => item.active)
);

// Multiple dependencies
protected readonly summary = computed(() => ({
  total: this.items().length,
  active: this.items().filter(i => i.active).length,
  selected: this.selectedId() !== null,
}));
```

## Effect - Side Effects

```typescript
// Runs when any signal inside changes
effect(() => {
  console.log('Count changed:', this.count());
});

// With cleanup
effect((onCleanup) => {
  const subscription = someObservable$.subscribe();
  onCleanup(() => subscription.unsubscribe());
});

// Conditional tracking
effect(() => {
  if (this.isEnabled()) {
    // Only tracks isEnabled and data when isEnabled is true
    this.saveData(this.data());
  }
});
```

## Signal Inputs/Outputs

```typescript
// Inputs - use input() function, NOT @Input() decorator
public readonly name = input<string>();              // Optional, undefined if not provided
public readonly name = input('default');             // With default value
public readonly name = input.required<string>();     // Required, error if not provided

// Transform input
public readonly count = input(0, { transform: numberAttribute });

// Alias
public readonly userName = input<string>('', { alias: 'name' });
```

```typescript
// Outputs - use output() function, NOT @Output() decorator
public readonly clicked = output<void>();
public readonly selected = output<Item>();
public readonly valueChange = output<string>();

// Emit
this.clicked.emit();
this.selected.emit(item);
```

```typescript
// Two-way binding with model()
public readonly value = model<string>('');           // Creates input + output pair
public readonly value = model.required<string>();    // Required two-way binding

// Parent usage: [(value)]="parentValue"
// Internally creates: [value]="..." (valueChange)="..."

// Update in component
this.value.set('new value');
```

## Convert Observables to Signals

```typescript
// toSignal - convert observable to signal
protected readonly data = toSignal(this.http.get<Data[]>('/api/data'), {
  initialValue: []
});

// With error handling
protected readonly data = toSignal(this.http.get<Data[]>('/api/data'), {
  initialValue: [],
  rejectErrors: true,
});

// From store
protected readonly users = this.store.selectSignal(selectAllUsers);
protected readonly loading = this.store.selectSignal(selectLoading);
```

## Signal Forms (Experimental)

```typescript
import { signalForm } from '@angular/forms';

// Create form with signals
protected readonly form = signalForm({
  name: '',
  email: '',
  age: 0,
});

// Access values (reactive)
form.value();              // { name: '', email: '', age: 0 }
form.controls.name();      // ''
form.valid();              // boolean signal
form.dirty();              // boolean signal

// Set values
form.controls.name.set('John');
form.patchValue({ email: 'john@example.com' });

// In template
<input [formControl]="form.controls.name" />
@if (form.controls.email.invalid()) {
  <span class="error">Invalid email</span>
}
```

## RxJS Interop

```typescript
// toObservable - convert signal to observable
private readonly count$ = toObservable(this.count);

// Use when you need RxJS operators
this.searchQuery$.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(query => this.searchService.search(query))
).subscribe();

// Cleanup with takeUntilDestroyed
private readonly destroyRef = inject(DestroyRef);

this.source$.pipe(
  takeUntilDestroyed(this.destroyRef)
).subscribe(data => this.handleData(data));
```

## Template Control Flow

```html
<!-- Conditionals -->
@if (loading()) {
  <app-spinner />
} @else if (error()) {
  <app-error [message]="error()" />
} @else {
  <app-content [data]="data()" />
}

<!-- Loops - track is REQUIRED -->
@for (item of items(); track item.id) {
  <app-item [item]="item" (click)="select(item)" />
} @empty {
  <p>No items found</p>
}

<!-- Switch -->
@switch (status()) {
  @case ('loading') { <app-spinner /> }
  @case ('error') { <app-error /> }
  @default { <app-content /> }
}

<!-- Defer (lazy loading) -->
@defer (on viewport) {
  <app-heavy-component />
} @placeholder {
  <div>Loading...</div>
}
```

## Anti-patterns to Avoid

```typescript
// BAD: Using decorators
@Input() name: string;        // Use input() instead
@Output() click = new EventEmitter();  // Use output() instead

// BAD: Constructor injection
constructor(private store: Store) {}  // Use inject() instead

// BAD: Subscribing in component
ngOnInit() {
  this.data$.subscribe(d => this.data = d);  // Use toSignal() instead
}

// BAD: Missing track in @for
@for (item of items()) {  // WRONG - missing track
  <div>{{ item.name }}</div>
}

// GOOD: Always use track
@for (item of items(); track item.id) {
  <div>{{ item.name }}</div>
}
```
