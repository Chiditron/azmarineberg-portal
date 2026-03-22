import { Request, Response } from 'express';
import { createReadStream } from 'fs';
import { existsSync } from 'fs';
import path from 'path';
import { pool } from '../db/pool.js';
import * as storage from '../services/storage.service.js';
import * as auditService from '../services/audit.service.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_UPLOAD_DIR = path.join(__dirname, '../../uploads');

const MIME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
};

export async function listDocuments(req: Request, res: Response) {
  const { serviceId } = req.params;
  const companyId = req.user!.companyId;
  const role = req.user!.role;

  const serviceCheck = await pool.query(
    'SELECT company_id FROM services WHERE id = $1',
    [serviceId]
  );
  if (!serviceCheck.rows[0]) {
    return res.status(404).json({ error: 'Service not found' });
  }
  if (role === 'client' && serviceCheck.rows[0].company_id !== companyId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const result = await pool.query(
    `SELECT id, file_name, version, document_type, uploaded_by_role, created_at
     FROM documents
     WHERE service_id = $1
     ORDER BY created_at DESC`,
    [serviceId]
  );
  res.json(result.rows);
}

export async function getDownloadUrl(req: Request, res: Response) {
  const { id } = req.params;
  const companyId = req.user!.companyId;
  const role = req.user!.role;

  const doc = await pool.query(
    `SELECT d.id, d.s3_key, d.service_id, s.company_id
     FROM documents d
     JOIN services s ON s.id = d.service_id
     WHERE d.id = $1`,
    [id]
  );
  if (!doc.rows[0]) {
    return res.status(404).json({ error: 'Document not found' });
  }
  if (role === 'client' && doc.rows[0].company_id !== companyId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const url = await storage.getDownloadUrl(doc.rows[0].s3_key);
  res.json({ url });
}

export async function serveFile(req: Request, res: Response) {
  const { key } = req.query;
  if (!key || typeof key !== 'string') {
    return res.status(400).json({ error: 'Missing key' });
  }
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const doc = await pool.query(
    `SELECT d.id, d.s3_key, d.file_name, s.company_id
     FROM documents d
     JOIN services s ON s.id = d.service_id
     WHERE d.s3_key = $1`,
    [key]
  );
  if (!doc.rows[0]) return res.status(404).json({ error: 'Document not found' });
  if (req.user.role === 'client' && doc.rows[0].company_id !== req.user.companyId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const fileName = doc.rows[0].file_name;
  const ext = path.extname(fileName).slice(1).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  const localPath = path.join(LOCAL_UPLOAD_DIR, key);
  if (existsSync(localPath)) {
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    createReadStream(localPath).pipe(res);
    return;
  }

  const s3Result = await storage.getObjectStream(key);
  if (!s3Result) return res.status(404).json({ error: 'File not found' });
  res.setHeader('Content-Type', s3Result.contentType || contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  s3Result.stream.pipe(res);
}

export async function uploadDocument(req: Request, res: Response) {
  const { serviceId } = req.params;
  const companyId = req.user!.companyId;
  const role = req.user!.role;

  const serviceCheck = await pool.query(
    'SELECT company_id FROM services WHERE id = $1',
    [serviceId]
  );
  if (!serviceCheck.rows[0]) {
    return res.status(404).json({ error: 'Service not found' });
  }
  if (role === 'client' && serviceCheck.rows[0].company_id !== companyId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const documentType = role === 'client' ? 'client_upload' : (req.body.documentType || 'azmarineberg_upload');
  const file = (req as Request & { file?: { buffer: Buffer; originalname: string; mimetype: string } }).file;
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const ext = file.originalname.includes('.') ? '.' + file.originalname.split('.').pop() : '';
  const docResult = await pool.query(
    `INSERT INTO documents (service_id, file_name, s3_key, version, document_type, uploaded_by_role, uploaded_by_id)
     VALUES ($1, $2, $3, 1, $4, $5, $6)
     RETURNING id`,
    [
      serviceId,
      file.originalname,
      'pending',
      documentType,
      role,
      req.user!.userId,
    ]
  );
  const docId = docResult.rows[0].id;
  const effectiveCompanyId = companyId ?? serviceCheck.rows[0].company_id;
  const s3Key = storage.getStoragePath(effectiveCompanyId, serviceId, docId, 1, ext);
  try {
    await storage.uploadFile(s3Key, file.buffer, file.mimetype);
  } catch (err) {
    await pool.query('DELETE FROM documents WHERE id = $1', [docId]);
    console.error('Storage upload error:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Upload failed. For local storage, ensure STORAGE_TYPE=local in .env',
    });
  }
  await pool.query('UPDATE documents SET s3_key = $1 WHERE id = $2', [s3Key, docId]);

  await auditService.log(
    req.user!.userId,
    'upload_document',
    'document',
    docId,
    { service_id: serviceId, file_name: file.originalname, document_type: documentType },
    req.ip
  );

  const companyIdForNotify = serviceCheck.rows[0].company_id;
  const title = 'New document uploaded';
  const message = `A document has been uploaded for a service.`;

  if (role === 'client') {
    const admins = await pool.query(
      "SELECT id FROM users WHERE role IN ('admin', 'super_admin')"
    );
    for (const a of admins.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id)
         VALUES ($1, $2, $3, 'document_upload', 'document', $4)`,
        [a.id, title, message, docId]
      );
    }
  } else {
    const clientUsers = await pool.query(
      "SELECT id FROM users WHERE company_id = $1 AND role = 'client'",
      [companyIdForNotify]
    );
    for (const u of clientUsers.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id)
         VALUES ($1, $2, $3, 'document_upload', 'document', $4)`,
        [u.id, title, message, docId]
      );
    }
  }

  res.status(201).json({ id: docId });
}
