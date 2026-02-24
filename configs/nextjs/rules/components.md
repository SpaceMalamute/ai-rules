---
description: "Next.js server and client components"
paths:
  - "**/apps/**/*.tsx"
  - "**/libs/**/*.tsx"
  - "**/app/**/*.tsx"
  - "**/src/**/*.tsx"
  - "**/components/**/*.tsx"
---

# Components (Next.js 15 / React 19)

## Server vs Client Decision

| Need | Component Type |
|------|---------------|
| Data fetching, DB, secrets | Server (default — no directive) |
| Hooks, event handlers, browser APIs | Client (`'use client'`) |
| Static content, heavy deps | Server |
| Interactive UI (forms, modals, toggles) | Client |

DO keep `'use client'` at the leaf level — push it down as far as possible.
DO pass server-fetched data as props to client components — not the other way around.

## React 19 Changes

- `ref` is a regular prop — DO NOT use `forwardRef` (deprecated pattern)
- `use()` unwraps promises and context in client components
- `useActionState` replaces `useFormState`

## Composition

DO use children/slots (composition) over many props — avoids prop drilling.
DO define a `Props` interface above each component.
DO use named exports for reusable components; default exports only for route files.

## File Organization

- Co-locate private components in `_components/` next to the page
- Shared components in `libs/shared/ui/` with barrel exports
- One component per file

## Naming

| Element | Convention |
|---------|-----------|
| Files | `kebab-case.tsx` |
| Components | `PascalCase` |
| Hooks | `useCamelCase` |
| Event handlers | `handle` + Event (`handleSubmit`) |

## Error & Loading Boundaries

- `error.tsx` — MUST be `'use client'`; receives `{ error, reset }` props
- `loading.tsx` — automatic Suspense fallback for the route segment
- `not-found.tsx` — triggered by `notFound()` calls

## Anti-Patterns

- DO NOT use `useEffect` for data fetching — use Server Components
- DO NOT use default exports for library/shared components
- DO NOT spread props without type safety
- DO NOT use anonymous/unnamed components — hurts debugging
- DO NOT add `'use client'` to a parent when only a child needs interactivity
