import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate, requireClient } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  getDashboardStats,
  getServices,
  getCompanyDetails,
  patchCompany,
  createClientFacility,
  updateClientFacility,
  deleteClientFacility,
} from '../controllers/clients.controller.js';
import { listIndustrySectors } from '../controllers/industrySectors.controller.js';

const router = Router();

router.use(authenticate, requireClient);

router.get('/dashboard/stats', getDashboardStats);
router.get('/company', getCompanyDetails);
router.patch(
  '/company',
  [
    body('company_name').optional().trim().notEmpty(),
    body('phone').optional({ nullable: true }).trim(),
    body('contact_person').optional().trim().notEmpty(),
    body('address').optional().trim().notEmpty(),
    body('lga').optional({ nullable: true }).trim(),
    body('state').optional({ nullable: true }).trim(),
    body('zone').optional({ nullable: true }).trim(),
  ],
  validate,
  patchCompany
);
router.get('/services', getServices);
router.get('/industry-sectors', listIndustrySectors);

router.post(
  '/facilities',
  [
    body('facility_name').trim().notEmpty(),
    body('facility_address').trim().notEmpty(),
    body('lga').optional().trim(),
    body('state').optional().trim(),
    body('zone').optional().trim(),
  ],
  validate,
  createClientFacility
);

router.patch(
  '/facilities/:facilityId',
  [
    param('facilityId').isUUID(),
    body('facility_name').optional().trim().notEmpty(),
    body('facility_address').optional().trim().notEmpty(),
    body('lga').optional({ nullable: true }).trim(),
    body('state').optional({ nullable: true }).trim(),
    body('zone').optional({ nullable: true }).trim(),
  ],
  validate,
  updateClientFacility
);

router.delete(
  '/facilities/:facilityId',
  [param('facilityId').isUUID()],
  validate,
  deleteClientFacility
);

export default router;
