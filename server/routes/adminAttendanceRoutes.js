import { Router } from 'express';
import { adminListAttendance, updateSession } from '../controllers/attendanceController.js';

const router = Router();

router.get('/', adminListAttendance);
router.put('/:id', updateSession);

export default router;
