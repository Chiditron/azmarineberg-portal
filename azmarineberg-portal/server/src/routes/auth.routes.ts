import { Router } from 'express';
import { body, query } from 'express-validator';
import {
  login,
  refresh,
  logout,
  acceptInvite,
  setPasswordFromInvite,
  changePassword,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  validate,
  login
);

router.post('/refresh', body('refreshToken').notEmpty(), validate, refresh);

router.post('/logout', authenticate, logout);

router.get(
  '/accept-invite',
  query('token').notEmpty(),
  validate,
  acceptInvite
);

router.post(
  '/accept-invite',
  [
    body('token').notEmpty(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  validate,
  setPasswordFromInvite
);

router.post(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  validate,
  changePassword
);

export default router;
