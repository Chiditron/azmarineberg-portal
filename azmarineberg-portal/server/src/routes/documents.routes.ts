import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import { listDocuments, getDownloadUrl, uploadDocument, serveFile } from '../controllers/documents.controller.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

const router = Router();

router.use(authenticate);

router.get('/service/:serviceId', listDocuments);
router.get('/serve', serveFile);
router.get('/:id/download-url', getDownloadUrl);
router.post('/service/:serviceId/upload', upload.single('file'), uploadDocument);

export default router;
