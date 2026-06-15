-- Backfill: existing rows get 1 year; defaults removed in 008 so new inserts must set validity explicitly.
ALTER TABLE service_types
  ADD COLUMN IF NOT EXISTS validity_count INTEGER NOT NULL DEFAULT 1
    CHECK (validity_count > 0 AND validity_count <= 999),
  ADD COLUMN IF NOT EXISTS validity_unit VARCHAR(20) NOT NULL DEFAULT 'years'
    CHECK (validity_unit IN ('days', 'weeks', 'months', 'years'));
