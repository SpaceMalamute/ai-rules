---
paths:
  - "**/*.spec.ts"
  - "**/*.test.ts"
---

# Testing Guidelines

## Framework

- **Vitest** (preferred for Angular 21+)
- Jest as fallback when required
- Follow framework recommendations

## Test File Structure

```
component.ts
component.spec.ts        # Unit tests

# or in separate folder
__tests__/
  component.spec.ts
```

## Component Testing (Zoneless)

Angular 21 is zoneless - tests must not rely on zone.js:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';

describe('UserListComponent', () => {
  let component: UserListComponent;
  let fixture: ComponentFixture<UserListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserListComponent],
      providers: [
        provideExperimentalZonelessChangeDetection(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserListComponent);
    component = fixture.componentInstance;
  });

  it('should display users', async () => {
    // Set input signal
    fixture.componentRef.setInput('users', [
      { id: '1', name: 'John' },
      { id: '2', name: 'Jane' },
    ]);

    // Trigger change detection manually (zoneless)
    await fixture.whenStable();

    const items = fixture.nativeElement.querySelectorAll('.user-item');
    expect(items.length).toBe(2);
  });

  it('should emit on user click', async () => {
    const spy = vi.fn();
    component.userSelected.subscribe(spy);

    fixture.componentRef.setInput('users', [{ id: '1', name: 'John' }]);
    await fixture.whenStable();

    fixture.nativeElement.querySelector('.user-item').click();
    expect(spy).toHaveBeenCalledWith({ id: '1', name: 'John' });
  });
});
```

## Service Mocking with createSpyFromClass

Use `jasmine-auto-spies` or equivalent:

```typescript
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';

describe('UserEffects', () => {
  let userService: Spy<UserService>;

  beforeEach(() => {
    userService = createSpyFromClass(UserService);

    TestBed.configureTestingModule({
      providers: [
        { provide: UserService, useValue: userService },
      ],
    });
  });

  it('should load users', () => {
    userService.getAll.and.returnValue(of([{ id: '1', name: 'John' }]));
    // ... test
  });

  it('should handle error', () => {
    userService.getAll.and.returnValue(throwError(() => new Error('API Error')));
    // ... test
  });
});
```

## NgRx Effects Testing with Marble

Use `TestScheduler` for RxJS marble testing:

```typescript
import { TestScheduler } from 'rxjs/testing';

describe('User Effects', () => {
  let testScheduler: TestScheduler;
  let actions$: Observable<Action>;
  let userService: Spy<UserService>;

  beforeEach(() => {
    testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });

    userService = createSpyFromClass(UserService);
  });

  it('should load users successfully', () => {
    testScheduler.run(({ hot, cold, expectObservable }) => {
      // Setup
      const users = [{ id: '1', name: 'John' }];
      actions$ = hot('-a', { a: UserActions.loadUsers() });
      userService.getAll.and.returnValue(cold('--b|', { b: users }));

      // Execute
      const effect = loadUsers$(actions$, userService);

      // Assert
      expectObservable(effect).toBe('---c', {
        c: UserActions.loadUsersSuccess({ users }),
      });
    });
  });

  it('should handle load error', () => {
    testScheduler.run(({ hot, cold, expectObservable }) => {
      const error = new Error('API Error');
      actions$ = hot('-a', { a: UserActions.loadUsers() });
      userService.getAll.and.returnValue(cold('--#', {}, error));

      const effect = loadUsers$(actions$, userService);

      expectObservable(effect).toBe('---c', {
        c: UserActions.loadUsersFailure({ error: 'API Error' }),
      });
    });
  });
});
```

## Marble Syntax Reference

| Symbol | Meaning |
|--------|---------|
| `-` | 10ms of time passing |
| `a-z` | Emission with value from values object |
| `\|` | Complete |
| `#` | Error |
| `^` | Subscription point |
| `!` | Unsubscription point |
| `()` | Sync grouping |

## Selector Testing

Test selectors in isolation:

```typescript
describe('User Selectors', () => {
  const initialState: UserState = {
    ids: ['1', '2'],
    entities: {
      '1': { id: '1', name: 'John', active: true },
      '2': { id: '2', name: 'Jane', active: false },
    },
    selectedId: '1',
    loading: false,
    error: null,
  };

  it('should select all users', () => {
    const result = selectAllUsers.projector(initialState);
    expect(result.length).toBe(2);
  });

  it('should select active users only', () => {
    const allUsers = selectAllUsers.projector(initialState);
    const result = selectActiveUsers.projector(allUsers);
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('John');
  });

  it('should select current user', () => {
    const entities = selectUserEntities.projector(initialState);
    const result = selectSelectedUser.projector(entities, '1');
    expect(result?.name).toBe('John');
  });
});
```

## Reducer Testing

```typescript
describe('User Reducer', () => {
  it('should set loading on loadUsers', () => {
    const state = userReducer(initialUserState, UserActions.loadUsers());
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('should add users on loadUsersSuccess', () => {
    const users = [{ id: '1', name: 'John' }];
    const state = userReducer(
      { ...initialUserState, loading: true },
      UserActions.loadUsersSuccess({ users })
    );

    expect(state.loading).toBe(false);
    expect(state.ids).toEqual(['1']);
    expect(state.entities['1'].name).toBe('John');
  });
});
```

## Test Organization

```typescript
describe('FeatureName', () => {
  // Setup
  beforeEach(() => { /* ... */ });
  afterEach(() => { /* ... */ });

  // Group by behavior
  describe('when initialized', () => {
    it('should have default state', () => {});
  });

  describe('when loading data', () => {
    it('should show loading indicator', () => {});
    it('should handle success', () => {});
    it('should handle error', () => {});
  });

  describe('when user interacts', () => {
    it('should emit selection event', () => {});
  });
});
```

## Coverage Expectations

- Aim for >80% coverage on business logic
- 100% coverage on reducers and selectors
- Effects: test success and error paths
- UI components: test inputs, outputs, rendering
