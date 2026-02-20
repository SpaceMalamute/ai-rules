---
description: "Next.js App Router patterns"
paths:
  - "**/apps/**/app/**/*.tsx"
  - "**/app/**/*.tsx"
---

# Next.js App Router Patterns

## Route Structure

```
app/
├── page.tsx                    # / (home)
├── layout.tsx                  # Root layout
├── loading.tsx                 # Root loading
├── error.tsx                   # Root error boundary
├── not-found.tsx               # 404 page
│
├── (marketing)/                # Route group (not in URL)
│   ├── layout.tsx              # Shared marketing layout
│   ├── about/page.tsx          # /about
│   └── pricing/page.tsx        # /pricing
│
├── (app)/                      # Route group for app
│   ├── layout.tsx              # App layout (with auth)
│   ├── dashboard/page.tsx      # /dashboard
│   └── settings/page.tsx       # /settings
│
├── blog/
│   ├── page.tsx                # /blog
│   └── [slug]/                 # Dynamic segment
│       ├── page.tsx            # /blog/my-post
│       └── opengraph-image.tsx # OG image generation
│
├── docs/
│   └── [...slug]/              # Catch-all segment
│       └── page.tsx            # /docs/a/b/c
│
└── api/                        # API routes
    └── webhooks/
        └── stripe/route.ts     # /api/webhooks/stripe
```

## Dynamic Routes

```tsx
// app/blog/[slug]/page.tsx
interface Props {
  params: Promise<{ slug: string }>;
}

export default async function BlogPost({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    notFound();
  }

  return <article>{post.content}</article>;
}

// Generate static params for SSG
export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((post) => ({ slug: post.slug }));
}
```

## Catch-All Routes

```tsx
// app/docs/[...slug]/page.tsx
interface Props {
  params: Promise<{ slug: string[] }>;
}

export default async function DocsPage({ params }: Props) {
  const { slug } = await params;
  // slug = ['guide', 'getting-started'] for /docs/guide/getting-started

  const path = slug.join('/');
  const doc = await getDoc(path);

  return <DocContent doc={doc} />;
}
```

## Route Groups

```tsx
// (marketing) and (app) don't appear in URL
// but allow different layouts

// app/(marketing)/layout.tsx
export default function MarketingLayout({ children }) {
  return (
    <>
      <MarketingNav />
      <main>{children}</main>
      <Footer />
    </>
  );
}

// app/(app)/layout.tsx
export default function AppLayout({ children }) {
  return (
    <>
      <Sidebar />
      <main>{children}</main>
    </>
  );
}
```

## Parallel Routes

```tsx
// app/layout.tsx with slots
export default function Layout({
  children,
  modal,     // @modal slot
  analytics, // @analytics slot
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
  analytics: React.ReactNode;
}) {
  return (
    <html>
      <body>
        {children}
        {modal}
        {analytics}
      </body>
    </html>
  );
}

// app/@modal/login/page.tsx - Intercepted modal
// app/@analytics/page.tsx - Analytics slot
```

## Intercepting Routes

```tsx
// Intercept /photo/123 when navigating from gallery
// app/gallery/@modal/(.)photo/[id]/page.tsx

// (.) - Same level
// (..) - One level up
// (..)(..) - Two levels up
// (...) - Root

export default function PhotoModal({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Modal>
      <Photo id={(await params).id} />
    </Modal>
  );
}
```

## Navigation

```tsx
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

// Declarative navigation
<Link href="/blog/my-post">Read Post</Link>
<Link href={{ pathname: '/blog', query: { sort: 'date' } }}>Blog</Link>

// Prefetch on hover (default)
<Link href="/dashboard" prefetch={true}>Dashboard</Link>

// No prefetch
<Link href="/admin" prefetch={false}>Admin</Link>

// Programmatic navigation
function NavigationExample() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function navigate() {
    router.push('/dashboard');
    router.replace('/login');  // No history entry
    router.back();
    router.forward();
    router.refresh();          // Re-fetch server components
  }

  // Current URL info
  console.log(pathname);                    // /blog
  console.log(searchParams.get('page'));    // 1
}
```

## Middleware

```typescript
// middleware.ts (root level)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Auth check
  const token = request.cookies.get('token');
  if (pathname.startsWith('/dashboard') && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Rewrite
  if (pathname.startsWith('/api/v1')) {
    return NextResponse.rewrite(new URL('/api/v2' + pathname.slice(7), request.url));
  }

  // Add headers
  const response = NextResponse.next();
  response.headers.set('x-custom-header', 'value');
  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};
```

## Metadata

```tsx
// Static metadata
export const metadata = {
  title: 'My Blog',
  description: 'A blog about things',
};

// Dynamic metadata
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      images: [post.image],
    },
  };
}
```

## Route Handlers (API)

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = searchParams.get('page') || '1';

  const users = await getUsers({ page: parseInt(page) });
  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const user = await createUser(body);
  return NextResponse.json(user, { status: 201 });
}

// app/api/users/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getUser(id);

  if (!user) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(user);
}
```

## Loading & Error Boundaries

```tsx
// app/dashboard/loading.tsx
export default function Loading() {
  return <DashboardSkeleton />;
}

// app/dashboard/error.tsx
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}

// app/dashboard/not-found.tsx
export default function NotFound() {
  return <div>Dashboard not found</div>;
}
```
