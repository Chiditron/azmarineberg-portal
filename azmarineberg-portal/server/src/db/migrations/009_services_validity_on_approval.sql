-- Regulatory validity dates are set when status becomes approved (effective date + snapshot duration).
-- Snapshot count/unit copied from service_types at service creation.

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS validity_count INTEGER
    CHECK (validity_count IS NULL OR (validity_count > 0 AND validity_count <= 999)),
  ADD COLUMN IF NOT EXISTS validity_unit VARCHAR(20)
    CHECK (validity_unit IS NULL OR validity_unit IN ('days', 'weeks', 'months', 'years'));

UPDATE services s
SET
  validity_count = st.validity_count,
  validity_unit = st.validity_unit
FROM service_types st
WHERE st.id = s.service_type_id
  AND (s.validity_count IS NULL OR s.validity_unit IS NULL);

ALTER TABLE services ALTER COLUMN validity_start DROP NOT NULL;
ALTER TABLE services ALTER COLUMN validity_end DROP NOT NULL;
