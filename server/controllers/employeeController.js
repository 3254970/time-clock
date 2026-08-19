import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import * as employeeService from '../services/employeeService.js';
import * as reportService from '../services/reportService.js';

/** GET /api/admin/employees - רשימת עובדים + סטטוס חי + שעות בתקופה הנוכחית. */
export const listEmployees = asyncHandler(async (req, res) => {
  const data = await reportService.getEmployeesOverview();
  sendSuccess(res, data);
});

/** POST /api/admin/employees */
export const createEmployee = asyncHandler(async (req, res) => {
  const employee = await employeeService.createEmployee(req.body);
  sendSuccess(res, employee, 201);
});

/** GET /api/admin/employees/:id */
export const getEmployee = asyncHandler(async (req, res) => {
  const { year, month } = req.query;
  const data = await reportService.getEmployeeDetail(req.params.id, { year, month });
  sendSuccess(res, data);
});

/** PUT /api/admin/employees/:id */
export const updateEmployee = asyncHandler(async (req, res) => {
  const employee = await employeeService.updateEmployee(req.params.id, req.body);
  sendSuccess(res, employee);
});

/** DELETE /api/admin/employees/:id - מותר רק לעובד ללא היסטוריית נוכחות. */
export const deleteEmployee = asyncHandler(async (req, res) => {
  await employeeService.deleteEmployee(req.params.id);
  sendSuccess(res, { deleted: true });
});
