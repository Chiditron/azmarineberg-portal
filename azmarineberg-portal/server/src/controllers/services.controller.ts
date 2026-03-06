import { Request, Response } from 'express';
import { pool } from '../db/pool.js';
import * as auditService from '../services/audit.service.js';

const STATUS_ORDER = ['draft', 'site_visit', 'report_preparation', 'submission', 'approved'];

export async function getServiceDetail(req: Request, res: Response) {
  const { id } = req.params;
  const companyId = req.user!.companyId;
  const role = req.user!.role;

  const serviceResult = await pool.query(
    `SELECT s.*, reg.name as regulator_name, reg.code as regulator_code,
            st.name as service_type_name, st.code as service_type_code,
            f.facility_name, f.facility_address,
            GREATEST(0, (s.validity_end - CURRENT_DATE)::int) as days_to_expiry
     FROM services s
     LEFT JOIN regulators reg ON reg.id = s.regulator_id
     LEFT JOIN service_types st ON st.id = s.service_type_id
     LEFT JOIN facilities f ON f.id = s.facility_id
     WHERE s.id = $1`,
    [id]
  );
  if (!serviceResult.rows[0]) {
    return res.status(404).json({ error: 'Service not found' });
  }
  const svc = serviceResult.rows[0];
  if (role === 'client' && svc.company_id !== companyId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const historyResult = await pool.query(
    `SELECT ssh.status, ssh.notes, ssh.created_at, u.email as created_by_email
     FROM service_status_history ssh
     LEFT JOIN users u ON u.id = ssh.created_by
     WHERE ssh.service_id = $1
     ORDER BY ssh.created_at ASC`,
    [id]
  );

  const statusHistory = historyResult.rows;
  const currentStatus = svc.status;
  const timeline = STATUS_ORDER.map((s, idx) => {
    const entry = statusHistory.find((h) => h.status === s);
    const isCompleted = STATUS_ORDER.indexOf(currentStatus) >= idx;
    const isCurrent = currentStatus === s;
    return {
      status: s,
      label: s.replace(/_/g, ' '),
      completed: isCompleted,
      current: isCurrent,
      date: entry?.created_at,
      notes: entry?.notes,
    };
  });

  res.json({
    ...svc,
    regulator: { name: svc.regulator_name, code: svc.regulator_code },
    service_type: { name: svc.service_type_name, code: svc.service_type_code },
    facility: { facility_name: svc.facility_name, facility_address: svc.facility_address },
    timeline,
  });
}

export async function updateServiceStatus(req: Request, res: Response) {
  const { id } = req.params;
  const { status, notes } = req.body;
  const role = req.user!.role;

  if (!['admin', 'staff', 'super_admin'].includes(role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  if (!STATUS_ORDER.includes(status) && status !== 'closed') {
    return res.status(400).json({ error: 'Invalid status' });
  }

  await pool.query(
    'UPDATE services SET status = $1, updated_at = NOW() WHERE id = $2',
    [status, id]
  );
  await pool.query(
    `INSERT INTO service_status_history (service_id, status, notes, created_by)
     VALUES ($1, $2, $3, $4)`,
    [id, status, notes || null, req.user!.userId]
  );
  await auditService.log(req.user!.userId, 'update_service_status', 'service', id, { status, notes }, req.ip);

  const serviceRow = await pool.query(
    'SELECT s.company_id, s.service_code FROM services s WHERE s.id = $1',
    [id]
  );
  if (serviceRow.rows[0]) {
    const clientUsers = await pool.query(
      "SELECT id FROM users WHERE company_id = $1 AND role = 'client'",
      [serviceRow.rows[0].company_id]
    );
    const statusLabel = (status as string).replace(/_/g, ' ');
    const title = 'Service status updated';
    const message = `Service ${serviceRow.rows[0].service_code} is now: ${statusLabel}.`;
    for (const u of clientUsers.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id)
         VALUES ($1, $2, $3, 'status_change', 'service', $4)`,
        [u.id, title, message, id]
      );
    }
  }

  res.json({ message: 'Status updated' });
}
