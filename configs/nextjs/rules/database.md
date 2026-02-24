---
description: "Next.js database access with Prisma"
paths:
  - "**/prisma/**"
  - "**/db/**"
  - "**/lib/db.ts"
  - "**/lib/prisma.ts"
---

# Database Access

## Client Singleton

DO use a global singleton for the ORM client — prevents connection exhaustion in dev (HMR creates new instances).

```typescript
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

## Key Directives

- DO query directly in Server Components — no API route needed
- DO select only the fields the UI needs — never return full rows with sensitive data
- DO use `include` / `join` for relations — avoid N+1 (one query per row in a loop)
- DO use `Promise.all()` for independent queries — avoid sequential waterfalls
- DO use transactions (`$transaction`) for multi-step writes that must be atomic
- DO handle `null` results — call `notFound()` for missing entities

## Pagination (Next.js 15)

`searchParams` is a `Promise` in Next.js 15 — `await` it before parsing `page`/`limit`.
DO always run `findMany` + `count` in `Promise.all()` for paginated responses.

## Connection Pooling (Serverless)

DO use a connection pooler (PgBouncer, Prisma Accelerate) for serverless deployments.
DO configure `directUrl` for migrations (bypasses pooler).

## Schema Conventions

- `cuid()` or `uuid()` for IDs
- Always add `createdAt` / `updatedAt`
- Index frequently queried fields
- Use enums for bounded value sets

## Anti-Patterns

- DO NOT instantiate a new client per request — exhausts connections
- DO NOT return full user objects — leaks password hashes, tokens
- DO NOT skip null checks — `findUnique` can return `null`
- DO NOT write N+1 loops — use relations or batch queries
- DO NOT run migrations through the connection pooler — use `directUrl`
