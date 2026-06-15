const UNIT_SINGULAR: Record<string, string> = {
  days: 'day',
  weeks: 'week',
  months: 'month',
  years: 'year',
};

/** Human-readable e.g. "1 year", "3 months". */
export function formatValidityPeriod(count: number, unit: string): string {
  const singular = UNIT_SINGULAR[unit] ?? unit;
  const noun = count === 1 ? singular : `${singular}s`;
  return `${count} ${noun}`;
}

export const VALIDITY_UNIT_OPTIONS = [
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' },
  { value: 'years', label: 'Years' },
] as const;

const ALLOWED_UNITS = ['days', 'weeks', 'months', 'years'] as const;
export type ValidityUnitValue = (typeof ALLOWED_UNITS)[number];

/** Table/list copy when API did not return usable validity (no fake "1 year"). */
export function formatValidityDisplay(
  count: number | null | undefined,
  unit: string | null | undefined,
): string {
  if (
    count == null ||
    unit == null ||
    !(ALLOWED_UNITS as readonly string[]).includes(unit)
  ) {
    return 'Not set';
  }
  return formatValidityPeriod(count, unit);
}

/** Normalize GET/PUT JSON (snake_case or camelCase). No invented defaults — missing → null. */
export function normalizeServiceTypeRow(row: Record<string, unknown>): {
  id: string;
  name: string;
  code: string;
  regulator_id: string;
  regulator_name?: string;
  validity_count: number | null;
  validity_unit: ValidityUnitValue | null;
} {
  const camel = row as {
    validityCount?: unknown;
    validityUnit?: unknown;
  };
  const countRaw = row.validity_count ?? camel.validityCount;
  const unitRaw = row.validity_unit ?? camel.validityUnit;

  let validity_count: number | null = null;
  if (typeof countRaw === 'number' && Number.isFinite(countRaw)) {
    const t = Math.trunc(countRaw);
    if (t >= 1 && t <= 999) validity_count = t;
  } else if (typeof countRaw === 'string' && countRaw.trim() !== '') {
    const n = parseInt(countRaw, 10);
    if (!Number.isNaN(n) && n >= 1 && n <= 999) validity_count = n;
  }

  let validity_unit: ValidityUnitValue | null = null;
  const u =
    typeof unitRaw === 'string' && unitRaw.trim()
      ? unitRaw.trim().toLowerCase()
      : '';
  if ((ALLOWED_UNITS as readonly string[]).includes(u)) {
    validity_unit = u as ValidityUnitValue;
  }

  return {
    id: String(row.id),
    name: String(row.name),
    code: String(row.code),
    regulator_id: String(row.regulator_id),
    regulator_name:
      row.regulator_name != null ? String(row.regulator_name) : undefined,
    validity_count,
    validity_unit,
  };
}
