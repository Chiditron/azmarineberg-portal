import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { getServiceDetail, updateServiceStatus } from '../controllers/services.controller.js';

const router = Router();

router.use(authenticate);

router.get('/:id', getServiceDetail);
router.patch(
  '/:id/status',
  body('status').notEmpty(),
  validate,
  updateServiceStatus
);

export default router;
