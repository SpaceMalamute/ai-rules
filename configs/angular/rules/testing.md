---
description: "Angular testing with TestBed"
paths:
  - "**/*.spec.ts"
  - "**/*.test.ts"
  - "**/*.e2e.ts"
---

# Testing Guidelines

## Framework

- **Vitest** (preferred for Angular 21+)
- **Playwright** for E2E testing
- Jest as fallback when required

## Critical Rules

### No `.subscribe()` for RxJS Testing

Never use `.subscribe()` for testing RxJS streams (services, effects, observables). Always use `TestScheduler` with marble testing.

```typescript
// FORBIDDEN - async callback hell
it('should load users', (done) => {
  service.getUsers().subscribe(users => {
    expect(users.length).toBe(2);
    done();
  });
});

// FORBIDDEN - fakeAsync with subscribe
it('should load users', fakeAsync(() => {
  let result: User[];
  service.getUsers().subscribe(users => result = users);
  tick();
  expect(result.length).toBe(2);
}));

// CORRECT - marble testing with TestScheduler
it('should load users', () => {
  testScheduler.run(({ cold, expectObservable }) => {
    const users = [{ id: '1' }, { id: '2' }];
    jest.spyOn(service, 'getUsers').mockReturnValue(cold('--a|', { a: users }));

    expectObservable(service.getUsers()).toBe('--a|', { a: users });
  });
});
```

**Exception**: Component `output()` testing uses `.subscribe()` because OutputEmitterRef is event-based, not RxJS stream-based.

## Test File Structure

```
component.ts
component.spec.ts        # Unit tests

# or in separate folder
__tests__/
  component.spec.ts
```

## Component Testing (Zoneless)

Angular 21 is zoneless by default - tests must not rely on zone.js:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';

describe('UserListComponent', () => {
  let component: UserListComponent;
  let fixture: ComponentFixture<UserListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserListComponent],
      // No need for provideZonelessChangeDetection() - it's the default in Angular 21
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

    // Use whenStable() instead of detectChanges() for zoneless
    await fixture.whenStable();

    const items = fixture.nativeElement.querySelectorAll('.user-item');
    expect(items.length).toBe(2);
  });

  it('should emit on user click', async () => {
    const spy = vi.fn();

    // Subscribe to output signal
    const subscription = component.userSelected.subscribe(spy);

    fixture.componentRef.setInput('users', [{ id: '1', name: 'John' }]);
    await fixture.whenStable();

    fixture.nativeElement.querySelector('.user-item').click();
    await fixture.whenStable();

    expect(spy).toHaveBeenCalledWith({ id: '1', name: 'John' });
    subscription.unsubscribe();
  });
});
```

### Key Testing Patterns for Zoneless

```typescript
// Use whenStable() instead of detectChanges()
await fixture.whenStable();

// For signal inputs
fixture.componentRef.setInput('inputName', value);

// For checking signal values directly
expect(component.mySignal()).toBe(expectedValue);

// For outputs (OutputEmitterRef)
const spy = vi.fn();
component.myOutput.subscribe(spy);
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

## E2E Testing with Playwright

Prefer Playwright for E2E tests when possible.

### Setup

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'nx serve app-name',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env.CI,
  },
});
```

### E2E Test Example

```typescript
// e2e/user-flow.e2e.ts
import { test, expect } from '@playwright/test';

test.describe('User Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/users');
  });

  test('should display user list', async ({ page }) => {
    await expect(page.getByTestId('user-list')).toBeVisible();
    await expect(page.getByTestId('user-item')).toHaveCount(3);
  });

  test('should filter users by name', async ({ page }) => {
    await page.getByPlaceholder('Search users').fill('John');
    await expect(page.getByTestId('user-item')).toHaveCount(1);
    await expect(page.getByText('John Doe')).toBeVisible();
  });

  test('should navigate to user details', async ({ page }) => {
    await page.getByTestId('user-item').first().click();
    await expect(page).toHaveURL(/\/users\/\d+/);
    await expect(page.getByTestId('user-details')).toBeVisible();
  });
});
```

### Page Object Pattern

```typescript
// e2e/pages/user-list.page.ts
import { Page, Locator } from '@playwright/test';

export class UserListPage {
  private readonly page: Page;
  private readonly searchInput: Locator;
  private readonly userItems: Locator;
  private readonly addUserButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByPlaceholder('Search users');
    this.userItems = page.getByTestId('user-item');
    this.addUserButton = page.getByRole('button', { name: 'Add User' });
  }

  public async goto(): Promise<void> {
    await this.page.goto('/users');
  }

  public async searchUser(name: string): Promise<void> {
    await this.searchInput.fill(name);
  }

  public async selectUser(index: number): Promise<void> {
    await this.userItems.nth(index).click();
  }
}
```

### Commands

```bash
# Run E2E tests
nx e2e app-name-e2e

# Run with UI mode
nx e2e app-name-e2e --ui

# Run specific test file
nx e2e app-name-e2e --grep "User Management"
```

## Coverage Expectations

- Aim for >80% coverage on business logic
- 100% coverage on reducers and selectors
- Effects: test success and error paths (with marble)
- UI components: test inputs, outputs, rendering
- E2E: critical user flows
