import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { requireStaffOrAbove } from '../middleware/auth.js';
import {
  listReportCycles,
  createReportCycle,
  updateReportCycleStatus,
} from '../controllers/reports.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', listReportCycles);
router.post(
  '/',
  requireStaffOrAbove,
  [
    body('service_id').notEmpty(),
    body('cycle_type').isIn(['monthly', 'quarterly', 'annual']),
    body('due_date').notEmpty(),
  ],
  validate,
  createReportCycle
);
router.patch(
  '/:id/status',
  requireStaffOrAbove,
  body('status').isIn(['pending', 'site_visit_done', 'report_prepared', 'submitted', 'acknowledged']),
  validate,
  updateReportCycleStatus
);

export default router;
