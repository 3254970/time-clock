import { Router } from 'express';
import { verifyFirebaseToken } from '../middleware/verifyFirebaseToken.js';
import { getMe, updateMe } from '../controllers/authController.js';

const router = Router();

router.get('/me', verifyFirebaseToken, getMe);
router.put('/me', verifyFirebaseToken, updateMe);

export default router;
