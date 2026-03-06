import { Request, Response } from 'express';
import { pool } from '../db/pool.js';

export async function listReportCycles(req: Request, res: Response) {
  const { serviceId } = req.query;
  const role = req.user!.role;
  const companyId = req.user!.companyId;

  let query = `
    SELECT rc.id, rc.service_id, rc.cycle_type, rc.due_date, rc.status, rc.created_at,
           s.service_code, c.company_name
    FROM report_cycles rc
    JOIN services s ON s.id = rc.service_id
    JOIN companies c ON c.id = s.company_id
  `;
  const params: string[] = [];
  if (serviceId) {
    query += ' WHERE rc.service_id = $1';
    params.push(serviceId as string);
  }
  if (role === 'client' && companyId) {
    query += params.length ? ' AND s.company_id = $2' : ' WHERE s.company_id = $1';
    params.push(companyId);
  }
  query += ' ORDER BY rc.due_date DESC';

  const result = await pool.query(query, params);
  res.json(result.rows);
}

export async function createReportCycle(req: Request, res: Response) {
  const { service_id, cycle_type, due_date } = req.body;

  await pool.query(
    `INSERT INTO report_cycles (service_id, cycle_type, due_date)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [service_id, cycle_type, due_date]
  );
  res.status(201).json({ message: 'Report cycle created' });
}

export async function updateReportCycleStatus(req: Request, res: Response) {
  const { id } = req.params;
  const { status } = req.body;

  await pool.query(
    'UPDATE report_cycles SET status = $1 WHERE id = $2',
    [status, id]
  );
  res.json({ message: 'Status updated' });
}
