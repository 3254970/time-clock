import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { getEmployeeById } from '../services/employeeService.js';

/** GET /api/auth/me - מחזיר את פרופיל המשתמש המחובר (role, employeeId, ושם מלא אם עובד). */
export const getMe = asyncHandler(async (req, res) => {
  const { uid, email, role, employeeId } = req.user;

  let fullName = null;
  if (role === 'EMPLOYEE' && employeeId) {
    const employee = await getEmployeeById(employeeId);
    fullName = employee.fullName;
  }

  sendSuccess(res, { uid, email, role, employeeId, fullName });
});
