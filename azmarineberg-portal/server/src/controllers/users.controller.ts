import { Request, Response } from 'express';
import { pool } from '../db/pool.js';
import * as authService from '../services/auth.service.js';
import * as auditService from '../services/audit.service.js';

const ROLES = ['super_admin', 'admin', 'staff'];

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'Password must contain at least one special character';
  return null;
}

export async function listUsers(req: Request, res: Response) {
  const { role } = req.query;
  let query = `
    SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.role, u.created_at
    FROM users u
    WHERE u.role != 'client'
  `;
  const params: (string | number)[] = [];
  let idx = 1;
  if (role && typeof role === 'string' && ROLES.includes(role)) {
    query += ` AND u.role = $${idx}`;
    params.push(role);
    idx++;
  }
  query += ' ORDER BY u.created_at DESC';
  const result = await pool.query(query, params);
  res.json(result.rows);
}

export async function createUser(req: Request, res: Response) {
  const { email, password, role, first_name, last_name, phone } = req.body;
  if (!email?.trim()) {
    return res.status(400).json({ error: 'Email is required' });
  }
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }
  if (!role || !ROLES.includes(role)) {
    return res.status(400).json({ error: 'Valid role is required (super_admin, admin, staff)' });
  }
  const pwdErr = validatePassword(password);
  if (pwdErr) {
    return res.status(400).json({ error: pwdErr });
  }
  try {
    const created = await authService.createUser(
      email.trim().toLowerCase(),
      password,
      role,
      null,
      { firstName: first_name ?? null, lastName: last_name ?? null, phone: phone ?? null }
    );
    await auditService.log(
      req.user?.userId ?? null,
      'create_user',
      'user',
      created.id,
      { email: email.trim(), role },
      req.ip
    );
    const row = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.role, u.created_at
       FROM users u WHERE u.id = $1`,
      [created.id]
    );
    res.status(201).json(row.rows[0]);
  } catch (err: unknown) {
    const pgErr = err as { code?: string; constraint?: string };
    if (pgErr?.code === '23505' && pgErr?.constraint?.includes('email')) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }
    throw err;
  }
}

export async function updateUser(req: Request, res: Response) {
  const { id } = req.params;
  const { role, first_name, last_name, phone } = req.body;
  const check = await pool.query('SELECT id, role, first_name, last_name, phone FROM users WHERE id = $1', [id]);
  if (!check.rows[0]) {
    return res.status(404).json({ error: 'User not found' });
  }
  const current = check.rows[0];
  let newRole = current.role;
  const newFirstName = first_name !== undefined ? first_name : current.first_name;
  const newLastName = last_name !== undefined ? last_name : current.last_name;
  const newPhone = phone !== undefined ? phone : current.phone;

  if (role !== undefined) {
    if (!ROLES.includes(role)) {
      return res.status(400).json({ error: 'Valid role is required (super_admin, admin, staff)' });
    }
    newRole = role;
  }

  await pool.query(
    'UPDATE users SET role = $1, first_name = $2, last_name = $3, phone = $4, updated_at = NOW() WHERE id = $5',
    [newRole, newFirstName, newLastName, newPhone, id]
  );
  await auditService.log(req.user?.userId ?? null, 'update_user', 'user', id, { role: newRole, first_name, last_name, phone }, req.ip);
  const row = await pool.query(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.role, u.created_at
     FROM users u WHERE u.id = $1`,
    [id]
  );
  res.json(row.rows[0]);
}
