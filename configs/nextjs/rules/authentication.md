---
description: "Next.js authentication patterns"
paths:
  - "**/auth/**"
  - "**/login/**"
  - "**/api/auth/**"
  - "**/middleware.ts"
---

# Next.js Authentication

## NextAuth.js v5 Setup

### Configuration

```typescript
// auth.ts
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { authConfig } from './auth.config';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      async authorize(credentials) {
        const user = await verifyCredentials(credentials.email, credentials.password);
        return user ?? null;
      },
    }),
  ],
});
```

### Auth Config (Edge-Compatible)

```typescript
// auth.config.ts — separated for Edge middleware compatibility
import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: { signIn: '/login', error: '/auth/error' },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isProtected = nextUrl.pathname.startsWith('/dashboard');

      if (isProtected && !isLoggedIn) {
        return Response.redirect(new URL('/login', nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as string;
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
```

### Route Handler

```typescript
// app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/auth';
export const { GET, POST } = handlers;
```

## Protected Layout

```typescript
// app/(protected)/layout.tsx — protects all child routes
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/login');
  return <>{children}</>;
}
```

## Login Action (useActionState)

```typescript
// app/login/actions.ts
'use server';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

export async function loginAction(
  prevState: { error?: string } | undefined,
  formData: FormData
) {
  try {
    await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirectTo: '/dashboard',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return error.type === 'CredentialsSignin'
        ? { error: 'Invalid credentials' }
        : { error: 'Something went wrong' };
    }
    throw error;
  }
}
```

```tsx
// app/login/page.tsx
'use client';

import { useActionState } from 'react';
import { loginAction } from './actions';

export function LoginForm() {
  const [state, action, isPending] = useActionState(loginAction, undefined);

  return (
    <form action={action}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      {state?.error && <p className="error">{state.error}</p>}
      <button type="submit" disabled={isPending}>
        {isPending ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
}
```

## Type Extensions

```typescript
// types/next-auth.d.ts
import 'next-auth';

declare module 'next-auth' {
  interface User { role: string }
  interface Session {
    user: User & { id: string; role: string };
  }
}

declare module 'next-auth/jwt' {
  interface JWT { id: string; role: string }
}
```

## Anti-patterns

```typescript
// BAD: Checking auth client-side for route protection
'use client';
export function ProtectedPage() {
  const { data: session } = useSession();
  if (!session) return <Redirect />;  // Page already loaded — too late
}

// GOOD: Check in middleware or Server Component
export default async function ProtectedPage() {
  const session = await auth();
  if (!session) redirect('/login');
}

// BAD: Returning sensitive fields
const user = await db.user.findUnique({ where: { id } });
return { ...user }; // Leaks password hash!

// GOOD: Select only needed fields
const user = await db.user.findUnique({
  where: { id },
  select: { id: true, name: true, email: true },
});
```
