import { auth } from './firebase.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// עוטף fetch: מוסיף טוקן Firebase, מפרש JSON ומטפל בשגיאות בפורמט אחיד.
async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };

  const currentUser = auth.currentUser;
  if (currentUser) {
    const token = await currentUser.getIdToken();
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });

  let body;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok || !body || body.success === false) {
    const message = body?.message || 'אירעה שגיאה בתקשורת עם השרת';
    throw new Error(message);
  }

  return body.data;
}

export const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, data) => request(path, { method: 'POST', body: JSON.stringify(data) }),
  put: (path, data) => request(path, { method: 'PUT', body: JSON.stringify(data) }),
  del: (path) => request(path, { method: 'DELETE' }),
};

export { API_URL };
