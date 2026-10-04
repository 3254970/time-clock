import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import ProfileModal from '../components/ProfileModal.jsx';
import UserBadge from '../components/UserBadge.jsx';

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
        {profile?.fullName && <UserBadge onClick={() => setShowProfile(true)} />}
      </aside>
      <main className="main-content">
        <Outlet />
      </main>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </div>
  );
}
