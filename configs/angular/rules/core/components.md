---
paths:
  - "**/libs/**/feature/**/*.ts"
  - "**/libs/**/ui/**/*.ts"
  - "**/apps/**/*.component.ts"
---

# Component Rules (Angular 21)

## Visibility Modifiers (MANDATORY)

**Every class member MUST have an explicit visibility modifier.**

```typescript
// BAD - No visibility modifiers
export class UserComponent {
  store = inject(Store);
  users = this.store.selectSignal(selectUsers);

  loadUsers(): void {}
}

// GOOD - Explicit visibility on ALL members
export class UserComponent {
  private readonly store = inject(Store);

  protected readonly users = this.store.selectSignal(selectUsers);

  // Inputs/outputs are public (they are the component API)
  public readonly name = input.required<string>();
  public readonly userSelected = output<User>();

  public loadUsers(): void {}

  private formatUser(user: User): string {}
}
```

### Visibility Rules

| Visibility | When to Use |
|------------|-------------|
| `private` | Injected services, internal state, helper methods |
| `protected` | State/methods needed by child classes |
| `public` | Inputs, outputs, template-bound methods |
| `readonly` | Injected services, signals (add with visibility) |

```typescript
// Standard pattern
private readonly store = inject(Store);        // Service injection
private readonly destroyRef = inject(DestroyRef);

protected readonly loading = signal(false);    // Internal state
protected readonly error = signal<string | null>(null);

public readonly items = input.required<Item[]>();  // Component API
public readonly itemSelected = output<Item>();

public onItemClick(item: Item): void {}        // Template-bound
private processItem(item: Item): void {}       // Internal helper
```

## Code Quality

### No Useless Comments

Code must be self-documenting. Variable and function names must be explicit.

```typescript
// BAD
const c = getConfig();  // get the config
items.filter(x => x.active);

// GOOD
const applicationConfig = getConfig();
items.filter(item => item.active);
users.map(user => user.email);
```

### Never Disable Lint Rules Without Justification

```typescript
// FORBIDDEN - no explanation
// eslint-disable-next-line @typescript-eslint/no-explicit-any

// ALLOWED - only with explicit justification
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Third-party API returns untyped response, ticket ABC-123 to add types
```

### ChangeDetectionStrategy.OnPush

Use `OnPush` for performance optimization. Required for:
- All UI components (dumb components)
- Feature components with signal-based state
- Any component where you control the inputs

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,  // Always add this
})
```

## File Structure

Always use separate files for template and styles:

```
user-list/
  user-list.component.ts
  user-list.component.html
  user-list.component.scss
  user-list.component.spec.ts
```

## @Component Decorator

```typescript
@Component({
  selector: 'app-user-list',
  imports: [SomeComponent, SomePipe],         // Direct imports
  templateUrl: './user-list.component.html',  // Always external
  styleUrl: './user-list.component.scss',     // Always external
  changeDetection: ChangeDetectionStrategy.OnPush,
})
```

**Do NOT include:**
- `standalone: true` (it's the default)
- `template:` inline templates
- `styles:` inline styles

## @defer — Lazy Loading Heavy Components

Use `@defer` for components that are below the fold, heavy, or not critical to
initial paint. This is the Angular way to code-split at component level without
needing router-level lazy loading.

```html
<!-- Heavy component below the fold -->
@defer (on viewport) {
  <app-analytics-chart [data]="chartData()" />
} @placeholder {
  <div class="chart-skeleton" />
} @loading (minimum 200ms) {
  <app-spinner />
}

<!-- Conditionally shown heavy component -->
@defer (when isExpanded()) {
  <app-rich-text-editor [content]="content()" />
} @placeholder {
  <div class="editor-placeholder">Click to edit</div>
}
```

**Use `@defer` when:**
- Component is below the fold on initial render
- Component has heavy third-party dependencies (charts, editors, maps, etc.)
- Component is not visible on page load and shown only on user interaction

## Smart Components (feature/)

Smart components are located in `feature/` libraries.

### Allowed

- Inject `Store` from NgRx
- Dispatch actions
- Use `selectSignal()` for state
- Handle routing and navigation
- Contain page-level logic

### Required

- Pass data to UI components via `input()` signals
- Handle events from UI components via `output()`
- Use `ChangeDetectionStrategy.OnPush`
- Use `templateUrl` (external template file)

### Example

```typescript
// product-page.component.ts
@Component({
  selector: 'app-product-page',
  imports: [ProductListComponent, ProductFiltersComponent],
  templateUrl: './product-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductPageComponent {
  private readonly store = inject(Store);

  protected readonly categories = this.store.selectSignal(selectCategories);
  protected readonly filteredProducts = this.store.selectSignal(selectFilteredProducts);
  protected readonly loading = this.store.selectSignal(selectProductsLoading);

  public onFilterChange(filters: Filters): void {
    this.store.dispatch(ProductActions.setFilters({ filters }));
  }

  public onAddToCart(product: Product): void {
    this.store.dispatch(CartActions.addItem({ product }));
  }
}
```

```html
<!-- product-page.component.html -->
<app-product-filters
  [categories]="categories()"
  (filterChange)="onFilterChange($event)"
/>

<app-product-list
  [products]="filteredProducts()"
  [loading]="loading()"
  (addToCart)="onAddToCart($event)"
/>
```

## UI Components (ui/)

UI components are located in `ui/` libraries. They are purely presentational.

### Forbidden

- NO `Store` injection
- NO service injection (except pure utility services)
- NO direct HTTP calls
- NO router navigation
- NO business logic

### Required

- Use `input()` and `input.required()` for data
- Use `output()` for events
- Use `model()` for two-way binding
- Use `ChangeDetectionStrategy.OnPush`
- Must be fully testable in isolation

### Example

```typescript
// product-card.component.ts
@Component({
  selector: 'app-product-card',
  imports: [CurrencyPipe],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCardComponent {
  public readonly product = input.required<Product>();
  public readonly addToCart = output<Product>();
}
```

```html
<!-- product-card.component.html -->
<article class="product-card">
  <img [src]="product().image" [alt]="product().name" />
  <h3>{{ product().name }}</h3>
  <p class="price">{{ product().price | currency }}</p>
  <button type="button" (click)="addToCart.emit(product())">
    Add to Cart
  </button>
</article>
```

## Signal Inputs/Outputs/Model

Always use signal-based functions, NOT decorators:

```typescript
// Inputs - use input(), NOT @Input()
public readonly name = input<string>();              // Optional
public readonly name = input('default');             // With default
public readonly name = input.required<string>();     // Required

// Outputs - use output(), NOT @Output()
public readonly clicked = output<void>();
public readonly selected = output<Item>();

// Two-way binding - use model()
public readonly value = model<string>('');           // Optional with default
public readonly value = model.required<string>();    // Required

// Emit
this.clicked.emit();
this.selected.emit(item);
this.value.set('new value');         // model is writable
```

### Two-way Binding with model()

```typescript
// Component
@Component({
  selector: 'app-search-input',
  templateUrl: './search-input.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchInputComponent {
  public readonly query = model('');  // Creates [(query)] binding
}
```

```html
<!-- Parent usage -->
<app-search-input [(query)]="searchQuery" />
```

## Control Flow (in templates)

Use the built-in control flow syntax:

```html
<!-- Conditionals -->
@if (loading()) {
  <app-spinner />
} @else if (error()) {
  <app-error [message]="error()" />
} @else {
  <app-content [data]="data()" />
}

<!-- Loops - always use track! -->
@for (item of items(); track item.id) {
  <app-item [item]="item" />
} @empty {
  <p>No items found</p>
}

<!-- Switch -->
@switch (status()) {
  @case ('loading') { <app-spinner /> }
  @case ('error') { <app-error /> }
  @default { <app-content /> }
}
```
