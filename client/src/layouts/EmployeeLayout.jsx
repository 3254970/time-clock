import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import ProfileModal from '../components/ProfileModal.jsx';

export default function EmployeeLayout() {
  const { logout, profile } = useAuth();
  const [showProfile, setShowProfile] = useState(false);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h2>נוכחות</h2>
        <NavLink to="/employee" end>
          דף הבית
        </NavLink>
        <NavLink to="/employee/attendance">הנוכחות שלי</NavLink>
        <button className="link" onClick={logout}>
          התנתקות
        </button>
        {profile?.fullName && (
          <button
            type="button"
            onClick={() => setShowProfile(true)}
            style={{
              marginTop: 'auto',
              padding: '10px 8px',
              fontSize: 13,
              color: '#6b7280',
              background: 'none',
              border: 'none',
              textAlign: 'inherit',
              cursor: 'pointer',
            }}
          >
            מחובר/ת: {profile.fullName}
          </button>
        )}
      </aside>
      <main className="main-content">
        <Outlet />
      </main>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </div>
  );
}
