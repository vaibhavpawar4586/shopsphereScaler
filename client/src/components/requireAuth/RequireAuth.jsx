import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../../context/auth/useAuth';
import Loader from '../loader/Loader';

/**
 * Wraps routes that need a login. With `roles`, the user must also have one of those roles.
 * Note: this only hides pages in the browser - the API checks permissions on every request.
 */
const RequireAuth = ({ roles }) => {
  const { user, isAuthLoading } = useAuth();
  const location = useLocation();

  if (isAuthLoading) return <Loader />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
};

export default RequireAuth;
