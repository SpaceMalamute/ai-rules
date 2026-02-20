---
description: "Next.js API route handlers"
paths:
  - "**/app/api/**/*.ts"
  - "**/src/app/api/**/*.ts"
---

# Next.js API Routes (App Router)

## Basic Route Handler

```typescript
// app/api/users/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const users = await db.user.findMany();
  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const body = await request.json();
  const user = await db.user.create({ data: body });
  return NextResponse.json(user, { status: 201 });
}
```

## Dynamic Routes

```typescript
// app/api/users/[id]/route.ts
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await db.user.findUnique({ where: { id } });

  if (!user) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(user);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const user = await db.user.update({
    where: { id },
    data: body,
  });

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

## Request Handling

### Query Parameters

```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const search = searchParams.get('search') || '';

  const users = await db.user.findMany({
    where: { name: { contains: search } },
    skip: (page - 1) * limit,
    take: limit,
  });

  const total = await db.user.count({
    where: { name: { contains: search } },
  });

  return NextResponse.json({
    data: users,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
```

### Headers & Cookies

```typescript
import { cookies, headers } from 'next/headers';

export async function GET() {
  const headersList = await headers();
  const authHeader = headersList.get('authorization');

  const cookieStore = await cookies();
  const token = cookieStore.get('token');

  return NextResponse.json({ auth: !!authHeader, hasToken: !!token });
}

export async function POST() {
  const response = NextResponse.json({ success: true });

  // Set cookie
  response.cookies.set('session', 'value', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });

  return response;
}
```

## Validation with Zod

```typescript
// app/api/users/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  age: z.number().min(18).optional(),
});

export async function POST(request: Request) {
  const body = await request.json();

  const result = createUserSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      {
        type: 'validation_error',
        title: 'Validation Error',
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
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message);
  }
}

// app/api/users/[id]/route.ts
import { ApiError } from '@/lib/api-error';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await db.user.findUnique({ where: { id } });

    if (!user) {
      throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
    }

    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        {
          type: `https://api.example.com/errors/${error.code}`,
          title: error.message,
          status: error.status,
        },
        { status: error.status }
      );
    }

    console.error('Unexpected error:', error);
    return NextResponse.json(
      { title: 'Internal Server Error', status: 500 },
      { status: 500 }
    );
  }
}
```

## Authentication

```typescript
import { auth } from '@/auth';

export async function GET() {
  const session = await auth();

  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const users = await db.user.findMany({
    where: { organizationId: session.user.organizationId },
  });

  return NextResponse.json(users);
}
```

## File Upload

```typescript
// app/api/upload/route.ts
import { writeFile } from 'fs/promises';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json(
      { error: 'No file uploaded' },
      { status: 400 }
    );
  }

  // Validate file
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: 'File too large' },
      { status: 400 }
    );
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: 'Invalid file type' },
      { status: 400 }
    );
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const filename = `${Date.now()}-${file.name}`;
  await writeFile(`./public/uploads/${filename}`, buffer);

  return NextResponse.json({ url: `/uploads/${filename}` });
}
```

## Streaming Response

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
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

## Route Configuration

```typescript
// Caching
export const revalidate = 60; // Revalidate every 60 seconds
export const dynamic = 'force-dynamic'; // Always dynamic

// Runtime
export const runtime = 'edge'; // or 'nodejs'

// Max duration (Vercel)
export const maxDuration = 30;
```

## Anti-patterns

```typescript
// BAD: Not validating input
export async function POST(request: Request) {
  const body = await request.json();
  await db.user.create({ data: body }); // SQL injection risk!
}

// GOOD: Validate with Zod
const result = schema.safeParse(body);
if (!result.success) return errorResponse(result.error);

// BAD: Exposing internal errors
catch (error) {
  return NextResponse.json({ error: error.message }); // Leaks info!
}

// GOOD: Generic error message
catch (error) {
  console.error(error);
  return NextResponse.json({ error: 'Internal error' }, { status: 500 });
}
```
