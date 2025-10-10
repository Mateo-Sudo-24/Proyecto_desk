// src/middlewares/authMiddleware.js (VERSIÓN MEJORADA - Mantiene tu estructura)
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import logger from '../../config/logger.js';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware de Autenticación Híbrido (MEJORADO).
 * 
 * Este middleware es el punto de entrada de seguridad para todas las rutas protegidas.
 * Su trabajo es identificar al usuario sin importar cómo se haya autenticado.
 * 
 * Estrategias que maneja:
 * 1. Token JWT (en la cabecera 'Authorization'): Usado por la aplicación de escritorio (empleados, admins).
 * 2. Sesión con Cookie (`express-session`): Usado por el portal web (clientes).
 * 
 * Si la autenticación es exitosa, crea un objeto `req.auth` unificado que
 * los siguientes middlewares y controladores pueden usar de forma consistente.
 * 
 * MEJORAS sobre versión anterior:
 * - Verifica que usuarios JWT sigan activos en BD
 * - Diferencia entre token expirado vs inválido
 * - Agrega metadata adicional útil (email, username)
 * - Valida issuer/audience del JWT
 * - Mejor manejo de errores con códigos específicos
 * 
 * Ejemplo de req.auth para un empleado: 
 *   { userId: 1, username: 'admin', email: 'admin@empresa.com', roles: ['Administrador'], type: 'employee' }
 * Ejemplo de req.auth para un cliente: 
 *   { clientId: 123, displayName: 'Juan Pérez', email: 'juan@email.com', roles: ['Cliente'], type: 'client' }
 */
export const authenticateHybrid = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const session = req.session;

  // --- Estrategia 1: Autenticación por Token JWT (para Empleados / Admins) ---
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    
    try {
      // Verificamos que el token sea válido, no expirado, y tenga el issuer/audience correcto
      const decodedPayload = jwt.verify(token, JWT_SECRET, {
        issuer: 'ecuatechnology-api',
        audience: 'ecuatechnology-desktop-app'
      });
      
      // 🔒 MEJORA CRÍTICA: Verificar que el usuario sigue activo en la base de datos
      const user = await prisma.user.findUnique({
        where: { UserId: decodedPayload.userId },
        select: {
          UserId: true,
          Username: true,
          Email: true,
          Active: true
        }
      });

      if (!user) {
        logger.warn(`Token JWT válido pero usuario ID ${decodedPayload.userId} no encontrado en BD`);
        return res.status(401).json({ 
          error: 'Usuario no encontrado',
          code: 'USER_NOT_FOUND' 
        });
      }

      if (!user.Active) {
        logger.warn(`Intento de acceso con token JWT de usuario inactivo ID: ${user.UserId}`);
        return res.status(401).json({ 
          error: 'Usuario inactivo. Contacte al administrador.',
          code: 'USER_INACTIVE' 
        });
      }

      // Si todo está bien, creamos el objeto `req.auth` con información completa
      req.auth = { 
        userId: decodedPayload.userId,
        username: user.Username,
        email: user.Email,
        roles: decodedPayload.roles,
        type: 'employee',
        authMethod: 'jwt' // Útil para logging/auditoría
      };

      logger.info(`✓ Acceso JWT exitoso - Usuario: ${user.Username} (ID: ${user.UserId}) | Roles: [${decodedPayload.roles.join(', ')}]`);
      return next(); // Autenticado con éxito, pasamos al siguiente middleware/controlador.
      
    } catch (err) {
      // 🔒 MEJORA: Diferenciamos entre token expirado vs inválido
      if (err.name === 'TokenExpiredError') {
        logger.warn(`Token JWT expirado. Expiró en: ${err.expiredAt}`);
        return res.status(401).json({ 
          error: 'Token expirado. Por favor, inicie sesión nuevamente.',
          code: 'TOKEN_EXPIRED',
          expiredAt: err.expiredAt
        });
      }

      if (err.name === 'JsonWebTokenError') {
        logger.warn(`Token JWT inválido. Razón: ${err.message}`);
        return res.status(401).json({ 
          error: 'Token inválido o malformado',
          code: 'TOKEN_INVALID' 
        });
      }

      // Error inesperado
      logger.error(`Error inesperado al verificar JWT: ${err.message}`, { stack: err.stack });
      return res.status(500).json({ 
        error: 'Error al procesar el token de autenticación',
        code: 'AUTH_ERROR' 
      });
    }
  }

  // --- Estrategia 2: Autenticación por Sesión/Cookie (para Clientes) ---
  if (session && session.clientId) {
    try {
      // ¡Paso de seguridad crucial! Verificamos que el cliente de la sesión todavía exista en la base de datos.
      const client = await prisma.client.findUnique({
        where: { ClientId: session.clientId },
        select: {
          ClientId: true,
          DisplayName: true,
          Email: true
        }
      });
      
      if (client) {
        // 🔒 MEJORA: Agregamos más información útil al req.auth
        req.auth = { 
          clientId: session.clientId,
          displayName: client.DisplayName,
          email: client.Email,
          roles: ['Cliente'], // 🔒 MEJORA: Agregamos rol para consistencia
          type: 'client',
          authMethod: 'session'
        };

        logger.info(`✓ Acceso Session exitoso - Cliente: ${client.DisplayName} (ID: ${client.ClientId})`);
        return next(); // Autenticado con éxito, continuamos.
      } else {
        // La sesión apunta a un cliente que ya no existe. Invalidamos la sesión.
        logger.warn(`⚠ Sesión inválida para clientId: ${session.clientId} (cliente no encontrado). Destruyendo sesión.`);
        req.session.destroy((err) => {
          if (err) {
            logger.error(`Error al destruir sesión inválida: ${err.message}`);
          }
        });
        return res.status(401).json({ 
          error: 'Sesión inválida. Por favor, inicie sesión nuevamente.',
          code: 'SESSION_INVALID' 
        });
      }
    } catch (dbError) {
      logger.error(`Error de base de datos al verificar la sesión del cliente: ${dbError.message}`, { 
        stack: dbError.stack,
        clientId: session.clientId 
      });
      return res.status(500).json({ 
        error: "Error del servidor al verificar la sesión.",
        code: 'DB_ERROR' 
      });
    }
  }

  // --- Fallo de Autenticación ---
  // Si no se encontró ni un Token JWT válido ni una Sesión de cliente válida.
  logger.warn(`⚠ Acceso denegado - IP: ${req.ip} | Path: ${req.path} | Method: ${req.method}`);
  return res.status(401).json({ 
    error: 'Acceso no autorizado. Se requiere autenticación.',
    code: 'UNAUTHENTICATED' 
  });
};

/**
 * Middleware para proteger rutas solo para clientes autenticados.
 * Debe usarse después de authenticateHybrid.
 * 
 * @example
 * router.get('/my-orders', authenticateHybrid, requireClientAuth, getMyOrders);
 */
export function requireClientAuth(req, res, next) {
  if (req.auth && req.auth.type === 'client' && req.auth.clientId) {
    return next();
  }
  
  logger.warn(`Acceso denegado a ruta de cliente - Usuario actual: ${JSON.stringify(req.auth)}`);
  return res.status(403).json({ 
    error: 'Solo clientes autenticados pueden acceder a esta ruta.',
    code: 'CLIENT_ONLY' 
  });
}

/**
 * Middleware para proteger rutas solo para empleados autenticados.
 * Debe usarse después de authenticateHybrid.
 * 
 * @example
 * router.get('/admin/users', authenticateHybrid, requireEmployeeAuth, listUsers);
 */
export function requireEmployeeAuth(req, res, next) {
  if (req.auth && req.auth.type === 'employee' && req.auth.userId) {
    return next();
  }
  
  logger.warn(`Acceso denegado a ruta de empleado - Usuario actual: ${JSON.stringify(req.auth)}`);
  return res.status(403).json({ 
    error: 'Solo empleados autenticados pueden acceder a esta ruta.',
    code: 'EMPLOYEE_ONLY' 
  });
}

/**
 * Middleware de autorización por roles (funciona con autenticación híbrida).
 * Verifica que el usuario tenga uno de los roles permitidos.
 * Debe usarse después de authenticateHybrid.
 * 
 * @param {string[]} allowedRoles - Array de roles permitidos
 * @returns {Function} Middleware function
 * 
 * @example
 * router.delete('/users/:id', authenticateHybrid, requireRoles(['Administrador']), deleteUser);
 */
export const requireRoles = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.auth || !req.auth.roles) {
      logger.warn('Intento de verificación de roles sin autenticación previa');
      return res.status(401).json({
        error: 'Usuario no autenticado',
        code: 'UNAUTHENTICATED'
      });
    }

    // Verificar si el usuario tiene alguno de los roles permitidos
    const userRoles = Array.isArray(req.auth.roles) ? req.auth.roles : [req.auth.roles];
    const hasRole = userRoles.some(role => allowedRoles.includes(role));

    if (!hasRole) {
      logger.warn(`Acceso denegado por roles - Usuario: ${req.auth.username || req.auth.displayName} | Roles actuales: [${userRoles.join(', ')}] | Roles requeridos: [${allowedRoles.join(', ')}]`);
      
      return res.status(403).json({
        error: 'No tienes permisos para acceder a este recurso',
        code: 'FORBIDDEN',
        requiredRoles: allowedRoles
      });
    }

    next();
  };
};

/**
 * Middleware que verifica que el usuario solo accede a sus propios recursos.
 * Útil para endpoints como /users/:userId donde el usuario solo debe ver sus datos.
 * Los administradores pueden acceder a cualquier recurso.
 * 
 * @param {string} paramName - Nombre del parámetro en la URL (default: 'userId')
 * @param {string} userIdField - Campo en req.auth que contiene el ID (default: 'userId')
 * 
 * @example
 * // Cliente accediendo a sus órdenes: /api/client/orders/:clientId
 * router.get('/orders/:clientId', authenticateHybrid, requireOwnership('clientId', 'clientId'), getOrders);
 */
export const requireOwnership = (paramName = 'userId', userIdField = 'userId') => {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({
        error: 'Usuario no autenticado',
        code: 'UNAUTHENTICATED'
      });
    }

    const resourceId = parseInt(req.params[paramName]);
    const currentUserId = req.auth[userIdField];

    // Administradores pueden acceder a cualquier recurso
    if (req.auth.roles && req.auth.roles.includes('Administrador')) {
      logger.info(`Acceso de administrador permitido al recurso ${paramName}=${resourceId}`);
      return next();
    }

    // Verificar que el usuario es el dueño del recurso
    if (resourceId !== currentUserId) {
      logger.warn(`Intento de acceso no autorizado - Usuario ${currentUserId} intentó acceder al recurso ${paramName}=${resourceId}`);
      
      return res.status(403).json({
        error: 'No tienes permiso para acceder a este recurso',
        code: 'NOT_OWNER'
      });
    }

    next();
  };
};