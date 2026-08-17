import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import LoadingState from './LoadingState.jsx';

// עוטף נתיבים שדורשים התחברות, ובאופן אופציונלי הרשאת role מסוימת.
export default function ProtectedRoute({ roles, children }) {
  const { firebaseUser, role, loading } = useAuth();

  if (loading) {
    return <LoadingState text="טוען משתמש..." />;
  }

  if (!firebaseUser) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(role)) {
    return (
      <div className="empty-state">
        אין לך הרשאה לצפות בעמוד זה.
      </div>
    );
  }

  return children;
}
