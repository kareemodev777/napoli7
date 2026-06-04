-- Phase 6 migration: guarantee at most one default address per user.
-- Apply via: supabase db push  (or paste into SQL editor). Run after 009.

-- Collapse any pre-existing duplicates so the unique index can be created:
-- keep the most recently created default per user, demote the rest.
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY user_id
           ORDER BY created_at DESC
         ) AS rn
  FROM saved_addresses
  WHERE is_default = true
)
UPDATE saved_addresses
SET is_default = false
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Partial unique index: only one row per user may have is_default = true.
CREATE UNIQUE INDEX IF NOT EXISTS saved_addresses_one_default_per_user
  ON saved_addresses (user_id)
  WHERE is_default;
