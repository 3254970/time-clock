import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import * as reportService from '../services/reportService.js';
import { buildEmployeeWorkbook, buildAllEmployeesWorkbook } from '../services/excelService.js';

/** GET /api/admin/reports?year=&month=&employeeId= */
export const getReports = asyncHandler(async (req, res) => {
  const { year, month, employeeId } = req.query;
  const data = await reportService.getEmployeesReport({ year, month, employeeId });
  sendSuccess(res, data);
});

/** GET /api/admin/reports/departments?year=&month= */
export const getDepartmentsReport = asyncHandler(async (req, res) => {
  const { year, month } = req.query;
  const data = await reportService.getDepartmentsReport({ year, month });
  sendSuccess(res, data);
});

/** GET /api/admin/reports/export?year=&month=&employeeId= - מייצר קובץ Excel בשרת (ExcelJS). */
export const exportExcel = asyncHandler(async (req, res) => {
  const { year, month, employeeId } = req.query;
  const { periodLabel, summaryRows, employeeSheets } = await reportService.getFullExportData({
    year,
    month,
    employeeId,
  });

  let workbook;
  let filename;

  if (employeeId) {
    const sheetData = employeeSheets[0];
    if (!sheetData) {
      return res.status(404).json({ success: false, message: 'לא נמצאו נתונים לעובד זה בתקופה' });
    }
    workbook = buildEmployeeWorkbook(sheetData);
    filename = `נוכחות-${sheetData.employee.fullName}.xlsx`;
  } else {
    workbook = buildAllEmployeesWorkbook({ periodLabel, summaryRows, employeeSheets });
    filename = `נוכחות-כל-העובדים-${periodLabel}.xlsx`;
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

  await workbook.xlsx.write(res);
  res.end();
});
