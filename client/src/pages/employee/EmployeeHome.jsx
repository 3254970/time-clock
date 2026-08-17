import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../hooks/useToast.js';
import LoadingState from '../../components/LoadingState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import Modal from '../../components/Modal.jsx';

export default function EmployeeHome() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showClockOutModal, setShowClockOutModal] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');

  const loadStatus = useCallback(async () => {
    try {
      setError('');
      const data = await api.get('/attendance/status');
      setStatus(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 60000);
    return () => clearInterval(interval);
  }, [loadStatus]);

  const handleClockIn = async () => {
    setBusy(true);
    try {
      await api.post('/attendance/clock-in', {});
      showToast('נרשמה כניסה לעבודה', 'success');
      await loadStatus();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const openClockOutModal = async () => {
    try {
      const list = await api.get('/departments');
      setDepartments(list);
      setSelectedDepartment(list[0]?.id || '');
      setShowClockOutModal(true);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleClockOut = async () => {
    if (!selectedDepartment) {
      showToast('יש לבחור מחלקה', 'error');
      return;
    }
    setBusy(true);
    try {
      await api.post('/attendance/clock-out', { departmentId: selectedDepartment });
      showToast('נרשמה יציאה מהעבודה', 'success');
      setShowClockOutModal(false);
      await loadStatus();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingState />;

  const isIn = status?.status === 'IN';

  return (
    <div className="employee-home">
      <h1 className="page-title">שלום {profile?.fullName || ''}</h1>
      <ErrorState message={error} />

      <div className="card">
        <div className="status-line">
          מצב נוכחי: <strong>{isIn ? 'בעבודה' : 'לא בעבודה'}</strong>
        </div>

        {isIn && (
          <>
            <div className="status-detail">נכנסת בשעה: {status.clockInTime}</div>
            <div className="status-detail">עבדת עד עכשיו: {status.workedSoFar}</div>
          </>
        )}

        <div style={{ marginTop: 24 }}>
          {isIn ? (
            <button className="btn btn-large btn-danger" onClick={openClockOutModal} disabled={busy}>
              יציאה מהעבודה
            </button>
          ) : (
            <button className="btn btn-large" onClick={handleClockIn} disabled={busy}>
              כניסה לעבודה
            </button>
          )}
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <button className="btn btn-secondary" onClick={() => navigate('/employee/attendance')}>
          לצפייה בהיסטוריית הנוכחות שלי
        </button>
      </div>

      {showClockOutModal && (
        <Modal title="באיזו מחלקה עבדת?" onClose={() => setShowClockOutModal(false)}>
          <div className="form-group">
            <select
              className="form-control"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="modal-actions">
            <button className="btn" onClick={handleClockOut} disabled={busy}>
              אישור יציאה
            </button>
            <button className="btn btn-secondary" onClick={() => setShowClockOutModal(false)}>
              ביטול
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
