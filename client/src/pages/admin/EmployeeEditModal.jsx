import { useState } from 'react';
import Modal from '../../components/Modal.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { api } from '../../services/api.js';

// עריכת פרטי עובד קיים: שם, מספר עובד, טלפון, PIN וסטטוס.
export default function EmployeeEditModal({ employee, onClose, onSaved }) {
  const [form, setForm] = useState({
    firstName: employee.firstName || '',
    lastName: employee.lastName || '',
    employeeNumber: employee.employeeNumber || '',
    phone: employee.phone || '',
    pin: '',
    status: employee.status,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...form };
      if (!payload.pin) delete payload.pin; // ריק = לא לשנות PIN קיים
      await api.put(`/admin/employees/${employee.id}`, payload);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="עריכת עובד" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <ErrorState message={error} />
        <div className="form-group">
          <label>שם פרטי</label>
          <input className="form-control" value={form.firstName} onChange={update('firstName')} required />
        </div>
        <div className="form-group">
          <label>שם משפחה</label>
          <input className="form-control" value={form.lastName} onChange={update('lastName')} required />
        </div>
        <div className="form-group">
          <label>מספר עובד</label>
          <input className="form-control" value={form.employeeNumber} onChange={update('employeeNumber')} required />
        </div>
        <div className="form-group">
          <label>טלפון</label>
          <input className="form-control" value={form.phone} onChange={update('phone')} required />
        </div>
        <div className="form-group">
          <label>קוד PIN חדש (השאירו ריק כדי לא לשנות)</label>
          <input className="form-control" value={form.pin} onChange={update('pin')} />
        </div>
        <div className="form-group">
          <label>סטטוס</label>
          <select className="form-control" value={form.status} onChange={update('status')}>
            <option value="ACTIVE">פעיל</option>
            <option value="INACTIVE">לא פעיל</option>
          </select>
        </div>
        <div className="modal-actions">
          <button type="submit" className="btn" disabled={saving}>
            {saving ? 'שומר...' : 'שמירה'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            ביטול
          </button>
        </div>
      </form>
    </Modal>
  );
}
