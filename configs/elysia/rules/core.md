---
description: "Elysia v1.4+ project conventions and architecture"
alwaysApply: true
---

# Elysia Project Guidelines

## Stack

- Elysia v1.4+
- TypeScript strict mode
- Bun runtime (primary), Node.js via `@elysiajs/node`
- Bun test runner (`bun:test`)
- TypeBox for validation (built-in `Elysia.t`)
- Eden Treaty for end-to-end type-safe client

## Architecture

```
src/
├── index.ts            # App entry, mounts plugins, listens
├── modules/
│   └── [resource]/
│       ├── index.ts    # Controller (Elysia instance with routes)
│       ├── service.ts  # Business logic (static methods/functions)
│       └── model.ts    # TypeBox schemas (Elysia.t)
├── plugins/
│   └── [name].ts       # Reusable plugins (Elysia instances)
└── types.ts            # Shared type definitions
test/
└── [resource].test.ts  # Tests (.handle() or Eden Treaty)
```

## Core Principles

- **Method chaining**: Chain `.get().post().put().delete()` on the same Elysia instance — required for type inference and Eden
- **Encapsulation**: Lifecycle hooks are scoped to their instance by default; use `as: 'scoped'` or `as: 'global'` to propagate
- **Single source of truth**: One TypeBox schema drives runtime validation, TypeScript types, and OpenAPI docs
- **Controller = Elysia instance**: Treat the Elysia instance as the controller; pass extracted values to services, not the full Context
- **Plugin deduplication**: Name plugins via `new Elysia({ name: 'pluginName' })` to prevent duplicate registration
- **Order matters**: Lifecycle hooks only apply to routes registered *after* them

## Naming Conventions

- Module directories: plural resource name (`users/`, `posts/`)
- Plugin files: descriptive name (`auth.ts`, `rate-limit.ts`)
- Model files: `model.ts` inside each module
- Type exports: `App` for Eden client type, module-level types in `model.ts`

## Commands

```bash
bun run dev             # Dev server (--hot)
bun run build           # Production build
bun test                # Run tests
bun run lint            # Lint
```

## Code Style

- Prefer `Elysia.t` (TypeBox) over external validators unless integrating Standard Schema
- Use `derive` for request-scoped context, `decorate` for static utilities, `state` for mutable stores
- Use `guard()` to apply shared schemas across multiple routes
- Keep modules small — one Elysia instance per resource, mounted via `.use()`
- Export app type as `export type App = typeof app` for Eden Treaty
