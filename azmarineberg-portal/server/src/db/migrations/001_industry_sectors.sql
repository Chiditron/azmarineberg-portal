-- Industry Sectors: lookup table for company industry
CREATE TABLE IF NOT EXISTS industry_sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK to companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS industry_sector_id UUID REFERENCES industry_sectors(id);

-- Seed standard sectors (ignore if exists)
INSERT INTO industry_sectors (name, code) VALUES
  ('Manufacturing', 'MFG'),
  ('Oil & Gas', 'OILGAS'),
  ('FMCG', 'FMCG'),
  ('Construction', 'CONST'),
  ('Mining', 'MINING'),
  ('Healthcare', 'HEALTH'),
  ('Energy', 'ENERGY'),
  ('Agriculture', 'AGRIC'),
  ('Transportation', 'TRANS'),
  ('Telecommunications', 'TELECOM'),
  ('Other', 'OTHER')
ON CONFLICT (code) DO NOTHING;

-- Backfill: map existing companies.industry_sector (text) to industry_sector_id
-- Match by name (case-insensitive)
UPDATE companies c
SET industry_sector_id = (
  SELECT s.id FROM industry_sectors s
  WHERE LOWER(TRIM(s.name)) = LOWER(TRIM(c.industry_sector))
  LIMIT 1
)
WHERE c.industry_sector_id IS NULL
  AND c.industry_sector IS NOT NULL
  AND TRIM(c.industry_sector) != '';

-- Companies with industry_sector not matching any seeded sector keep industry_sector_id NULL
-- and continue using industry_sector text for display.
