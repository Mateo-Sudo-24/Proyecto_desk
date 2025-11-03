// src/routes/PrivateRoute.jsx
import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../context/storeAuth';

/**
 * Mapeo de roles a dashboard correspondiente
 */
const roleRedirect = {
  superadmin: '/dashboard/superadmin',
  admin: '/dashboard/superadmin',
  recepcionista: '/dashboard/reception',
  tecnico: '/dashboard/tech',
  ventas: '/dashboard/sales',
};

const PrivateRoute = ({ allowedRoles = [] }) => {
  const { user } = useAuthStore();

  // Si no hay usuario logueado, manda al login
  if (!user) return <Navigate to="/login" replace />;

  const roles = user?.roles || [];

  // Verifica si tiene acceso a la ruta
  const hasAccess = allowedRoles.length === 0 || roles.some(role => allowedRoles.includes(role));

  if (!hasAccess) {
    // Redirige al dashboard según rol principal
    const primaryRole = roles.find(role => roleRedirect[role]);
    if (primaryRole) return <Navigate to={roleRedirect[primaryRole]} replace />;

    // Si rol desconocido, manda al login
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default PrivateRoute;
