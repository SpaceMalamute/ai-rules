---
paths:
  - "**/*"
---

# Testing Principles

## Test Structure (AAA Pattern)

1. **Arrange** - Set up test data and dependencies
2. **Act** - Execute the code under test
3. **Assert** - Verify the expected outcome

## Naming Conventions

| Language | Pattern |
|----------|---------|
| TypeScript | `should_ExpectedBehavior_When_Condition` |
| Python | `test_action_condition_expected` |
| C# | `MethodName_Scenario_ExpectedBehavior` |

## Test Organization

- Group tests by class/module
- Sub-group by method or behavior
- Use descriptive describe/context blocks

## Mocking Best Practices

- Mock only external dependencies
- Don't mock internal implementation details
- Use factories for test data
- Verify interactions when behavior matters

## Test Isolation

- Each test must be independent
- No shared mutable state
- Tests should run in any order
- Clean up after each test

## What to Test

| Priority | What | Why |
|----------|------|-----|
| High | Business logic | Core value |
| High | Edge cases | Common bugs |
| Medium | Error paths | Graceful degradation |
| Medium | Integration points | Contract verification |
| Low | Trivial getters/setters | Low value |

## Coverage Guidelines

- **80%+** on business logic
- **100%** on critical paths (payments, auth)
- Don't chase coverage numbers blindly
- One meaningful test > many trivial tests

## Anti-Patterns

- Tests that depend on execution order
- Testing implementation, not behavior
- Excessive mocking (testing mocks, not code)
- Flaky tests (non-deterministic)
- Slow tests in the unit test suite
