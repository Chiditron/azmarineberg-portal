import { Request, Response } from 'express';
import { pool } from '../db/pool.js';

export async function getUnreadCount(req: Request, res: Response) {
  const userId = req.user!.userId;
  const result = await pool.query(
    'SELECT COUNT(*)::int as count FROM notifications WHERE user_id = $1 AND read_at IS NULL',
    [userId]
  );
  res.json({ count: result.rows[0].count });
}

export async function listNotifications(req: Request, res: Response) {
  const userId = req.user!.userId;
  const result = await pool.query(
    `SELECT id, title, message, type, entity_type, entity_id, read_at, created_at
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [userId]
  );
  res.json(result.rows);
}

export async function markRead(req: Request, res: Response) {
  const { id } = req.params;
  const userId = req.user!.userId;
  await pool.query(
    'UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  res.json({ message: 'Marked as read' });
}

export async function markAllRead(req: Request, res: Response) {
  const userId = req.user!.userId;
  await pool.query(
    'UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL',
    [userId]
  );
  res.json({ message: 'All marked as read' });
}
