import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useToast } from '../../hooks/useToast.js';
import LoadingState from '../../components/LoadingState.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import Modal from '../../components/Modal.jsx';
import AttendanceEditForm from '../../components/AttendanceEditForm.jsx';
import EmployeeEditModal from './EmployeeEditModal.jsx';
import AddAttendanceModal from '../../components/AddAttendanceModal.jsx';
import { getCurrentPeriodParts } from '../../utils/period.js';

const currentPeriod = getCurrentPeriodParts();

export default function EmployeeDetail() {
  const { id } = useParams();
  const { showToast } = useToast();
  const [year, setYear] = useState(currentPeriod.year);
  const [month, setMonth] = useState(currentPeriod.month);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showAddAttendance, setShowAddAttendance] = useState(false);

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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.del(`/admin/attendance/${deleteTarget.id}`);
      showToast('הדיווח נמחק', 'success');
      setDeleteTarget(null);
      load();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setDeleting(false);
    }
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
        <div className="spacer" />
        <button className="btn" onClick={() => setShowAddAttendance(true)}>
          + הוספת דיווח ידני
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
              <th></th>
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
                <td>
                  <button
                    className="btn btn-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(row);
                    }}
                  >
                    מחיקה
                  </button>
                </td>
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

      {deleteTarget && (
        <Modal title="מחיקת דיווח נוכחות" onClose={() => setDeleteTarget(null)}>
          <p>
            למחוק לצמיתות את הדיווח מתאריך <strong>{deleteTarget.dateFormatted}</strong>
            {deleteTarget.clockInTime ? ` (כניסה ${deleteTarget.clockInTime})` : ''}?
          </p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
            הפעולה בלתי הפיכה. עצם המחיקה תישמר ביומן השינויים (Audit), אך תוכן הדיווח לא
            יהיה ניתן לשחזור.
          </p>
          <div className="modal-actions">
            <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'מוחק...' : 'מחיקה לצמיתות'}
            </button>
            <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>
              ביטול
            </button>
          </div>
        </Modal>
      )}

      {showAddAttendance && (
        <AddAttendanceModal
          employeeId={id}
          onClose={() => setShowAddAttendance(false)}
          onCreated={() => {
            setShowAddAttendance(false);
            showToast('הדיווח נוסף בהצלחה', 'success');
            load();
          }}
        />
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
