---
description: "Next.js middleware and edge functions"
paths:
  - "**/middleware.ts"
  - "**/src/middleware.ts"
---

# Next.js Middleware

Runs on **Edge runtime** before every matched request. Keep it lightweight.

## What Middleware SHOULD Do

- Authentication / authorization checks (JWT verification, session validation)
- Redirects and rewrites (locale detection, legacy URLs)
- Request/response header manipulation (security headers, request IDs)
- Feature flags / A/B routing via cookies

## What Middleware SHOULD NOT Do

- Heavy computation — blocks every matched request
- Database queries — use Server Components or API routes instead
- Node.js APIs (`fs`, `path`) — Edge runtime does not support them
- Response body modification — loses Next.js features; use rewrite/redirect

## Matcher Config

DO always define a matcher to avoid running on static assets.

```typescript
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

Pattern reference: `/dashboard/:path*` (specific), `/(api|admin)/:path*` (multi), `/((?!api/public).*)` (exclusion).

## Auth Pattern

DO separate `auth.config.ts` (Edge-compatible, no DB) from `auth.ts` (full, Node.js) when using NextAuth.
DO use the `authorized` callback in `auth.config.ts` for middleware auth checks.
DO redirect unauthenticated users with `callbackUrl` for return-after-login.

## Security Headers

DO set security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, CSP) in middleware for app-wide coverage.

## Upcoming: `proxy.ts` (Next.js 16)

`proxy.ts` will replace `middleware.ts` — runs on Node.js runtime instead of Edge. Plan for migration: avoid deep Edge-only dependencies in middleware.

## Anti-Patterns

- DO NOT use `new Response('body')` — returns raw response, loses Next.js routing
- DO NOT import Node.js modules — middleware is Edge-only (until proxy.ts)
- DO NOT put rate limiting logic inline — use an Edge-compatible service (Upstash, Vercel WAF)
- DO NOT run middleware without a matcher — it will execute on every request including static files
