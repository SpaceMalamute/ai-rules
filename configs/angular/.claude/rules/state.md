---
paths:
  - "libs/**/data-access/**/*.ts"
  - "libs/**/+state/**/*.ts"
---

# NgRx State Management Rules

## File Structure

```
libs/[domain]/data-access/
  src/lib/
    +state/
      [domain].actions.ts
      [domain].reducer.ts
      [domain].effects.ts
      [domain].selectors.ts
      [domain].adapter.ts      # If using @ngrx/entity
      [domain].state.ts        # State interface
    services/
      [domain].service.ts      # API calls
    index.ts                   # Public API
```

## Actions

Use `createActionGroup` for related actions:

```typescript
import { createActionGroup, emptyProps, props } from '@ngrx/store';

export const UserActions = createActionGroup({
  source: 'Users',
  events: {
    // Load
    'Load Users': emptyProps(),
    'Load Users Success': props<{ users: User[] }>(),
    'Load Users Failure': props<{ error: string }>(),

    // CRUD
    'Add User': props<{ user: User }>(),
    'Update User': props<{ update: Update<User> }>(),
    'Delete User': props<{ id: string }>(),

    // Selection
    'Select User': props<{ id: string }>(),
    'Clear Selection': emptyProps(),
  },
});
```

## Reducer with Entity Adapter

Always use `@ngrx/entity` for collections:

```typescript
// [domain].adapter.ts
import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';

export interface UserState extends EntityState<User> {
  selectedId: string | null;
  loading: boolean;
  error: string | null;
}

export const userAdapter: EntityAdapter<User> = createEntityAdapter<User>({
  selectId: (user) => user.id,
  sortComparer: (a, b) => a.name.localeCompare(b.name),
});

export const initialUserState: UserState = userAdapter.getInitialState({
  selectedId: null,
  loading: false,
  error: null,
});
```

```typescript
// [domain].reducer.ts
import { createReducer, on } from '@ngrx/store';

export const userReducer = createReducer(
  initialUserState,

  on(UserActions.loadUsers, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),

  on(UserActions.loadUsersSuccess, (state, { users }) =>
    userAdapter.setAll(users, { ...state, loading: false })
  ),

  on(UserActions.loadUsersFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  on(UserActions.addUser, (state, { user }) =>
    userAdapter.addOne(user, state)
  ),

  on(UserActions.updateUser, (state, { update }) =>
    userAdapter.updateOne(update, state)
  ),

  on(UserActions.deleteUser, (state, { id }) =>
    userAdapter.removeOne(id, state)
  ),

  on(UserActions.selectUser, (state, { id }) => ({
    ...state,
    selectedId: id,
  })),

  on(UserActions.clearSelection, (state) => ({
    ...state,
    selectedId: null,
  }))
);
```

## Selectors

Use adapter selectors and compose them:

```typescript
// [domain].selectors.ts
import { createFeatureSelector, createSelector } from '@ngrx/store';

// Feature selector
export const selectUserState = createFeatureSelector<UserState>('users');

// Adapter selectors
const { selectAll, selectEntities, selectIds, selectTotal } =
  userAdapter.getSelectors();

// Exported selectors
export const selectAllUsers = createSelector(selectUserState, selectAll);

export const selectUserEntities = createSelector(selectUserState, selectEntities);

export const selectUsersLoading = createSelector(
  selectUserState,
  (state) => state.loading
);

export const selectUsersError = createSelector(
  selectUserState,
  (state) => state.error
);

export const selectSelectedUserId = createSelector(
  selectUserState,
  (state) => state.selectedId
);

export const selectSelectedUser = createSelector(
  selectUserEntities,
  selectSelectedUserId,
  (entities, selectedId) => (selectedId ? entities[selectedId] : null)
);

// Derived/computed selectors
export const selectActiveUsers = createSelector(
  selectAllUsers,
  (users) => users.filter((u) => u.active)
);

export const selectUserCount = createSelector(
  selectUserState,
  selectTotal
);
```

## Effects

Keep effects clean and focused:

```typescript
// [domain].effects.ts
import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, exhaustMap, map, of } from 'rxjs';

export const loadUsers$ = createEffect(
  (actions$ = inject(Actions), userService = inject(UserService)) =>
    actions$.pipe(
      ofType(UserActions.loadUsers),
      exhaustMap(() =>
        userService.getAll().pipe(
          map((users) => UserActions.loadUsersSuccess({ users })),
          catchError((error) =>
            of(UserActions.loadUsersFailure({ error: error.message }))
          )
        )
      )
    ),
  { functional: true }
);

export const addUser$ = createEffect(
  (actions$ = inject(Actions), userService = inject(UserService)) =>
    actions$.pipe(
      ofType(UserActions.addUser),
      exhaustMap(({ user }) =>
        userService.create(user).pipe(
          map((created) => UserActions.addUserSuccess({ user: created })),
          catchError((error) =>
            of(UserActions.addUserFailure({ error: error.message }))
          )
        )
      )
    ),
  { functional: true }
);
```

## RxJS Operator Guidelines

| Scenario | Operator |
|----------|----------|
| Single request, cancel previous | `switchMap` |
| Single request, ignore while pending | `exhaustMap` |
| Queue all requests | `concatMap` |
| Parallel requests | `mergeMap` |

## Store Usage in Components

Only in smart components (feature/):

```typescript
// Use selectSignal for signal-based selection
protected readonly users = this.store.selectSignal(selectAllUsers);
protected readonly loading = this.store.selectSignal(selectUsersLoading);

// Dispatch actions
this.store.dispatch(UserActions.loadUsers());
```

## Anti-patterns to Avoid

- Never store derived state in the store (use selectors)
- Never dispatch actions from effects that trigger the same effect
- Never use `store.select()` in UI components
- Never mutate state directly
- Avoid fat effects - keep business logic in services
