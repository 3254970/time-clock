// עוזר לשליחת תשובות בפורמט אחיד: { success: true, data } או { success: false, message }.
export function sendSuccess(res, data, statusCode = 200) {
  res.status(statusCode).json({ success: true, data });
}
