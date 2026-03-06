import { pool } from '../db/pool.js';

export async function log(
  actorId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  changes?: Record<string, unknown>,
  ip?: string
) {
  await pool.query(
    `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, changes, ip)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [actorId, action, entityType, entityId, changes ? JSON.stringify(changes) : null, ip]
  );
}
