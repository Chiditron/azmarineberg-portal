import { Request, Response } from 'express';
import { pool } from '../db/pool.js';
import * as auditService from '../services/audit.service.js';
import { computeValidityEndDate } from '../utils/serviceValidity.js';
import {
  getServiceStatusByCode,
  getServiceStatusLabel,
  getServiceStatusLabelsMap,
} from '../services/serviceStatuses.service.js';

export async function getServiceDetail(req: Request, res: Response) {
  const { id } = req.params;
  const companyId = req.user!.companyId;
  const role = req.user!.role;

  const serviceResult = await pool.query(
    `SELECT s.*, reg.name as regulator_name, reg.code as regulator_code,
            st.name as service_type_name, st.code as service_type_code,
            f.facility_name, f.facility_address,
            ss.label as status_label,
            ss.requires_approval_effective_date as status_requires_approval_effective_date,
            ss.is_terminal as status_is_terminal,
            CASE WHEN s.validity_end IS NULL THEN NULL
                 ELSE GREATEST(0, (s.validity_end::date - CURRENT_DATE)::int) END as days_to_expiry
     FROM services s
     LEFT JOIN regulators reg ON reg.id = s.regulator_id
     LEFT JOIN service_types st ON st.id = s.service_type_id
     LEFT JOIN facilities f ON f.id = s.facility_id
     LEFT JOIN service_statuses ss ON ss.code = s.status
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
    `SELECT ssh.status, ssh.status_date, ssh.notes, ssh.created_at, u.email as created_by_email
     FROM service_status_history ssh
     LEFT JOIN users u ON u.id = ssh.created_by
     WHERE ssh.service_id = $1
     ORDER BY ssh.status_date ASC, ssh.created_at ASC`,
    [id]
  );

  const labelsMap = await getServiceStatusLabelsMap();
  const statusHistory = historyResult.rows as Array<{
    status: string;
    status_date: string;
    created_at: string;
    notes?: string | null;
  }>;
  const timeline = statusHistory.map((h, i) => ({
    status: h.status,
    label: labelsMap.get(h.status) ?? h.status.replace(/_/g, ' '),
    completed: true,
    current: i === statusHistory.length - 1,
    date: h.status_date,
    notes: h.notes ?? undefined,
  }));

  res.json({
    ...svc,
    regulator: { name: svc.regulator_name, code: svc.regulator_code },
    service_type: { name: svc.service_type_name, code: svc.service_type_code },
    facility: { facility_name: svc.facility_name, facility_address: svc.facility_address },
    status_meta: {
      label: svc.status_label ?? svc.status,
      requires_approval_effective_date: Boolean(
        svc.status_requires_approval_effective_date
      ),
      is_terminal: Boolean(svc.status_is_terminal),
    },
    timeline,
  });
}

export async function updateServiceStatus(req: Request, res: Response) {
  const { id } = req.params;
  const { status, notes, approval_effective_date, status_date } = req.body as {
    status?: string;
    notes?: string;
    approval_effective_date?: string;
    status_date?: string;
  };
  const role = req.user!.role;

  if (!['admin', 'staff', 'super_admin'].includes(role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  if (!status || typeof status !== 'string') {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const targetStatus = await getServiceStatusByCode(status);
  if (!targetStatus || !targetStatus.is_active) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const statusDate =
    typeof status_date === 'string' ? status_date.slice(0, 10) : '';
  if (!statusDate || !/^\d{4}-\d{2}-\d{2}$/.test(statusDate)) {
    return res.status(400).json({
      error: 'status_date (YYYY-MM-DD) is required for status timeline',
    });
  }

  const cur = await pool.query(
    `SELECT s.status, s.validity_end, s.validity_count, s.validity_unit,
            ss.is_terminal AS current_is_terminal, ss.label AS current_status_label
     FROM services s
     LEFT JOIN service_statuses ss ON ss.code = s.status
     WHERE s.id = $1`,
    [id]
  );
  if (!cur.rows[0]) {
    return res.status(404).json({ error: 'Service not found' });
  }
  const snap = cur.rows[0];
  if (snap.current_is_terminal) {
    return res.status(400).json({
      error: `This service is in ${snap.current_status_label ?? snap.status} and can no longer be updated.`,
    });
  }

  if (targetStatus.requires_approval_effective_date) {
    const eff =
      typeof approval_effective_date === 'string'
        ? approval_effective_date.slice(0, 10)
        : '';
    if (!eff || !/^\d{4}-\d{2}-\d{2}$/.test(eff)) {
      return res.status(400).json({
        error:
          'approval_effective_date (YYYY-MM-DD) is required when setting this status',
      });
    }

    // Only calculate validity when missing; do not override existing expiry.
    if (snap.validity_end == null) {
      if (snap.validity_count == null || snap.validity_unit == null) {
        return res.status(400).json({
          error:
            'This service has no validity duration snapshot; contact support or recreate the service.',
        });
      }
      const endDate = await computeValidityEndDate(
        eff,
        Number(snap.validity_count),
        String(snap.validity_unit),
      );
      await pool.query(
        `UPDATE services SET status = $1, validity_start = $2::date, validity_end = $3::date, updated_at = NOW() WHERE id = $4`,
        [status, eff, endDate, id]
      );
    } else {
      await pool.query(
        'UPDATE services SET status = $1, updated_at = NOW() WHERE id = $2',
        [status, id]
      );
    }
  } else {
    await pool.query(
      'UPDATE services SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, id]
    );
  }

  await pool.query(
    `INSERT INTO service_status_history (service_id, status, status_date, notes, created_by)
     VALUES ($1, $2, $3::date, $4, $5)`,
    [id, status, statusDate, notes || null, req.user!.userId]
  );
  await auditService.log(req.user!.userId, 'update_service_status', 'service', id, {
    status,
    notes,
    ...(targetStatus.requires_approval_effective_date && approval_effective_date
      ? { approval_effective_date: String(approval_effective_date).slice(0, 10) }
      : {}),
  }, req.ip);

  const serviceRow = await pool.query(
    'SELECT s.company_id, s.service_code FROM services s WHERE s.id = $1',
    [id]
  );
  if (serviceRow.rows[0]) {
    const clientUsers = await pool.query(
      "SELECT id FROM users WHERE company_id = $1 AND role = 'client'",
      [serviceRow.rows[0].company_id]
    );
    const statusLabel = await getServiceStatusLabel(status);
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
