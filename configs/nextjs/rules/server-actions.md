---
description: "Next.js Server Actions and mutations"
paths:
  - "**/actions.ts"
  - "**/actions.tsx"
  - "**/actions/**/*.ts"
  - "**/actions/**/*.tsx"
  - "**/_actions/**/*.ts"
  - "**/_actions/**/*.tsx"
  - "**/*.action.ts"
  - "**/*.actions.ts"
  - "**/app/**/page.tsx"
  - "**/app/**/route.ts"
---

# Next.js Server Actions

## With Validation (Zod)

```typescript
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
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export async function createUser(formData: FormData): Promise<ActionResult<User>> {
  const parsed = UserSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { success: false, error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const user = await db.user.create({ data: parsed.data });
    revalidatePath('/users');
    return { success: true, data: user };
  } catch {
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
      {optimisticPost.isLiked ? 'Liked' : 'Like'} {optimisticPost.likes}
    </button>
  );
}
```

## Binding Arguments

```tsx
// Pass additional data to action via .bind()
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
  revalidatePath('/posts');
}
```

## Anti-patterns

```typescript
// BAD: No validation — never trust client input
'use server';
export async function createPost(formData: FormData) {
  await db.post.create({ data: { title: formData.get('title') as string } });
}

// BAD: No revalidation after mutation — UI shows stale data
export async function updatePost(id: string, formData: FormData) {
  await db.post.update({ where: { id }, data: { ... } });
  // Missing revalidatePath or revalidateTag!
}

// BAD: Using router.refresh() instead of revalidation
// GOOD: Use revalidatePath('/posts') or revalidateTag('posts')
```
