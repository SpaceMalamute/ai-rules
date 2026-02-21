---
description: "Next.js SEO and metadata"
paths:
  - "**/layout.tsx"
  - "**/page.tsx"
  - "**/app/sitemap.ts"
  - "**/app/robots.ts"
---

# Next.js SEO

## Static Metadata

```typescript
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Home | My App',
  description: 'Welcome to my application',
  openGraph: {
    title: 'Home | My App',
    description: 'Welcome to my application',
    url: 'https://example.com',
    siteName: 'My App',
    images: [{ url: 'https://example.com/og.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
};
```

## Dynamic Metadata (Next.js 15)

```typescript
// app/blog/[slug]/page.tsx — params is a Promise
type Props = { params: Promise<{ slug: string }> };

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
      images: [{ url: post.featuredImage, width: 1200, height: 630 }],
    },
  };
}
```

## Layout Metadata Template

```typescript
// app/layout.tsx — title template applies to all children
export const metadata: Metadata = {
  metadataBase: new URL('https://example.com'),
  title: {
    template: '%s | My App',
    default: 'My App',
  },
  description: 'My application description',
};

// Child page: title: 'Blog' renders as 'Blog | My App'
```

## Sitemap

```typescript
// app/sitemap.ts
import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://example.com';

  const posts = await db.post.findMany({
    select: { slug: true, updatedAt: true },
  });

  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    ...posts.map(post => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}
```

## Robots.txt

```typescript
// app/robots.ts
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin/', '/api/', '/private/'] },
    ],
    sitemap: 'https://example.com/sitemap.xml',
  };
}
```

## JSON-LD Structured Data

```typescript
export function ArticleJsonLd({ title, description, publishedTime, author, image, url }: ArticleJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    image,
    datePublished: publishedTime,
    author: { '@type': 'Person', name: author },
    mainEntityOfPage: url,
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

## Anti-patterns

```typescript
// BAD: Missing metadata on pages
export default function Page() {
  return <div>Content</div>; // No title, no description — bad for SEO
}

// BAD: Duplicate content without canonical
// GOOD: Set canonical to preferred URL
export const metadata: Metadata = {
  alternates: { canonical: '/page-1' },
};

// BAD: Accidentally blocking indexing
export const metadata: Metadata = {
  robots: { index: false }, // Check this is intentional!
};
```
