---
paths:
  - "**/layout.tsx"
  - "**/page.tsx"
  - "**/app/sitemap.ts"
  - "**/app/robots.ts"
---

# Next.js SEO

## Metadata API

### Static Metadata

```typescript
// app/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Home | My App',
  description: 'Welcome to my application',
  keywords: ['next.js', 'react', 'web development'],
  authors: [{ name: 'John Doe' }],
  openGraph: {
    title: 'Home | My App',
    description: 'Welcome to my application',
    url: 'https://example.com',
    siteName: 'My App',
    images: [
      {
        url: 'https://example.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'My App',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Home | My App',
    description: 'Welcome to my application',
    images: ['https://example.com/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};
```

### Dynamic Metadata

```typescript
// app/blog/[slug]/page.tsx
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  return {
    title: `${post.title} | Blog`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.publishedAt,
      authors: [post.author.name],
      images: [
        {
          url: post.featuredImage,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
  };
}
```

### Layout Metadata (Template)

```typescript
// app/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://example.com'),
  title: {
    template: '%s | My App',
    default: 'My App',
  },
  description: 'My application description',
};

// Child page: title: 'Blog' → renders as 'Blog | My App'
```

## Sitemap

```typescript
// app/sitemap.ts
import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://example.com';

  // Static pages
  const staticPages = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 1 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
  ];

  // Dynamic pages
  const posts = await db.post.findMany({
    select: { slug: true, updatedAt: true },
  });

  const postPages = posts.map(post => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...postPages];
}
```

### Large Sitemap (Multiple Files)

```typescript
// app/sitemap/[id]/route.ts
import { getPostsBatch } from '@/lib/posts';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const posts = await getPostsBatch(parseInt(id));

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${posts.map(post => `
        <url>
          <loc>https://example.com/blog/${post.slug}</loc>
          <lastmod>${post.updatedAt.toISOString()}</lastmod>
        </url>
      `).join('')}
    </urlset>`;

  return new Response(sitemap, {
    headers: { 'Content-Type': 'application/xml' },
  });
}
```

## Robots.txt

```typescript
// app/robots.ts
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/private/'],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
      },
    ],
    sitemap: 'https://example.com/sitemap.xml',
  };
}
```

## JSON-LD Structured Data

```typescript
// components/structured-data.tsx
export function ArticleJsonLd({
  title,
  description,
  publishedTime,
  author,
  image,
  url,
}: ArticleJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    image,
    datePublished: publishedTime,
    author: {
      '@type': 'Person',
      name: author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'My App',
      logo: {
        '@type': 'ImageObject',
        url: 'https://example.com/logo.png',
      },
    },
    mainEntityOfPage: url,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// Usage in page
export default function BlogPost({ post }) {
  return (
    <>
      <ArticleJsonLd
        title={post.title}
        description={post.excerpt}
        publishedTime={post.publishedAt}
        author={post.author.name}
        image={post.featuredImage}
        url={`https://example.com/blog/${post.slug}`}
      />
      <article>...</article>
    </>
  );
}
```

### Organization Schema

```typescript
export function OrganizationJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'My Company',
    url: 'https://example.com',
    logo: 'https://example.com/logo.png',
    sameAs: [
      'https://twitter.com/mycompany',
      'https://linkedin.com/company/mycompany',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+1-800-555-1234',
      contactType: 'customer service',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
```

## Canonical URLs

```typescript
export const metadata: Metadata = {
  alternates: {
    canonical: 'https://example.com/page',
    languages: {
      'en-US': 'https://example.com/en-US/page',
      'fr-FR': 'https://example.com/fr-FR/page',
    },
  },
};
```

## Performance (Core Web Vitals)

```typescript
// next.config.js
module.exports = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  },
  experimental: {
    optimizeCss: true,
  },
};

// Image component
import Image from 'next/image';

<Image
  src="/hero.jpg"
  alt="Hero image"
  width={1200}
  height={630}
  priority // For LCP images
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>
```

## Anti-patterns

```typescript
// BAD: Missing metadata
export default function Page() {
  return <div>Content</div>;
}

// GOOD: Always include metadata
export const metadata: Metadata = {
  title: 'Page Title',
  description: 'Page description',
};

// BAD: Duplicate content without canonical
// page-1 and page-2 have same content

// GOOD: Set canonical
export const metadata: Metadata = {
  alternates: { canonical: '/page-1' },
};

// BAD: Blocking indexing of important pages
export const metadata: Metadata = {
  robots: { index: false }, // Accidentally blocking!
};
```
