import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api.js';
import LoadingState from '../../components/LoadingState.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

const now = new Date();

export default function AttendanceHistory() {
  const navigate = useNavigate();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.get(`/attendance/my-period?year=${year}&month=${month}`);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    load();
  }, [load]);

  const changeMonth = (delta) => {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    setMonth(newMonth);
    setYear(newYear);
  };

  return (
    <div>
      <h1 className="page-title">הנוכחות שלי</h1>

      <div className="toolbar">
        <button className="btn btn-secondary" onClick={() => changeMonth(-1)}>
          &larr; חודש קודם
        </button>
        <strong>{data?.periodLabel || ''}</strong>
        <button className="btn btn-secondary" onClick={() => changeMonth(1)}>
          חודש הבא &rarr;
        </button>
        <div className="spacer" />
        {data && (
          <strong>סה"כ בתקופה: {data.totalFormatted}</strong>
        )}
      </div>

      <ErrorState message={error} />

      {loading ? (
        <LoadingState />
      ) : !data?.rows?.length ? (
        <EmptyState text="אין דיווחי נוכחות בתקופה זו" />
      ) : (
        <table>
          <thead>
            <tr>
              <th>תאריך</th>
              <th>כניסה</th>
              <th>יציאה</th>
              <th>מחלקה</th>
              <th>סה"כ שעות</th>
              <th>סטטוס</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.id} role="button" onClick={() => navigate(`/employee/attendance/${row.id}`)}>
                <td>{row.dateFormatted}</td>
                <td>{row.clockInTime || '—'}</td>
                <td>{row.clockOutTime || '—'}</td>
                <td>{row.departmentName || '—'}</td>
                <td>{row.totalFormatted || '—'}</td>
                <td>
                  <StatusBadge status={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
