import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api.js';
import LoadingState from '../../components/LoadingState.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.get('/admin/employees');
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) return <LoadingState />;

  const employees = data?.employees || [];
  const summary = data?.summary || {};

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <ErrorState message={error} />

      <div className="card-grid">
        <div className="stat-card">
          <div className="stat-label">סה"כ עובדים פעילים</div>
          <div className="stat-value">{summary.activeCount ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">עובדים כרגע בעבודה</div>
          <div className="stat-value">{summary.inCount ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">עובדים לא בעבודה</div>
          <div className="stat-value">{summary.outCount ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">דיווחים חסרים בתקופה</div>
          <div className="stat-value">{summary.missingCount ?? '—'}</div>
        </div>
      </div>

      {employees.length === 0 ? (
        <EmptyState text="אין עובדים להצגה" />
      ) : (
        <table>
          <thead>
            <tr>
              <th>שם</th>
              <th>מספר עובד</th>
              <th>סטטוס</th>
              <th>כניסה היום</th>
              <th>משך עבודה היום</th>
              <th>סה"כ שעות בתקופה</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id} role="button" onClick={() => navigate(`/admin/employees/${emp.id}`)}>
                <td>{emp.fullName}</td>
                <td>{emp.employeeNumber}</td>
                <td>
                  <StatusBadge status={emp.currentStatus} />
                </td>
                <td>{emp.todayClockIn || '—'}</td>
                <td>{emp.todayDuration || '—'}</td>
                <td>{emp.periodTotalFormatted || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
