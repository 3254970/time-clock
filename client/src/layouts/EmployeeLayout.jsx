import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export default function EmployeeLayout() {
  const { logout, profile } = useAuth();

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
          <div style={{ marginTop: 'auto', padding: '10px 8px', fontSize: 13, color: '#6b7280' }}>
            מחובר/ת: {profile.fullName}
          </div>
        )}
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
