---
description: "React testing patterns with Vitest and Testing Library"
paths:
  - "src/**/*.test.tsx"
  - "src/**/*.test.ts"
  - "src/**/*.spec.tsx"
  - "src/**/*.spec.ts"
---

# React Testing

## Component Tests

### GOOD

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserCard } from './user-card';

describe('UserCard', () => {
  it('displays user information', () => {
    const user = { id: '1', name: 'John', email: 'john@example.com' };

    render(<UserCard user={user} />);

    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('calls onSelect when clicked', async () => {
    const user = { id: '1', name: 'John', email: 'john@example.com' };
    const handleSelect = vi.fn();

    render(<UserCard user={user} onSelect={handleSelect} />);
    await userEvent.click(screen.getByRole('article'));

    expect(handleSelect).toHaveBeenCalledWith(user);
  });
});
```

### BAD

```tsx
// Testing implementation details
it('sets internal state', () => {
  const { result } = renderHook(() => useCounter());
  expect(result.current.internalState).toBe(0); // Don't test internals
});

// Snapshot overuse
it('renders correctly', () => {
  const { container } = render(<ComplexComponent />);
  expect(container).toMatchSnapshot(); // Brittle, hard to review
});
```

## Testing User Interactions

### GOOD

```tsx
import userEvent from '@testing-library/user-event';

it('submits form with entered data', async () => {
  const user = userEvent.setup();
  const handleSubmit = vi.fn();

  render(<LoginForm onSubmit={handleSubmit} />);

  await user.type(screen.getByLabelText(/email/i), 'test@example.com');
  await user.type(screen.getByLabelText(/password/i), 'password123');
  await user.click(screen.getByRole('button', { name: /sign in/i }));

  expect(handleSubmit).toHaveBeenCalledWith({
    email: 'test@example.com',
    password: 'password123',
  });
});
```

### BAD

```tsx
// Using fireEvent instead of userEvent
fireEvent.change(input, { target: { value: 'test' } });
fireEvent.click(button);
```

## Testing Hooks

### GOOD

```tsx
import { renderHook, act } from '@testing-library/react';
import { useCounter } from './use-counter';

describe('useCounter', () => {
  it('increments count', () => {
    const { result } = renderHook(() => useCounter());

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });

  it('accepts initial value', () => {
    const { result } = renderHook(() => useCounter(10));
    expect(result.current.count).toBe(10);
  });
});
```

## Mocking API Calls

### GOOD

```tsx
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: '1', name: 'John' },
      { id: '2', name: 'Jane' },
    ]);
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it('displays users from API', async () => {
  render(<UserList />);

  expect(await screen.findByText('John')).toBeInTheDocument();
  expect(screen.getByText('Jane')).toBeInTheDocument();
});
```

### BAD

```tsx
// Mocking implementation instead of network
vi.mock('./api', () => ({
  getUsers: vi.fn().mockResolvedValue([...])
}));
```

## Testing Async Behavior

### GOOD

```tsx
it('shows loading then data', async () => {
  render(<UserList />);

  // Loading state
  expect(screen.getByRole('progressbar')).toBeInTheDocument();

  // Wait for data
  expect(await screen.findByText('John')).toBeInTheDocument();
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
});
```

## Testing Error States

### GOOD

```tsx
it('displays error message on failure', async () => {
  server.use(
    http.get('/api/users', () => {
      return HttpResponse.json({ error: 'Server error' }, { status: 500 });
    })
  );

  render(<UserList />);

  expect(await screen.findByRole('alert')).toHaveTextContent(/failed to load/i);
});
```

## Query Priority

Use queries in this order (most to least preferred):

1. `getByRole` - Accessible name
2. `getByLabelText` - Form inputs
3. `getByPlaceholderText` - When no label
4. `getByText` - Non-interactive content
5. `getByTestId` - Last resort

### GOOD

```tsx
screen.getByRole('button', { name: /submit/i });
screen.getByLabelText(/email address/i);
```

### BAD

```tsx
screen.getByTestId('submit-button'); // Use role instead
container.querySelector('.btn-primary'); // Never query by class
```
