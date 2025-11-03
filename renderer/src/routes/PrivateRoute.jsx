// src/routes/PrivateRoute.jsx
import { Navigate, Outlet } from "react-router-dom";
import useAuthStore from "../context/storeAuth";
import { pagePermissions } from "../helpers/pagePermissions";

/**
 * PrivateRoute protege rutas según los roles permitidos.
 * @param {string} page - nombre de la página (key en pagePermissions)
 */
const PrivateRoute = ({ page }) => {
  const { user } = useAuthStore();

  if (!user) return <Navigate to="/login" replace />;

  const roles = user.roles.map(r => r.toLowerCase());

  // Obtener roles permitidos para la página
  const allowedRoles = pagePermissions[page]?.map(r => r.toLowerCase()) || [];

  const hasAccess =
    allowedRoles.length === 0 || roles.some(role => allowedRoles.includes(role));

  if (!hasAccess) return <Navigate to="/login" replace />;

  return <Outlet />;
};

export default PrivateRoute;
