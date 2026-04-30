# ADR-001: Data Layer

**Date:** 2026-04-30
**Status:** Accepted

## Context

The catalog is 23 fixed SKUs (7 pizza, 5 focaccia, 3 dessert, 8 drinks). Each SKU has a name, foreign-language name, description, price, customization options (per-ingredient: default / extra +AED / without), veg/spicy flags, and a category. Deals are currently one item (welcome offer); the structure should support future combos.

Three options were evaluated:

| Option | Reads | Writes | Latency | Ops burden | Cost |
|--------|-------|--------|---------|------------|------|
| A. Flat TypeScript seed file | Compile-time | Deploy | 0ms (bundled) | None | Free |
| B. Supabase (Postgres) | Runtime | SQL | ~5ms (edge) | Low | Free tier |
| C. Headless CMS (Sanity/Payload) | Runtime | CMS UI | ~30ms (CDN) | Medium | $99+/mo |

## Decision

**Supabase (Option B).**

Reasoning:

1. Orders, users, addresses, and cart persistence all require a relational database. Supabase is already the implied platform for auth (ADR-002) and order management. Co-locating catalog data in the same Postgres instance avoids a second integration.
2. The catalog is small enough (23 rows) that the query cost is negligible. With Next.js 16 Cache Components (`use cache`, `cacheTag('catalog')`), the database is hit only on deploy or manual revalidation — effectively the same as a static file after warm-up.
3. A flat TypeScript seed file (Option A) would require a deploy to update prices, add an SKU, or disable an item when it is 86'd. Supabase gives the owner a Supabase Studio dashboard (or a future `/admin` panel) to make those changes without a developer.
4. A CMS (Option C) is over-engineered for a 23-SKU single-store catalog and adds monthly cost with no benefit over Supabase Studio.

**Phase boundary**: Phases 1–2 use a local TypeScript seed file (`src/data/mock/catalog.ts`) that mirrors the Supabase schema exactly. Phase 3 migrates reads to Supabase with Cache Components. This means UI can be built and approved before any backend exists.

## Supabase Schema

```sql
-- Catalog
CREATE TABLE categories (
  id         text PRIMARY KEY,         -- 'pizza' | 'focaccia' | 'dessert' | 'drinks'
  label      text NOT NULL,
  description text,
  position   int NOT NULL DEFAULT 0
);

CREATE TABLE products (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text UNIQUE NOT NULL,
  category_id  text NOT NULL REFERENCES categories(id),
  name         text NOT NULL,
  name_it      text,                   -- Italian foreign name (italic in UI)
  description  text,
  price        numeric(8,2) NOT NULL,
  is_veg       boolean NOT NULL DEFAULT false,
  is_spicy     boolean NOT NULL DEFAULT false,
  is_active    boolean NOT NULL DEFAULT true,
  position     int NOT NULL DEFAULT 0,
  image_url    text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE product_customizations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label       text NOT NULL,           -- "Fior di latte mozzarella"
  extra_price numeric(6,2),            -- null = cannot be "Extra"; 0 = free extra
  removable   boolean NOT NULL DEFAULT true,
  position    int NOT NULL DEFAULT 0
);

-- Deals
CREATE TABLE deals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text UNIQUE NOT NULL,
  title       text NOT NULL,
  body        text,
  is_active   boolean NOT NULL DEFAULT true,
  expires_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

## Consequences

Positive:
- Single database for all data (catalog + orders + users).
- Owner can update catalog without a deploy.
- Cache Components eliminate per-request DB cost on catalog reads.
- Seed file doubles as type source of truth during UI phases.

Negative:
- Requires Supabase account and environment variables before Phase 3.
- Slightly more setup than a flat file.

## Alternatives Considered

- **Option A (flat file)**: Used only during Phases 1–2 as mock data. Rejected as permanent solution because price changes require a code deploy.
- **Option C (Sanity)**: Rejected. $99+/mo for 23 SKUs that barely change is not justified. No content editor is needed on day one.
