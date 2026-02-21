---
description: "Next.js API route handlers"
paths:
  - "**/app/api/**/*.ts"
  - "**/src/app/api/**/*.ts"
---

# Next.js API Routes (App Router)

## Dynamic Routes (Next.js 15)

```typescript
// app/api/users/[id]/route.ts — params is a Promise in Next.js 15
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await db.user.findUnique({ where: { id } });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.user.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
```

## Query Parameters & Pagination

```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');

  const [data, total] = await Promise.all([
    db.user.findMany({ skip: (page - 1) * limit, take: limit }),
    db.user.count(),
  ]);

  return NextResponse.json({
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
```

## Headers & Cookies (Next.js 15)

```typescript
import { cookies, headers } from 'next/headers';

export async function GET() {
  // Both are async in Next.js 15
  const headersList = await headers();
  const cookieStore = await cookies();

  const authHeader = headersList.get('authorization');
  const token = cookieStore.get('token');

  return NextResponse.json({ auth: !!authHeader, hasToken: !!token });
}
```

## Validation with Zod

```typescript
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
});

export async function POST(request: Request) {
  const body = await request.json();
  const result = createUserSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      {
        type: 'validation_error',
        status: 400,
        errors: result.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      },
      { status: 400 }
    );
  }

  const user = await db.user.create({ data: result.data });
  return NextResponse.json(user, { status: 201 });
}
```

## Error Handling

```typescript
// lib/api-error.ts
export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

// In route handler
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await db.user.findUnique({ where: { id } });

    if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');

    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { title: error.message, status: error.status },
        { status: error.status }
      );
    }

    console.error('Unexpected error:', error);
    return NextResponse.json({ title: 'Internal Server Error', status: 500 }, { status: 500 });
  }
}
```

## Streaming (SSE)

```typescript
export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      for (let i = 0; i < 10; i++) {
        controller.enqueue(encoder.encode(`data: ${i}\n\n`));
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
}
```

## Route Configuration

```typescript
export const revalidate = 60;              // ISR every 60s
export const dynamic = 'force-dynamic';    // Always dynamic
export const runtime = 'edge';             // Edge runtime
export const maxDuration = 30;             // Max execution time (Vercel)
```

## Anti-patterns

```typescript
// BAD: Not validating input
export async function POST(request: Request) {
  const body = await request.json();
  await db.user.create({ data: body }); // Injection risk!
}

// BAD: Exposing internal errors
catch (error) {
  return NextResponse.json({ error: error.message }); // Leaks stack info!
}

// GOOD: Always validate input with Zod, return generic error messages
```
