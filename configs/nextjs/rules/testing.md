---
description: "Next.js testing with Vitest and Playwright"
paths:
  - "**/*.test.tsx"
  - "**/*.test.ts"
  - "**/*.spec.tsx"
  - "**/*.spec.ts"
  - "**/*.e2e.ts"
---

# Testing

## Stack

- **Vitest** + **React Testing Library** for unit/integration tests (default)
- **Playwright** for E2E tests

## What to Test at Each Level

| Level | What | Tools |
|-------|------|-------|
| Unit | Utils, hooks, store logic, Server Action validation | Vitest |
| Integration | Component rendering, user interactions, form submissions | Vitest + RTL |
| E2E | Critical user flows (auth, checkout, CRUD) | Playwright |

## Key Directives

- DO co-locate test files next to source: `component.tsx` + `component.test.tsx`
- DO test Server Components by calling them as async functions and asserting the result. Native async component testing in RTL is evolving; consider testing data-fetching and Server Actions separately as unit tests.
- DO test Server Actions as plain async functions with `FormData` input
- DO mock `next/navigation` and `next/headers` in unit tests
- DO use `vi.fn()` for callbacks and `vi.mock()` for modules
- DO use `userEvent.setup()` over `fireEvent` — simulates real user behavior
- DO use Page Object pattern in Playwright for maintainable E2E tests

## Coverage Targets

- >80% on business logic and Server Actions
- All user interactions (clicks, form submissions, error states)
- E2E for critical user flows only — not for unit-testable logic

## Mocking Next.js

Mock `next/navigation` (`useRouter`, `usePathname`, `useSearchParams`) and `next/headers` (`cookies`, `headers`) in unit tests. Both are commonly needed for Server Component and middleware tests.

## Testing with Providers

DO create a `renderWithProviders` utility that wraps components in required context providers.
DO NOT duplicate provider setup across test files.

## Anti-Patterns

- DO NOT test implementation details — test behavior and output
- DO NOT write E2E tests for what unit tests cover — E2E is slow and flaky
- DO NOT forget to reset mocks / store state in `beforeEach`
- DO NOT skip error state testing — verify error boundaries and validation feedback
