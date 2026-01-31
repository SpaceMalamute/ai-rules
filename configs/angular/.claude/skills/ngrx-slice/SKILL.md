---
name: ngrx-slice
description: Generate a complete NgRx store slice with actions, reducer, effects, selectors, and Entity Adapter
argument-hint: <domain> [--entity <EntityName>]
---

# Generate NgRx Store Slice

Generate a complete NgRx store slice following best practices with Entity Adapter.

## Syntax

```
/ngrx-slice <domain> [--entity <EntityName>]
```

## Examples

```bash
/ngrx-slice users
/ngrx-slice products --entity Product
/ngrx-slice orders --entity Order
```

## Generated Structure

```
libs/<domain>/data-access/src/lib/+state/
├── <domain>.actions.ts      # Action groups with createActionGroup
├── <domain>.reducer.ts      # Reducer with Entity Adapter
├── <domain>.effects.ts      # Functional effects
├── <domain>.selectors.ts    # Memoized selectors
├── <domain>.state.ts        # State interface
└── <domain>.adapter.ts      # Entity Adapter config
```

## File Templates

### 1. State Interface (`<domain>.state.ts`)

```typescript
import { EntityState } from '@ngrx/entity';

export interface <Entity> {
  id: string;
  // Add entity properties
}

export interface <Entity>State extends EntityState<<Entity>> {
  selectedId: string | null;
  loading: boolean;
  error: string | null;
}
```

### 2. Entity Adapter (`<domain>.adapter.ts`)

```typescript
import { createEntityAdapter, EntityAdapter } from '@ngrx/entity';
import { <Entity>, <Entity>State } from './<domain>.state';

export const <entity>Adapter: EntityAdapter<<Entity>> = createEntityAdapter<<Entity>>({
  selectId: (<entity>) => <entity>.id,
  sortComparer: (a, b) => a.name.localeCompare(b.name),
});

export const initial<Entity>State: <Entity>State = <entity>Adapter.getInitialState({
  selectedId: null,
  loading: false,
  error: null,
});
```

### 3. Actions (`<domain>.actions.ts`)

```typescript
import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { <Entity> } from './<domain>.state';

export const <Entity>Actions = createActionGroup({
  source: '<Entities>',
  events: {
    // Load
    'Load <Entities>': emptyProps(),
    'Load <Entities> Success': props<{ <entities>: <Entity>[] }>(),
    'Load <Entities> Failure': props<{ error: string }>(),

    // Load Single
    'Load <Entity>': props<{ id: string }>(),
    'Load <Entity> Success': props<{ <entity>: <Entity> }>(),
    'Load <Entity> Failure': props<{ error: string }>(),

    // Create
    'Create <Entity>': props<{ <entity>: Omit<<Entity>, 'id'> }>(),
    'Create <Entity> Success': props<{ <entity>: <Entity> }>(),
    'Create <Entity> Failure': props<{ error: string }>(),

    // Update
    'Update <Entity>': props<{ update: Update<<Entity>> }>(),
    'Update <Entity> Success': props<{ <entity>: <Entity> }>(),
    'Update <Entity> Failure': props<{ error: string }>(),

    // Delete
    'Delete <Entity>': props<{ id: string }>(),
    'Delete <Entity> Success': props<{ id: string }>(),
    'Delete <Entity> Failure': props<{ error: string }>(),

    // Selection
    'Select <Entity>': props<{ id: string }>(),
    'Clear Selection': emptyProps(),
  },
});
```

### 4. Reducer (`<domain>.reducer.ts`)

```typescript
import { createReducer, on } from '@ngrx/store';
import { <Entity>Actions } from './<domain>.actions';
import { <entity>Adapter, initial<Entity>State } from './<domain>.adapter';

export const <entity>Reducer = createReducer(
  initial<Entity>State,

  // Load All
  on(<Entity>Actions.load<Entities>, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(<Entity>Actions.load<Entities>Success, (state, { <entities> }) =>
    <entity>Adapter.setAll(<entities>, { ...state, loading: false })
  ),
  on(<Entity>Actions.load<Entities>Failure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  // Load Single
  on(<Entity>Actions.load<Entity>Success, (state, { <entity> }) =>
    <entity>Adapter.upsertOne(<entity>, state)
  ),

  // Create
  on(<Entity>Actions.create<Entity>Success, (state, { <entity> }) =>
    <entity>Adapter.addOne(<entity>, state)
  ),

  // Update
  on(<Entity>Actions.update<Entity>Success, (state, { <entity> }) =>
    <entity>Adapter.updateOne({ id: <entity>.id, changes: <entity> }, state)
  ),

  // Delete
  on(<Entity>Actions.delete<Entity>Success, (state, { id }) =>
    <entity>Adapter.removeOne(id, state)
  ),

  // Selection
  on(<Entity>Actions.select<Entity>, (state, { id }) => ({
    ...state,
    selectedId: id,
  })),
  on(<Entity>Actions.clearSelection, (state) => ({
    ...state,
    selectedId: null,
  })),
);
```

### 5. Selectors (`<domain>.selectors.ts`)

```typescript
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { <Entity>State } from './<domain>.state';
import { <entity>Adapter } from './<domain>.adapter';

export const select<Entity>State = createFeatureSelector<<Entity>State>('<entities>');

const { selectAll, selectEntities, selectIds, selectTotal } =
  <entity>Adapter.getSelectors();

export const selectAll<Entities> = createSelector(select<Entity>State, selectAll);

export const select<Entity>Entities = createSelector(select<Entity>State, selectEntities);

export const select<Entity>Ids = createSelector(select<Entity>State, selectIds);

export const select<Entity>Total = createSelector(select<Entity>State, selectTotal);

export const select<Entities>Loading = createSelector(
  select<Entity>State,
  (state) => state.loading
);

export const select<Entities>Error = createSelector(
  select<Entity>State,
  (state) => state.error
);

export const selectSelected<Entity>Id = createSelector(
  select<Entity>State,
  (state) => state.selectedId
);

export const selectSelected<Entity> = createSelector(
  select<Entity>Entities,
  selectSelected<Entity>Id,
  (entities, selectedId) => (selectedId ? entities[selectedId] : null)
);
```

### 6. Effects (`<domain>.effects.ts`)

```typescript
import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, exhaustMap, map, of } from 'rxjs';
import { <Entity>Actions } from './<domain>.actions';
import { <Entity>Service } from '../services/<domain>.service';

export const load<Entities>$ = createEffect(
  (
    actions$ = inject(Actions),
    <entity>Service = inject(<Entity>Service)
  ) =>
    actions$.pipe(
      ofType(<Entity>Actions.load<Entities>),
      exhaustMap(() =>
        <entity>Service.getAll().pipe(
          map((<entities>) => <Entity>Actions.load<Entities>Success({ <entities> })),
          catchError((error) =>
            of(<Entity>Actions.load<Entities>Failure({ error: error.message }))
          )
        )
      )
    ),
  { functional: true }
);

export const load<Entity>$ = createEffect(
  (
    actions$ = inject(Actions),
    <entity>Service = inject(<Entity>Service)
  ) =>
    actions$.pipe(
      ofType(<Entity>Actions.load<Entity>),
      exhaustMap(({ id }) =>
        <entity>Service.getById(id).pipe(
          map((<entity>) => <Entity>Actions.load<Entity>Success({ <entity> })),
          catchError((error) =>
            of(<Entity>Actions.load<Entity>Failure({ error: error.message }))
          )
        )
      )
    ),
  { functional: true }
);

export const create<Entity>$ = createEffect(
  (
    actions$ = inject(Actions),
    <entity>Service = inject(<Entity>Service)
  ) =>
    actions$.pipe(
      ofType(<Entity>Actions.create<Entity>),
      exhaustMap(({ <entity> }) =>
        <entity>Service.create(<entity>).pipe(
          map((<entity>) => <Entity>Actions.create<Entity>Success({ <entity> })),
          catchError((error) =>
            of(<Entity>Actions.create<Entity>Failure({ error: error.message }))
          )
        )
      )
    ),
  { functional: true }
);

export const update<Entity>$ = createEffect(
  (
    actions$ = inject(Actions),
    <entity>Service = inject(<Entity>Service)
  ) =>
    actions$.pipe(
      ofType(<Entity>Actions.update<Entity>),
      exhaustMap(({ update }) =>
        <entity>Service.update(update.id as string, update.changes).pipe(
          map((<entity>) => <Entity>Actions.update<Entity>Success({ <entity> })),
          catchError((error) =>
            of(<Entity>Actions.update<Entity>Failure({ error: error.message }))
          )
        )
      )
    ),
  { functional: true }
);

export const delete<Entity>$ = createEffect(
  (
    actions$ = inject(Actions),
    <entity>Service = inject(<Entity>Service)
  ) =>
    actions$.pipe(
      ofType(<Entity>Actions.delete<Entity>),
      exhaustMap(({ id }) =>
        <entity>Service.delete(id).pipe(
          map(() => <Entity>Actions.delete<Entity>Success({ id })),
          catchError((error) =>
            of(<Entity>Actions.delete<Entity>Failure({ error: error.message }))
          )
        )
      )
    ),
  { functional: true }
);
```

## Execution Steps

1. **Parse Arguments**
   - Extract domain name (e.g., "users")
   - Extract entity name (e.g., "User") or derive from domain

2. **Create Files**
   - Generate all 6 files with proper naming
   - Replace placeholders with actual names

3. **Update Public API**
   - Export all from `index.ts`

4. **Provide Registration**
   - Show how to register in `app.config.ts`

## Output

```typescript
// app.config.ts
import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { <entity>Reducer } from '@app/<domain>/data-access';
import * as <entity>Effects from '@app/<domain>/data-access';

export const appConfig: ApplicationConfig = {
  providers: [
    provideStore(),
    provideState('<entities>', <entity>Reducer),
    provideEffects(<entity>Effects),
  ],
};
```

## Placeholders

| Placeholder | Example (users) |
|-------------|-----------------|
| `<domain>` | users |
| `<entity>` | user |
| `<Entity>` | User |
| `<entities>` | users |
| `<Entities>` | Users |
