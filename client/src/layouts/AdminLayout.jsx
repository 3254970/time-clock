import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export default function AdminLayout() {
  const { logout, profile } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h2>ניהול נוכחות</h2>
        <NavLink to="/admin" end>
          Dashboard
        </NavLink>
        <NavLink to="/admin/employees">עובדים</NavLink>
        <NavLink to="/admin/departments">מחלקות</NavLink>
        <NavLink to="/admin/reports">דוחות</NavLink>
        <button className="link" onClick={logout}>
          התנתקות
        </button>
        {profile?.email && (
          <div style={{ marginTop: 'auto', padding: '10px 8px', fontSize: 13, color: '#6b7280' }}>
            מחובר/ת: {profile.email}
          </div>
        )}
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
