import { Request, Response } from 'express';
import { pool } from '../db/pool.js';
import * as auditService from '../services/audit.service.js';
import { listServiceStatuses } from '../services/serviceStatuses.service.js';

const CODE_PATTERN = /^[a-z][a-z0-9_]*$/;

export async function listServiceStatusesHandler(req: Request, res: Response) {
  const includeInactive = req.query.includeInactive === 'true';
  const rows = await listServiceStatuses(includeInactive);
  res.json(rows);
}

export async function createServiceStatus(req: Request, res: Response) {
  const {
    code,
    label,
    sort_order,
    requires_approval_effective_date,
    is_terminal,
    is_active,
  } = req.body;

  const normalizedCode =
    typeof code === 'string' ? code.trim().toLowerCase() : '';
  if (!normalizedCode || !CODE_PATTERN.test(normalizedCode)) {
    return res.status(400).json({
      error:
        'Code is required (lowercase letters, numbers, underscores; must start with a letter)',
    });
  }
  if (!label?.trim()) {
    return res.status(400).json({ error: 'Label is required' });
  }
  const order = Number(sort_order);
  if (!Number.isFinite(order)) {
    return res.status(400).json({ error: 'Sort order must be a number' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO service_statuses (
         code, label, sort_order,
         requires_approval_effective_date, is_terminal, is_active
       ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, code, label, sort_order,
         requires_approval_effective_date, is_terminal, is_active,
         created_at, updated_at`,
      [
        normalizedCode,
        label.trim(),
        order,
        Boolean(requires_approval_effective_date),
        Boolean(is_terminal),
        is_active !== false,
      ]
    );
    await auditService.log(
      req.user?.userId ?? null,
      'create_service_status',
      'service_status',
      result.rows[0].id,
      { code: normalizedCode, label: label.trim() },
      req.ip
    );
    res.status(201).json(result.rows[0]);
  } catch (err: unknown) {
    const pgErr = err as { code?: string; constraint?: string };
    if (pgErr?.code === '23505') {
      return res.status(400).json({ error: 'A status with this code already exists' });
    }
    throw err;
  }
}

export async function updateServiceStatusDefinition(req: Request, res: Response) {
  const { id } = req.params;
  const {
    label,
    sort_order,
    requires_approval_effective_date,
    is_terminal,
    is_active,
  } = req.body;

  const check = await pool.query(
    'SELECT id, code FROM service_statuses WHERE id = $1',
    [id]
  );
  if (!check.rows[0]) {
    return res.status(404).json({ error: 'Service status not found' });
  }
  if (!label?.trim()) {
    return res.status(400).json({ error: 'Label is required' });
  }
  const order = Number(sort_order);
  if (!Number.isFinite(order)) {
    return res.status(400).json({ error: 'Sort order must be a number' });
  }

  const result = await pool.query(
    `UPDATE service_statuses SET
       label = $1,
       sort_order = $2,
       requires_approval_effective_date = $3,
       is_terminal = $4,
       is_active = $5,
       updated_at = NOW()
     WHERE id = $6
     RETURNING id, code, label, sort_order,
       requires_approval_effective_date, is_terminal, is_active,
       created_at, updated_at`,
    [
      label.trim(),
      order,
      Boolean(requires_approval_effective_date),
      Boolean(is_terminal),
      is_active !== false,
      id,
    ]
  );
  await auditService.log(
    req.user?.userId ?? null,
    'update_service_status',
    'service_status',
    id,
    { code: check.rows[0].code, label: label.trim() },
    req.ip
  );
  res.json(result.rows[0]);
}

export async function deleteServiceStatus(req: Request, res: Response) {
  const { id } = req.params;
  const check = await pool.query(
    'SELECT id, code, label FROM service_statuses WHERE id = $1',
    [id]
  );
  if (!check.rows[0]) {
    return res.status(404).json({ error: 'Service status not found' });
  }
  const code = check.rows[0].code as string;

  const serviceRefs = await pool.query(
    'SELECT COUNT(*)::int AS c FROM services WHERE status = $1',
    [code]
  );
  if (serviceRefs.rows[0].c > 0) {
    return res.status(400).json({
      error: 'Cannot delete: services are using this status. Deactivate it instead.',
    });
  }
  const historyRefs = await pool.query(
    'SELECT COUNT(*)::int AS c FROM service_status_history WHERE status = $1',
    [code]
  );
  if (historyRefs.rows[0].c > 0) {
    return res.status(400).json({
      error: 'Cannot delete: status history references this status. Deactivate it instead.',
    });
  }

  await pool.query('DELETE FROM service_statuses WHERE id = $1', [id]);
  await auditService.log(
    req.user?.userId ?? null,
    'delete_service_status',
    'service_status',
    id,
    { code, label: check.rows[0].label },
    req.ip
  );
  res.status(204).send();
}
