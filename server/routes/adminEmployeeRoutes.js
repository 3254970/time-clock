import { Router } from 'express';
import { listEmployees, createEmployee, getEmployee, updateEmployee } from '../controllers/employeeController.js';

const router = Router();

router.get('/', listEmployees);
router.post('/', createEmployee);
router.get('/:id', getEmployee);
router.put('/:id', updateEmployee);

export default router;
