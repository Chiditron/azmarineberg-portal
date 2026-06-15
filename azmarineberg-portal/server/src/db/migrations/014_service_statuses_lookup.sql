-- Dynamic service statuses lookup table (replaces hardcoded CHECK constraint).

CREATE TABLE IF NOT EXISTS service_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  label VARCHAR(100) NOT NULL,
  sort_order INTEGER NOT NULL,
  requires_approval_effective_date BOOLEAN NOT NULL DEFAULT false,
  is_terminal BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO service_statuses (code, label, sort_order, requires_approval_effective_date, is_terminal) VALUES
  ('draft', 'Draft', 1, false, false),
  ('site_visit', 'Site visit', 2, false, false),
  ('quality_checks', 'Quality checks', 3, false, false),
  ('field_exercise', 'Field exercise', 4, false, false),
  ('scoping', 'Scoping', 5, false, false),
  ('site_verification', 'Site verification', 6, false, false),
  ('inspection', 'Inspection', 7, false, false),
  ('seasonal_data_gathering', 'Seasonal data gathering', 8, false, false),
  ('data_gathering', 'Data gathering', 9, false, false),
  ('analysis', 'Analysis', 10, false, false),
  ('regulatory_review', 'Regulatory review', 11, false, false),
  ('report_preparation', 'Report preparation', 12, false, false),
  ('submission', 'Submission', 13, false, false),
  ('client_review', 'Client review', 14, false, false),
  ('payment_pending', 'Payment pending', 15, false, false),
  ('procurement_stage', 'Procurement stage', 16, false, false),
  ('bill_preparation', 'Bill preparation', 17, false, false),
  ('client_acknowledgement', 'Client acknowledgement', 18, false, false),
  ('processing', 'Processing', 19, false, false),
  ('interim_approval', 'Interim approval', 20, false, false),
  ('final_approval', 'Final approval', 21, true, true),
  ('postponed', 'Postponed', 22, false, false),
  ('closed', 'Closed', 23, false, true)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE services DROP CONSTRAINT IF EXISTS services_status_check;

ALTER TABLE services
  ADD CONSTRAINT services_status_fkey
  FOREIGN KEY (status) REFERENCES service_statuses (code);

ALTER TABLE service_status_history
  ADD CONSTRAINT service_status_history_status_fkey
  FOREIGN KEY (status) REFERENCES service_statuses (code);

CREATE INDEX IF NOT EXISTS idx_service_statuses_sort_order ON service_statuses (sort_order);
CREATE INDEX IF NOT EXISTS idx_service_statuses_is_active ON service_statuses (is_active);
