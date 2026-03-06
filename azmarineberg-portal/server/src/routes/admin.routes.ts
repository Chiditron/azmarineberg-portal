import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, requireAdminOrAbove, requireStaffOrAbove, requireSuperAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  getClients,
  listFacilities,
  createClient,
  inviteClient,
  getRegulators,
  getServiceTypes,
  createRegulator,
  updateRegulator,
  deleteRegulator,
  createServiceType,
  updateServiceType,
  deleteServiceType,
  getClientDetail,
  addFacility,
  addService,
} from '../controllers/admin.controller.js';
import { listReport, exportReport } from '../controllers/report.controller.js';
import {
  listIndustrySectors,
  createIndustrySector,
  updateIndustrySector,
  deleteIndustrySector,
} from '../controllers/industrySectors.controller.js';
import { listUsers, createUser, updateUser } from '../controllers/users.controller.js';

const router = Router();

router.use(authenticate);

router.get('/facilities', requireAdminOrAbove, listFacilities);
router.get('/report/export', requireAdminOrAbove, exportReport);
router.get('/report', requireAdminOrAbove, listReport);

router.get('/clients', requireStaffOrAbove, getClients);
router.post(
  '/clients',
  requireAdminOrAbove,
  [
    body('company_name').notEmpty(),
    body('email').isEmail(),
    body('facilities').isArray({ min: 1 }),
  ],
  validate,
  createClient
);
router.post(
  '/clients/:id/invite',
  requireAdminOrAbove,
  body('email').optional().isEmail(),
  validate,
  inviteClient
);

router.get('/clients/:id', requireStaffOrAbove, getClientDetail);
router.post(
  '/clients/:id/facilities',
  requireStaffOrAbove,
  [body('facility_name').notEmpty().trim(), body('facility_address').notEmpty().trim()],
  validate,
  addFacility
);
router.post(
  '/services',
  requireStaffOrAbove,
  [
    body('facility_id').notEmpty(),
    body('company_id').notEmpty(),
    body('service_type_id').notEmpty(),
    body('regulator_id').notEmpty(),
    body('validity_end').notEmpty(),
  ],
  validate,
  addService
);

router.get('/regulators', getRegulators);
router.post('/regulators', requireAdminOrAbove, createRegulator);
router.put('/regulators/:id', requireAdminOrAbove, updateRegulator);
router.delete('/regulators/:id', requireAdminOrAbove, deleteRegulator);

router.get('/service-types', getServiceTypes);
router.post('/service-types', requireAdminOrAbove, createServiceType);
router.put('/service-types/:id', requireAdminOrAbove, updateServiceType);
router.delete('/service-types/:id', requireAdminOrAbove, deleteServiceType);

router.get('/industry-sectors', listIndustrySectors);
router.post('/industry-sectors', requireSuperAdmin, createIndustrySector);
router.put('/industry-sectors/:id', requireSuperAdmin, updateIndustrySector);
router.delete('/industry-sectors/:id', requireSuperAdmin, deleteIndustrySector);

router.get('/users', requireSuperAdmin, listUsers);
router.post('/users', requireSuperAdmin, createUser);
router.put('/users/:id', requireSuperAdmin, updateUser);

export default router;
