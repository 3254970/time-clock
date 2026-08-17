import { Router } from 'express';
import { verifyFirebaseToken } from '../middleware/verifyFirebaseToken.js';
import { listActiveDepartments } from '../controllers/departmentController.js';

const router = Router();

// כל משתמש מחובר (עובד/מנהל) יכול לראות מחלקות פעילות - נדרש לדרופדאון ביציאה.
router.get('/', verifyFirebaseToken, listActiveDepartments);

export default router;
