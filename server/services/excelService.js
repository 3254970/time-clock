import ExcelJS from 'exceljs';
import { statusLabelHe } from '../utils/statusLabels.js';

const ROW_HEADERS = ['תאריך', 'יום', 'כניסה', 'יציאה', 'מחלקה', 'סה"כ שעות', 'סטטוס'];

function sanitizeSheetName(name) {
  return name.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'גיליון';
}

function writeEmployeeSheet(workbook, { employee, periodLabel, rows, totalFormatted }) {
  const sheet = workbook.addWorksheet(sanitizeSheetName(employee.fullName), {
    views: [{ rightToLeft: true }],
  });

  sheet.addRow([`שם עובד: ${employee.fullName}`]);
  sheet.addRow([`מספר עובד: ${employee.employeeNumber}`]);
  sheet.addRow([`תקופת עבודה: ${periodLabel}`]);
  sheet.addRow([]);

  const headerRow = sheet.addRow(ROW_HEADERS);
  headerRow.font = { bold: true };

  for (const row of rows) {
    sheet.addRow([
      row.dateFormatted,
      row.dayName,
      row.clockInTime || '—',
      row.clockOutTime || '—',
      row.departmentName || '—',
      row.totalFormatted || '—',
      statusLabelHe(row.status),
    ]);
  }

  sheet.addRow([]);
  const totalRow = sheet.addRow([`סה"כ שעות בתקופה: ${totalFormatted}`]);
  totalRow.font = { bold: true };

  sheet.columns.forEach((col) => {
    col.width = 16;
  });

  return sheet;
}

/** בונה קובץ Excel לעובד בודד. */
export function buildEmployeeWorkbook({ employee, periodLabel, rows, totalFormatted }) {
  const workbook = new ExcelJS.Workbook();
  writeEmployeeSheet(workbook, { employee, periodLabel, rows, totalFormatted });
  return workbook;
}

/** בונה קובץ Excel לכלל העובדים: גיליון "סיכום" + גיליון לכל עובד. */
export function buildAllEmployeesWorkbook({ periodLabel, summaryRows, employeeSheets }) {
  const workbook = new ExcelJS.Workbook();

  const summarySheet = workbook.addWorksheet('סיכום', { views: [{ rightToLeft: true }] });
  summarySheet.addRow([`תקופת עבודה: ${periodLabel}`]);
  summarySheet.addRow([]);
  const headerRow = summarySheet.addRow(['מספר עובד', 'שם', 'סה"כ שעות', 'דיווחים חסרים']);
  headerRow.font = { bold: true };

  for (const row of summaryRows) {
    summarySheet.addRow([row.employeeNumber, row.fullName, row.totalFormatted, row.missingCount]);
  }
  summarySheet.columns.forEach((col) => {
    col.width = 18;
  });

  for (const sheetData of employeeSheets) {
    writeEmployeeSheet(workbook, sheetData);
  }

  return workbook;
}
