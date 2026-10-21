import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Customers must sign in AND tick the acceptance notice before any shop page opens.
export default function ProtectedRoute() {
  const { user, ready } = useAuth();
  if (!ready) return <div className="kg-center-msg">Loading&hellip;</div>;
  if (!user || !user.terms_accepted) return <Navigate to="/" replace />;
  return <Outlet />;
}
