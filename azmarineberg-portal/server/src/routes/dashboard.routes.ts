import { Router } from 'express';
import { authenticate, requireSuperAdmin } from '../middleware/auth.js';
import { getMetrics } from '../controllers/dashboard.controller.js';
import { listAuditLogs } from '../controllers/audit.controller.js';

const router = Router();

router.use(authenticate, requireSuperAdmin);

router.get('/metrics', getMetrics);
router.get('/audit-logs', listAuditLogs);

export default router;
