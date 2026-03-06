import { Request, Response } from 'express';
import { pool } from '../db/pool.js';

export async function getDashboardStats(req: Request, res: Response) {
  const companyId = req.user!.companyId;
  if (!companyId) {
    return res.json({
      activeServices: 0,
      completedServices: 0,
      expiringSoon: 0,
      pendingReports: 0,
    });
  }

  const now = new Date();
  const threeMonthsFromNow = new Date(now);
  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

  const servicesResult = await pool.query(
    `SELECT status, validity_end
     FROM services
     WHERE company_id = $1`,
    [companyId]
  );

  let activeServices = 0;
  let completedServices = 0;
  let expiringSoon = 0;

  for (const s of servicesResult.rows) {
    if (s.status === 'approved' || s.status === 'closed') completedServices++;
    else activeServices++;
    if (s.status !== 'closed') {
      const end = new Date(s.validity_end);
      if (end <= threeMonthsFromNow && end >= now) expiringSoon++;
    }
  }

  const reportsResult = await pool.query(
    `SELECT COUNT(*)::int as cnt FROM report_cycles rc
     JOIN services s ON s.id = rc.service_id
     WHERE s.company_id = $1 AND rc.status != 'acknowledged' AND rc.due_date <= $2`,
    [companyId, now]
  );
  const pendingReports = reportsResult.rows[0]?.cnt ?? 0;

  res.json({
    activeServices,
    completedServices,
    expiringSoon,
    pendingReports,
  });
}

export async function getServices(req: Request, res: Response) {
  const companyId = req.user!.companyId;
  if (!companyId) return res.json([]);

  const result = await pool.query(
    `SELECT s.id, s.service_code, s.service_description, s.validity_end, s.status,
            reg.name as regulator_name, reg.code as regulator_code,
            st.name as service_type_name, st.code as service_type_code,
            f.facility_name,
            GREATEST(0, (s.validity_end - CURRENT_DATE)::int) as days_to_expiry
     FROM services s
     LEFT JOIN regulators reg ON reg.id = s.regulator_id
     LEFT JOIN service_types st ON st.id = s.service_type_id
     LEFT JOIN facilities f ON f.id = s.facility_id
     WHERE s.company_id = $1
     ORDER BY s.validity_end ASC`,
    [companyId]
  );

  const rows = result.rows.map((r) => ({
    id: r.id,
    service_code: r.service_code,
    service_description: r.service_description,
    validity_end: r.validity_end,
    status: r.status,
    regulator: { name: r.regulator_name, code: r.regulator_code },
    service_type: { name: r.service_type_name, code: r.service_type_code },
    facility: { facility_name: r.facility_name },
    days_to_expiry: r.days_to_expiry,
  }));

  res.json(rows);
}

export async function getCompanyDetails(req: Request, res: Response) {
  const companyId = req.user!.companyId;
  if (!companyId) {
    return res.status(404).json({ error: 'Company not found' });
  }

  const companyResult = await pool.query(
    'SELECT id, company_name, email, phone, contact_person, address, lga, state, zone, industry_sector FROM companies WHERE id = $1',
    [companyId]
  );
  if (!companyResult.rows[0]) {
    return res.status(404).json({ error: 'Company not found' });
  }

  const facilitiesResult = await pool.query(
    'SELECT id, facility_name, facility_address, lga, state, zone FROM facilities WHERE company_id = $1',
    [companyId]
  );

  const company = companyResult.rows[0];
  res.json({
    company_name: company.company_name,
    email: company.email,
    phone: company.phone,
    contact_person: company.contact_person,
    address: company.address,
    lga: company.lga,
    state: company.state,
    zone: company.zone,
    industry_sector: company.industry_sector,
    facilities: facilitiesResult.rows,
  });
}
