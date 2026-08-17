import { Router } from 'express';
import {
  listAllDepartments,
  createDepartment,
  updateDepartment,
} from '../controllers/departmentController.js';

const router = Router();

router.get('/', listAllDepartments);
router.post('/', createDepartment);
router.put('/:id', updateDepartment);

export default router;
