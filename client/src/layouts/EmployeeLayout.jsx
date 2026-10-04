import { NavLink, Outlet } from 'react-router-dom';
import SidebarUserMenu from '../components/SidebarUserMenu.jsx';

export default function EmployeeLayout() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h2>נוכחות</h2>
        <NavLink to="/employee" end>
          דף הבית
        </NavLink>
        <NavLink to="/employee/attendance">הנוכחות שלי</NavLink>
        <SidebarUserMenu />
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
