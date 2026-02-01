---
description: "Next.js 15+ project conventions and architecture"
alwaysApply: true
---

# Next.js Project Guidelines

## Stack

- Next.js 15+ (App Router)
- React 19+
- TypeScript strict mode
- Nx monorepo

## Architecture - Nx

```
apps/[app-name]/app/          # App Router
  (routes)/                   # Route groups (not in URL)
    users/
      page.tsx                # /users
      _components/            # Private, co-located
  layout.tsx
  error.tsx
  loading.tsx

libs/[domain]/
  feature/                    # Feature logic
  ui/                         # Presentational components
  data-access/                # API, server actions
  util/                       # Helpers
```

### Folder Conventions

| Pattern | Meaning |
|---------|---------|
| `_folder/` | Private - co-located, not a route |
| `(folder)/` | Route group - organizational only |
| `[param]/` | Dynamic segment |
| `[...param]/` | Catch-all segment |

## Core Principles

### Server vs Client Components

| Server (default) | Client (`'use client'`) |
|------------------|-------------------------|
| Fetch data, access DB | useState, useEffect, hooks |
| Use secrets/env vars | Event handlers (onClick) |
| Static content | Browser APIs |
| No hooks/events | Interactive UI |

### Data Fetching

- **Read**: Server Components with `fetch()` or DB
- **Mutations**: Server Actions with `'use server'`
- **Revalidation**: `revalidatePath()` or `revalidateTag()`

### React 19 Hooks

- `useActionState` - Form state + pending
- `useOptimistic` - Optimistic UI updates
- `use()` - Unwrap promises/context

## Code Style

- One component per file
- Named exports for components
- Default export only for `page.tsx`, `layout.tsx`
- Files: `kebab-case.tsx`, Components: `PascalCase`
- Props interface above component

### Naming

| Element | Convention |
|---------|------------|
| Components | `PascalCase` |
| Files | `kebab-case.tsx` |
| Hooks | `useCamelCase` |
| Server Actions | `camelCase` |
| Route folders | `kebab-case/` |

### Error Handling

- `error.tsx` - Error boundary (must be client component)
- `loading.tsx` - Suspense loading state
- `not-found.tsx` - 404 page

## Commands

```bash
nx serve [app]              # Dev server
nx build [app] --configuration=production
nx test [lib]               # Unit tests
nx affected -t test         # Test affected
nx e2e [app]-e2e            # E2E tests
```

## Caching (Next.js 15)

- Default: `staleTime=0` - always fresh data on navigation
- Static routes cached, dynamic routes not cached
- Route segment config:
  - `export const dynamic = 'force-dynamic'` - SSR
  - `export const revalidate = 60` - ISR (seconds)
  - `export const dynamic = 'force-static'` - SSG
- `"use cache"` directive for granular caching
- `fetch(url, { next: { revalidate: 60 } })` - per-request

## Performance

- Keep most UI as Server Components
- Add `'use client'` only for interactive "islands"
- `next/dynamic` for heavy client components
- Always use `next/image` and `next/link`
- Never `useEffect` for data fetching
