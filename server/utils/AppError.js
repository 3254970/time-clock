// שגיאה עסקית מבוקרת - נתפסת ע"י errorHandler ומוחזרת ללקוח בפורמט אחיד.
export class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}
