import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import heroImage from '../../img/background.png';

export default function LoginPage() {
  const { login, firebaseUser, role, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && firebaseUser && role) {
    const target = role === 'EMPLOYEE' ? '/employee' : '/admin';
    return <Navigate to={target} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError('אימייל או סיסמה שגויים');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div
        className="login-hero"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="login-hero-overlay">
          <div className="login-hero-content">
            <span className="login-hero-badge">מערכת נוכחות</span>
            <h2>ניהול נוכחות חכם, פשוט ומדויק</h2>
            <p>דיווח כניסה ויציאה, מעקב שעות ודוחות מנהלים - הכל במקום אחד.</p>
            <ul className="login-hero-features">
              <li>
                <CheckIcon /> דיווח נוכחות בזמן אמת
              </li>
              <li>
                <CheckIcon /> מעקב שעות עבודה חודשי
              </li>
              <li>
                <CheckIcon /> ניהול עובדים ודוחות מתקדמים
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="login-form-panel">
        <div className="login-card">
          <div className="login-card-header">
            <div className="login-icon">
              <ClockIcon />
            </div>
            <h1>כניסה למערכת</h1>
            <p className="login-subtitle">התחברו כדי להמשיך לחשבון שלכם</p>
          </div>

          {error && (
            <div className="error-state login-error">
              <AlertIcon />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">אימייל</label>
              <div className="input-with-icon">
                <MailIcon />
                <input
                  id="email"
                  type="email"
                  className="form-control"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  autoComplete="username"
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="password">סיסמה</label>
              <div className="input-with-icon">
                <LockIcon />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-control"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="input-icon-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-block login-submit" disabled={submitting}>
              {submitting ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  מתחבר...
                </>
              ) : (
                'התחברות'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-10.5-7-10.5-7a19.4 19.4 0 0 1 4.22-5.44M9.9 4.24A10.7 10.7 0 0 1 12 5c7 0 10.5 7 10.5 7a19.4 19.4 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <path d="M1 1l22 22" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5" />
      <path d="M12 16h.01" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
