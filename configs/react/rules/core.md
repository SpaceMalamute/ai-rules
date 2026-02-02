---
description: "React 19+ project conventions and architecture"
alwaysApply: true
---

# React Project Guidelines

## Stack

- React 19+
- TypeScript strict mode
- Vite (recommended bundler)
- Vitest + React Testing Library

## Architecture

```
src/
  components/           # Reusable UI components
    ui/                 # Design system primitives
    forms/              # Form components
  features/             # Feature modules
    [feature]/
      components/       # Feature-specific components
      hooks/            # Feature-specific hooks
      api/              # Feature API calls
      types.ts          # Feature types
  hooks/                # Shared custom hooks
  lib/                  # Utilities and helpers
  api/                  # API client and endpoints
  types/                # Shared TypeScript types
  App.tsx
  main.tsx
```

## Core Principles

### Component Model

| Server Components | Client Components |
|-------------------|-------------------|
| Default in RSC frameworks | Standard React components |
| No state, no effects | useState, useEffect, hooks |
| Fetch data directly | Event handlers |
| `async` functions | Browser APIs |

### React 19 Features

- **Actions**: async functions for mutations
- **useActionState**: Form state + pending status
- **useOptimistic**: Optimistic UI updates
- **use()**: Unwrap promises/context in render
- **ref as prop**: No more forwardRef needed

### State Management

- **Local state**: `useState` for component state
- **Shared state**: Context or state library (Zustand, Jotai)
- **Server state**: TanStack Query or SWR
- **Form state**: React Hook Form or native actions

## Code Style

- One component per file
- Named exports for components
- Files: `kebab-case.tsx`, Components: `PascalCase`
- Props interface above component
- Destructure props in function signature

### Naming

| Element | Convention |
|---------|------------|
| Components | `PascalCase` |
| Files | `kebab-case.tsx` |
| Hooks | `useCamelCase` |
| Utilities | `camelCase` |
| Constants | `UPPER_SNAKE_CASE` |
| Types/Interfaces | `PascalCase` |

### Component Structure

1. Imports
2. Types/Interfaces
3. Component function
4. Hooks (in consistent order)
5. Derived state / computations
6. Event handlers
7. Effects
8. Return JSX

## Commands

```bash
npm run dev             # Dev server
npm run build           # Production build
npm run test            # Run tests
npm run lint            # ESLint
npm run typecheck       # TypeScript check
```

## Performance

- Memoize expensive computations with `useMemo`
- Memoize callbacks passed to children with `useCallback`
- Use React Compiler (React 19) when available
- Lazy load routes and heavy components
- Avoid inline object/array props

## Testing

- Test behavior, not implementation
- Use React Testing Library
- Mock API calls, not components
- Test user interactions with `userEvent`
