import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { UserRole } from '../shared-types.js';

export interface AuthPayload {
  userId: string;
  email: string;
  role: UserRole;
  companyId: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) throw new Error('JWT_ACCESS_SECRET not configured');
    const decoded = jwt.verify(token, secret) as AuthPayload;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  return requireRoles('super_admin')(req, res, next);
}

export function requireAdminOrAbove(req: Request, res: Response, next: NextFunction) {
  return requireRoles('super_admin', 'admin')(req, res, next);
}

export function requireStaffOrAbove(req: Request, res: Response, next: NextFunction) {
  return requireRoles('super_admin', 'admin', 'staff')(req, res, next);
}

export function requireClient(req: Request, res: Response, next: NextFunction) {
  return requireRoles('client')(req, res, next);
}
