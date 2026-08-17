import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/authRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import ivrRoutes from './routes/ivrRoutes.js';

import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { startDailyAttendanceJob } from './jobs/dailyAttendanceJob.js';

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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`שרת הנוכחות פועל על פורט ${PORT}`);
  startDailyAttendanceJob();
});
