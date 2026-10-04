import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import UserBadge from '../components/UserBadge.jsx';

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
        {profile && <UserBadge />}
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
