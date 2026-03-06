import 'dotenv/config';
import express from 'express';
import { startExpiryCron } from './jobs/expiryNotifications.js';
import { startReportRemindersCron } from './jobs/reportReminders.js';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import clientsRoutes from './routes/clients.routes.js';
import adminRoutes from './routes/admin.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import documentsRoutes from './routes/documents.routes.js';
import servicesRoutes from './routes/services.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import messagesRoutes from './routes/messages.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import { authenticate } from './middleware/auth.js';
import { pool } from './db/pool.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.APP_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/reports', reportsRoutes);

app.get('/api/auth/me', authenticate, async (req, res) => {
  const r = await pool.query(
    `SELECT u.id, u.email, u.role, u.company_id, u.first_name, u.last_name, c.company_name
     FROM users u
     LEFT JOIN companies c ON c.id = u.company_id
     WHERE u.id = $1`,
    [req.user!.userId]
  );
  if (!r.rows[0]) return res.status(404).json({ error: 'User not found' });
  const row = r.rows[0];
  res.json({
    user: {
      id: row.id,
      email: row.email,
      role: row.role,
      companyId: row.company_id,
      firstName: row.first_name ?? null,
      lastName: row.last_name ?? null,
      companyName: row.company_name ?? null,
    },
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startExpiryCron();
  startReportRemindersCron();
});
