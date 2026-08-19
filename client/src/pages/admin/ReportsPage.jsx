import { useEffect, useState, useCallback } from 'react';
import { api, API_URL } from '../../services/api.js';
import { auth } from '../../services/firebase.js';
import LoadingState from '../../components/LoadingState.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { getCurrentPeriodParts } from '../../utils/period.js';

const currentPeriod = getCurrentPeriodParts();

async function downloadExport(query) {
  const token = auth.currentUser && (await auth.currentUser.getIdToken());
  const response = await fetch(`${API_URL}/admin/reports/export?${query}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error('שגיאה בייצוא הקובץ');
  }
  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^";]+)"?/);
  const filename = match ? decodeURIComponent(match[1]) : 'export.xlsx';
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [year, setYear] = useState(currentPeriod.year);
  const [month, setMonth] = useState(currentPeriod.month);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [report, setReport] = useState(null);
  const [departmentReport, setDepartmentReport] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/employees').then((res) => setEmployees(res.employees || [])).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = `year=${year}&month=${month}${selectedEmployee ? `&employeeId=${selectedEmployee}` : ''}`;
      const [summary, byDepartment] = await Promise.all([
        api.get(`/admin/reports?${query}`),
        api.get(`/admin/reports/departments?year=${year}&month=${month}`),
      ]);
      setReport(summary);
      setDepartmentReport(byDepartment);
      setSelectedDepartment(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [year, month, selectedEmployee]);

  useEffect(() => {
    load();
  }, [load]);

  const handleExportAll = async () => {
    try {
      await downloadExport(`year=${year}&month=${month}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleExportEmployee = async (employeeId) => {
    try {
      await downloadExport(`year=${year}&month=${month}&employeeId=${employeeId}`);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h1 className="page-title">דוחות</h1>

      <div className="toolbar">
        <select className="form-control" style={{ maxWidth: 120 }} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              חודש {m}
            </option>
          ))}
        </select>
        <input
          type="number"
          className="form-control"
          style={{ maxWidth: 100 }}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        />
        <select
          className="form-control"
          style={{ maxWidth: 220 }}
          value={selectedEmployee}
          onChange={(e) => setSelectedEmployee(e.target.value)}
        >
          <option value="">כל העובדים</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.fullName}
            </option>
          ))}
        </select>
        <div className="spacer" />
        <button className="btn btn-secondary" onClick={handleExportAll}>
          ייצוא Excel לכל העובדים
        </button>
      </div>

      <ErrorState message={error} />

      {loading ? (
        <LoadingState />
      ) : (
        <>
          {report?.periodLabel && (
            <p style={{ color: '#6b7280', marginTop: -10 }}>{report.periodLabel}</p>
          )}

          <h3>סיכום עובדים</h3>
          {!report?.rows?.length ? (
            <EmptyState text="אין נתונים" />
          ) : (
            <table style={{ marginBottom: 30 }}>
              <thead>
                <tr>
                  <th>שם עובד</th>
                  <th>סה"כ שעות</th>
                  <th>מספר Sessions</th>
                  <th>דיווחים חסרים</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row) => (
                  <tr key={row.employeeId}>
                    <td>{row.fullName}</td>
                    <td>{row.totalFormatted}</td>
                    <td>{row.sessionsCount}</td>
                    <td>{row.missingCount}</td>
                    <td>
                      <button className="btn btn-secondary" onClick={() => handleExportEmployee(row.employeeId)}>
                        ייצוא Excel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h3>דוח מחלקות</h3>
          {!departmentReport?.length ? (
            <EmptyState text="אין נתונים" />
          ) : (
            <table>
              <thead>
                <tr>
                  <th>מחלקה</th>
                  <th>סה"כ שעות</th>
                </tr>
              </thead>
              <tbody>
                {departmentReport.map((dep) => (
                  <tr
                    key={dep.departmentId}
                    role="button"
                    onClick={() =>
                      setSelectedDepartment(selectedDepartment?.departmentId === dep.departmentId ? null : dep)
                    }
                  >
                    <td>{dep.departmentName}</td>
                    <td>{dep.totalFormatted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {selectedDepartment && (
            <div style={{ marginTop: 20 }}>
              <h4>פירוט: {selectedDepartment.departmentName}</h4>
              {!selectedDepartment.sessions?.length ? (
                <EmptyState text="אין נתונים" />
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>עובד</th>
                      <th>תאריך</th>
                      <th>כניסה</th>
                      <th>יציאה</th>
                      <th>שעות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDepartment.sessions.map((s) => (
                      <tr key={s.id}>
                        <td>{s.employeeName}</td>
                        <td>{s.dateFormatted}</td>
                        <td>{s.clockInTime || '—'}</td>
                        <td>{s.clockOutTime || '—'}</td>
                        <td>{s.totalFormatted || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
