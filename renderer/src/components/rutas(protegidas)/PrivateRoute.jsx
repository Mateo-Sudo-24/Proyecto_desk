import { Navigate, Outlet } from "react-router-dom";
import { useProfileStore } from "../../context/storeProfile";

/**
 * Componente de rutas privadas.
 * @param {string[]} allowedRoles - Array de roles permitidos para acceder a la ruta
 */
const PrivateRoute = ({ allowedRoles = [] }) => {
  const user = useProfileStore((state) => state.user);

  // Si no hay usuario logueado, redirige al login
  if (!user || !user.token) {
    return <Navigate to="/login" replace />;
  }

  // Si hay usuario pero su rol no está permitido
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  // Usuario autorizado
  return <Outlet />;
};

export default PrivateRoute;
