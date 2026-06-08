-- Phase: POS order push. Durable record of every order push attempt to the POS
-- (xtbooks). Apply via: supabase db push (or paste into SQL editor). Run after 011.
--
-- Additive only: a new table. No changes to orders/order_items. One row is written
-- per push attempt-set (final outcome + attempts used), with the body stored so a
-- failed push can be replayed verbatim. Inspected/replayed server-side only.

CREATE TABLE IF NOT EXISTS pos_push_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     uuid REFERENCES orders(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  kind         text NOT NULL,            -- 'create' | 'status_update'
  endpoint     text NOT NULL,
  status       text NOT NULL,            -- 'sent' | 'failed'
  http_status  int,
  attempts     int NOT NULL DEFAULT 1,
  error        text,
  payload      jsonb,                     -- body sent, for replay/debugging
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pos_push_log_status_idx ON pos_push_log (status);
CREATE INDEX IF NOT EXISTS pos_push_log_order_id_idx ON pos_push_log (order_id);

-- RLS on with NO policies for anon/auth → service-role only. The POS pusher runs
-- through the service-role client (which bypasses RLS), so client roles can never
-- read or write this log. Mirrors how other server-only writes are gated.
ALTER TABLE pos_push_log ENABLE ROW LEVEL SECURITY;
