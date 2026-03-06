import { Request, Response, NextFunction } from 'express';
import { pool } from '../db/pool.js';

export function auditLog(action: string, entityType: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    res.json = function (body: unknown) {
      if (req.user && res.statusCode < 400) {
        pool.query(
          `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, ip)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            req.user.userId,
            action,
            entityType,
            (req.params?.id as string) || null,
            req.ip || req.socket.remoteAddress,
          ]
        ).catch((err) => console.error('Audit log error:', err));
      }
      return originalJson(body);
    };
    next();
  };
}
