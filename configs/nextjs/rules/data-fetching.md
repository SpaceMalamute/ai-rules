---
description: "Next.js data fetching patterns in Server Components"
paths:
  - "**/app/**/*.tsx"
  - "**/app/**/*.ts"
---

# Data Fetching

## Server Components Are the Default Data Layer

DO fetch data directly in Server Components — no API route round-trip needed.
DO use `async` Server Components with direct `await` for DB or API calls.
DO query only the fields the UI needs (`select` in ORM, explicit fields in API).

## Parallel Fetching

DO use `Promise.all()` for independent data needs — avoid sequential waterfalls.
DO NOT `await` one fetch before starting another unless there is a real dependency.

## Streaming with Suspense

DO wrap slow async components in `<Suspense>` with granular fallbacks.
DO NOT wrap the entire page in a single `<Suspense>` — defeats streaming.
Each `<Suspense>` boundary streams independently — split by data speed.

## Client Components

DO use the `use()` hook to unwrap promises passed from Server Components.
DO NOT use `useEffect` + `fetch` for data fetching — use Server Components.
For client-side interactivity with server data: fetch in Server Component, pass as props.

## Dynamic Params (Next.js 15)

`params` and `searchParams` are `Promise` — always `await` them:

```tsx
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
}
```

## Error Handling

- Throw errors in fetch functions — they bubble to the nearest `error.tsx`
- Call `notFound()` for 404 — triggers `not-found.tsx`
- DO NOT silently catch and return `null` — hides errors from the user

## Anti-Patterns

- DO NOT create API routes just to call them from Server Components — query DB directly
- DO NOT fetch in `useEffect` — Server Components eliminate the need
- DO NOT use `cache: 'force-cache'` by default in Next.js 15 — caching is opt-in now
- DO NOT destructure `params` synchronously — it is a Promise in Next.js 15
