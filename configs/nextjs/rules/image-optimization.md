---
description: "Next.js image optimization with next/image"
paths:
  - "**/app/**/*.tsx"
  - "**/components/**/*.tsx"
  - "**/next.config.*"
---

# Image Optimization

## Basic Usage

### GOOD

```tsx
import Image from 'next/image';

// Static import — dimensions inferred, blur placeholder auto-generated
import heroImage from '@/public/hero.jpg';

export function Hero() {
  return (
    <Image
      src={heroImage}
      alt="Product showcase"
      priority                    // Above the fold — preload
      placeholder="blur"          // Auto blur from static import
    />
  );
}
```

### BAD

```tsx
// Don't use <img> — no optimization, no lazy loading, no responsive
<img src="/hero.jpg" alt="Hero" />

// Don't skip alt text
<Image src={heroImage} alt="" />   // Empty alt only for decorative images
```

## Remote Images

### GOOD

```tsx
// Remote images require explicit dimensions
<Image
  src="https://cdn.example.com/avatar.jpg"
  alt="User avatar"
  width={80}
  height={80}
  className="rounded-full"
/>
```

```ts
// next.config.ts — allow remote domains
import type { NextConfig } from 'next';

const config: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.example.com',
        pathname: '/images/**',
      },
    ],
  },
};

export default config;
```

### BAD

```ts
// Don't use domains — use remotePatterns (more secure, supports wildcards)
const config: NextConfig = {
  images: {
    domains: ['cdn.example.com'],   // Deprecated
  },
};
```

## Responsive Images

### GOOD

```tsx
// Fill mode — image fills its container
export function Banner() {
  return (
    <div className="relative h-64 w-full">
      <Image
        src="/banner.jpg"
        alt="Banner"
        fill
        sizes="100vw"
        className="object-cover"
      />
    </div>
  );
}

// Responsive with sizes hint — correct srcSet selection
<Image
  src="/product.jpg"
  alt="Product"
  width={800}
  height={600}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>
```

### BAD

```tsx
// fill without sizes — browser can't pick the right srcSet
<Image src="/banner.jpg" alt="Banner" fill />

// fill without a positioned container — image will overflow
<div>
  <Image src="/banner.jpg" alt="Banner" fill />
</div>
```

## Priority & Loading

### GOOD

```tsx
// Above the fold (hero, LCP image) — priority to preload
<Image src={hero} alt="Hero" priority />

// Below the fold — default lazy loading (no prop needed)
<Image src={product} alt="Product" width={400} height={300} />

// Blur placeholder for remote images
<Image
  src="https://cdn.example.com/photo.jpg"
  alt="Photo"
  width={600}
  height={400}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,/9j/4AAQ..."
/>
```

### BAD

```tsx
// Don't set priority on every image — only LCP / above the fold
{products.map(p => (
  <Image key={p.id} src={p.image} alt={p.name} priority />  // All priority = none priority
))}

// Don't set loading="eager" — use priority instead
<Image src={hero} alt="Hero" loading="eager" />
```

## Configuration

```ts
// next.config.ts — image optimization settings
const config: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },
};
```

## Anti-patterns

```tsx
// BAD: Using next/image for icons or tiny SVGs — use inline SVG or CSS
<Image src="/icon-arrow.svg" alt="" width={16} height={16} />

// GOOD: Inline SVG for icons
import { ArrowIcon } from '@/components/icons';
<ArrowIcon className="h-4 w-4" />

// BAD: Massive unoptimized images uploaded by users without resize
<Image src={userUpload.url} alt="Upload" width={2000} height={2000} />

// GOOD: Resize on upload or use a CDN with transformation
<Image
  src={`${userUpload.url}?w=800&q=75`}
  alt="Upload"
  width={800}
  height={600}
/>
```
