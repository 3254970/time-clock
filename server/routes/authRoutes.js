import { Router } from 'express';
import { verifyFirebaseToken } from '../middleware/verifyFirebaseToken.js';
import { getMe } from '../controllers/authController.js';

const router = Router();

router.get('/me', verifyFirebaseToken, getMe);

export default router;
