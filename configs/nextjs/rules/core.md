---
description: "Next.js 15+ project conventions and architecture"
alwaysApply: true
---

# Next.js Project Guidelines

## Stack

- Next.js 15+ (App Router only) with Turbopack
- React 19+
- TypeScript strict mode
- Nx monorepo

## Rendering Model

- **PPR (Partial Prerendering)** — static shell + dynamic streaming holes
- Enable `experimental: { ppr: true }` for Partial Prerendering
- Enable `dynamicIO` in `next.config.ts` for opt-in caching/dynamic behavior
- Functions using dynamic APIs (`cookies()`, `headers()`, `searchParams`) render dynamically; use `"use cache"` to opt specific functions/components into caching
- Use `<Suspense>` to define dynamic holes within a static page

## Architecture — Nx

| Folder | Purpose |
|--------|---------|
| `apps/[app]/app/` | App Router — routes, layouts, pages |
| `apps/[app]/app/(group)/` | Route groups (not in URL) |
| `apps/[app]/app/_components/` | Private co-located components |
| `libs/[domain]/feature/` | Feature logic |
| `libs/[domain]/ui/` | Presentational components |
| `libs/[domain]/data-access/` | API, server actions |
| `libs/[domain]/util/` | Helpers |

## Server vs Client Components

| Server (default) | Client (`'use client'`) |
|------------------|-------------------------|
| Data fetching, DB access | useState, useEffect, hooks |
| Secrets / env vars | Event handlers, browser APIs |
| Heavy deps that stay server-side | Interactive UI "islands" |

DO push `'use client'` to the **leaf** — keep the boundary as small as possible.

## React 19 Changes

- `ref` is a regular prop — DO NOT use `forwardRef`
- `useActionState` replaces `useFormState` (deprecated)
- `useOptimistic` for optimistic UI
- `use()` to unwrap promises/context in client components

## Code Style

- One component per file, named export
- Default export ONLY for `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`
- Files: `kebab-case.tsx` — Components: `PascalCase` — Hooks: `useCamelCase`
- Props interface defined above component

## Caching (Next.js 15)

- All caching is **opt-in** (not opt-out like Next.js 14)
- `"use cache"` directive + `cacheTag()` + `cacheLife()` for granular control
- `revalidateTag()` for on-demand invalidation

## Performance

- Keep most UI as Server Components
- `next/dynamic` for heavy client components
- Always use `next/image` and `next/link`
- DO NOT use `useEffect` for data fetching

## Commands

```bash
nx serve [app]              # Dev server (Turbopack)
nx build [app] --configuration=production
nx test [lib]               # Unit tests
nx affected -t test         # Test affected
nx e2e [app]-e2e            # E2E tests
```
