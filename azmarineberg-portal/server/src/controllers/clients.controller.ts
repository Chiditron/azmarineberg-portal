import { Request, Response } from 'express';
import { pool } from '../db/pool.js';
import * as auditService from '../services/audit.service.js';

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
    if (s.status !== 'closed' && s.validity_end != null) {
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
            CASE WHEN s.validity_end IS NULL THEN NULL
                 ELSE GREATEST(0, (s.validity_end::date - CURRENT_DATE)::int) END as days_to_expiry
     FROM services s
     LEFT JOIN regulators reg ON reg.id = s.regulator_id
     LEFT JOIN service_types st ON st.id = s.service_type_id
     LEFT JOIN facilities f ON f.id = s.facility_id
     WHERE s.company_id = $1
     ORDER BY s.validity_end ASC NULLS LAST, s.created_at DESC`,
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
    'SELECT id, company_name, email, phone, contact_person, address, lga, state, zone, industry_sector, industry_sector_id FROM companies WHERE id = $1',
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
    id: company.id,
    company_name: company.company_name,
    email: company.email,
    phone: company.phone,
    contact_person: company.contact_person,
    address: company.address,
    lga: company.lga,
    state: company.state,
    zone: company.zone,
    industry_sector: company.industry_sector,
    industry_sector_id: company.industry_sector_id,
    facilities: facilitiesResult.rows,
  });
}

export async function patchCompany(req: Request, res: Response) {
  const companyId = req.user!.companyId;
  if (!companyId) {
    return res.status(404).json({ error: 'Company not found' });
  }

  const body = req.body as Record<string, unknown>;
  delete body.email;
  delete body.industry_sector_id;

  const { company_name, phone, contact_person, address, lga, state, zone } = body;

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let p = 1;

  if (company_name !== undefined) {
    const v = String(company_name).trim();
    if (!v) {
      return res.status(400).json({ error: 'company_name cannot be empty' });
    }
    setClauses.push(`company_name = $${p++}`);
    values.push(v);
  }
  if (phone !== undefined) {
    setClauses.push(`phone = $${p++}`);
    values.push(phone === null || phone === '' ? null : String(phone).trim());
  }
  if (contact_person !== undefined) {
    const v = String(contact_person).trim();
    if (!v) {
      return res.status(400).json({ error: 'contact_person cannot be empty' });
    }
    setClauses.push(`contact_person = $${p++}`);
    values.push(v);
  }
  if (address !== undefined) {
    const v = String(address).trim();
    if (!v) {
      return res.status(400).json({ error: 'address cannot be empty' });
    }
    setClauses.push(`address = $${p++}`);
    values.push(v);
  }
  if (lga !== undefined) {
    setClauses.push(`lga = $${p++}`);
    values.push(lga === null || lga === '' ? null : String(lga).trim());
  }
  if (state !== undefined) {
    setClauses.push(`state = $${p++}`);
    values.push(state === null || state === '' ? null : String(state).trim());
  }
  if (zone !== undefined) {
    setClauses.push(`zone = $${p++}`);
    values.push(zone === null || zone === '' ? null : String(zone).trim());
  }

  if (setClauses.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  values.push(companyId);
  await pool.query(
    `UPDATE companies SET ${setClauses.join(', ')} WHERE id = $${p}`,
    values
  );

  await auditService.log(
    req.user!.userId ?? null,
    'client_update_company',
    'company',
    companyId,
    {
      updated: Object.keys(body).filter(
        (k) => k !== 'email' && k !== 'industry_sector_id'
      ),
    },
    req.ip
  );

  const companyResult = await pool.query(
    'SELECT id, company_name, email, phone, contact_person, address, lga, state, zone, industry_sector, industry_sector_id FROM companies WHERE id = $1',
    [companyId]
  );
  const facilitiesResult = await pool.query(
    'SELECT id, facility_name, facility_address, lga, state, zone FROM facilities WHERE company_id = $1',
    [companyId]
  );
  const company = companyResult.rows[0];
  res.json({
    id: company.id,
    company_name: company.company_name,
    email: company.email,
    phone: company.phone,
    contact_person: company.contact_person,
    address: company.address,
    lga: company.lga,
    state: company.state,
    zone: company.zone,
    industry_sector: company.industry_sector,
    industry_sector_id: company.industry_sector_id,
    facilities: facilitiesResult.rows,
  });
}

export async function createClientFacility(req: Request, res: Response) {
  const companyId = req.user!.companyId;
  if (!companyId) {
    return res.status(404).json({ error: 'Company not found' });
  }

  const { facility_name, facility_address, lga, state, zone } = req.body as Record<string, string>;
  if (!facility_name?.trim() || !facility_address?.trim()) {
    return res.status(400).json({ error: 'Facility name and address are required' });
  }

  const companyResult = await pool.query(
    'SELECT id, lga, state, zone FROM companies WHERE id = $1',
    [companyId]
  );
  if (!companyResult.rows[0]) {
    return res.status(404).json({ error: 'Company not found' });
  }
  const company = companyResult.rows[0];

  const result = await pool.query(
    `INSERT INTO facilities (company_id, facility_name, facility_address, lga, state, zone)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, facility_name, facility_address, lga, state, zone`,
    [
      companyId,
      facility_name.trim(),
      facility_address.trim(),
      lga?.trim() || company.lga || company.state || 'Other',
      state?.trim() || company.state || 'Other',
      zone?.trim() || company.zone || 'South-West',
    ]
  );

  await auditService.log(
    req.user?.userId ?? null,
    'client_add_facility',
    'facility',
    result.rows[0].id,
    { facility_name: facility_name.trim() },
    req.ip
  );

  res.status(201).json(result.rows[0]);
}

export async function updateClientFacility(req: Request, res: Response) {
  const companyId = req.user!.companyId;
  if (!companyId) {
    return res.status(404).json({ error: 'Company not found' });
  }

  const { facilityId } = req.params;
  const body = req.body as Record<string, unknown>;

  const own = await pool.query(
    'SELECT id FROM facilities WHERE id = $1 AND company_id = $2',
    [facilityId, companyId]
  );
  if (!own.rows[0]) {
    return res.status(404).json({ error: 'Facility not found' });
  }

  const {
    facility_name,
    facility_address,
    lga,
    state,
    zone,
  } = body;

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let p = 1;

  if (facility_name !== undefined) {
    const v = String(facility_name).trim();
    if (!v) {
      return res.status(400).json({ error: 'facility_name cannot be empty' });
    }
    setClauses.push(`facility_name = $${p++}`);
    values.push(v);
  }
  if (facility_address !== undefined) {
    const v = String(facility_address).trim();
    if (!v) {
      return res.status(400).json({ error: 'facility_address cannot be empty' });
    }
    setClauses.push(`facility_address = $${p++}`);
    values.push(v);
  }
  if (lga !== undefined) {
    setClauses.push(`lga = $${p++}`);
    values.push(lga === null || lga === '' ? null : String(lga).trim());
  }
  if (state !== undefined) {
    setClauses.push(`state = $${p++}`);
    values.push(state === null || state === '' ? null : String(state).trim());
  }
  if (zone !== undefined) {
    setClauses.push(`zone = $${p++}`);
    values.push(zone === null || zone === '' ? null : String(zone).trim());
  }

  if (setClauses.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  values.push(facilityId, companyId);
  const result = await pool.query(
    `UPDATE facilities SET ${setClauses.join(', ')}
     WHERE id = $${p++} AND company_id = $${p}
     RETURNING id, facility_name, facility_address, lga, state, zone`,
    values
  );

  await auditService.log(
    req.user?.userId ?? null,
    'client_update_facility',
    'facility',
    facilityId,
    { updated: Object.keys(body) },
    req.ip
  );

  res.json(result.rows[0]);
}

export async function deleteClientFacility(req: Request, res: Response) {
  const companyId = req.user!.companyId;
  if (!companyId) {
    return res.status(404).json({ error: 'Company not found' });
  }

  const { facilityId } = req.params;

  const own = await pool.query(
    'SELECT id FROM facilities WHERE id = $1 AND company_id = $2',
    [facilityId, companyId]
  );
  if (!own.rows[0]) {
    return res.status(404).json({ error: 'Facility not found' });
  }

  const refs = await pool.query(
    'SELECT COUNT(*)::int as c FROM services WHERE facility_id = $1',
    [facilityId]
  );
  if (refs.rows[0].c > 0) {
    return res.status(400).json({
      error: 'Cannot remove facility linked to services. Contact support if you need to reassign services first.',
    });
  }

  await pool.query('DELETE FROM facilities WHERE id = $1 AND company_id = $2', [facilityId, companyId]);

  await auditService.log(
    req.user?.userId ?? null,
    'client_delete_facility',
    'facility',
    facilityId,
    {},
    req.ip
  );

  res.status(204).send();
}
