---
name: signal-store
description: Generate an @ngrx/signals SignalStore with state, computed, methods, and optional entities
argument-hint: <name> [--entity <EntityName>] [--root]
---

# Generate NgRx SignalStore

Generate a modern SignalStore using `@ngrx/signals` package.

## Syntax

```
/signal-store <name> [--entity <EntityName>] [--root]
```

## Options

| Option | Description |
|--------|-------------|
| `--entity <Name>` | Add entity management with `withEntities()` |
| `--root` | Make store a singleton (`providedIn: 'root'`) |

## Examples

```bash
/signal-store cart
/signal-store users --entity User --root
/signal-store todo --entity TodoItem
/signal-store auth --root
```

## Generated Structure

```
libs/<domain>/data-access/src/lib/stores/
├── <name>.store.ts        # SignalStore definition
├── <name>.store.spec.ts   # Store tests
└── index.ts               # Public API
```

## File Templates

### Basic Store (`<name>.store.ts`)

```typescript
import { computed, inject } from '@angular/core';
import {
  signalStore,
  withState,
  withComputed,
  withMethods,
  withHooks,
  patchState,
} from '@ngrx/signals';
import { <Name>Service } from '../services/<name>.service';
import { firstValueFrom } from 'rxjs';

// State interface
interface <Name>State {
  items: <Item>[];
  selectedId: string | null;
  loading: boolean;
  error: string | null;
}

// Initial state
const initialState: <Name>State = {
  items: [],
  selectedId: null,
  loading: false,
  error: null,
};

export const <Name>Store = signalStore(
  // { providedIn: 'root' },  // Uncomment for singleton store
  withState(initialState),

  withComputed(({ items, selectedId }) => ({
    selectedItem: computed(() => {
      const id = selectedId();
      return id ? items().find(item => item.id === id) ?? null : null;
    }),
    itemCount: computed(() => items().length),
    isEmpty: computed(() => items().length === 0),
  })),

  withMethods((store, <name>Service = inject(<Name>Service)) => ({
    async load(): Promise<void> {
      patchState(store, { loading: true, error: null });

      try {
        const items = await firstValueFrom(<name>Service.getAll());
        patchState(store, { items, loading: false });
      } catch (error) {
        patchState(store, {
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load',
        });
      }
    },

    async add(item: Omit<<Item>, 'id'>): Promise<void> {
      const created = await firstValueFrom(<name>Service.create(item));
      patchState(store, { items: [...store.items(), created] });
    },

    async update(id: string, changes: Partial<<Item>>): Promise<void> {
      const updated = await firstValueFrom(<name>Service.update(id, changes));
      patchState(store, {
        items: store.items().map(item =>
          item.id === id ? updated : item
        ),
      });
    },

    async remove(id: string): Promise<void> {
      await firstValueFrom(<name>Service.delete(id));
      patchState(store, {
        items: store.items().filter(item => item.id !== id),
        selectedId: store.selectedId() === id ? null : store.selectedId(),
      });
    },

    select(id: string | null): void {
      patchState(store, { selectedId: id });
    },

    clearError(): void {
      patchState(store, { error: null });
    },
  })),

  withHooks({
    onInit(store) {
      // Optionally load data on init
      // store.load();
    },
  }),
);
```

### Entity Store (`<name>.store.ts` with `--entity`)

```typescript
import { computed, inject } from '@angular/core';
import {
  signalStore,
  withComputed,
  withMethods,
  withHooks,
  patchState,
} from '@ngrx/signals';
import {
  withEntities,
  setAllEntities,
  addEntity,
  updateEntity,
  removeEntity,
} from '@ngrx/signals/entities';
import { <Entity>Service } from '../services/<entity>.service';
import { firstValueFrom } from 'rxjs';

export interface <Entity> {
  id: string;
  name: string;
  // Add more properties
}

interface <Entity>StoreState {
  loading: boolean;
  error: string | null;
  filter: string;
}

export const <Entity>Store = signalStore(
  { providedIn: 'root' },

  // Entity adapter - provides: entities(), ids(), entityMap()
  withEntities<<Entity>>(),

  // Additional state
  withState<<Entity>StoreState>({
    loading: false,
    error: null,
    filter: '',
  }),

  withComputed(({ entities, filter }) => ({
    filtered<Entities>: computed(() => {
      const filterValue = filter().toLowerCase();
      if (!filterValue) return entities();
      return entities().filter(entity =>
        entity.name.toLowerCase().includes(filterValue)
      );
    }),
    total: computed(() => entities().length),
  })),

  withMethods((store, <entity>Service = inject(<Entity>Service)) => ({
    async load(): Promise<void> {
      patchState(store, { loading: true, error: null });

      try {
        const <entities> = await firstValueFrom(<entity>Service.getAll());
        patchState(store, setAllEntities(<entities>), { loading: false });
      } catch (error) {
        patchState(store, {
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load',
        });
      }
    },

    async add(data: Omit<<Entity>, 'id'>): Promise<void> {
      const <entity> = await firstValueFrom(<entity>Service.create(data));
      patchState(store, addEntity(<entity>));
    },

    async update(id: string, changes: Partial<<Entity>>): Promise<void> {
      const <entity> = await firstValueFrom(<entity>Service.update(id, changes));
      patchState(store, updateEntity({ id, changes: <entity> }));
    },

    async remove(id: string): Promise<void> {
      await firstValueFrom(<entity>Service.delete(id));
      patchState(store, removeEntity(id));
    },

    setFilter(filter: string): void {
      patchState(store, { filter });
    },
  })),

  withHooks({
    onInit(store) {
      store.load();
    },
  }),
);
```

### Store Tests (`<name>.store.spec.ts`)

```typescript
import { TestBed } from '@angular/core/testing';
import { <Name>Store } from './<name>.store';
import { <Name>Service } from '../services/<name>.service';
import { of, throwError } from 'rxjs';

describe('<Name>Store', () => {
  let store: InstanceType<typeof <Name>Store>;
  let <name>ServiceSpy: jasmine.SpyObj<<Name>Service>;

  beforeEach(() => {
    <name>ServiceSpy = jasmine.createSpyObj<<Name>Service>('<Name>Service', [
      'getAll',
      'create',
      'update',
      'delete',
    ]);

    TestBed.configureTestingModule({
      providers: [
        <Name>Store,
        { provide: <Name>Service, useValue: <name>ServiceSpy },
      ],
    });

    store = TestBed.inject(<Name>Store);
  });

  describe('initial state', () => {
    it('should have empty items', () => {
      expect(store.items()).toEqual([]);
    });

    it('should not be loading', () => {
      expect(store.loading()).toBe(false);
    });

    it('should have no error', () => {
      expect(store.error()).toBeNull();
    });
  });

  describe('load', () => {
    it('should set loading to true while loading', async () => {
      <name>ServiceSpy.getAll.and.returnValue(
        of([{ id: '1', name: 'Item 1' }])
      );

      const loadPromise = store.load();
      // Note: In real tests, you'd need to check intermediate state
      await loadPromise;

      expect(store.loading()).toBe(false);
    });

    it('should populate items on success', async () => {
      const items = [{ id: '1', name: 'Item 1' }];
      <name>ServiceSpy.getAll.and.returnValue(of(items));

      await store.load();

      expect(store.items()).toEqual(items);
    });

    it('should set error on failure', async () => {
      <name>ServiceSpy.getAll.and.returnValue(
        throwError(() => new Error('Network error'))
      );

      await store.load();

      expect(store.error()).toBe('Network error');
    });
  });

  describe('add', () => {
    it('should add item to store', async () => {
      const newItem = { id: '1', name: 'New Item' };
      <name>ServiceSpy.create.and.returnValue(of(newItem));

      await store.add({ name: 'New Item' });

      expect(store.items()).toContain(newItem);
    });
  });

  describe('computed', () => {
    it('should compute itemCount', async () => {
      const items = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ];
      <name>ServiceSpy.getAll.and.returnValue(of(items));

      await store.load();

      expect(store.itemCount()).toBe(2);
    });
  });
});
```

## Component Usage

```typescript
@Component({
  selector: 'app-<name>-list',
  providers: [<Name>Store],  // Component-level store (or omit for root)
  template: `
    @if (store.loading()) {
      <app-spinner />
    }

    @if (store.error()) {
      <app-error
        [message]="store.error()!"
        (retry)="store.load()"
      />
    }

    @for (item of store.items(); track item.id) {
      <app-<name>-card
        [item]="item"
        [selected]="store.selectedItem()?.id === item.id"
        (select)="store.select(item.id)"
        (delete)="store.remove(item.id)"
      />
    } @empty {
      <p>No items found</p>
    }
  `,
})
export class <Name>ListComponent {
  protected readonly store = inject(<Name>Store);

  constructor() {
    // Load data on component init if store is component-level
    this.store.load();
  }
}
```

## Execution Steps

1. **Parse Arguments**
   - Extract store name
   - Check for `--entity` flag
   - Check for `--root` flag

2. **Generate Files**
   - Create store file with appropriate template
   - Create test file
   - Update index.ts

3. **Show Usage**
   - Display component usage example
   - Show how to inject the store

## Output Summary

```
✓ Created SignalStore: libs/<domain>/data-access/src/lib/stores/<name>.store.ts

  Store name: <Name>Store
  Type: [Basic | Entity]
  Scope: [Component | Root]

  Features:
  - withState (loading, error, custom state)
  - withComputed (derived values)
  - withMethods (CRUD operations)
  - withHooks (onInit)
  [- withEntities (entity adapter)]

  Usage:
  // In component
  protected readonly store = inject(<Name>Store);

  // Access state
  store.items()
  store.loading()
  store.selectedItem()

  // Call methods
  store.load()
  store.add(item)
  store.update(id, changes)
  store.remove(id)
```

## Placeholders

| Placeholder | Example (product) |
|-------------|-------------------|
| `<name>` | product |
| `<Name>` | Product |
| `<entity>` | product |
| `<Entity>` | Product |
| `<entities>` | products |
| `<Entities>` | Products |
| `<Item>` | Product (or custom type) |
