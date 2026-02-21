---
description: "Next.js database access with Prisma"
paths:
  - "**/prisma/**"
  - "**/db/**"
  - "**/lib/db.ts"
  - "**/lib/prisma.ts"
---

# Next.js Database (Prisma)

## Client Singleton

```typescript
// lib/prisma.ts — MUST use singleton to avoid connection exhaustion
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

## Schema Conventions

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  role      Role     @default(USER)
  posts     Post[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([email])           // Index frequently queried fields
}

enum Role {
  USER
  ADMIN
}
```

## Query Patterns

### With Pagination (Next.js 15)

```typescript
type Props = {
  searchParams: Promise<{ page?: string; limit?: string }>;
};

export default async function PostsPage({ searchParams }: Props) {
  const { page = '1', limit = '10' } = await searchParams;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where: { published: true },
      include: { author: { select: { name: true } } },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.post.count({ where: { published: true } }),
  ]);

  return <PostList posts={posts} totalPages={Math.ceil(total / limitNum)} />;
}
```

## Transactions

```typescript
export async function transferCredits(fromId: string, toId: string, amount: number) {
  return prisma.$transaction(async (tx) => {
    const sender = await tx.user.update({
      where: { id: fromId },
      data: { credits: { decrement: amount } },
    });

    if (sender.credits < 0) throw new Error('Insufficient credits');

    await tx.user.update({
      where: { id: toId },
      data: { credits: { increment: amount } },
    });
  });
}
```

## Optimization

### Select Only Needed Fields

```typescript
// BAD: Fetches all fields including sensitive data
const users = await prisma.user.findMany();

// GOOD: Select only what the UI needs
const users = await prisma.user.findMany({
  select: { id: true, name: true, email: true },
});
```

### Avoid N+1

```typescript
// BAD: N+1 — one query per post
const posts = await prisma.post.findMany();
for (const post of posts) {
  const author = await prisma.user.findUnique({ where: { id: post.authorId } });
}

// GOOD: Single query with relation
const posts = await prisma.post.findMany({
  include: { author: { select: { name: true } } },
});
```

### Connection Pooling (Serverless)

```prisma
// For Vercel / AWS Lambda — use connection pooler
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")      // Pooled connection (PgBouncer, Prisma Accelerate)
  directUrl = env("DIRECT_URL")        // Direct connection for migrations
}
```

## Anti-patterns

```typescript
// BAD: New client per request — exhausts connections
export default async function Page() {
  const prisma = new PrismaClient();
}

// GOOD: Use singleton from lib/prisma.ts
import { prisma } from '@/lib/prisma';

// BAD: Not handling null
const user = await prisma.user.findUnique({ where: { id } });
return user.name; // Might be null!

// GOOD: Handle null
const user = await prisma.user.findUnique({ where: { id } });
if (!user) notFound();
```
