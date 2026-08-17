/**
 * מנרמל מספר טלפון ישראלי לפורמט מקומי אחיד (מתחיל ב-0), כדי שניתן יהיה
 * להשוות מספרים שהגיעו בפורמטים שונים, לדוגמה:
 * "972501234567", "+972-50-123-4567", "0501234567" => "0501234567"
 */
export function normalizePhoneNumber(rawPhone) {
  if (!rawPhone) return '';

  const digitsOnly = String(rawPhone).replace(/\D/g, '');

  if (digitsOnly.startsWith('972')) {
    return `0${digitsOnly.slice(3)}`;
  }

  if (digitsOnly.startsWith('0')) {
    return digitsOnly;
  }

  // מספר בן 9 ספרות בלי קידומת (למשל 501234567) - נוסיף אפס מוביל.
  if (digitsOnly.length === 9) {
    return `0${digitsOnly}`;
  }

  return digitsOnly;
}
