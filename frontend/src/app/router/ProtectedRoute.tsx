import { Navigate, Outlet } from 'react-router';
import { useAppSelector } from '@store/hooks';
import { ERoutes } from '@constants/routes';

function ProtectedRoute() {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to={ERoutes.LOGIN} replace />;
  }
  return <Outlet />;
}

export default ProtectedRoute;
