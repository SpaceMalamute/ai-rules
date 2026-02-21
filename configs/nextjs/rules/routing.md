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
│   └── [slug]/page.tsx         # /blog/my-post (dynamic)
│
└── docs/
    └── [...slug]/page.tsx      # /docs/a/b/c (catch-all)
```

## Dynamic Routes (Next.js 15)

```tsx
// app/blog/[slug]/page.tsx — params is a Promise in Next.js 15
interface Props {
  params: Promise<{ slug: string }>;
}

export default async function BlogPost({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) notFound();

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
export default async function DocsPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const doc = await getDoc(slug.join('/'));
  return <DocContent doc={doc} />;
}
```

## Route Groups

```tsx
// (marketing) and (app) don't appear in URL but allow different layouts

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
// app/layout.tsx — slots render simultaneously
export default function Layout({
  children,
  modal,
  analytics,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;     // @modal slot
  analytics: React.ReactNode; // @analytics slot
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
```

## Intercepting Routes

```tsx
// Intercept /photo/123 when navigating from gallery — show modal
// app/gallery/@modal/(.)photo/[id]/page.tsx

// Convention: (.) same level, (..) one up, (...) root

export default async function PhotoModal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Modal>
      <Photo id={id} />
    </Modal>
  );
}
```

## Navigation

```tsx
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

// Declarative
<Link href="/blog/my-post">Read Post</Link>
<Link href={{ pathname: '/blog', query: { sort: 'date' } }}>Blog</Link>
<Link href="/dashboard" prefetch={true}>Dashboard</Link>

// Programmatic (client components only)
const router = useRouter();
router.push('/dashboard');
router.replace('/login');     // No history entry
router.refresh();             // Re-fetch server components
```

## Loading & Error Boundaries

```tsx
// app/dashboard/loading.tsx — automatic Suspense boundary
export default function Loading() {
  return <DashboardSkeleton />;
}

// app/dashboard/error.tsx — must be 'use client'
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
```
