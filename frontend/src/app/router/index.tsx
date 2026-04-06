import { createBrowserRouter, Navigate } from 'react-router';
import { ERoutes } from '@constants/routes';
import LoginPage from '../../modules/Auth/_pages/LoginPage';
import RegisterPage from '../../modules/Auth/_pages/RegisterPage';
import DashboardPage from '../../modules/Dashboard/_pages/DashboardPage';
import ProtectedRoute from './ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: ERoutes.ROOT,
    element: <Navigate to={ERoutes.DASHBOARD} replace />,
  },
  {
    path: ERoutes.LOGIN,
    element: <LoginPage />,
  },
  {
    path: ERoutes.REGISTER,
    element: <RegisterPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: ERoutes.DASHBOARD,
        element: <DashboardPage />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to={ERoutes.DASHBOARD} replace />,
  },
]);
