import { useState } from 'react';
import Modal from './Modal.jsx';
import ErrorState from './ErrorState.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { api } from '../services/api.js';

// חלון פרטים אישיים: שינוי שם, טלפון, אימייל וסיסמה של המשתמש המחובר.
export default function ProfileModal({ onClose }) {
  const { profile, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [firstName, setFirstName] = useState(profile?.firstName || '');
  const [lastName, setLastName] = useState(profile?.lastName || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password && password !== confirmPassword) {
      setError('הסיסמאות אינן תואמות');
      return;
    }
    if (password && password.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }

    setSaving(true);
    try {
      const payload = { firstName, lastName, phone, email };
      if (password) payload.password = password;
      await api.put('/auth/me', payload);
      await refreshProfile();
      showToast('הפרטים נשמרו בהצלחה', 'success');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="פרטים אישיים" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <ErrorState message={error} />

        <div className="form-group">
          <label htmlFor="profileFirstName">שם פרטי</label>
          <input
            id="profileFirstName"
            type="text"
            className="form-control"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="profileLastName">שם משפחה</label>
          <input
            id="profileLastName"
            type="text"
            className="form-control"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="profilePhone">טלפון</label>
          <input
            id="profilePhone"
            type="tel"
            className="form-control"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="profileEmail">אימייל</label>
          <input
            id="profileEmail"
            type="email"
            className="form-control"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="profilePassword">סיסמה חדשה (אופציונלי)</label>
          <input
            id="profilePassword"
            type="password"
            className="form-control"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="השאירו ריק אם אין צורך לשנות"
            autoComplete="new-password"
          />
        </div>

        {password && (
          <div className="form-group">
            <label htmlFor="profileConfirmPassword">אימות סיסמה חדשה</label>
            <input
              id="profileConfirmPassword"
              type="password"
              className="form-control"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        )}

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
