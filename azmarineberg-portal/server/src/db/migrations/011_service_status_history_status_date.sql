-- Add manual timeline date for each status update.

ALTER TABLE service_status_history
  ADD COLUMN IF NOT EXISTS status_date DATE;

-- Backfill for existing history rows.
UPDATE service_status_history
SET status_date = COALESCE(status_date, created_at::date);

ALTER TABLE service_status_history
  ALTER COLUMN status_date SET NOT NULL;

