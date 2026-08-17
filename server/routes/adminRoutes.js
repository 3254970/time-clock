import { Router } from 'express';
import { verifyFirebaseToken } from '../middleware/verifyFirebaseToken.js';
import { requireRole } from '../middleware/requireRole.js';
import adminEmployeeRoutes from './adminEmployeeRoutes.js';
import adminDepartmentRoutes from './adminDepartmentRoutes.js';
import adminAttendanceRoutes from './adminAttendanceRoutes.js';
import adminReportRoutes from './adminReportRoutes.js';

const router = Router();

// כל נתיבי הניהול דורשים התחברות + הרשאת ADMIN או MANAGER.
router.use(verifyFirebaseToken, requireRole(['ADMIN', 'MANAGER']));

router.use('/employees', adminEmployeeRoutes);
router.use('/departments', adminDepartmentRoutes);
router.use('/attendance', adminAttendanceRoutes);
router.use('/reports', adminReportRoutes);

export default router;
