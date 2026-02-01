---
paths:
  - "middleware.ts"
  - "src/middleware.ts"
---

# Next.js Middleware

## Basic Structure

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Runs on every matched request
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

## Common Patterns

### Authentication

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  const { pathname } = request.nextUrl;

  // Public paths
  const publicPaths = ['/login', '/register', '/api/auth'];
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Protected paths
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
```

### Role-Based Access

```typescript
export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  const { pathname } = request.nextUrl;

  // Admin routes
  if (pathname.startsWith('/admin')) {
    if (token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/forbidden', request.url));
    }
  }

  // API admin routes
  if (pathname.startsWith('/api/admin')) {
    if (token?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
  }

  return NextResponse.next();
}
```

### Internationalization (i18n)

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { match } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';

const locales = ['en', 'fr', 'de'];
const defaultLocale = 'en';

function getLocale(request: NextRequest): string {
  const headers = { 'accept-language': request.headers.get('accept-language') || '' };
  const languages = new Negotiator({ headers }).languages();
  return match(languages, locales, defaultLocale);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if pathname has locale
  const pathnameHasLocale = locales.some(
    locale => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) return NextResponse.next();

  // Redirect to locale
  const locale = getLocale(request);
  request.nextUrl.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

### Rate Limiting

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api')) {
    const ip = request.ip ?? '127.0.0.1';
    const { success, limit, remaining, reset } = await ratelimit.limit(ip);

    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
          },
        }
      );
    }
  }

  return NextResponse.next();
}
```

### Geolocation Redirect

```typescript
export function middleware(request: NextRequest) {
  const country = request.geo?.country || 'US';

  // Redirect EU users to EU subdomain
  const euCountries = ['DE', 'FR', 'IT', 'ES', 'NL'];
  if (euCountries.includes(country) && !request.nextUrl.hostname.includes('eu.')) {
    return NextResponse.redirect(
      new URL(request.nextUrl.pathname, 'https://eu.example.com')
    );
  }

  return NextResponse.next();
}
```

### Security Headers

```typescript
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
  );
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );

  return response;
}
```

### Request/Response Modification

```typescript
export function middleware(request: NextRequest) {
  // Add custom header to request
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', crypto.randomUUID());

  // Rewrite URL
  if (request.nextUrl.pathname === '/old-path') {
    return NextResponse.rewrite(new URL('/new-path', request.url));
  }

  // Pass headers to server components
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Add header to response
  response.headers.set('x-request-id', requestHeaders.get('x-request-id')!);

  return response;
}
```

### A/B Testing

```typescript
export function middleware(request: NextRequest) {
  const bucket = request.cookies.get('ab-bucket')?.value;

  if (!bucket) {
    // Assign to bucket
    const newBucket = Math.random() > 0.5 ? 'a' : 'b';
    const response = NextResponse.next();
    response.cookies.set('ab-bucket', newBucket, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return response;
  }

  // Rewrite based on bucket
  if (request.nextUrl.pathname === '/landing') {
    return NextResponse.rewrite(
      new URL(`/landing-${bucket}`, request.url)
    );
  }

  return NextResponse.next();
}
```

## Matcher Patterns

```typescript
export const config = {
  matcher: [
    // Match all paths except static
    '/((?!_next/static|_next/image|favicon.ico).*)',

    // Match specific paths
    '/dashboard/:path*',
    '/api/:path*',

    // Match with regex
    '/(api|admin)/:path*',

    // Exclude specific paths
    '/((?!api/public)api/:path*)',
  ],
};
```

## Anti-patterns

```typescript
// BAD: Heavy computation in middleware (runs on every request)
export async function middleware(request: NextRequest) {
  await heavyDatabaseQuery(); // Blocks all requests!
}

// GOOD: Keep middleware lightweight
export async function middleware(request: NextRequest) {
  // Only quick checks, use Edge-compatible code
}

// BAD: Using Node.js APIs (middleware runs on Edge)
import fs from 'fs'; // Won't work!

// GOOD: Use Edge-compatible APIs
import { Redis } from '@upstash/redis'; // Edge-compatible

// BAD: Modifying response body
return new Response('Modified body'); // Loses Next.js features

// GOOD: Use rewrite or redirect
return NextResponse.rewrite(new URL('/new-path', request.url));
```
