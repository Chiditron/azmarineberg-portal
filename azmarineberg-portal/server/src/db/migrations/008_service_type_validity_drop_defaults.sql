-- New rows must set validity explicitly; API always sends these on create/update.
ALTER TABLE service_types ALTER COLUMN validity_count DROP DEFAULT;
ALTER TABLE service_types ALTER COLUMN validity_unit DROP DEFAULT;
