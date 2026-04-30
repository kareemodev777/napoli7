# ADR-002: Authentication

**Date:** 2026-04-30
**Status:** Accepted

## Context

Auth is required for:
- `/account`, `/account/orders`, `/account/addresses`, `/account/wishlist` — customer self-service.
- `/admin/orders` — kitchen/owner view, role-gated.

Auth is explicitly NOT required for:
- `/track` — public order tracking by order ID + phone.
- All marketing and menu pages.

The tech stack already targets Supabase for the data layer (ADR-001), and the gstack skill set includes Supabase integration patterns.

Three options evaluated:

| Option | Setup | Cost | UAE compliance | Magic link | Social | Role RBAC |
|--------|-------|------|----------------|------------|--------|-----------|
| Supabase Auth | Low | Free | Adequate | Yes | Yes | Via `user_roles` table |
| Clerk | Medium | $25+/mo | Adequate | Yes | Yes | Built-in |
| Custom JWT (NextAuth v5) | High | Free | Manual | No | Manual | Manual |

## Decision

**Supabase Auth.**

Reasoning:

1. Supabase Auth is bundled with the Supabase project already chosen in ADR-001. No second vendor, no second billing relationship.
2. Supports email/password and magic link out of the box. Magic link is ideal for a food-delivery context — customers order on mobile, one-tap link via email removes friction.
3. Row Level Security (RLS) in Supabase means the same JWT that authenticates a customer also enforces data access rules on orders — no separate middleware layer needed.
4. Admin role: a single `user_roles` table with `role = 'admin'` distinguishes kitchen staff. The `/admin/*` routes check this in a Server Component before rendering.
5. Clerk (option 2) costs $25+/mo at meaningful scale and is redundant when Supabase Auth already exists.
6. Custom JWT (option 3) is engineering work we don't need.

## Implementation Notes

```ts
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: (cs) => cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } }
  )
}
```

```sql
CREATE TABLE user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role    text NOT NULL DEFAULT 'customer'  -- 'customer' | 'admin'
);

-- RLS: customers read only their own orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_orders" ON orders
  FOR ALL USING (auth.uid() = user_id);

-- Admins bypass RLS for orders
CREATE POLICY "admin_all_orders" ON orders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
```

**Session handling**: Use `@supabase/ssr` (not the deprecated `auth-helpers-nextjs`). Session is read server-side from cookies in Server Components and Server Actions. No client-side session polling.

**Route protection**: A `src/lib/auth/require-auth.ts` helper called at the top of protected Server Components. Returns `redirect('/login')` if no session. Admin routes additionally check role.

## Proxy / Middleware Note

Next.js 16 renames `middleware.ts` to `proxy.ts`. Session refresh (keeping the Supabase access token alive) must be handled in `src/proxy.ts`, not `src/middleware.ts`.

## Consequences

Positive:
- Zero additional vendor cost.
- RLS ties DB access control to the same JWT.
- Magic link reduces registration friction on mobile.

Negative:
- Supabase session management in Next.js 16 requires `@supabase/ssr` + proxy.ts — slightly more setup than Clerk's drop-in Next.js SDK.
- If we ever move off Supabase, auth moves with it.

## Alternatives Considered

- **Clerk**: Rejected — adds $25+/mo cost and a second vendor for no capability gain given Supabase Auth already covers the requirements.
- **NextAuth v5**: Rejected — requires significant custom implementation for magic link, role RBAC, and DB integration. Too much engineering for a single-store takeaway site.
