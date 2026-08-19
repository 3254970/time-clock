import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useToast } from '../../hooks/useToast.js';
import LoadingState from '../../components/LoadingState.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import Modal from '../../components/Modal.jsx';
import EmployeeFormModal from './EmployeeFormModal.jsx';

export default function EmployeesList() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [resetLink, setResetLink] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.get('/admin/employees');
      setEmployees(result.employees || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleStatus = async (emp, e) => {
    e.stopPropagation();
    const newStatus = emp.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.put(`/admin/employees/${emp.id}`, { status: newStatus });
      showToast('הסטטוס עודכן', 'success');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.del(`/admin/employees/${deleteTarget.id}`);
      showToast('העובד נמחק', 'success');
      setDeleteTarget(null);
      load();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const filtered = employees.filter((emp) => {
    const term = search.trim();
    if (!term) return true;
    return emp.fullName.includes(term) || emp.employeeNumber.includes(term) || (emp.phone || '').includes(term);
  });

  return (
    <div>
      <h1 className="page-title">ניהול עובדים</h1>

      <div className="toolbar">
        <input
          className="form-control"
          style={{ maxWidth: 260 }}
          placeholder="חיפוש לפי שם, מספר עובד או טלפון"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="spacer" />
        <button className="btn" onClick={() => setShowAdd(true)}>
          + הוספת עובד
        </button>
      </div>

      <ErrorState message={error} />

      {loading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState text="לא נמצאו עובדים" />
      ) : (
        <table>
          <thead>
            <tr>
              <th>שם</th>
              <th>מספר עובד</th>
              <th>טלפון</th>
              <th>סטטוס</th>
              <th>נוכחות כרגע</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((emp) => (
              <tr key={emp.id} role="button" onClick={() => navigate(`/admin/employees/${emp.id}`)}>
                <td>{emp.fullName}</td>
                <td>{emp.employeeNumber}</td>
                <td>{emp.phone}</td>
                <td>
                  <StatusBadge status={emp.status} />
                </td>
                <td>
                  <StatusBadge status={emp.currentStatus} />
                </td>
                <td style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary" onClick={(e) => toggleStatus(emp, e)}>
                    {emp.status === 'ACTIVE' ? 'השבתה' : 'הפעלה'}
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(emp);
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

      {showAdd && (
        <EmployeeFormModal
          onClose={() => setShowAdd(false)}
          onCreated={(created) => {
            setShowAdd(false);
            showToast('העובד נוצר בהצלחה', 'success');
            if (created?.resetLink) setResetLink(created.resetLink);
            load();
          }}
        />
      )}

      {deleteTarget && (
        <Modal title="מחיקת עובד" onClose={() => setDeleteTarget(null)}>
          <p>
            למחוק את <strong>{deleteTarget.fullName}</strong> לצמיתות? הפעולה בלתי הפיכה.
          </p>
          <p style={{ color: 'var(--color-danger)', fontSize: 13, fontWeight: 600 }}>
            אזהרה: אם לעובד יש דיווחי נוכחות, כל הדיווחים, האירועים וההיסטוריה שלו יימחקו
            לצמיתות יחד איתו - כולל דוחות עבר. אם ברצונך לשמור על ההיסטוריה, השבת את העובד
            במקום למחוק אותו.
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

      {resetLink && (
        <Modal title="קישור להגדרת סיסמה" onClose={() => setResetLink('')}>
          <p>יש לשלוח לעובד את הקישור הבא כדי שיגדיר סיסמה ראשונית להתחברות:</p>
          <input className="form-control" readOnly value={resetLink} onFocus={(e) => e.target.select()} />
          <div className="modal-actions">
            <button type="button" className="btn" onClick={() => setResetLink('')}>
              סגירה
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
