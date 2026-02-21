---
description: "Hono v4+ project conventions and architecture"
alwaysApply: true
---

# Hono Project Guidelines

## Stack

- Hono v4+
- TypeScript strict mode
- Vitest for testing
- Zod for validation (`@hono/zod-validator`)
- Multi-runtime: Cloudflare Workers, Node.js, Bun, Deno

## Architecture

```
src/
├── index.ts            # App entry, mounts route modules
├── routes/
│   └── [resource].ts   # Route module (Hono instance per resource)
├── middleware/
│   └── [name].ts       # Custom middleware (createMiddleware)
├── validators/
│   └── [resource].ts   # Zod schemas
└── types.ts            # Shared Env types (Bindings, Variables)
test/
└── [resource].test.ts  # Tests (app.request or testClient)
```

## Core Principles

- **Route modules**: Each resource exports a `new Hono()` instance, mounted via `app.route()`
- **Inline handlers**: Define handlers inline with routes to preserve TypeScript path parameter inference
- **Typed environment**: Use `Hono<{ Bindings: B; Variables: V }>` generics for type-safe `c.env` and `c.var`
- **Chained definitions**: Chain `.get().post().put().delete()` on the same Hono instance for RPC type inference
- **Middleware order**: `app.use()` before route definitions; middleware calls `await next()` (onion model)
- **Error handling**: Throw `HTTPException` from `hono/http-exception`; handle globally with `app.onError()`
- **Zero dependencies**: Hono uses Web Standard APIs only — avoid importing Node.js-specific modules in shared code

## Naming Conventions

- Route files: plural resource name (`authors.ts`, `books.ts`)
- Middleware files: descriptive name (`auth.ts`, `rate-limit.ts`)
- Validators: match route file name (`authors.ts` in `validators/`)
- Types: export `AppType` for RPC, `Env` for shared bindings

## Commands

```bash
npm run dev             # Dev server (wrangler dev / tsx watch / bun run --hot)
npm run build           # Production build
npm run test            # Vitest
npm run deploy          # Deploy (wrangler deploy / platform-specific)
```

## Runtime Entry Points

| Runtime            | Entry pattern                          |
|--------------------|----------------------------------------|
| Cloudflare Workers | `export default app`                   |
| Node.js            | `serve(app)` from `@hono/node-server`  |
| Bun                | `export default app`                   |
| Deno               | `Deno.serve(app.fetch)`                |

## Code Style

- Prefer `c.json()`, `c.text()`, `c.html()` over raw `new Response()`
- Access validated data via `c.req.valid('json' | 'query' | 'param')`
- Use `createMiddleware()` from `hono/factory` for typed custom middleware
- Keep route modules small — split large resources into sub-routers
