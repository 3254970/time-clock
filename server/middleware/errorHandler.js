// Middleware מרכזי לטיפול בשגיאות. מחזיר תמיד מבנה אחיד: { success: false, message }.
export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const statusCode = err.statusCode || 500;

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || 'אירעה שגיאה בשרת',
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({ success: false, message: 'הנתיב המבוקש לא נמצא' });
}
