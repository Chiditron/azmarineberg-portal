import { Router } from 'express';
import { body, query } from 'express-validator';
import rateLimit from 'express-rate-limit';
import {
  login,
  refresh,
  logout,
  acceptInvite,
  setPasswordFromInvite,
  changePassword,
  forgotPassword,
  resetPassword,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: { error: 'Too many password reset attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

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

router.post(
  '/forgot-password',
  passwordResetLimiter,
  body('email').isEmail().normalizeEmail(),
  validate,
  forgotPassword
);

router.post(
  '/reset-password',
  passwordResetLimiter,
  [
    body('token').notEmpty(),
    body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('confirmPassword').isLength({ min: 8 }).withMessage('Password confirmation is required'),
  ],
  validate,
  resetPassword
);

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
    body('password').matches(/[a-z]/).withMessage('Password must include a lowercase letter'),
    body('password').matches(/[A-Z]/).withMessage('Password must include an uppercase letter'),
    body('password').matches(/[0-9]/).withMessage('Password must include a number'),
    body('password').matches(/[^A-Za-z0-9]/).withMessage('Password must include a special character'),
    body('confirmPassword').isLength({ min: 8 }).withMessage('Password confirmation is required'),
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
    body('newPassword').matches(/[a-z]/).withMessage('Password must include a lowercase letter'),
    body('newPassword').matches(/[A-Z]/).withMessage('Password must include an uppercase letter'),
    body('newPassword').matches(/[0-9]/).withMessage('Password must include a number'),
    body('newPassword').matches(/[^A-Za-z0-9]/).withMessage('Password must include a special character'),
  ],
  validate,
  changePassword
);

export default router;
