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
  createSession,
  deleteSession,
} from '../controllers/attendanceController.js';

const router = Router();

router.use(verifyFirebaseToken);

router.get('/status', requireRole('EMPLOYEE'), getStatus);
router.post('/clock-in', requireRole('EMPLOYEE'), clockIn);
router.post('/clock-out', requireRole('EMPLOYEE'), clockOut);
router.get('/my-period', requireRole('EMPLOYEE'), getMyPeriod);

// הוספת דיווח ידני - עובד יוצר לעצמו בלבד (employeeId נלקח מהטוקן).
router.post('/', requireRole('EMPLOYEE'), createSession);

// רשומה בודדת: עובד יכול לגשת/לערוך/למחוק רק רשומה שלו, מנהל לכל רשומה (נבדק בתוך ה-controller).
router.get('/:id', requireRole(['EMPLOYEE', 'ADMIN', 'MANAGER']), getSession);
router.put('/:id', requireRole(['EMPLOYEE', 'ADMIN', 'MANAGER']), updateSession);
router.delete('/:id', requireRole(['EMPLOYEE', 'ADMIN', 'MANAGER']), deleteSession);

export default router;
