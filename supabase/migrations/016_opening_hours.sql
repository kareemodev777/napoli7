-- Ordering availability: restaurant opening hours.
-- Apply via: supabase db push (or paste into SQL editor).

CREATE TABLE IF NOT EXISTS opening_hours (
  day_of_week smallint PRIMARY KEY CHECK (day_of_week BETWEEN 0 AND 6),
  is_closed boolean NOT NULL DEFAULT true,
  opens_at time,
  closes_at time,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT opening_hours_time_check
    CHECK (
      (is_closed = true AND opens_at IS NULL AND closes_at IS NULL)
      OR
      (is_closed = false AND opens_at IS NOT NULL AND closes_at IS NOT NULL)
    )
);

ALTER TABLE opening_hours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "opening_hours_public_read" ON opening_hours;
CREATE POLICY "opening_hours_public_read" ON opening_hours
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "opening_hours_admin_all" ON opening_hours;
CREATE POLICY "opening_hours_admin_all" ON opening_hours
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Default to the published Napoli 7 hours, Tue-Sun 12:30 PM to midnight.
INSERT INTO opening_hours (day_of_week, is_closed, opens_at, closes_at, note) VALUES
  (0, true, NULL, NULL, 'Closed'),
  (1, true, NULL, NULL, 'Closed'),
  (2, false, '12:30', '00:00', 'Open'),
  (3, false, '12:30', '00:00', 'Open'),
  (4, false, '12:30', '00:00', 'Open'),
  (5, false, '12:30', '00:00', 'Open'),
  (6, false, '12:30', '00:00', 'Open')
ON CONFLICT (day_of_week) DO UPDATE
SET
  is_closed = EXCLUDED.is_closed,
  opens_at = EXCLUDED.opens_at,
  closes_at = EXCLUDED.closes_at,
  note = EXCLUDED.note,
  updated_at = now();
