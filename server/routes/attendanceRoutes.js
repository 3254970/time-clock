import { Router } from 'express';
import { verifyFirebaseToken } from '../middleware/verifyFirebaseToken.js';
import { requireRole } from '../middleware/requireRole.js';
import {
  getStatus,
  clockIn,
  clockOut,
  getMyPeriod,
  getSession,
  updateSession,
} from '../controllers/attendanceController.js';

const router = Router();

router.use(verifyFirebaseToken);

router.get('/status', requireRole('EMPLOYEE'), getStatus);
router.post('/clock-in', requireRole('EMPLOYEE'), clockIn);
router.post('/clock-out', requireRole('EMPLOYEE'), clockOut);
router.get('/my-period', requireRole('EMPLOYEE'), getMyPeriod);

// רשומה בודדת: עובד יכול לגשת רק לרשומה שלו, מנהל לכל רשומה (נבדק בתוך ה-controller).
router.get('/:id', requireRole(['EMPLOYEE', 'ADMIN', 'MANAGER']), getSession);
router.put('/:id', requireRole(['EMPLOYEE', 'ADMIN', 'MANAGER']), updateSession);

export default router;
