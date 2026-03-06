import { Request, Response } from 'express';
import { pool } from '../db/pool.js';

export async function getMetrics(_req: Request, res: Response) {
  const now = new Date();
  const threeMonthsFromNow = new Date(now);
  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

  const companiesResult = await pool.query('SELECT COUNT(*)::int as cnt FROM companies');
  const totalCompanies = companiesResult.rows[0]?.cnt ?? 0;

  const servicesResult = await pool.query(
    `SELECT status, validity_end FROM services WHERE status != 'closed'`
  );
  let activeServices = 0;
  let completedServices = 0;
  let expiringServices = 0;
  for (const s of servicesResult.rows) {
    if (s.status === 'approved') completedServices++;
    else activeServices++;
    const end = new Date(s.validity_end);
    if (end <= threeMonthsFromNow && end >= now) expiringServices++;
  }

  const byRegulator = await pool.query(
    `SELECT reg.code, reg.name, COUNT(*)::int as count
     FROM services s
     JOIN regulators reg ON reg.id = s.regulator_id
     WHERE s.status != 'closed'
     GROUP BY reg.code, reg.name ORDER BY count DESC`
  );

  const bySector = await pool.query(
    `SELECT c.industry_sector as sector, COUNT(*)::int as count
     FROM services s
     JOIN companies c ON c.id = s.company_id
     WHERE s.status != 'closed'
     GROUP BY c.industry_sector ORDER BY count DESC`
  );

  res.json({
    totalCompanies,
    activeServices,
    completedServices,
    expiringServices,
    byRegulator: byRegulator.rows,
    bySector: bySector.rows,
  });
}
