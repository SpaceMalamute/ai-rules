---
paths:
  - "**/prisma/**"
  - "**/db/**"
  - "**/lib/db.ts"
  - "**/lib/prisma.ts"
---

# Next.js Database (Prisma)

## Prisma Setup

### Client Singleton

```typescript
// lib/prisma.ts
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

### Schema

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  role      Role     @default(USER)
  posts     Post[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([email])
}

model Post {
  id          String   @id @default(cuid())
  title       String
  slug        String   @unique
  content     String?
  published   Boolean  @default(false)
  author      User     @relation(fields: [authorId], references: [id])
  authorId    String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([authorId])
  @@index([slug])
}

enum Role {
  USER
  ADMIN
}
```

## Query Patterns

### Server Components

```typescript
// app/users/page.tsx
import { prisma } from '@/lib/prisma';

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      _count: { select: { posts: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>
          {user.name} - {user._count.posts} posts
        </li>
      ))}
    </ul>
  );
}
```

### With Pagination

```typescript
// app/posts/page.tsx
import { prisma } from '@/lib/prisma';

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

  const totalPages = Math.ceil(total / limitNum);

  return (
    <>
      <PostList posts={posts} />
      <Pagination
        currentPage={pageNum}
        totalPages={totalPages}
      />
    </>
  );
}
```

### Server Actions

```typescript
// app/posts/actions.ts
'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().optional(),
});

export async function createPost(formData: FormData) {
  const session = await auth();
  if (!session) throw new Error('Unauthorized');

  const data = createPostSchema.parse({
    title: formData.get('title'),
    content: formData.get('content'),
  });

  const slug = data.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const post = await prisma.post.create({
    data: {
      ...data,
      slug,
      authorId: session.user.id,
    },
  });

  revalidatePath('/posts');
  return post;
}

export async function deletePost(id: string) {
  const session = await auth();
  if (!session) throw new Error('Unauthorized');

  const post = await prisma.post.findUnique({
    where: { id },
    select: { authorId: true },
  });

  if (post?.authorId !== session.user.id) {
    throw new Error('Forbidden');
  }

  await prisma.post.delete({ where: { id } });
  revalidatePath('/posts');
}
```

### Transactions

```typescript
export async function transferCredits(
  fromUserId: string,
  toUserId: string,
  amount: number
) {
  return prisma.$transaction(async (tx) => {
    const sender = await tx.user.update({
      where: { id: fromUserId },
      data: { credits: { decrement: amount } },
    });

    if (sender.credits < 0) {
      throw new Error('Insufficient credits');
    }

    const recipient = await tx.user.update({
      where: { id: toUserId },
      data: { credits: { increment: amount } },
    });

    await tx.transaction.create({
      data: {
        fromUserId,
        toUserId,
        amount,
        type: 'TRANSFER',
      },
    });

    return { sender, recipient };
  });
}
```

## Migrations

```bash
# Create migration
npx prisma migrate dev --name add_user_role

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (development)
npx prisma migrate reset

# Generate client
npx prisma generate
```

## Seeding

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clean up
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const alice = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      name: 'Alice',
      role: 'ADMIN',
      posts: {
        create: [
          { title: 'First Post', slug: 'first-post', published: true },
          { title: 'Second Post', slug: 'second-post' },
        ],
      },
    },
  });

  console.log({ alice });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

```json
// package.json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

## Soft Deletes

```prisma
model User {
  id        String    @id @default(cuid())
  email     String    @unique
  deletedAt DateTime?

  @@index([deletedAt])
}
```

```typescript
// Middleware for soft deletes
prisma.$use(async (params, next) => {
  if (params.model === 'User') {
    if (params.action === 'delete') {
      params.action = 'update';
      params.args['data'] = { deletedAt: new Date() };
    }
    if (params.action === 'findMany' || params.action === 'findFirst') {
      params.args['where'] = {
        ...params.args['where'],
        deletedAt: null,
      };
    }
  }
  return next(params);
});
```

## Optimization

### Select Only Needed Fields

```typescript
// BAD: Fetches all fields
const users = await prisma.user.findMany();

// GOOD: Select only needed
const users = await prisma.user.findMany({
  select: { id: true, name: true, email: true },
});
```

### Avoid N+1

```typescript
// BAD: N+1 query
const posts = await prisma.post.findMany();
for (const post of posts) {
  const author = await prisma.user.findUnique({ where: { id: post.authorId } });
}

// GOOD: Include relation
const posts = await prisma.post.findMany({
  include: { author: { select: { name: true } } },
});
```

### Connection Pooling (Serverless)

```typescript
// For serverless (Vercel, AWS Lambda)
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL") // For migrations
}

// Use connection pooler (PgBouncer, Prisma Accelerate)
// DATABASE_URL="prisma://accelerate.prisma-data.net/?api_key=..."
```

## Anti-patterns

```typescript
// BAD: Creating client in component
export default async function Page() {
  const prisma = new PrismaClient(); // New connection each request!
}

// GOOD: Use singleton
import { prisma } from '@/lib/prisma';

// BAD: Not handling errors
const user = await prisma.user.findUnique({ where: { id } });
return user.name; // Might be null!

// GOOD: Handle null
const user = await prisma.user.findUnique({ where: { id } });
if (!user) notFound();
return user.name;
```
