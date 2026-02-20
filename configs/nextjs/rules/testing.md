---
description: "Next.js testing with Vitest and Playwright"
paths:
  - "**/*.test.tsx"
  - "**/*.test.ts"
  - "**/*.spec.tsx"
  - "**/*.spec.ts"
  - "**/*.e2e.ts"
---

# Testing Guidelines (Next.js)

## Framework

- **Vitest** or **Jest** for unit/integration tests
- **React Testing Library** for component tests
- **Playwright** for E2E tests

## Test File Structure

```
component.tsx
component.test.tsx       # Co-located tests

# or
__tests__/
  component.test.tsx
```

## Component Testing

### Basic Component Test

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserCard } from './user-card';

describe('UserCard', () => {
  const mockUser = { id: '1', name: 'John Doe', email: 'john@example.com' };

  it('should render user information', () => {
    render(<UserCard user={mockUser} onSelect={vi.fn()} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('should call onSelect when clicked', async () => {
    const handleSelect = vi.fn();
    const user = userEvent.setup();

    render(<UserCard user={mockUser} onSelect={handleSelect} />);

    await user.click(screen.getByRole('button'));

    expect(handleSelect).toHaveBeenCalledWith(mockUser);
  });
});
```

### Testing Async Components

```tsx
import { render, screen } from '@testing-library/react';

// Mock the fetch/data function
vi.mock('@/lib/api', () => ({
  getUsers: vi.fn().mockResolvedValue([
    { id: '1', name: 'John' },
    { id: '2', name: 'Jane' },
  ]),
}));

describe('UsersPage', () => {
  it('should render users', async () => {
    // For async Server Components, render and await
    const Page = await import('./page');
    render(await Page.default());

    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('Jane')).toBeInTheDocument();
  });
});
```

### Testing with Providers

```tsx
import { render } from '@testing-library/react';

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        {ui}
      </ThemeProvider>
    </QueryClientProvider>
  );
}

it('should render with providers', () => {
  renderWithProviders(<MyComponent />);
});
```

## Server Actions Testing

```tsx
import { createUser } from './actions';

describe('createUser', () => {
  it('should create a user', async () => {
    const formData = new FormData();
    formData.set('name', 'John Doe');
    formData.set('email', 'john@example.com');

    const result = await createUser(formData);

    expect(result.success).toBe(true);
  });

  it('should validate input', async () => {
    const formData = new FormData();
    formData.set('name', ''); // Invalid

    const result = await createUser(formData);

    expect(result.error).toBeDefined();
  });
});
```

## Hook Testing

```tsx
import { renderHook, act } from '@testing-library/react';
import { useCounter } from './use-counter';

describe('useCounter', () => {
  it('should increment counter', () => {
    const { result } = renderHook(() => useCounter());

    expect(result.current.count).toBe(0);

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });
});
```

## E2E Testing with Playwright

### Setup

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'nx serve app-name',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### E2E Test Example

```typescript
// e2e/users.e2e.ts
import { test, expect } from '@playwright/test';

test.describe('Users Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/users');
  });

  test('should display user list', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
    await expect(page.getByTestId('user-list')).toBeVisible();
  });

  test('should create new user', async ({ page }) => {
    await page.getByRole('button', { name: 'Add User' }).click();

    await page.getByLabel('Name').fill('John Doe');
    await page.getByLabel('Email').fill('john@example.com');
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page.getByText('John Doe')).toBeVisible();
  });

  test('should filter users', async ({ page }) => {
    await page.getByPlaceholder('Search...').fill('John');

    await expect(page.getByTestId('user-card')).toHaveCount(1);
  });
});
```

### Page Object Pattern

```typescript
// e2e/pages/users.page.ts
import { Page, Locator } from '@playwright/test';

export class UsersPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly userList: Locator;
  readonly searchInput: Locator;
  readonly addButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Users' });
    this.userList = page.getByTestId('user-list');
    this.searchInput = page.getByPlaceholder('Search...');
    this.addButton = page.getByRole('button', { name: 'Add User' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/users');
  }

  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
  }

  async addUser(name: string, email: string): Promise<void> {
    await this.addButton.click();
    await this.page.getByLabel('Name').fill(name);
    await this.page.getByLabel('Email').fill(email);
    await this.page.getByRole('button', { name: 'Submit' }).click();
  }
}
```

## Mocking

### Mocking Modules

```tsx
// Mock entire module
vi.mock('@/lib/api', () => ({
  getUsers: vi.fn(),
  createUser: vi.fn(),
}));

// Mock with implementation
import { getUsers } from '@/lib/api';

vi.mocked(getUsers).mockResolvedValue([
  { id: '1', name: 'John' },
]);
```

### Mocking Next.js

```tsx
// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/users',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: () => ({
    get: vi.fn(),
    set: vi.fn(),
  }),
  headers: () => new Headers(),
}));
```

## Commands

```bash
# Run tests
nx test [project]

# Run with coverage
nx test [project] --coverage

# Run E2E
nx e2e [project]-e2e

# Run E2E with UI
nx e2e [project]-e2e --ui

# Run specific test
nx test [project] --testFile=user-card.test.tsx
```

## Coverage Expectations

- >80% coverage on business logic
- Test all Server Actions
- Test user interactions
- E2E for critical user flows
