import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import LoadingState from './LoadingState.jsx';

// עוטף נתיבים שדורשים התחברות, ובאופן אופציונלי הרשאת role מסוימת.
export default function ProtectedRoute({ roles, children }) {
  const { firebaseUser, role, loading } = useAuth();

  if (loading) {
    return <LoadingState text="טוען משתמש..." />;
  }

  // אין משתמש מחובר, או שההתחברות קיימת בדפדפן אך לא נטען עבורה פרופיל תקין
  // מהשרת (למשל טוקן שפג תוקפו / משתמש שנמחק) - מתייחסים לזה כלא-מחובר ומפנים ללוגין.
  if (!firebaseUser || !role) {
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
