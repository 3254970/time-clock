import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { AppError } from '../utils/AppError.js';
import { getEmployeeById, updateEmployee } from '../services/employeeService.js';
import { updateAuthCredentials, setUserRole } from '../services/userService.js';

/** GET /api/auth/me - מחזיר את פרופיל המשתמש המחובר (role, employeeId, ושם מלא ופרטים אם עובד). */
export const getMe = asyncHandler(async (req, res) => {
  const { uid, email, role, employeeId } = req.user;

  let fullName = null;
  let firstName = null;
  let lastName = null;
  let phone = null;
  if (role === 'EMPLOYEE' && employeeId) {
    const employee = await getEmployeeById(employeeId);
    fullName = employee.fullName;
    firstName = employee.firstName;
    lastName = employee.lastName;
    phone = employee.phone;
  }

  sendSuccess(res, { uid, email, role, employeeId, fullName, firstName, lastName, phone });
});

/**
 * PUT /api/auth/me - עדכון פרטים אישיים של המשתמש המחובר: שם, טלפון, אימייל וסיסמה.
 * שם/טלפון מתעדכנים ברשומת העובד (אם קיימת), אימייל/סיסמה מתעדכנים ב-Firebase Auth.
 */
export const updateMe = asyncHandler(async (req, res) => {
  const { uid, role, employeeId } = req.user;
  const { firstName, lastName, phone, email, password } = req.body;

  if (password && password.length < 6) {
    throw new AppError('הסיסמה חייבת להכיל לפחות 6 תווים', 400);
  }

  if (employeeId && (firstName || lastName || phone)) {
    await updateEmployee(employeeId, { firstName, lastName, phone });
  }

  if (email || password) {
    await updateAuthCredentials(uid, { email, password });
  }

  if (email) {
    await setUserRole(uid, { role, employeeId, email });
  }

  let fullName = null;
  let firstNameOut = null;
  let lastNameOut = null;
  let phoneOut = null;
  if (role === 'EMPLOYEE' && employeeId) {
    const employee = await getEmployeeById(employeeId);
    fullName = employee.fullName;
    firstNameOut = employee.firstName;
    lastNameOut = employee.lastName;
    phoneOut = employee.phone;
  }

  sendSuccess(res, {
    uid,
    email: email || req.user.email,
    role,
    employeeId,
    fullName,
    firstName: firstNameOut,
    lastName: lastNameOut,
    phone: phoneOut,
  });
});
