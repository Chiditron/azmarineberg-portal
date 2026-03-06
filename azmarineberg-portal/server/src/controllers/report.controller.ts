import { Request, Response } from 'express';
import { pool } from '../db/pool.js';
import * as XLSX from 'xlsx';
import PDFDocument from 'pdfkit';

const EXPORT_MAX_ROWS = 10_000;

export interface ReportRow {
  facility: string;
  address: string;
  sector: string;
  service: string;
  regulator: string;
  status: string;
}

function buildReportWhere(
  params: (string | number)[],
  facilityId?: string,
  sectorId?: string,
  serviceTypeId?: string,
  regulatorId?: string,
  status?: string
): { conditions: string[]; nextIndex: number } {
  const conditions: string[] = [];
  let i = params.length;
  if (facilityId) {
    conditions.push(`s.facility_id = $${++i}`);
    params.push(facilityId);
  }
  if (sectorId) {
    conditions.push(`c.industry_sector_id = $${++i}`);
    params.push(sectorId);
  }
  if (serviceTypeId) {
    conditions.push(`s.service_type_id = $${++i}`);
    params.push(serviceTypeId);
  }
  if (regulatorId) {
    conditions.push(`s.regulator_id = $${++i}`);
    params.push(regulatorId);
  }
  if (status) {
    conditions.push(`s.status = $${++i}`);
    params.push(status);
  }
  return { conditions, nextIndex: i };
}

const REPORT_SELECT = `
  SELECT
    f.facility_name AS facility,
    f.facility_address AS address,
    COALESCE(ins.name, c.industry_sector) AS sector,
    st.name AS service,
    reg.name AS regulator,
    s.status
  FROM services s
  JOIN facilities f ON f.id = s.facility_id
  JOIN companies c ON c.id = s.company_id
  LEFT JOIN industry_sectors ins ON ins.id = c.industry_sector_id
  JOIN service_types st ON st.id = s.service_type_id
  JOIN regulators reg ON reg.id = s.regulator_id
`;

export async function listReport(req: Request, res: Response) {
  const {
    facility_id: facilityId,
    sector: sectorId,
    service_type_id: serviceTypeId,
    regulator_id: regulatorId,
    status,
    limit = '25',
    offset = '0',
  } = req.query;

  const params: (string | number)[] = [];
  const { conditions, nextIndex } = buildReportWhere(
    params,
    typeof facilityId === 'string' ? facilityId : undefined,
    typeof sectorId === 'string' ? sectorId : undefined,
    typeof serviceTypeId === 'string' ? serviceTypeId : undefined,
    typeof regulatorId === 'string' ? regulatorId : undefined,
    typeof status === 'string' ? status : undefined
  );

  const whereClause = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
  const orderLimitOffset = ' ORDER BY f.facility_name, st.name';

  const limitVal = Math.min(Math.max(1, parseInt(limit as string) || 25), 100);
  const offsetVal = Math.max(0, parseInt(offset as string) || 0);
  params.push(limitVal, offsetVal);

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM services s
     JOIN facilities f ON f.id = s.facility_id
     JOIN companies c ON c.id = s.company_id
     LEFT JOIN industry_sectors ins ON ins.id = c.industry_sector_id
     JOIN service_types st ON st.id = s.service_type_id
     JOIN regulators reg ON reg.id = s.regulator_id${whereClause}`,
    params.slice(0, nextIndex)
  );
  const total = countResult.rows[0]?.total ?? 0;

  const dataResult = await pool.query(
    REPORT_SELECT + whereClause + orderLimitOffset + ` LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  res.json({ rows: dataResult.rows as ReportRow[], total });
}

export async function exportReport(req: Request, res: Response) {
  const {
    format,
    facility_id: facilityId,
    sector: sectorId,
    service_type_id: serviceTypeId,
    regulator_id: regulatorId,
    status,
  } = req.query;

  const fmt = typeof format === 'string' ? format.toLowerCase() : '';
  if (!['csv', 'excel', 'pdf'].includes(fmt)) {
    return res.status(400).json({ error: 'Invalid format. Use csv, excel, or pdf.' });
  }

  const params: (string | number)[] = [];
  const { conditions, nextIndex } = buildReportWhere(
    params,
    typeof facilityId === 'string' ? facilityId : undefined,
    typeof sectorId === 'string' ? sectorId : undefined,
    typeof serviceTypeId === 'string' ? serviceTypeId : undefined,
    typeof regulatorId === 'string' ? regulatorId : undefined,
    typeof status === 'string' ? status : undefined
  );

  const whereClause = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
  params.push(EXPORT_MAX_ROWS);

  const result = await pool.query(
    REPORT_SELECT + whereClause + ' ORDER BY f.facility_name, st.name LIMIT $' + params.length,
    params
  );
  const rows = result.rows as ReportRow[];

  const dateStr = new Date().toISOString().slice(0, 10);

  if (fmt === 'csv') {
    const header = 'Facility,Address,Sector,Service,Regulator,Status';
    const escape = (v: string) => {
      const s = String(v ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [header, ...rows.map((r) => [r.facility, r.address, r.sector, r.service, r.regulator, r.status].map(escape).join(','))];
    const csv = lines.join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="report-${dateStr}.csv"`);
    return res.send(Buffer.from('\uFEFF' + csv, 'utf-8'));
  }

  if (fmt === 'excel') {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows.map((r) => ({
      Facility: r.facility,
      Address: r.address,
      Sector: r.sector,
      Service: r.service,
      Regulator: r.regulator,
      Status: r.status,
    })));
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="report-${dateStr}.xlsx"`);
    return res.send(buf);
  }

  if (fmt === 'pdf') {
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report-${dateStr}.pdf"`);
    doc.pipe(res);

    const cols = ['Facility', 'Address', 'Sector', 'Service', 'Regulator', 'Status'];
    const colWidths = [80, 120, 70, 100, 70, 60];
    const rowHeight = 22;
    const startY = 50;

    doc.fontSize(10).font('Helvetica-Bold');
    let y = startY;
    let x = 50;
    cols.forEach((col, i) => {
      doc.text(col, x, y, { width: colWidths[i], align: 'left' });
      x += colWidths[i];
    });
    y += rowHeight;
    doc.moveTo(50, y).lineTo(50 + colWidths.reduce((a, b) => a + b, 0), y).stroke();
    doc.font('Helvetica').fontSize(9);

    for (const r of rows) {
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
      const cells = [r.facility, r.address, r.sector, r.service, r.regulator, r.status];
      x = 50;
      cells.forEach((cell, i) => {
        const text = String(cell ?? '').slice(0, 40);
        doc.text(text, x, y, { width: colWidths[i], align: 'left', ellipsis: true });
        x += colWidths[i];
      });
      y += rowHeight;
    }

    doc.end();
    return;
  }

  res.status(400).json({ error: 'Invalid format' });
}
