import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import LoadingState from '../../components/LoadingState.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import Modal from '../../components/Modal.jsx';
import AttendanceEditForm from '../../components/AttendanceEditForm.jsx';
import EmployeeEditModal from './EmployeeEditModal.jsx';
import { getCurrentPeriodParts } from '../../utils/period.js';

const currentPeriod = getCurrentPeriodParts();

export default function EmployeeDetail() {
  const { id } = useParams();
  const [year, setYear] = useState(currentPeriod.year);
  const [month, setMonth] = useState(currentPeriod.month);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.get(`/admin/employees/${id}?year=${year}&month=${month}`);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, year, month]);

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

  if (loading) return <LoadingState />;
  if (!data) return <ErrorState message={error || 'העובד לא נמצא'} />;

  const emp = data.employee;
  const rows = data.rows || [];

  return (
    <div>
      <div className="toolbar">
        <h1 className="page-title" style={{ marginBottom: 0 }}>
          {emp.fullName}
        </h1>
        <div className="spacer" />
        <button className="btn btn-secondary" onClick={() => setEditingEmployee(true)}>
          עריכת פרטי עובד
        </button>
      </div>
      <ErrorState message={error} />

      <div className="card-grid">
        <div className="stat-card">
          <div className="stat-label">מספר עובד</div>
          <div className="stat-value">{emp.employeeNumber}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">טלפון</div>
          <div className="stat-value">{emp.phone}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">סטטוס</div>
          <div className="stat-value">
            <StatusBadge status={emp.status} />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">נוכחות כרגע</div>
          <div className="stat-value">
            <StatusBadge status={data.currentStatus} />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">כניסה היום</div>
          <div className="stat-value">{data.todayClockIn || '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">זמן עבודה היום</div>
          <div className="stat-value">{data.todayDuration || '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">סה"כ שעות בתקופה</div>
          <div className="stat-value">{data.periodTotalFormatted || '—'}</div>
        </div>
      </div>

      <div className="toolbar">
        <button className="btn btn-secondary" onClick={() => changeMonth(-1)}>
          &larr; חודש קודם
        </button>
        <strong>{data.periodLabel}</strong>
        <button className="btn btn-secondary" onClick={() => changeMonth(1)}>
          חודש הבא &rarr;
        </button>
      </div>

      {rows.length === 0 ? (
        <EmptyState text="אין דיווחי נוכחות בתקופה זו" />
      ) : (
        <table>
          <thead>
            <tr>
              <th>תאריך</th>
              <th>כניסה</th>
              <th>יציאה</th>
              <th>מחלקה</th>
              <th>שעות</th>
              <th>סטטוס</th>
              <th>מקור</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} role="button" onClick={() => setEditingId(row.id)}>
                <td>{row.dateFormatted}</td>
                <td>{row.clockInTime || '—'}</td>
                <td>{row.clockOutTime || '—'}</td>
                <td>{row.departmentName || '—'}</td>
                <td>{row.totalFormatted || '—'}</td>
                <td>
                  <StatusBadge status={row.status} />
                </td>
                <td>{row.clockInSource || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editingId && (
        <Modal title="עריכת דיווח נוכחות" onClose={() => setEditingId(null)}>
          <AttendanceEditForm
            sessionId={editingId}
            onSaved={() => {
              setEditingId(null);
              load();
            }}
            onCancel={() => setEditingId(null)}
          />
        </Modal>
      )}

      {editingEmployee && (
        <EmployeeEditModal
          employee={emp}
          onClose={() => setEditingEmployee(false)}
          onSaved={() => {
            setEditingEmployee(false);
            load();
          }}
        />
      )}
    </div>
  );
}
