---
name: nextjs-best-practices
description: Next.js App Router conventions and best practices for TypeScript projects, covering routing, server vs client components, data fetching, caching, Server Actions, Tailwind/shadcn styling, testing, and performance. Use when scaffolding a Next.js app, adding routes, writing server or client components, fetching data, styling with Tailwind/shadcn, or reviewing Next.js code.
---

# Next.js Best Practices (App Router + TypeScript)

Full-stack conventions for modern Next.js projects. Apply these when creating, editing, or reviewing any file under `app/`, `components/`, or `lib/` in a Next.js codebase.

## Core principles

1. **Server by default, client on demand.** Every component is a Server Component unless it needs interactivity, browser APIs, or state. Add `"use client"` only at the leaf boundary — never at the top of a page that has server-only children.
2. **Colocate.** Keep route-specific components, loaders, and tests inside the route segment folder. Promote to `components/` or `lib/` only when reused.
3. **Type everything.** `strict: true` in `tsconfig.json`. Prefer explicit return types on exported functions and route handlers.
4. **Fetch on the server.** Do data fetching in Server Components or Route Handlers. Use client data libraries (TanStack Query/SWR) only for interactive, user-driven refetches and mutations.
5. **Small, composable components.** One responsibility per file. Extract when a component exceeds ~150 lines or mixes concerns.

---

## Project structure

```
app/
  (marketing)/page.tsx          # route groups - no URL segment
  (app)/
    layout.tsx                  # shared authed layout
    dashboard/
      page.tsx
      loading.tsx
      error.tsx
      _components/              # private folder (underscore) - not routable
        chart.tsx
  api/
    webhooks/route.ts
  layout.tsx                    # root layout (required)
  not-found.tsx
components/
  ui/                           # shadcn primitives
  <feature>/                    # feature-scoped components
lib/
  api/                          # fetch wrapper, typed clients
  auth/                         # session helpers
  utils.ts                      # cn(), formatters
  env.ts                        # validated env (zod)
hooks/                          # client hooks only
types/                          # shared TS types
middleware.ts
```

**Rules:**
- Use **route groups** `(name)` to share layouts without affecting URLs.
- Use **private folders** `_name` for route-local helpers that shouldn't be routable.
- Never import server-only modules from client components. Guard with `import "server-only"` at the top of server-only files.

---

## Server vs Client Components

### Default: Server Component

```tsx
// app/dashboard/page.tsx
import { getForms } from "@/lib/api/forms";

export default async function DashboardPage() {
  const forms = await getForms();
  return <FormList forms={forms} />;
}
```

### Client Component (explicit, minimal)

```tsx
"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); }}>
    {copied ? "Copied" : "Copy"}
  </button>;
}
```

**Push `"use client"` as far down the tree as possible.** A Server Component can render a Client Component, but not the reverse (Client Components receive server-rendered children via props).

### Decision checklist

Add `"use client"` only if the component:
- Uses `useState`, `useEffect`, `useReducer`, `useContext`
- Handles events (`onClick`, `onChange`)
- Uses browser-only APIs (`window`, `localStorage`, `IntersectionObserver`)
- Uses a client-only library (charting, dnd-kit, framer-motion)

Otherwise keep it a Server Component for smaller bundles and direct DB/API access.

---

## Data fetching and caching

### Server-side (preferred)

Fetch inside Server Components or Route Handlers. Use `fetch` with explicit caching:

```ts
// Static, cached indefinitely (default)
const res = await fetch(url);

// Revalidate every 60s (ISR)
const res = await fetch(url, { next: { revalidate: 60 } });

// Always fresh (dynamic)
const res = await fetch(url, { cache: "no-store" });

// Tag-based revalidation (pair with revalidateTag)
const res = await fetch(url, { next: { tags: ["forms"] } });
```

For non-`fetch` data sources (DB clients), wrap in `unstable_cache` with explicit tags.

### Parallel fetching

Kick off independent requests in parallel:

```tsx
const [user, forms] = await Promise.all([getUser(), getForms()]);
```

### Client-side (TanStack Query pattern)

Use only for user-driven mutations or live UI. Keep query keys centralized:

```ts
// lib/queries/keys.ts
export const qk = {
  form: (id: string) => ["form", id] as const,
  responses: (id: string) => ["responses", id] as const,
};
```

---

## Server Actions

Prefer Server Actions for mutations from forms and client handlers. They eliminate an API layer for internal mutations.

```tsx
// app/forms/actions.ts
"use server";

import { revalidateTag } from "next/cache";
import { z } from "zod";

const Input = z.object({ title: z.string().min(1) });

export async function createForm(formData: FormData) {
  const parsed = Input.parse({ title: formData.get("title") });
  const form = await db.forms.create(parsed);
  revalidateTag("forms");
  return form;
}
```

```tsx
// app/forms/new/page.tsx
import { createForm } from "../actions";

export default function NewFormPage() {
  return (
    <form action={createForm}>
      <input name="title" required />
      <button type="submit">Create</button>
    </form>
  );
}
```

**Rules:**
- Validate every action's input with zod or equivalent.
- Return typed results; surface errors via `useActionState` on the client.
- Revalidate via `revalidatePath` or `revalidateTag` — never manually mutate the router cache.

---

## Routing and navigation

- Use `<Link>` from `next/link` for internal navigation; it prefetches automatically.
- Use `useRouter` from `next/navigation` (not `next/router`) in client components.
- `loading.tsx` and `error.tsx` per route segment give you streaming UI and error boundaries with zero extra code. Add them proactively for any async segment.
- `not-found.tsx` for 404s; call `notFound()` from server code.
- **Dynamic segments** use `[param]`; **catch-all** `[...slug]`; **optional** `[[...slug]]`.

---

## Metadata and SEO

```tsx
// app/forms/[id]/page.tsx
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const form = await getForm(id);
  return { title: form.title, description: form.summary };
}
```

Set defaults in the root `app/layout.tsx`; override per-route. Use `next/image` for images and `next/font` for fonts — never raw `<img>` or `<link rel="stylesheet">` for Google Fonts.

---

## Styling: Tailwind + shadcn/ui

- Install shadcn via its CLI; components land in `components/ui/` and are owned by the repo (edit freely).
- Merge conditional classes with `cn()`:

```ts
// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- Use **CSS variables** for theme tokens (shadcn default). Don't hardcode hex values in components.
- Dark mode via `class` strategy; toggle on `<html>`.

---

## Forms

- Use `react-hook-form` + `zod` + `@hookform/resolvers/zod` for client validation.
- For server-side Server Actions, validate again with the same zod schema (single source of truth — export schemas from `lib/schemas/`).

---

## Environment variables

Validate at boot so misconfiguration fails loudly:

```ts
// lib/env.ts
import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),
});

export const env = schema.parse(process.env);
```

**Never** expose secrets with `NEXT_PUBLIC_`. Server-only variables are inlined only in server bundles.

---

## Error handling

- Throw in Server Components; let `error.tsx` catch it.
- In Route Handlers, return `NextResponse.json({ error }, { status: 400 })` with typed error shapes.
- Use `try/catch` around Server Actions and return `{ ok: false, message }` to the client.

---

## Performance

- **Images:** `next/image` with `priority` on LCP images; provide `sizes` for responsive.
- **Fonts:** `next/font` with `display: "swap"` (default).
- **Bundle:** dynamic-import heavy client-only libs: `const Chart = dynamic(() => import("./chart"), { ssr: false });`
- **Streaming:** use `<Suspense>` around slow server data to unblock shell render.
- **Third-party scripts:** `next/script` with `strategy="afterInteractive"` or `"lazyOnload"`.
- Measure with `next build` + the build output table; investigate any route whose First Load JS exceeds ~150 KB.

---

## Testing

- **Unit / component:** Vitest + React Testing Library. Place tests next to the file as `*.test.ts(x)`.
- **End-to-end:** Playwright in `e2e/`. Run against `next start` in CI.
- Test Server Actions as plain async functions (no HTTP layer needed).
- Don't test implementation details (class names, internal state) — test user-visible behavior.

---

## Accessibility

- Prefer semantic HTML (`<button>`, `<nav>`, `<main>`) over styled `<div>`s.
- Every interactive element is keyboard-reachable with a visible focus ring (Tailwind `focus-visible:ring-2`).
- Images have `alt`; decorative images use `alt=""`.
- Forms have labels associated via `htmlFor`/`id` (shadcn `<Label>` handles this).

---

## Anti-patterns to avoid

- `"use client"` at the top of a page/layout just to use one hook deeper — push it down.
- Fetching on the client when a Server Component could have fetched at render time.
- Passing large non-serializable objects as props across the server/client boundary.
- Using `useEffect` to fetch initial data in App Router — use a Server Component instead.
- Mixing `pages/` and `app/` in new code — App Router only.
- Committing generated files (`.next/`, `node_modules/`) — ensure they're in `.gitignore`.
- Hardcoding URLs — read from validated `env`.

---

## Pre-merge checklist

- [ ] No `"use client"` higher than necessary
- [ ] All async segments have `loading.tsx` and `error.tsx`
- [ ] Data fetching happens server-side where possible
- [ ] Mutations use Server Actions or Route Handlers with zod validation
- [ ] `next/image` + `next/font` used; no raw `<img>` / font `<link>`
- [ ] `tsc --noEmit` and `eslint` pass
- [ ] New routes have metadata
- [ ] No server-only imports leak into client bundles (`import "server-only"` guards in place)
