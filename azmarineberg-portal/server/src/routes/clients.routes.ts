import { Router } from 'express';
import { authenticate, requireClient } from '../middleware/auth.js';
import { getDashboardStats, getServices, getCompanyDetails } from '../controllers/clients.controller.js';

const router = Router();

router.use(authenticate, requireClient);

router.get('/dashboard/stats', getDashboardStats);
router.get('/company', getCompanyDetails);
router.get('/services', getServices);

export default router;
