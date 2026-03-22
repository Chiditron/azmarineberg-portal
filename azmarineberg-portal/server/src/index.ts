import 'dotenv/config';
import express, { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { startExpiryCron } from './jobs/expiryNotifications.js';
import { startReportRemindersCron } from './jobs/reportReminders.js';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
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
const isProduction = process.env.NODE_ENV === 'production';

app.use(helmet({ contentSecurityPolicy: false }));

const allowedOrigins = ['http://localhost:5173', process.env.APP_URL].filter(
  (o): o is string => Boolean(o)
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS not allowed'));
      }
    },
    credentials: true,
  })
);
app.use(express.json());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: 'Too many attempts; try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth', authLimiter);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Too many requests; try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

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

function isDbUnreachable(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; name?: string; errors?: Array<{ code?: string }> };
  if (e.code === 'ECONNREFUSED') return true;
  if (e.name === 'AggregateError' && Array.isArray(e.errors)) {
    return e.errors.some((x) => x.code === 'ECONNREFUSED');
  }
  return false;
}

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  if (isDbUnreachable(err)) {
    res.status(503).json({
      error:
        'Database unreachable. Start PostgreSQL and set DATABASE_URL in server/.env (see server/.env.example). Then run npm run db:migrate and npm run db:seed from the portal folder.',
    });
    return;
  }
  const status = (err as { status?: number }).status ?? 500;
  const message = isProduction ? 'An error occurred' : err.message;
  res.status(status).json({ error: message });
};
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startExpiryCron();
  startReportRemindersCron();
});
