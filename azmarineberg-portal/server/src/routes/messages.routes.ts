import { Router } from 'express';
import { authenticate, requireStaffOrAbove } from '../middleware/auth.js';
import {
  listMessages,
  getMessage,
  sendMessage,
  markMessageRead,
  getUnreadCount,
  listStaffRecipients,
  listClientRecipients,
} from '../controllers/messages.controller.js';

const router = Router();

router.use(authenticate);

router.get('/unread-count', getUnreadCount);
router.get('/recipients/staff', requireStaffOrAbove, listStaffRecipients);
router.get('/recipients/clients', requireStaffOrAbove, listClientRecipients);
router.get('/', listMessages);
router.get('/:id', getMessage);
router.post('/', sendMessage);
router.post('/:id/read', markMessageRead);

export default router;
