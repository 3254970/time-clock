import { useEffect, useState, useCallback } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../../hooks/useToast.js';
import LoadingState from '../../components/LoadingState.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import Modal from '../../components/Modal.jsx';

export default function DepartmentsPage() {
  const { showToast } = useToast();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // null | {} (new) | department object
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.get('/admin/departments');
      setDepartments(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setName('');
    setEditing({});
  };

  const openEdit = (dep) => {
    setName(dep.name);
    setEditing(dep);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing.id) {
        await api.put(`/admin/departments/${editing.id}`, { name });
      } else {
        await api.post('/admin/departments', { name });
      }
      showToast('המחלקה נשמרה', 'success');
      setEditing(null);
      load();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (dep) => {
    try {
      await api.put(`/admin/departments/${dep.id}`, { isActive: !dep.isActive });
      showToast('הסטטוס עודכן', 'success');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div>
      <h1 className="page-title">ניהול מחלקות</h1>

      <div className="toolbar">
        <div className="spacer" />
        <button className="btn" onClick={openNew}>
          + הוספת מחלקה
        </button>
      </div>

      <ErrorState message={error} />

      {loading ? (
        <LoadingState />
      ) : departments.length === 0 ? (
        <EmptyState text="אין מחלקות" />
      ) : (
        <table>
          <thead>
            <tr>
              <th>שם מחלקה</th>
              <th>סטטוס</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {departments.map((dep) => (
              <tr key={dep.id}>
                <td>{dep.name}</td>
                <td>
                  <StatusBadge status={dep.isActive ? 'ACTIVE' : 'INACTIVE'} />
                </td>
                <td style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary" onClick={() => openEdit(dep)}>
                    עריכה
                  </button>
                  <button className="btn btn-secondary" onClick={() => toggleActive(dep)}>
                    {dep.isActive ? 'השבתה' : 'הפעלה'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing && (
        <Modal title={editing.id ? 'עריכת מחלקה' : 'הוספת מחלקה'} onClose={() => setEditing(null)}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>שם מחלקה</label>
              <input className="form-control" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
            </div>
            <div className="modal-actions">
              <button type="submit" className="btn" disabled={saving}>
                {saving ? 'שומר...' : 'שמירה'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>
                ביטול
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
