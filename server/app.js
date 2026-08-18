import express from 'express';
import cors from 'cors';

import authRoutes from './routes/authRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import ivrRoutes from './routes/ivrRoutes.js';

import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

/**
 * הרכבת אפליקציית ה-Express, מופרדת מהפעלת השרת עצמו (listen), כדי שאותה
 * אפליקציה תוכל לשמש גם ריצה עצמאית (server.js, npm run dev) וגם כ-Firebase
 * Cloud Function (functionsIndex.js) בלי לשכפל קוד.
 */
const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());
// ימות המשיח עשוי לשלוח בקשות POST בפורמט form-urlencoded (לא JSON).
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => res.json({ success: true, data: { status: 'ok' } }));

app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ivr', ivrRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
