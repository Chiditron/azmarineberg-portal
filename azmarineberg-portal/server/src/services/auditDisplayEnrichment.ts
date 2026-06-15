import { pool } from '../db/pool.js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function asUuid(v: unknown): string | null {
  if (typeof v !== 'string' || !UUID_RE.test(v)) return null;
  return v.toLowerCase();
}

export type AuditLogRow = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  changes: Record<string, unknown> | null;
  ip: string | null;
  created_at: Date | string;
  actor_email: string | null;
};

export type EnrichedAuditLogRow = AuditLogRow & { entity_label: string | null };

function shortId(id: string): string {
  return `${id.slice(0, 8)}…`;
}

async function regulatorsById(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const r = await pool.query<{ id: string; name: string }>(
    'SELECT id::text, name FROM regulators WHERE id = ANY($1::uuid[])',
    [ids],
  );
  for (const row of r.rows) map.set(row.id, row.name);
  return map;
}

async function serviceTypesById(
  ids: string[],
): Promise<Map<string, { name: string; code: string }>> {
  const map = new Map<string, { name: string; code: string }>();
  if (ids.length === 0) return map;
  const r = await pool.query<{ id: string; name: string; code: string }>(
    'SELECT id::text, name, code FROM service_types WHERE id = ANY($1::uuid[])',
    [ids],
  );
  for (const row of r.rows) map.set(row.id, { name: row.name, code: row.code });
  return map;
}

async function facilitiesById(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const r = await pool.query<{ id: string; facility_name: string }>(
    'SELECT id::text, facility_name FROM facilities WHERE id = ANY($1::uuid[])',
    [ids],
  );
  for (const row of r.rows) map.set(row.id, row.facility_name);
  return map;
}

async function companiesById(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const r = await pool.query<{ id: string; company_name: string }>(
    'SELECT id::text, company_name FROM companies WHERE id = ANY($1::uuid[])',
    [ids],
  );
  for (const row of r.rows) map.set(row.id, row.company_name);
  return map;
}

async function servicesById(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const r = await pool.query<{
    id: string;
    service_code: string;
    type_name: string;
  }>(
    `SELECT s.id::text, s.service_code, st.name AS type_name
     FROM services s
     JOIN service_types st ON st.id = s.service_type_id
     WHERE s.id = ANY($1::uuid[])`,
    [ids],
  );
  for (const row of r.rows) {
    const label = `${row.service_code} – ${row.type_name}`;
    map.set(row.id, label);
  }
  return map;
}

async function usersById(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const r = await pool.query<{ id: string; email: string }>(
    'SELECT id::text, email FROM users WHERE id = ANY($1::uuid[])',
    [ids],
  );
  for (const row of r.rows) map.set(row.id, row.email);
  return map;
}

async function documentsById(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const r = await pool.query<{ id: string; file_name: string }>(
    'SELECT id::text, file_name FROM documents WHERE id = ANY($1::uuid[])',
    [ids],
  );
  for (const row of r.rows) map.set(row.id, row.file_name);
  return map;
}

async function industrySectorsById(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const r = await pool.query<{ id: string; name: string }>(
    'SELECT id::text, name FROM industry_sectors WHERE id = ANY($1::uuid[])',
    [ids],
  );
  for (const row of r.rows) map.set(row.id, row.name);
  return map;
}

function enrichChanges(
  changes: Record<string, unknown> | null,
  regulators: Map<string, string>,
  serviceTypes: Map<string, { name: string; code: string }>,
  facilities: Map<string, string>,
  companies: Map<string, string>,
  services: Map<string, string>,
): Record<string, unknown> | null {
  if (!changes || typeof changes !== 'object' || Array.isArray(changes)) return changes;
  const out: Record<string, unknown> = { ...changes };

  const rid = asUuid(out.regulator_id);
  if (rid) {
    out.regulator_name = regulators.get(rid) ?? 'Unknown (deleted)';
  }

  const stid = asUuid(out.service_type_id);
  if (stid) {
    const st = serviceTypes.get(stid);
    out.service_type_name = st
      ? `${st.name} (${st.code})`
      : 'Unknown (deleted)';
  }

  const fid = asUuid(out.facility_id);
  if (fid) {
    out.facility_name = facilities.get(fid) ?? 'Unknown (deleted)';
  }

  const cid = asUuid(out.company_id);
  if (cid) {
    out.company_name = companies.get(cid) ?? 'Unknown (deleted)';
  }

  const svcId = asUuid(out.service_id);
  if (svcId) {
    out.service_label = services.get(svcId) ?? 'Unknown (deleted)';
  }

  return out;
}

function resolveEntityLabel(
  entityType: string,
  entityId: string | null,
  regulators: Map<string, string>,
  serviceTypes: Map<string, { name: string; code: string }>,
  facilities: Map<string, string>,
  companies: Map<string, string>,
  services: Map<string, string>,
  users: Map<string, string>,
  documents: Map<string, string>,
  sectors: Map<string, string>,
): string | null {
  const id = asUuid(entityId);
  if (!id) return null;

  switch (entityType) {
    case 'regulator':
      return regulators.get(id) ?? `Unknown (deleted) · ${shortId(id)}`;
    case 'service_type': {
      const st = serviceTypes.get(id);
      return st ? `${st.name} (${st.code})` : `Unknown (deleted) · ${shortId(id)}`;
    }
    case 'facility':
      return facilities.get(id) ?? `Unknown (deleted) · ${shortId(id)}`;
    case 'company':
      return companies.get(id) ?? `Unknown (deleted) · ${shortId(id)}`;
    case 'service':
      return services.get(id) ?? `Unknown (deleted) · ${shortId(id)}`;
    case 'user':
      return users.get(id) ?? `Unknown (deleted) · ${shortId(id)}`;
    case 'document':
      return documents.get(id) ?? `Unknown (deleted) · ${shortId(id)}`;
    case 'industry_sector':
      return sectors.get(id) ?? `Unknown (deleted) · ${shortId(id)}`;
    default:
      return shortId(id);
  }
}

function uniq(ids: Iterable<string>): string[] {
  return [...new Set(ids)];
}

export async function enrichAuditLogRows(
  rows: AuditLogRow[],
): Promise<EnrichedAuditLogRow[]> {
  const regulatorIds = new Set<string>();
  const serviceTypeIds = new Set<string>();
  const facilityIds = new Set<string>();
  const companyIds = new Set<string>();
  const serviceIds = new Set<string>();
  const userIds = new Set<string>();
  const documentIds = new Set<string>();
  const sectorIds = new Set<string>();

  const entityByType: Record<string, Set<string>> = {};

  for (const row of rows) {
    const eid = asUuid(row.entity_id);
    if (eid) {
      const t = row.entity_type;
      if (!entityByType[t]) entityByType[t] = new Set();
      entityByType[t].add(eid);
    }

    const c = row.changes;
    if (!c || typeof c !== 'object' || Array.isArray(c)) continue;
    const r = asUuid(c.regulator_id);
    if (r) regulatorIds.add(r);
    const st = asUuid(c.service_type_id);
    if (st) serviceTypeIds.add(st);
    const f = asUuid(c.facility_id);
    if (f) facilityIds.add(f);
    const co = asUuid(c.company_id);
    if (co) companyIds.add(co);
    const sv = asUuid(c.service_id);
    if (sv) serviceIds.add(sv);
  }

  for (const [t, set] of Object.entries(entityByType)) {
    for (const id of set) {
      switch (t) {
        case 'regulator':
          regulatorIds.add(id);
          break;
        case 'service_type':
          serviceTypeIds.add(id);
          break;
        case 'facility':
          facilityIds.add(id);
          break;
        case 'company':
          companyIds.add(id);
          break;
        case 'service':
          serviceIds.add(id);
          break;
        case 'user':
          userIds.add(id);
          break;
        case 'document':
          documentIds.add(id);
          break;
        case 'industry_sector':
          sectorIds.add(id);
          break;
        default:
          break;
      }
    }
  }

  const [
    regulators,
    serviceTypes,
    facilities,
    companies,
    services,
    users,
    documents,
    sectors,
  ] = await Promise.all([
    regulatorsById(uniq(regulatorIds)),
    serviceTypesById(uniq(serviceTypeIds)),
    facilitiesById(uniq(facilityIds)),
    companiesById(uniq(companyIds)),
    servicesById(uniq(serviceIds)),
    usersById(uniq(userIds)),
    documentsById(uniq(documentIds)),
    industrySectorsById(uniq(sectorIds)),
  ]);

  return rows.map((row) => {
    const changes = enrichChanges(
      row.changes,
      regulators,
      serviceTypes,
      facilities,
      companies,
      services,
    );
    const entity_label = resolveEntityLabel(
      row.entity_type,
      row.entity_id,
      regulators,
      serviceTypes,
      facilities,
      companies,
      services,
      users,
      documents,
      sectors,
    );
    return { ...row, changes, entity_label };
  });
}
