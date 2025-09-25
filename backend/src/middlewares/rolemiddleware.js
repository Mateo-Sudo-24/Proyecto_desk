/**
 * Middleware para verificar roles.
 * Lee los roles desde `req.auth.roles` (establecido por el middleware `authenticateHybrid`).
 * DEBE usarse DESPUÉS de `authenticateHybrid`.
 * 
 * @param {string[]} allowedRoles - Un array de nombres de roles permitidos.
 */
export function requireRoles(allowedRoles) {
  return (req, res, next) => {
    // Verifica que el usuario sea un empleado y tenga roles
    if (!req.auth || req.auth.type !== 'employee' || !req.auth.roles) {
      return res.status(403).json({ error: 'Acceso denegado. Esta acción es solo para empleados.' });
    }

    const userRoles = req.auth.roles;
    
    // Comprueba si el empleado tiene al menos uno de los roles requeridos
    const hasAccess = userRoles.some(role => allowedRoles.includes(role));

    if (!hasAccess) {
      return res.status(403).json({ error: 'Acceso denegado. No tienes los permisos necesarios.' });
    }
    
    next();
  };
}