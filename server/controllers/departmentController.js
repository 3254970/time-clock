import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import * as departmentService from '../services/departmentService.js';

/** GET /api/departments - מחלקות פעילות בלבד (לשימוש בטפסים / דרופדאון). */
export const listActiveDepartments = asyncHandler(async (req, res) => {
  const departments = await departmentService.listDepartments({ activeOnly: true });
  sendSuccess(res, departments);
});

/** GET /api/admin/departments - כל המחלקות, כולל לא פעילות (לניהול). */
export const listAllDepartments = asyncHandler(async (req, res) => {
  const departments = await departmentService.listDepartments({ activeOnly: false });
  sendSuccess(res, departments);
});

export const createDepartment = asyncHandler(async (req, res) => {
  const department = await departmentService.createDepartment(req.body);
  sendSuccess(res, department, 201);
});

export const updateDepartment = asyncHandler(async (req, res) => {
  const department = await departmentService.updateDepartment(req.params.id, req.body);
  sendSuccess(res, department);
});
