import { Router } from 'express';
import { getReports, getDepartmentsReport, exportExcel } from '../controllers/reportController.js';

const router = Router();

router.get('/', getReports);
router.get('/departments', getDepartmentsReport);
router.get('/export', exportExcel);

export default router;
