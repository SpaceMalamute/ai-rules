---
description: "Elysia v1.4+ project conventions and architecture"
alwaysApply: true
---

# Elysia Project Guidelines

## Stack

- Elysia v1.4+ on Bun runtime (Node.js via `@elysiajs/node` only when required)
- TypeScript strict mode
- Bun test runner (`bun:test`)
- TypeBox for validation (built-in `Elysia.t`) — do NOT use Zod (breaks type inference)
- Eden Treaty v2 for end-to-end type-safe client

## Commands

- `bun run dev` — dev server (--hot)
- `bun run build` — production build
- `bun test` — run tests
- `bun run lint` — lint

## Core Principles

- **Method chaining is mandatory** — chain `.get().post().use()` on the same instance; breaking the chain loses type inference and Eden types
- **Inline handlers** — define handlers inline for full type inference; extracting to separate functions breaks context typing
- **Controller = Elysia instance** — one instance per resource with `prefix`, mounted via `.use()`; pass destructured values to services, never the full Context
- **Plugin deduplication** — always set `name` in `new Elysia({ name: '...' })` to prevent duplicate registration
- **Hook order matters** — lifecycle hooks only apply to routes registered AFTER them
- **Encapsulation** — hooks are scoped to their instance by default; use `as('scoped')` or `as('global')` to propagate
- **Single source of truth** — one TypeBox schema drives runtime validation, TS types, and OpenAPI docs

## Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Module directory | Plural resource | `users/`, `posts/` |
| Plugin file | Descriptive name | `auth.ts`, `rate-limit.ts` |
| Model file | `model.ts` per module | `modules/users/model.ts` |
| App type export | `App` | `export type App = typeof app` |

## Anti-Patterns

- Do NOT break method chains with separate statements — Eden won't see route types
- Do NOT extract handlers to standalone functions — context types are lost outside the chain
- Do NOT pass the full Context to service classes — breaks encapsulation, harder to test
- Do NOT use `decorate` for per-request values — use `derive`/`resolve` instead
- Do NOT use `derive` for static utilities — use `decorate` instead

## Code Style

- Prefer `Elysia.t` (TypeBox) over external validators
- Use `guard()` to apply shared schemas across multiple routes
- Use `derive` for request-scoped context, `decorate` for static utilities, `state` for mutable stores
- Keep modules small — one Elysia instance per resource
- Lazy-load modules with `.use(import('./modules/users'))` for faster startup
