import { Request, Response } from 'express';
import { pool } from '../db/pool.js';
import * as authService from '../services/auth.service.js';
import * as auditService from '../services/audit.service.js';
import { sendEmail } from '../services/EmailService.js';
import { renderClientOnboardingTemplate } from '../email/templates/clientOnboarding.template.js';

export async function listFacilities(_req: Request, res: Response) {
  const result = await pool.query(
    `SELECT f.id, f.facility_name, c.company_name
     FROM facilities f
     JOIN companies c ON c.id = f.company_id
     ORDER BY f.facility_name`
  );
  res.json(result.rows);
}

export async function getClients(_req: Request, res: Response) {
  const result = await pool.query(
    `SELECT c.id, c.company_name, c.email, c.contact_person, c.state, c.zone, c.industry_sector,
            (SELECT COUNT(*)::int FROM facilities f WHERE f.company_id = c.id) as facility_count,
            (SELECT COUNT(*)::int FROM services s WHERE s.company_id = c.id) as service_count
     FROM companies c
     ORDER BY c.company_name`
  );
  res.json(result.rows);
}

export async function createClient(req: Request, res: Response) {
  const client = await pool.connect();
  try {
    const {
      company_name,
      address,
      phone,
      email,
      contact_person,
      lga,
      state,
      zone,
      industry_sector,
      industry_sector_id,
      facilities,
      services: servicesData,
      createUserAndInvite,
    } = req.body;

    if (!company_name || !address || !phone || !email || !contact_person || !lga || !state || !zone) {
      return res.status(400).json({ error: 'Missing required company fields' });
    }
    if (!industry_sector_id && !industry_sector) {
      return res.status(400).json({ error: 'Industry sector or industry_sector_id is required' });
    }
    if (!facilities?.length) {
      return res.status(400).json({ error: 'At least one facility is required' });
    }
    const emptyFacility = facilities.find((f: { facility_name?: string }) => !f?.facility_name?.trim());
    if (emptyFacility) {
      return res.status(400).json({ error: 'Each facility must have a name. Please fill in the Facility Name.' });
    }

    await client.query('BEGIN');

    let resolvedSectorId: string | null = null;
    let resolvedSectorName = industry_sector || '';
    if (industry_sector_id) {
      const sec = await client.query(
        'SELECT id, name FROM industry_sectors WHERE id = $1',
        [industry_sector_id]
      );
      if (sec.rows[0]) {
        resolvedSectorId = sec.rows[0].id;
        resolvedSectorName = sec.rows[0].name;
      }
    } else if (industry_sector) {
      const sec = await client.query(
        'SELECT id, name FROM industry_sectors WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))',
        [industry_sector]
      );
      if (sec.rows[0]) {
        resolvedSectorId = sec.rows[0].id;
        resolvedSectorName = sec.rows[0].name;
      } else {
        resolvedSectorName = industry_sector;
      }
    }

    const companyResult = await client.query(
      `INSERT INTO companies (company_name, address, phone, email, contact_person, lga, state, zone, industry_sector, industry_sector_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [company_name, address, phone, email, contact_person, lga, state, zone, resolvedSectorName, resolvedSectorId]
    );
    const companyId = companyResult.rows[0].id;

    const facilityIds: string[] = [];
    for (const f of facilities) {
      const fr = await client.query(
        `INSERT INTO facilities (company_id, facility_name, facility_address, lga, state, zone)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [companyId, f.facility_name, f.facility_address || '', f.lga || lga, f.state || state, f.zone || zone]
      );
      facilityIds.push(fr.rows[0].id);
    }

    if (servicesData?.length) {
      for (const svc of servicesData) {
        const facilityId = svc.facility_id || facilityIds[0];
        await client.query(
          `INSERT INTO services (facility_id, company_id, service_type_id, regulator_id, service_description, service_code, validity_start, validity_end, status, documents_required)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            facilityId,
            companyId,
            svc.service_type_id,
            svc.regulator_id,
            svc.service_description || '',
            svc.service_code || 'N/A',
            svc.validity_start || new Date(),
            svc.validity_end || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            svc.status || 'draft',
            JSON.stringify(svc.documents_required || []),
          ]
        );
      }
    }

    let userId: string | null = null;
    if (createUserAndInvite) {
      const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';
      const hash = await authService.hashPassword(tempPassword);
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, role, company_id, must_change_password)
         VALUES ($1, $2, 'client', $3, true)
         RETURNING id`,
        [email, hash, companyId]
      );
      userId = userResult.rows[0].id;
    }

    await client.query('COMMIT');

    await auditService.log(req.user?.userId ?? null, 'create_client', 'company', companyId, { company_name }, req.ip);

    const response: Record<string, unknown> = {
      companyId,
      facilityIds,
      message: 'Client created successfully',
    };
    if (createUserAndInvite && userId) {
      const { token, hoursValid } = await authService.createInviteToken(companyId, userId);
      const appUrl = process.env.APP_URL || 'http://localhost:5173';
      const inviteLink = `${appUrl}/invite?token=${encodeURIComponent(token)}`;
      response.inviteLink = inviteLink;
      response.inviteToken = token;

      try {
        const template = renderClientOnboardingTemplate({
          onboardingUrl: inviteLink,
          companyName: String(company_name),
          hoursValid,
        });
        await sendEmail({
          to: String(email),
          subject: template.subject,
          html: template.html,
          text: template.text,
        });
        response.inviteEmailSent = true;
      } catch (mailErr) {
        console.error('Client onboarding email failed:', mailErr);
        response.inviteEmailSent = false;
      }
    }
    res.status(201).json(response);
  } catch (err: unknown) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Create client error:', err);
    const pgErr = err as { code?: string; constraint?: string };
    if (pgErr?.code === '23505' && pgErr?.constraint?.includes('email')) {
      return res.status(400).json({ error: 'A user with this email already exists.' });
    }
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to create client' });
  } finally {
    client.release();
  }
}

export async function inviteClient(req: Request, res: Response) {
  const { id } = req.params;
  const { email } = req.body;
  const client = await pool.connect();
  try {
    const companyResult = await client.query(
      'SELECT id, email, company_name FROM companies WHERE id = $1',
      [id]
    );
    if (!companyResult.rows[0]) {
      return res.status(404).json({ error: 'Company not found' });
    }
    const company = companyResult.rows[0];
    const clientEmail = email || company.email;

    const existingUser = await authService.findUserByEmail(clientEmail);
    let userId: string;
    if (existingUser) {
      if (existingUser.company_id !== id) {
        await client.query('UPDATE users SET company_id = $1 WHERE id = $2', [id, existingUser.id]);
      }
      userId = existingUser.id;
    } else {
      const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';
      const created = await authService.createUser(clientEmail, tempPassword, 'client', id);
      userId = created.id;
      await client.query(
        'UPDATE users SET must_change_password = true WHERE id = $1',
        [userId]
      );
    }

    const { token, hoursValid } = await authService.createInviteToken(id, userId);
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const inviteLink = `${appUrl}/invite?token=${encodeURIComponent(token)}`;

    try {
      const template = renderClientOnboardingTemplate({
        onboardingUrl: inviteLink,
        companyName: String(company.company_name),
        hoursValid,
      });
      await sendEmail({
        to: clientEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
    } catch (mailErr) {
      console.error('Email send failed:', mailErr);
    }

    await auditService.log(req.user?.userId ?? null, 'invite_client', 'company', id, { email: clientEmail }, req.ip);
    res.json({ inviteLink, message: 'Invite sent (or link generated)' });
  } finally {
    client.release();
  }
}

export async function getRegulators(_req: Request, res: Response) {
  const result = await pool.query(
    'SELECT id, name, code, level FROM regulators ORDER BY level, name'
  );
  res.json(result.rows);
}

export async function createRegulator(req: Request, res: Response) {
  const { name, code, level } = req.body;
  if (!name?.trim() || !code?.trim() || !level) {
    return res.status(400).json({ error: 'Name, code, and level are required' });
  }
  if (!['federal', 'state'].includes(level)) {
    return res.status(400).json({ error: 'Level must be federal or state' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO regulators (name, code, level) VALUES ($1, $2, $3) RETURNING id, name, code, level`,
      [name.trim(), code.trim().toUpperCase(), level]
    );
    await auditService.log(req.user?.userId ?? null, 'create_regulator', 'regulator', result.rows[0].id, { name, code, level }, req.ip);
    res.status(201).json(result.rows[0]);
  } catch (err: unknown) {
    const pgErr = err as { code?: string; constraint?: string };
    if (pgErr?.code === '23505' && pgErr?.constraint?.includes('code')) {
      return res.status(400).json({ error: 'A regulator with this code already exists' });
    }
    throw err;
  }
}

export async function updateRegulator(req: Request, res: Response) {
  const { id } = req.params;
  const { name, code, level } = req.body;
  if (!name?.trim() || !code?.trim() || !level) {
    return res.status(400).json({ error: 'Name, code, and level are required' });
  }
  if (!['federal', 'state'].includes(level)) {
    return res.status(400).json({ error: 'Level must be federal or state' });
  }
  const check = await pool.query('SELECT id FROM regulators WHERE id = $1', [id]);
  if (!check.rows[0]) {
    return res.status(404).json({ error: 'Regulator not found' });
  }
  try {
    const result = await pool.query(
      `UPDATE regulators SET name = $1, code = $2, level = $3 WHERE id = $4 RETURNING id, name, code, level`,
      [name.trim(), code.trim().toUpperCase(), level, id]
    );
    await auditService.log(req.user?.userId ?? null, 'update_regulator', 'regulator', id, { name, code, level }, req.ip);
    res.json(result.rows[0]);
  } catch (err: unknown) {
    const pgErr = err as { code?: string; constraint?: string };
    if (pgErr?.code === '23505' && pgErr?.constraint?.includes('code')) {
      return res.status(400).json({ error: 'A regulator with this code already exists' });
    }
    throw err;
  }
}

export async function deleteRegulator(req: Request, res: Response) {
  const { id } = req.params;
  const check = await pool.query('SELECT id FROM regulators WHERE id = $1', [id]);
  if (!check.rows[0]) {
    return res.status(404).json({ error: 'Regulator not found' });
  }
  const refs = await pool.query('SELECT COUNT(*)::int as c FROM service_types WHERE regulator_id = $1', [id]);
  if (refs.rows[0].c > 0) {
    return res.status(400).json({ error: 'Cannot delete: regulator has service types. Remove or reassign them first.' });
  }
  await pool.query('DELETE FROM regulators WHERE id = $1', [id]);
  await auditService.log(req.user?.userId ?? null, 'delete_regulator', 'regulator', id, {}, req.ip);
  res.status(204).send();
}

export async function getServiceTypes(req: Request, res: Response) {
  const { regulatorId } = req.query;
  let query = `SELECT st.id, st.name, st.code, st.regulator_id, reg.name as regulator_name
               FROM service_types st
               JOIN regulators reg ON reg.id = st.regulator_id`;
  const params: string[] = [];
  if (regulatorId) {
    query += ' WHERE st.regulator_id = $1';
    params.push(regulatorId as string);
  }
  query += ' ORDER BY reg.name, st.name';
  const result = await pool.query(query, params);
  res.json(result.rows);
}

export async function createServiceType(req: Request, res: Response) {
  const { name, code, regulator_id } = req.body;
  if (!name?.trim() || !code?.trim() || !regulator_id) {
    return res.status(400).json({ error: 'Name, code, and regulator are required' });
  }
  const regCheck = await pool.query('SELECT id FROM regulators WHERE id = $1', [regulator_id]);
  if (!regCheck.rows[0]) {
    return res.status(400).json({ error: 'Regulator not found' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO service_types (name, code, regulator_id) VALUES ($1, $2, $3) RETURNING id, name, code, regulator_id`,
      [name.trim(), code.trim().toUpperCase(), regulator_id]
    );
    await auditService.log(req.user?.userId ?? null, 'create_service_type', 'service_type', result.rows[0].id, { name, code, regulator_id }, req.ip);
    res.status(201).json(result.rows[0]);
  } catch (err: unknown) {
    const pgErr = err as { code?: string; constraint?: string };
    if (pgErr?.code === '23505') {
      return res.status(400).json({ error: 'A service type with this code already exists for this regulator' });
    }
    throw err;
  }
}

export async function updateServiceType(req: Request, res: Response) {
  const { id } = req.params;
  const { name, code, regulator_id } = req.body;
  if (!name?.trim() || !code?.trim() || !regulator_id) {
    return res.status(400).json({ error: 'Name, code, and regulator are required' });
  }
  const check = await pool.query('SELECT id FROM service_types WHERE id = $1', [id]);
  if (!check.rows[0]) {
    return res.status(404).json({ error: 'Service type not found' });
  }
  const regCheck = await pool.query('SELECT id FROM regulators WHERE id = $1', [regulator_id]);
  if (!regCheck.rows[0]) {
    return res.status(400).json({ error: 'Regulator not found' });
  }
  try {
    const result = await pool.query(
      `UPDATE service_types SET name = $1, code = $2, regulator_id = $3 WHERE id = $4 RETURNING id, name, code, regulator_id`,
      [name.trim(), code.trim().toUpperCase(), regulator_id, id]
    );
    await auditService.log(req.user?.userId ?? null, 'update_service_type', 'service_type', id, { name, code, regulator_id }, req.ip);
    res.json(result.rows[0]);
  } catch (err: unknown) {
    const pgErr = err as { code?: string; constraint?: string };
    if (pgErr?.code === '23505') {
      return res.status(400).json({ error: 'A service type with this code already exists for this regulator' });
    }
    throw err;
  }
}

export async function deleteServiceType(req: Request, res: Response) {
  const { id } = req.params;
  const check = await pool.query('SELECT id FROM service_types WHERE id = $1', [id]);
  if (!check.rows[0]) {
    return res.status(404).json({ error: 'Service type not found' });
  }
  const refs = await pool.query('SELECT COUNT(*)::int as c FROM services WHERE service_type_id = $1', [id]);
  if (refs.rows[0].c > 0) {
    return res.status(400).json({ error: 'Cannot delete: service type is in use. Remove or reassign services first.' });
  }
  await pool.query('DELETE FROM service_types WHERE id = $1', [id]);
  await auditService.log(req.user?.userId ?? null, 'delete_service_type', 'service_type', id, {}, req.ip);
  res.status(204).send();
}

export async function getClientDetail(req: Request, res: Response) {
  const { id } = req.params;
  const companyResult = await pool.query(
    'SELECT * FROM companies WHERE id = $1',
    [id]
  );
  if (!companyResult.rows[0]) {
    return res.status(404).json({ error: 'Company not found' });
  }
  const facilities = await pool.query(
    'SELECT * FROM facilities WHERE company_id = $1',
    [id]
  );
  const services = await pool.query(
    `SELECT s.*, reg.name as regulator_name, st.name as service_type_name, f.facility_name
     FROM services s
     LEFT JOIN regulators reg ON reg.id = s.regulator_id
     LEFT JOIN service_types st ON st.id = s.service_type_id
     LEFT JOIN facilities f ON f.id = s.facility_id
     WHERE s.company_id = $1
     ORDER BY s.created_at DESC`,
    [id]
  );
  res.json({
    ...companyResult.rows[0],
    facilities: facilities.rows,
    services: services.rows,
  });
}

export async function addFacility(req: Request, res: Response) {
  const { id } = req.params;
  const { facility_name, facility_address, lga, state, zone } = req.body;
  if (!facility_name?.trim() || !facility_address?.trim()) {
    return res.status(400).json({ error: 'Facility name and address are required' });
  }
  const companyResult = await pool.query(
    'SELECT id, lga, state, zone FROM companies WHERE id = $1',
    [id]
  );
  if (!companyResult.rows[0]) {
    return res.status(404).json({ error: 'Company not found' });
  }
  const company = companyResult.rows[0];
  const result = await pool.query(
    `INSERT INTO facilities (company_id, facility_name, facility_address, lga, state, zone)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, facility_name, facility_address`,
    [
      id,
      facility_name.trim(),
      facility_address.trim(),
      lga?.trim() || company.lga || company.state || 'Other',
      state?.trim() || company.state || 'Other',
      zone?.trim() || company.zone || 'South-West',
    ]
  );
  await auditService.log(
    req.user?.userId ?? null,
    'add_facility',
    'facility',
    result.rows[0].id,
    { facility_name: facility_name.trim() },
    req.ip
  );
  res.status(201).json(result.rows[0]);
}

export async function addService(req: Request, res: Response) {
  const {
    facility_id,
    company_id,
    service_type_id,
    regulator_id,
    service_description,
    service_code,
    validity_start,
    validity_end,
    status,
    documents_required,
  } = req.body;

  if (!facility_id || !company_id || !service_type_id || !regulator_id || !validity_end) {
    return res.status(400).json({ error: 'Missing required service fields' });
  }

  const result = await pool.query(
    `INSERT INTO services (facility_id, company_id, service_type_id, regulator_id, service_description, service_code, validity_start, validity_end, status, documents_required)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [
      facility_id,
      company_id,
      service_type_id,
      regulator_id,
      service_description || '',
      service_code || 'N/A',
      validity_start || new Date(),
      validity_end,
      status || 'draft',
      JSON.stringify(documents_required || []),
    ]
  );
  const serviceId = result.rows[0].id;
  await auditService.log(
    req.user?.userId ?? null,
    'add_service',
    'service',
    serviceId,
    { service_type_id, regulator_id, facility_id, status: status || 'draft' },
    req.ip
  );
  res.status(201).json({ id: serviceId });
}
