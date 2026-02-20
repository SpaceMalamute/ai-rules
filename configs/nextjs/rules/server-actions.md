---
paths:
  - "apps/**/app/**/*.tsx"
  - "apps/**/app/**/*.ts"
  - "**/app/**/*.tsx"
  - "**/app/**/*.ts"
  - "**/actions.ts"
  - "**/actions/*.ts"
---

# Next.js Server Actions

## Basic Server Action

```typescript
// app/actions.ts
'use server';

import { revalidatePath } from 'next/cache';

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;

  await db.post.create({ data: { title, content } });

  revalidatePath('/posts');
}
```

## With Validation (Zod)

```typescript
// app/actions.ts
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const CreatePostSchema = z.object({
  title: z.string().min(1).max(100),
  content: z.string().min(1),
});

export async function createPost(formData: FormData) {
  const parsed = CreatePostSchema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  await db.post.create({ data: parsed.data });
  revalidatePath('/posts');

  return { success: true };
}
```

## Return Type Pattern

```typescript
// Type-safe action results
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export async function createUser(formData: FormData): Promise<ActionResult<User>> {
  const parsed = UserSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      success: false,
      error: 'Validation failed',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const user = await db.user.create({ data: parsed.data });
    revalidatePath('/users');
    return { success: true, data: user };
  } catch (error) {
    return { success: false, error: 'Failed to create user' };
  }
}
```

## useActionState (React 19)

```tsx
'use client';

import { useActionState } from 'react';
import { createPost } from './actions';

export function PostForm() {
  const [state, formAction, isPending] = useActionState(createPost, null);

  return (
    <form action={formAction}>
      <input name="title" disabled={isPending} />
      {state?.fieldErrors?.title && (
        <span className="error">{state.fieldErrors.title}</span>
      )}

      <textarea name="content" disabled={isPending} />
      {state?.fieldErrors?.content && (
        <span className="error">{state.fieldErrors.content}</span>
      )}

      <button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create Post'}
      </button>

      {state?.error && <div className="error">{state.error}</div>}
    </form>
  );
}
```

## useOptimistic

```tsx
'use client';

import { useOptimistic } from 'react';
import { toggleLike } from './actions';

interface Post {
  id: string;
  likes: number;
  isLiked: boolean;
}

export function LikeButton({ post }: { post: Post }) {
  const [optimisticPost, addOptimistic] = useOptimistic(
    post,
    (state, newLiked: boolean) => ({
      ...state,
      isLiked: newLiked,
      likes: newLiked ? state.likes + 1 : state.likes - 1,
    })
  );

  async function handleClick() {
    addOptimistic(!optimisticPost.isLiked);
    await toggleLike(post.id);
  }

  return (
    <button onClick={handleClick}>
      {optimisticPost.isLiked ? '❤️' : '🤍'} {optimisticPost.likes}
    </button>
  );
}
```

## Revalidation Strategies

```typescript
'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

export async function createPost(data: PostData) {
  await db.post.create({ data });

  // Revalidate specific path
  revalidatePath('/posts');

  // Revalidate dynamic path
  revalidatePath(`/posts/${data.slug}`);

  // Revalidate layout (all child pages)
  revalidatePath('/posts', 'layout');

  // Revalidate by cache tag
  revalidateTag('posts');
}

// In data fetching, use tags
async function getPosts() {
  return fetch('/api/posts', {
    next: { tags: ['posts'] },
  });
}
```

## Redirect After Action

```typescript
'use server';

import { redirect } from 'next/navigation';

export async function createPost(formData: FormData) {
  const post = await db.post.create({
    data: {
      title: formData.get('title') as string,
      content: formData.get('content') as string,
    },
  });

  redirect(`/posts/${post.slug}`);
}
```

## With Authentication

```typescript
'use server';

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function createPost(formData: FormData) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  await db.post.create({
    data: {
      title: formData.get('title') as string,
      content: formData.get('content') as string,
      authorId: session.user.id,
    },
  });

  revalidatePath('/posts');
}
```

## File Upload

```typescript
'use server';

export async function uploadFile(formData: FormData) {
  const file = formData.get('file') as File;

  if (!file || file.size === 0) {
    return { error: 'No file provided' };
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { error: 'Invalid file type' };
  }

  // Validate file size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    return { error: 'File too large' };
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Save to storage (S3, local, etc.)
  const url = await uploadToStorage(buffer, file.name);

  return { success: true, url };
}
```

## Progressive Enhancement

```tsx
// Works without JavaScript (form submits normally)
// Enhanced with JavaScript (no page reload)

export function ContactForm() {
  return (
    <form action={sendMessage}>
      <input name="email" type="email" required />
      <textarea name="message" required />
      <button type="submit">Send</button>
    </form>
  );
}
```

## Error Handling

```typescript
'use server';

export async function riskyAction(formData: FormData) {
  try {
    await someRiskyOperation();
    return { success: true };
  } catch (error) {
    // Log server-side
    console.error('Action failed:', error);

    // Return safe error to client
    if (error instanceof KnownError) {
      return { success: false, error: error.message };
    }

    return { success: false, error: 'An unexpected error occurred' };
  }
}
```

## Binding Arguments

```tsx
// Pass additional data to action
import { updatePost } from './actions';

export function EditButton({ postId }: { postId: string }) {
  const updateWithId = updatePost.bind(null, postId);

  return (
    <form action={updateWithId}>
      <input name="title" />
      <button type="submit">Update</button>
    </form>
  );
}

// actions.ts
'use server';

export async function updatePost(postId: string, formData: FormData) {
  const title = formData.get('title') as string;
  await db.post.update({ where: { id: postId }, data: { title } });
}
```

## Non-Form Usage

```tsx
'use client';

import { deletePost } from './actions';

export function DeleteButton({ postId }: { postId: string }) {
  async function handleDelete() {
    if (confirm('Are you sure?')) {
      await deletePost(postId);
    }
  }

  return <button onClick={handleDelete}>Delete</button>;
}
```
