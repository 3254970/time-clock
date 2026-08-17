import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { useToast } from '../hooks/useToast.js';
import LoadingState from './LoadingState.jsx';
import ErrorState from './ErrorState.jsx';

// ממיר Timestamp ISO לערך תואם ל-<input type="datetime-local">
function toInputValue(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AttendanceEditForm({ sessionId, onSaved, onCancel }) {
  const { showToast } = useToast();
  const [session, setSession] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [clockIn, setClockIn] = useState('');
  const [clockOut, setClockOut] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [sessionData, deptData] = await Promise.all([
          api.get(`/attendance/${sessionId}`),
          api.get('/departments'),
        ]);
        if (cancelled) return;
        setSession(sessionData);
        setDepartments(deptData);
        setClockIn(toInputValue(sessionData.clockIn));
        setClockOut(toInputValue(sessionData.clockOut));
        setDepartmentId(sessionData.departmentId || '');
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.put(`/attendance/${sessionId}`, {
        clockIn: clockIn ? new Date(clockIn).toISOString() : null,
        clockOut: clockOut ? new Date(clockOut).toISOString() : null,
        departmentId: departmentId || null,
      });
      showToast('הרשומה נשמרה בהצלחה', 'success');
      onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState />;
  if (!session) return <ErrorState message={error || 'הרשומה לא נמצאה'} />;

  return (
    <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 480 }}>
      <ErrorState message={error} />

      <div className="form-group">
        <label htmlFor="clockIn">שעת כניסה</label>
        <input
          id="clockIn"
          type="datetime-local"
          className="form-control"
          value={clockIn}
          onChange={(e) => setClockIn(e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="clockOut">שעת יציאה</label>
        <input
          id="clockOut"
          type="datetime-local"
          className="form-control"
          value={clockOut}
          onChange={(e) => setClockOut(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="department">מחלקה</label>
        <select
          id="department"
          className="form-control"
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
        >
          <option value="">— לא נבחרה —</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <div className="modal-actions">
        <button type="submit" className="btn" disabled={saving}>
          {saving ? 'שומר...' : 'שמירה'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          ביטול
        </button>
      </div>
    </form>
  );
}
