---
paths:
  - "libs/**/feature/**/*.ts"
  - "libs/**/ui/**/*.ts"
  - "apps/**/*.component.ts"
---

# Component Rules

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

### Example

```typescript
@Component({
  selector: 'app-product-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProductListComponent, ProductFiltersComponent],
  template: `
    <app-product-filters
      [categories]="categories()"
      (filterChange)="onFilterChange($event)"
    />
    <app-product-list
      [products]="filteredProducts()"
      [loading]="loading()"
      (addToCart)="onAddToCart($event)"
    />
  `
})
export class ProductPageComponent {
  private readonly store = inject(Store);

  categories = this.store.selectSignal(selectCategories);
  filteredProducts = this.store.selectSignal(selectFilteredProducts);
  loading = this.store.selectSignal(selectProductsLoading);

  onFilterChange(filters: Filters): void {
    this.store.dispatch(ProductActions.setFilters({ filters }));
  }

  onAddToCart(product: Product): void {
    this.store.dispatch(CartActions.addItem({ product }));
  }
}
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
- Use `ChangeDetectionStrategy.OnPush`
- Must be fully testable in isolation

### Example

```typescript
@Component({
  selector: 'app-product-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CurrencyPipe],
  template: `
    <article class="product-card">
      <img [src]="product().image" [alt]="product().name" />
      <h3>{{ product().name }}</h3>
      <p class="price">{{ product().price | currency }}</p>
      <button (click)="addToCart.emit(product())">Add to Cart</button>
    </article>
  `
})
export class ProductCardComponent {
  product = input.required<Product>();
  addToCart = output<Product>();
}
```

## Signal Inputs/Outputs

Always use the new signal-based inputs and outputs:

```typescript
// Inputs
name = input<string>();              // Optional
name = input('default');             // With default
name = input.required<string>();     // Required

// Outputs
clicked = output<void>();
selected = output<Item>();

// Emit
this.clicked.emit();
this.selected.emit(item);
```

## Control Flow

Use the new built-in control flow syntax:

```typescript
// Conditionals
@if (loading()) {
  <app-spinner />
} @else if (error()) {
  <app-error [message]="error()" />
} @else {
  <app-content [data]="data()" />
}

// Loops - always use track!
@for (item of items(); track item.id) {
  <app-item [item]="item" />
} @empty {
  <p>No items found</p>
}

// Switch
@switch (status()) {
  @case ('loading') { <app-spinner /> }
  @case ('error') { <app-error /> }
  @default { <app-content /> }
}
```
