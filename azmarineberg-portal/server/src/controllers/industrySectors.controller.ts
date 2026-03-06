import { Request, Response } from 'express';
import { pool } from '../db/pool.js';
import * as auditService from '../services/audit.service.js';

export async function listIndustrySectors(_req: Request, res: Response) {
  const result = await pool.query(
    'SELECT id, name, code FROM industry_sectors ORDER BY name'
  );
  res.json(result.rows);
}

export async function createIndustrySector(req: Request, res: Response) {
  const { name, code } = req.body;
  if (!name?.trim() || !code?.trim()) {
    return res.status(400).json({ error: 'Name and code are required' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO industry_sectors (name, code) VALUES ($1, $2) RETURNING id, name, code`,
      [name.trim(), code.trim().toUpperCase()]
    );
    await auditService.log(
      req.user?.userId ?? null,
      'create_industry_sector',
      'industry_sector',
      result.rows[0].id,
      { name, code },
      req.ip
    );
    res.status(201).json(result.rows[0]);
  } catch (err: unknown) {
    const pgErr = err as { code?: string; constraint?: string };
    if (pgErr?.code === '23505' && pgErr?.constraint?.includes('code')) {
      return res.status(400).json({ error: 'An industry sector with this code already exists' });
    }
    throw err;
  }
}

export async function updateIndustrySector(req: Request, res: Response) {
  const { id } = req.params;
  const { name, code } = req.body;
  if (!name?.trim() || !code?.trim()) {
    return res.status(400).json({ error: 'Name and code are required' });
  }
  const check = await pool.query('SELECT id FROM industry_sectors WHERE id = $1', [id]);
  if (!check.rows[0]) {
    return res.status(404).json({ error: 'Industry sector not found' });
  }
  try {
    const result = await pool.query(
      `UPDATE industry_sectors SET name = $1, code = $2 WHERE id = $3 RETURNING id, name, code`,
      [name.trim(), code.trim().toUpperCase(), id]
    );
    await auditService.log(
      req.user?.userId ?? null,
      'update_industry_sector',
      'industry_sector',
      id,
      { name, code },
      req.ip
    );
    res.json(result.rows[0]);
  } catch (err: unknown) {
    const pgErr = err as { code?: string; constraint?: string };
    if (pgErr?.code === '23505' && pgErr?.constraint?.includes('code')) {
      return res.status(400).json({ error: 'An industry sector with this code already exists' });
    }
    throw err;
  }
}

export async function deleteIndustrySector(req: Request, res: Response) {
  const { id } = req.params;
  const check = await pool.query('SELECT id FROM industry_sectors WHERE id = $1', [id]);
  if (!check.rows[0]) {
    return res.status(404).json({ error: 'Industry sector not found' });
  }
  const refs = await pool.query(
    'SELECT COUNT(*)::int as c FROM companies WHERE industry_sector_id = $1',
    [id]
  );
  if (refs.rows[0].c > 0) {
    return res.status(400).json({
      error: 'Cannot delete: industry sector is in use. Reassign companies first.',
    });
  }
  await pool.query('DELETE FROM industry_sectors WHERE id = $1', [id]);
  await auditService.log(
    req.user?.userId ?? null,
    'delete_industry_sector',
    'industry_sector',
    id,
    {},
    req.ip
  );
  res.status(204).send();
}
