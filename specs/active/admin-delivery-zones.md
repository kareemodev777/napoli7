# Spec: Admin — Delivery Zones management

**Status:** Implemented 2026-06-03 · **Phase:** 5 (Admin, SEO, Polish) follow-up · **Author:** spec drafted 2026-06-02

## Goal

Give the kitchen/admin a UI to manage per-area delivery fees, instead of editing
the `delivery_zones` table by hand in the Supabase dashboard. The seeded fees
(`008_delivery_zones.sql`) are **placeholder estimates** — the owner needs a way
to set real Ajman areas + real fees before launch.

## Context / what already exists

- **Table** `delivery_zones` (migration `008_delivery_zones.sql`):
  `area text PK`, `fee_aed numeric(6,2) >= 0`, `position int default 0`,
  `active boolean default true`, `created_at timestamptz`.
- **RLS**: public read where `active = true`; admin (`user_roles.role = 'admin'`)
  full access. Already in place — no migration change needed.
- **Lib** `src/lib/checkout.ts` — `getDeliveryZones()` (active only, ordered by
  `position`), `getDeliveryFee(area)`, `DEFAULT_DELIVERY_FEE = 20`, mock fallback.
- **Consumer**: `/checkout` page fetches zones server-side → `CheckoutForm` area
  `<select>` with live fee. `placeOrder` recomputes fee server-side.
- **Admin shell**: `src/app/admin/layout.tsx` gates with `requireAdmin()` and
  renders the top nav (Orders · Catalog). Mirror the catalog admin exactly:
  `src/app/admin/catalog/page.tsx` + `actions.ts`.

## Non-goals

- No map/polygon zones — flat per-area fee only (matches current model).
- No bulk import/CSV.
- No reordering drag-and-drop — `position` is a numeric input (same as catalog).
- No changes to the checkout consumer or `008` migration.

## Deliverables

### 1. Nav link — `src/app/admin/layout.tsx`
Add a third link after Catalog:
```tsx
<Link href="/admin/delivery-zones" className="hover:text-muted-foreground">
  Delivery
</Link>
```

### 2. Server actions — `src/app/admin/delivery-zones/actions.ts`
`"use server"`. Mirror `catalog/actions.ts` conventions exactly:
- `requireAdmin()` first line of every action.
- `createServiceRoleClient()` for writes.
- Zod parse of `Object.fromEntries(formData)`; on failure `logActionError` + return.
- `revalidateDeliveryZones()` helper → `revalidatePath("/admin/delivery-zones")`
  + `revalidatePath("/checkout")` + `refresh()` (so the checkout picker updates).
- `boolFromForm(formData, "active")` for the checkbox (value `"on"`).

Schema:
```ts
const zoneSchema = z.object({
  // original area name for renaming the PK; empty = insert
  originalArea: z.string().max(120).optional().or(z.literal("")),
  area: z.string().min(2).max(120),
  fee_aed: z.coerce.number().min(0),
  position: z.coerce.number().int().default(0),
  active: z.coerce.boolean().default(true),
});
```

Actions:
- `upsertZone(formData)` — `area` is the PK. If `originalArea` is set and differs
  from `area`, this is a rename: `update(...).eq("area", originalArea)`. Else
  `upsert({ area, fee_aed, position, active })` (insert-or-update on PK).
  Guard rename collisions: the `update` will fail on duplicate PK — surface via
  `logActionError` (a future toast can show it; for now log + return like catalog).
- `deleteZone(formData)` — `area = String(formData.get("area"))`, guard empty,
  `delete().eq("area", area)`, revalidate.

> Note: catalog uses uuid `id` PKs; delivery_zones uses `area` (text) as PK. All
> action wiring keys off `area` instead of `id`. The `originalArea` field exists
> only to support renaming a primary key safely.

### 3. Page — `src/app/admin/delivery-zones/page.tsx`
Server component. Mirror `catalog/page.tsx`:
- `export const metadata = { title: "Delivery Zones · Admin", robots: { index: false, follow: false } }`
- `export const dynamic = "force-dynamic"`
- `loadZones()`: if `!HAS_SUPABASE_SERVICE` return `[]`; else
  `createServiceRoleClient().from("delivery_zones").select("*").order("position")`
  (load **all** zones incl. inactive — admin needs to see hidden ones).
- Empty-state when `!HAS_SUPABASE_SERVICE`: a notice that Supabase service env is
  required (match catalog's empty handling).

Layout:
- Page heading row (UPPERCASE `font-display tracking-[0.18em]`) + an **Add zone**
  button opening a `Dialog` (reuse `@/components/ui/dialog`) with the zone form.
- A table/list of zones, each row showing: `area`, `fee_aed` (via a `money`/
  `formatAed` helper), `position`, an `active` badge (Active / Hidden), and
  edit (Pencil) + delete (Trash2) icon buttons. Edit opens the same Dialog
  pre-filled; delete is a `DeleteButton` (confirm) wrapping a form posting to
  `deleteZone`. Reuse the `IconButton`/`Badge`/`DeleteButton`/`SaveButton`
  patterns from catalog (extract or duplicate small helpers locally — keep the
  page self-contained like catalog's `form-components.tsx`).

### 4. Form fields (in the Dialog)
- hidden `originalArea` (the row's current `area`, empty for add)
- `area` — text, required, placeholder e.g. `Al Jurf 2`
- `fee_aed` — number, `step="0.01"`, `min="0"`, required
- `position` — number, integer, default `0` (sort order, lower = first)
- `active` — checkbox, default checked

Styling: reuse `Field` wrapper + `<Input>` from catalog form components; the
`active` checkbox matches the `is_active` pattern. UPPERCASE labels,
`font-display tracking-[0.1em]`, 0px corners, navy `brand` focus border. **No
emojis** — lucide icons only (`Plus`, `Pencil`, `Trash2`).

## Acceptance criteria

- [x] `/admin/delivery-zones` renders for an admin; non-admins redirect (via layout `requireAdmin`).
- [x] Add a new zone → appears in list **and** in the `/checkout` area `<select>` (if `active`).
- [x] Edit a zone's fee → `/checkout` reflects the new fee on next load (revalidate works).
- [x] Rename a zone (PK change) → old name gone, new name present, no orphan row.
- [x] Toggle `active = false` → zone disappears from `/checkout` picker but still shows in admin (as "Hidden").
- [x] Delete a zone → removed from both admin and checkout.
- [x] `position` controls order in both admin list and checkout picker.
- [x] `fee_aed` rejects negatives (DB `CHECK` + zod `min(0)`).
- [x] No emojis; lucide icons only. Matches catalog admin visual language.
- [x] `npx tsc --noEmit` clean; `pnpm lint` clean.

## Edge cases

- Empty `delivery_zones` table → checkout falls back to `MOCK_ZONES` (already
  handled in `getDeliveryZones`); admin shows an empty list with the Add button.
- Renaming to an existing area name → update fails on PK conflict; log + no-op
  (acceptable v1; toast feedback is a follow-up).
- Deleting the area a past order used → orders store the area as free text in
  `delivery_address` JSON, not an FK, so no referential breakage.

## Files

| File | Change |
|---|---|
| `src/app/admin/layout.tsx` | add Delivery nav link |
| `src/app/admin/delivery-zones/page.tsx` | new — server component list + dialogs |
| `src/app/admin/delivery-zones/actions.ts` | new — upsert/delete/rename server actions |
| `src/app/admin/delivery-zones/form-components.tsx` | new (optional) — Field/Badge/buttons if not shared |

## Estimate

Small. ~1 page + 1 actions file, all patterns already established in the catalog
admin. No migration, no lib change, no checkout consumer change.
