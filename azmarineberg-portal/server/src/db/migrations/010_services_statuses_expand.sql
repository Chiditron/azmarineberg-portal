-- Expand allowed service statuses to match application workflow.
-- This updates the existing check constraint created in schema.sql.

ALTER TABLE services DROP CONSTRAINT IF EXISTS services_status_check;

ALTER TABLE services
  ADD CONSTRAINT services_status_check CHECK (
    status IN (
      'draft',
      'site_visit',
      'quality_checks',
      'field_exercise',
      'analysis',
      'regulatory_review',
      'payment_pending',
      'client_acknowledgement',
      'inspection',
      'bill_preparation',
      'procurement_stage',
      'seasonal_data_gathering',
      'data_gathering',
      'scoping',
      'site_verification',
      'processing',
      'final_approval',
      'interim_approval',
      'client_review',
      'postponed',
      'report_preparation',
      'submission',
      'approved',
      'closed'
    )
  );

