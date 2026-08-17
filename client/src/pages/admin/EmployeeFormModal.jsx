import { useState } from 'react';
import Modal from '../../components/Modal.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { api } from '../../services/api.js';

const emptyForm = {
  firstName: '',
  lastName: '',
  employeeNumber: '',
  phone: '',
  pin: '',
  email: '',
};

// מודל להוספת עובד חדש. עריכת עובד קיים מתבצעת בכרטיס העובד.
export default function EmployeeFormModal({ onClose, onCreated }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const created = await api.post('/admin/employees', form);
      onCreated(created);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="הוספת עובד" onClose={onClose}>
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
          <label>קוד PIN (לזיהוי טלפוני)</label>
          <input className="form-control" value={form.pin} onChange={update('pin')} />
        </div>
        <div className="form-group">
          <label>אימייל (ליצירת משתמש התחברות)</label>
          <input type="email" className="form-control" value={form.email} onChange={update('email')} />
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
