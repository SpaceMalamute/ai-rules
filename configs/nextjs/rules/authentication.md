---
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
        const { email, password } = credentials;
        const user = await verifyCredentials(email, password);
        if (!user) return null;
        return user;
      },
    }),
  ],
});
```

### Auth Config (for Edge)

```typescript
// auth.config.ts
import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
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
  providers: [], // Configured in auth.ts
} satisfies NextAuthConfig;
```

### Route Handlers

```typescript
// app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/auth';
export const { GET, POST } = handlers;
```

## Middleware Protection

```typescript
// middleware.ts
import { auth } from './auth';

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const publicPaths = ['/login', '/register', '/'];
  const isPublic = publicPaths.includes(nextUrl.pathname);

  if (!isLoggedIn && !isPublic) {
    return Response.redirect(new URL('/login', nextUrl));
  }

  // Role-based protection
  if (nextUrl.pathname.startsWith('/admin')) {
    if (req.auth?.user?.role !== 'admin') {
      return Response.redirect(new URL('/forbidden', nextUrl));
    }
  }
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

## Server Components

### Get Session

```typescript
// app/dashboard/page.tsx
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <div>
      <h1>Welcome, {session.user.name}</h1>
    </div>
  );
}
```

### Protected Layout

```typescript
// app/(protected)/layout.tsx
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return <>{children}</>;
}
```

## Client Components

### Sign In/Out

```typescript
'use client';

import { signIn, signOut } from 'next-auth/react';

export function LoginButton() {
  return (
    <button onClick={() => signIn('google', { callbackUrl: '/dashboard' })}>
      Sign in with Google
    </button>
  );
}

export function LogoutButton() {
  return (
    <button onClick={() => signOut({ callbackUrl: '/' })}>
      Sign out
    </button>
  );
}
```

### Use Session Hook

```typescript
'use client';

import { useSession } from 'next-auth/react';

export function UserProfile() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <Skeleton />;
  }

  if (!session) {
    return <LoginButton />;
  }

  return (
    <div>
      <img src={session.user.image} alt={session.user.name} />
      <span>{session.user.name}</span>
    </div>
  );
}
```

## Server Actions

### Login Action

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
      switch (error.type) {
        case 'CredentialsSignin':
          return { error: 'Invalid credentials' };
        default:
          return { error: 'Something went wrong' };
      }
    }
    throw error;
  }
}
```

### Login Form

```typescript
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
  interface User {
    role: string;
  }

  interface Session {
    user: User & {
      id: string;
      role: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
  }
}
```

## Session Provider

```typescript
// app/providers.tsx
'use client';

import { SessionProvider } from 'next-auth/react';

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

// app/layout.tsx
import { Providers } from './providers';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

## Anti-patterns

```typescript
// BAD: Checking auth in client component for protection
'use client';
export function ProtectedPage() {
  const { data: session } = useSession();
  if (!session) return <Redirect />;  // Too late, page already loaded
}

// GOOD: Check in middleware or server component
export default async function ProtectedPage() {
  const session = await auth();
  if (!session) redirect('/login');
}

// BAD: Exposing secrets
const user = await db.user.findUnique({ where: { id } });
return { ...user, password: user.password }; // Leaking password!

// GOOD: Select only needed fields
const user = await db.user.findUnique({
  where: { id },
  select: { id: true, name: true, email: true },
});
```
