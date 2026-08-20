import { Router } from 'express';
import {
  adminListAttendance,
  adminCreateSession,
  updateSession,
  adminDeleteSession,
} from '../controllers/attendanceController.js';

const router = Router();

router.get('/', adminListAttendance);
router.post('/', adminCreateSession);
router.put('/:id', updateSession);
router.delete('/:id', adminDeleteSession);

export default router;
