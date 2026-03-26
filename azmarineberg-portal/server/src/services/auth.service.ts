import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';
import type { AuthPayload } from '../middleware/auth.js';
import type { UserRole } from '../shared-types.js';

const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD_RESET_TTL_MINUTES = 20;
const DEFAULT_INVITE_TOKEN_TTL_HOURS = 48;

export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[a-z]/.test(password)) return 'Password must include at least one lowercase letter.';
  if (!/[A-Z]/.test(password)) return 'Password must include at least one uppercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must include at least one number.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must include at least one special character.';
  return null;
}

function getPasswordResetTtlMinutes(): number {
  const raw = parseInt(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES || '', 10);
  if (Number.isNaN(raw)) return DEFAULT_PASSWORD_RESET_TTL_MINUTES;
  return Math.min(Math.max(raw, 15), 30);
}

function getInviteTokenTtlHours(): number {
  const raw = parseInt(process.env.INVITE_TOKEN_TTL_HOURS || '', 10);
  if (Number.isNaN(raw)) return DEFAULT_INVITE_TOKEN_TTL_HOURS;
  return Math.min(Math.max(raw, 24), 48);
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

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
  return jwt.sign(payload, secret, { expiresIn: expiry } as jwt.SignOptions);
}

export function generateRefreshToken(payload: AuthPayload): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  const expiry = process.env.JWT_REFRESH_EXPIRY || '7d';
  if (!secret) throw new Error('JWT_REFRESH_SECRET not configured');
  return jwt.sign(payload, secret, { expiresIn: expiry } as jwt.SignOptions);
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

export async function createInviteToken(companyId: string, userId: string): Promise<{ token: string; expiresAt: Date; hoursValid: number }> {
  const hoursValid = getInviteTokenTtlHours();
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + hoursValid * 60 * 60 * 1000);
  await pool.query(
    `INSERT INTO invite_tokens (company_id, user_id, token, token_hash, expires_at)
     VALUES ($1, $2, NULL, $3, $4)`,
    [companyId, userId, tokenHash, expiresAt]
  );
  return { token, expiresAt, hoursValid };
}

export async function validateInviteToken(token: string) {
  const tokenHash = sha256(token);
  const result = await pool.query(
    `SELECT it.id, it.company_id, it.user_id, u.email
     FROM invite_tokens it
     JOIN users u ON u.id = it.user_id
     WHERE (
         (it.token_hash IS NOT NULL AND it.token_hash = $1)
         OR (it.token IS NOT NULL AND it.token = $2)
       )
       AND it.expires_at > NOW()
       AND it.used_at IS NULL`,
    [tokenHash, token]
  );
  return result.rows[0] || null;
}

export async function markInviteTokenUsedById(inviteTokenId: string) {
  await pool.query(
    `UPDATE invite_tokens SET used_at = NOW() WHERE id = $1`,
    [inviteTokenId]
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

export async function createPasswordResetToken(userId: string): Promise<{ token: string; expiresAt: Date; minutesValid: number }> {
  const minutesValid = getPasswordResetTtlMinutes();
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + minutesValid * 60 * 1000);
  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );
  return { token, expiresAt, minutesValid };
}

export async function getValidPasswordResetToken(token: string): Promise<{ id: string; user_id: string } | null> {
  const tokenHash = sha256(token);
  const result = await pool.query(
    `SELECT id, user_id
     FROM password_reset_tokens
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
     LIMIT 1`,
    [tokenHash]
  );
  return result.rows[0] || null;
}

export async function consumePasswordResetToken(tokenRowId: string, userId: string): Promise<void> {
  await pool.query(
    `UPDATE password_reset_tokens
     SET used_at = NOW()
     WHERE id = $1`,
    [tokenRowId]
  );
  await pool.query(
    `UPDATE password_reset_tokens
     SET used_at = COALESCE(used_at, NOW())
     WHERE user_id = $1 AND used_at IS NULL`,
    [userId]
  );
}
