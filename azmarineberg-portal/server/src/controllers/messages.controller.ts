import { Request, Response } from 'express';
import { pool } from '../db/pool.js';

function displayName(row: { first_name?: string | null; last_name?: string | null; email?: string; company_name?: string | null }) {
  const first = row?.first_name ?? '';
  const last = row?.last_name ?? '';
  const name = [first, last].filter(Boolean).join(' ').trim();
  return name || row?.company_name || row?.email || '';
}

export async function listMessages(req: Request, res: Response) {
  const userId = req.user!.userId;
  const folder = (req.query.folder as string) || 'inbox';
  const limit = Math.min(parseInt(String(req.query.limit || 50), 10) || 50, 100);
  const offset = parseInt(String(req.query.offset || 0), 10) || 0;

  if (folder !== 'inbox' && folder !== 'sent') {
    return res.status(400).json({ error: 'Invalid folder. Use inbox or sent.' });
  }

  if (folder === 'inbox') {
    const result = await pool.query(
      `SELECT m.id, m.subject, m.body, m.read_at, m.created_at, m.parent_id,
              u.id as sender_id, u.email as sender_email, u.first_name as sender_first_name, u.last_name as sender_last_name,
              c.company_name as sender_company_name
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       LEFT JOIN companies c ON c.id = u.company_id
       WHERE m.recipient_id = $1
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    const rows = result.rows.map((r) => ({
      id: r.id,
      subject: r.subject,
      body: r.body,
      readAt: r.read_at,
      createdAt: r.created_at,
      parentId: r.parent_id,
      senderId: r.sender_id,
      senderDisplay: displayName({
        first_name: r.sender_first_name,
        last_name: r.sender_last_name,
        email: r.sender_email,
        company_name: r.sender_company_name,
      }),
    }));
    const countResult = await pool.query(
      'SELECT COUNT(*)::int FROM messages WHERE recipient_id = $1',
      [userId]
    );
    return res.json({ rows, total: countResult.rows[0].count });
  }

  const result = await pool.query(
    `SELECT m.id, m.subject, m.body, m.read_at, m.created_at, m.parent_id,
            u.id as recipient_id, u.email as recipient_email, u.first_name as recipient_first_name, u.last_name as recipient_last_name,
            c.company_name as recipient_company_name
     FROM messages m
     JOIN users u ON u.id = m.recipient_id
     LEFT JOIN companies c ON c.id = u.company_id
     WHERE m.sender_id = $1
     ORDER BY m.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  const rows = result.rows.map((r) => ({
    id: r.id,
    subject: r.subject,
    body: r.body,
    readAt: r.read_at,
    createdAt: r.created_at,
    parentId: r.parent_id,
    recipientId: r.recipient_id,
    recipientDisplay: displayName({
      first_name: r.recipient_first_name,
      last_name: r.recipient_last_name,
      email: r.recipient_email,
      company_name: r.recipient_company_name,
    }),
  }));
  const countResult = await pool.query(
    'SELECT COUNT(*)::int FROM messages WHERE sender_id = $1',
    [userId]
  );
  return res.json({ rows, total: countResult.rows[0].count });
}

export async function getMessage(req: Request, res: Response) {
  const { id } = req.params;
  const userId = req.user!.userId;

  const msg = await pool.query(
    `SELECT m.id, m.sender_id, m.recipient_id, m.subject, m.body, m.parent_id, m.read_at, m.created_at,
            su.email as sender_email, su.first_name as sender_first_name, su.last_name as sender_last_name, sc.company_name as sender_company_name,
            ru.email as recipient_email, ru.first_name as recipient_first_name, ru.last_name as recipient_last_name, rc.company_name as recipient_company_name
     FROM messages m
     LEFT JOIN users su ON su.id = m.sender_id
     LEFT JOIN companies sc ON sc.id = su.company_id
     LEFT JOIN users ru ON ru.id = m.recipient_id
     LEFT JOIN companies rc ON rc.id = ru.company_id
     WHERE m.id = $1`,
    [id]
  );
  if (!msg.rows[0]) {
    return res.status(404).json({ error: 'Message not found' });
  }
  const m = msg.rows[0];
  if (m.sender_id !== userId && m.recipient_id !== userId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const rootId = m.parent_id
    ? (await resolveRootId(m.parent_id)) || id
    : id;
  const threadResult = await pool.query(
    `WITH RECURSIVE thread_msgs AS (
       SELECT m.id FROM messages m WHERE m.id = $1
       UNION ALL
       SELECT m.id FROM messages m
       INNER JOIN thread_msgs t ON m.parent_id = t.id
     )
     SELECT m.id, m.sender_id, m.recipient_id, m.subject, m.body, m.parent_id, m.read_at, m.created_at,
            su.email as sender_email, su.first_name as sender_first_name, su.last_name as sender_last_name, sc.company_name as sender_company_name,
            ru.email as recipient_email, ru.first_name as recipient_first_name, ru.last_name as recipient_last_name, rc.company_name as recipient_company_name
     FROM thread_msgs tm
     JOIN messages m ON m.id = tm.id
     LEFT JOIN users su ON su.id = m.sender_id
     LEFT JOIN companies sc ON sc.id = su.company_id
     LEFT JOIN users ru ON ru.id = m.recipient_id
     LEFT JOIN companies rc ON rc.id = ru.company_id
     ORDER BY m.created_at ASC`,
    [rootId]
  );

  const thread = threadResult.rows.map((r) => ({
    id: r.id,
    senderId: r.sender_id,
    recipientId: r.recipient_id,
    subject: r.subject,
    body: r.body,
    parentId: r.parent_id,
    readAt: r.read_at,
    createdAt: r.created_at,
    senderDisplay: displayName({
      first_name: r.sender_first_name,
      last_name: r.sender_last_name,
      email: r.sender_email,
      company_name: r.sender_company_name,
    }),
    recipientDisplay: displayName({
      first_name: r.recipient_first_name,
      last_name: r.recipient_last_name,
      email: r.recipient_email,
      company_name: r.recipient_company_name,
    }),
  }));

  return res.json({ message: thread[0], thread });
}

async function resolveRootId(parentId: string): Promise<string | null> {
  const r = await pool.query('SELECT id, parent_id FROM messages WHERE id = $1', [parentId]);
  if (!r.rows[0]) return null;
  if (r.rows[0].parent_id) return resolveRootId(r.rows[0].parent_id);
  return r.rows[0].id;
}

export async function sendMessage(req: Request, res: Response) {
  const userId = req.user!.userId;
  const role = req.user!.role;
  const {
    recipientType,
    recipientId,
    companyId,
    broadcastToAllClients,
    subject,
    body,
    parentId,
  } = req.body;

  if (parentId) {
    const parent = await pool.query(
      'SELECT id, sender_id, recipient_id, subject FROM messages WHERE id = $1',
      [parentId]
    );
    if (!parent.rows[0]) return res.status(404).json({ error: 'Parent message not found' });
    const p = parent.rows[0];
    if (p.recipient_id !== userId && p.sender_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const replyRecipient = p.sender_id === userId ? p.recipient_id : p.sender_id;
    const subjectRe = (p.subject || '').startsWith('Re:') ? p.subject : `Re: ${p.subject}`;
    const insertResult = await pool.query(
      `INSERT INTO messages (sender_id, recipient_id, subject, body, parent_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [userId, replyRecipient, subjectRe, body || '', parentId]
    );
    const newId = insertResult.rows[0].id;
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id)
       VALUES ($1, $2, $3, 'message', 'message', $4)`,
      [replyRecipient, subjectRe, body || '', newId]
    );
    return res.status(201).json({ id: newId });
  }

  if (!['admin', 'staff', 'super_admin'].includes(role)) {
    return res.status(403).json({ error: 'Only staff can send new messages. Clients can reply only.' });
  }
  if (!subject || typeof subject !== 'string' || !subject.trim()) {
    return res.status(400).json({ error: 'Subject is required' });
  }

  let recipientUserIds: string[] = [];

  if (recipientType === 'staff') {
    if (!recipientId) return res.status(400).json({ error: 'Recipient is required for staff' });
    const u = await pool.query(
      "SELECT id FROM users WHERE id = $1 AND role IN ('super_admin','admin','staff')",
      [recipientId]
    );
    if (!u.rows[0]) return res.status(400).json({ error: 'Invalid staff recipient' });
    recipientUserIds = [recipientId];
  } else if (recipientType === 'client') {
    if (broadcastToAllClients) {
      const all = await pool.query(
        "SELECT id FROM users WHERE role = 'client'"
      );
      recipientUserIds = all.rows.map((r) => r.id);
    } else if (companyId) {
      const clients = await pool.query(
        "SELECT id FROM users WHERE company_id = $1 AND role = 'client'",
        [companyId]
      );
      recipientUserIds = clients.rows.map((r) => r.id);
      if (recipientUserIds.length === 0) {
        return res.status(400).json({ error: 'No client users found for this company' });
      }
    } else {
      return res.status(400).json({ error: 'Select one client (company) or bulk (all clients)' });
    }
  } else {
    return res.status(400).json({ error: 'Invalid recipient type. Use staff or client.' });
  }

  const createdIds: string[] = [];
  for (const rid of recipientUserIds) {
    const ins = await pool.query(
      `INSERT INTO messages (sender_id, recipient_id, subject, body)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [userId, rid, subject.trim(), body || '']
    );
    const mid = ins.rows[0].id;
    createdIds.push(mid);
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id)
       VALUES ($1, $2, $3, 'message', 'message', $4)`,
      [rid, subject.trim(), body || '', mid]
    );
  }
  return res.status(201).json({ ids: createdIds, count: createdIds.length });
}

export async function markMessageRead(req: Request, res: Response) {
  const { id } = req.params;
  const userId = req.user!.userId;
  const msg = await pool.query(
    'SELECT id, recipient_id FROM messages WHERE id = $1',
    [id]
  );
  if (!msg.rows[0]) return res.status(404).json({ error: 'Message not found' });
  if (msg.rows[0].recipient_id !== userId) {
    return res.status(403).json({ error: 'Only the recipient can mark as read' });
  }
  await pool.query(
    'UPDATE messages SET read_at = NOW() WHERE id = $1',
    [id]
  );
  return res.json({ message: 'Marked as read' });
}

export async function getUnreadCount(req: Request, res: Response) {
  const userId = req.user!.userId;
  const r = await pool.query(
    'SELECT COUNT(*)::int FROM messages WHERE recipient_id = $1 AND read_at IS NULL',
    [userId]
  );
  return res.json({ count: r.rows[0].count });
}

export async function listStaffRecipients(req: Request, res: Response) {
  const userId = req.user!.userId;
  const result = await pool.query(
    `SELECT id, email, first_name, last_name
     FROM users
     WHERE role IN ('super_admin','admin','staff') AND id != $1
     ORDER BY first_name, last_name, email`,
    [userId]
  );
  const rows = result.rows.map((r) => ({
    id: r.id,
    label: displayName({ first_name: r.first_name, last_name: r.last_name, email: r.email }),
    email: r.email,
  }));
  return res.json(rows);
}

export async function listClientRecipients(req: Request, res: Response) {
  const result = await pool.query(
    `SELECT DISTINCT c.id, c.company_name
     FROM companies c
     JOIN users u ON u.company_id = c.id AND u.role = 'client'
     ORDER BY c.company_name`
  );
  const rows = result.rows.map((r) => ({
    id: r.id,
    label: r.company_name,
  }));
  return res.json(rows);
}
