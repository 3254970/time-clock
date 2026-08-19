import { Router } from 'express';
import { adminListAttendance, updateSession, adminDeleteSession } from '../controllers/attendanceController.js';

const router = Router();

router.get('/', adminListAttendance);
router.put('/:id', updateSession);
router.delete('/:id', adminDeleteSession);

export default router;
