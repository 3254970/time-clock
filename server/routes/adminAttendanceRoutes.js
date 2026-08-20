import { Router } from 'express';
import {
  adminListAttendance,
  createSession,
  updateSession,
  deleteSession,
} from '../controllers/attendanceController.js';

const router = Router();

router.get('/', adminListAttendance);
router.post('/', createSession);
router.put('/:id', updateSession);
router.delete('/:id', deleteSession);

export default router;
