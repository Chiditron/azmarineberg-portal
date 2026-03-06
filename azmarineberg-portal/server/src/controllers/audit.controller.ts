import { Request, Response } from 'express';
import { pool } from '../db/pool.js';

export async function listAuditLogs(req: Request, res: Response) {
  const { limit = '50', offset = '0', entity_type, entity_id, action, from, to } = req.query;

  let query = `
    SELECT al.id, al.action, al.entity_type, al.entity_id, al.changes, al.ip, al.created_at,
           u.email as actor_email
    FROM audit_logs al
    LEFT JOIN users u ON u.id = al.actor_id
  `;
  const params: (string | number)[] = [];
  const conditions: string[] = [];
  if (entity_type && typeof entity_type === 'string') {
    conditions.push(`al.entity_type = $${params.length + 1}`);
    params.push(entity_type);
  }
  if (entity_id && typeof entity_id === 'string') {
    conditions.push(`al.entity_id = $${params.length + 1}`);
    params.push(entity_id);
  }
  if (action && typeof action === 'string') {
    conditions.push(`al.action = $${params.length + 1}`);
    params.push(action);
  }
  if (from && typeof from === 'string') {
    conditions.push(`al.created_at >= $${params.length + 1}::date`);
    params.push(from);
  }
  if (to && typeof to === 'string') {
    conditions.push(`al.created_at::date <= $${params.length + 1}::date`);
    params.push(to);
  }
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY al.created_at DESC';
  const limitVal = Math.min(parseInt(limit as string) || 50, 200);
  const offsetVal = Math.max(0, parseInt(offset as string) || 0);
  query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limitVal, offsetVal);

  const result = await pool.query(query, params);
  res.json(result.rows);
}
