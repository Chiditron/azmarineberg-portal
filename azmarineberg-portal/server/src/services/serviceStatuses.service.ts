import { pool } from '../db/pool.js';

export interface ServiceStatusRow {
  id: string;
  code: string;
  label: string;
  sort_order: number;
  requires_approval_effective_date: boolean;
  is_terminal: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

const SELECT_COLUMNS = `
  id, code, label, sort_order,
  requires_approval_effective_date, is_terminal, is_active,
  created_at, updated_at
`;

export async function listServiceStatuses(
  includeInactive = false
): Promise<ServiceStatusRow[]> {
  const result = await pool.query(
    `SELECT ${SELECT_COLUMNS}
     FROM service_statuses
     ${includeInactive ? '' : 'WHERE is_active = true'}
     ORDER BY sort_order ASC, label ASC`
  );
  return result.rows;
}

export async function getServiceStatusByCode(
  code: string
): Promise<ServiceStatusRow | null> {
  const result = await pool.query(
    `SELECT ${SELECT_COLUMNS} FROM service_statuses WHERE code = $1`,
    [code]
  );
  return result.rows[0] ?? null;
}

export async function getServiceStatusLabel(code: string): Promise<string> {
  const row = await getServiceStatusByCode(code);
  return row?.label ?? code.replace(/_/g, ' ');
}

export async function getServiceStatusLabelsMap(): Promise<Map<string, string>> {
  const rows = await listServiceStatuses(true);
  return new Map(rows.map((r) => [r.code, r.label]));
}
