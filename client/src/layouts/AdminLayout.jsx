import { NavLink, Outlet } from 'react-router-dom';
import SidebarUserMenu from '../components/SidebarUserMenu.jsx';

export default function AdminLayout() {
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
        <SidebarUserMenu />
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
