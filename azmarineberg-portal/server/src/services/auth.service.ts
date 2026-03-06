import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db/pool.js';
import type { AuthPayload, UserRole } from '../../shared/types.js';

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateAccessToken(payload: AuthPayload): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  const expiry = process.env.JWT_ACCESS_EXPIRY || '15m';
  if (!secret) throw new Error('JWT_ACCESS_SECRET not configured');
  return jwt.sign(payload, secret, { expiresIn: expiry });
}

export function generateRefreshToken(payload: AuthPayload): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  const expiry = process.env.JWT_REFRESH_EXPIRY || '7d';
  if (!secret) throw new Error('JWT_REFRESH_SECRET not configured');
  return jwt.sign(payload, secret, { expiresIn: expiry });
}

export function verifyAccessToken(token: string): AuthPayload {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('JWT_ACCESS_SECRET not configured');
  return jwt.verify(token, secret) as AuthPayload;
}

export function verifyRefreshToken(token: string): AuthPayload {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET not configured');
  return jwt.verify(token, secret) as AuthPayload;
}

export async function createUser(
  email: string,
  password: string,
  role: UserRole,
  companyId?: string | null,
  options?: { firstName?: string | null; lastName?: string | null; phone?: string | null }
): Promise<{ id: string }> {
  const hash = await hashPassword(password);
  const result = await pool.query(
    `INSERT INTO users (email, password_hash, role, company_id, first_name, last_name, phone)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      email,
      hash,
      role,
      companyId ?? null,
      options?.firstName ?? null,
      options?.lastName ?? null,
      options?.phone ?? null,
    ]
  );
  return { id: result.rows[0].id };
}

export async function findUserByEmail(email: string) {
  const result = await pool.query(
    `SELECT id, email, password_hash, role, company_id, must_change_password, first_name, last_name
     FROM users WHERE email = $1`,
    [email.toLowerCase()]
  );
  return result.rows[0] || null;
}

export async function findUserById(id: string) {
  const result = await pool.query(
    `SELECT id, email, role, company_id, first_name, last_name FROM users WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function getCompanyName(companyId: string | null): Promise<string | null> {
  if (!companyId) return null;
  const result = await pool.query('SELECT company_name FROM companies WHERE id = $1', [companyId]);
  return result.rows[0]?.company_name ?? null;
}

export async function createInviteToken(companyId: string, userId: string): Promise<string> {
  const token = uuidv4();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await pool.query(
    `INSERT INTO invite_tokens (company_id, user_id, token, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [companyId, userId, token, expiresAt]
  );
  return token;
}

export async function validateInviteToken(token: string) {
  const result = await pool.query(
    `SELECT it.id, it.company_id, it.user_id, u.email
     FROM invite_tokens it
     JOIN users u ON u.id = it.user_id
     WHERE it.token = $1 AND it.expires_at > NOW() AND it.used_at IS NULL`,
    [token]
  );
  return result.rows[0] || null;
}

export async function markInviteTokenUsed(token: string) {
  await pool.query(
    `UPDATE invite_tokens SET used_at = NOW() WHERE token = $1`,
    [token]
  );
}

export async function setPassword(userId: string, password: string) {
  const hash = await hashPassword(password);
  await pool.query(
    `UPDATE users SET password_hash = $1, must_change_password = false, updated_at = NOW()
     WHERE id = $2`,
    [hash, userId]
  );
}
