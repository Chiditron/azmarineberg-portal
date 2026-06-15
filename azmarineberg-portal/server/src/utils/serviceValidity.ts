import { pool } from '../db/pool.js';

const UNITS = new Set(['days', 'weeks', 'months', 'years']);

/** End date (YYYY-MM-DD) = start + count * unit, computed in PostgreSQL for calendar-safe intervals. */
export async function computeValidityEndDate(
  startDate: string,
  count: number,
  unit: string,
): Promise<string> {
  const u = String(unit).toLowerCase().trim();
  const c = Math.trunc(Number(count));
  if (!UNITS.has(u) || !Number.isFinite(c) || c < 1) {
    throw new Error('Invalid validity duration');
  }
  const r = await pool.query<{ d: string }>(
    `SELECT ($1::date + ($2::text || ' ' || $3::text)::interval)::date::text AS d`,
    [startDate, String(c), u],
  );
  const row = r.rows[0];
  if (!row?.d) throw new Error('Could not compute validity end date');
  return row.d;
}
