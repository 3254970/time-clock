import { useEffect, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { api } from '../../services/api.js';

// הוספת דיווח נוכחות ידני לעובד (למשל יום ששכח לדווח) - כולל בחירת תאריך.
export default function AddAttendanceModal({ employeeId, onClose, onCreated }) {
  const [departments, setDepartments] = useState([]);
  const [clockIn, setClockIn] = useState('');
  const [clockOut, setClockOut] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get('/departments')
      .then((list) => {
        setDepartments(list);
        setDepartmentId(list[0]?.id || '');
      })
      .catch((err) => setError(err.message));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const created = await api.post('/admin/attendance', {
        employeeId,
        clockIn: clockIn ? new Date(clockIn).toISOString() : null,
        clockOut: clockOut ? new Date(clockOut).toISOString() : null,
        departmentId: departmentId || null,
      });
      onCreated(created);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="הוספת דיווח ידני" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <ErrorState message={error} />

        <div className="form-group">
          <label htmlFor="manualClockIn">שעת כניסה</label>
          <input
            id="manualClockIn"
            type="datetime-local"
            className="form-control"
            value={clockIn}
            onChange={(e) => setClockIn(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="manualClockOut">שעת יציאה</label>
          <input
            id="manualClockOut"
            type="datetime-local"
            className="form-control"
            value={clockOut}
            onChange={(e) => setClockOut(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="manualDepartment">מחלקה</label>
          <select
            id="manualDepartment"
            className="form-control"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            required
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
            {saving ? 'שומר...' : 'הוספה'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            ביטול
          </button>
        </div>
      </form>
    </Modal>
  );
}
