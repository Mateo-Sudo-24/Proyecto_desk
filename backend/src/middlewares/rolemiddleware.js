// src/middlewares/roleMiddleware.js

/**
 * Middleware mejorado para verificación de roles con soporte híbrido
 * @version 1.0.0
 * @description Soporta empleados y clientes, validación completa, logging y normalización de roles
 */

import logger from '../../config/logger.js';

// Códigos de error específicos
export const ROLE_ERROR_CODES = {
  MISSING_AUTH: 'ROLE_001',
  INVALID_USER_TYPE: 'ROLE_002',
  MISSING_ROLES: 'ROLE_003',
  INSUFFICIENT_PERMISSIONS: 'ROLE_004',
  INVALID_ROLE_FORMAT: 'ROLE_005',
  CLIENT_ACCESS_DENIED: 'ROLE_006',
  UNAUTHORIZED_ACCESS: 'ROLE_007'
};

// Tipos de usuario soportados
export const USER_TYPES = {
  EMPLOYEE: 'employee',
  CLIENT: 'client',
  ANY: 'any'
};

/**
 * Normaliza los roles a un array consistente
 * @param {string|string[]} roles - Roles a normalizar
 * @returns {string[]} Array de roles normalizado
 */
function normalizeRoles(roles) {
  if (!roles) return [];
  
  if (typeof roles === 'string') {
    return [roles.trim()];
  }
  
  if (Array.isArray(roles)) {
    return roles.map(role => typeof role === 'string' ? role.trim() : String(role));
  }
  
  return [String(roles)];
}

/**
 * Valida la estructura de autenticación
 * @param {object} auth - Objeto de autenticación
 * @returns {Object} Resultado de validación
 */
function validateAuthStructure(auth) {
  if (!auth) {
    return { isValid: false, error: 'Estructura de autenticación no encontrada' };
  }
  
  if (!auth.type || !Object.values(USER_TYPES).includes(auth.type)) {
    return { isValid: false, error: 'Tipo de usuario inválido' };
  }
  
  if (auth.type === USER_TYPES.EMPLOYEE && !auth.roles) {
    return { isValid: false, error: 'Roles requeridos para empleados' };
  }
  
  return { isValid: true };
}

/**
 * Middleware principal para verificación de roles
 * @param {Object} options - Opciones de configuración
 * @param {string[]} options.allowedRoles - Roles permitidos
 * @param {string} options.userType - Tipo de usuario requerido (employee, client, any)
 * @param {boolean} options.strictValidation - Validación estricta de roles
 * @returns {Function} Middleware de Express
 */
export function requireAccess(options = {}) {
  const {
    allowedRoles = [],
    userType = USER_TYPES.ANY,
    strictValidation = false
  } = options;

  return (req, res, next) => {
    const requestId = req.id || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    // Log de inicio de verificación
    logger.info('Iniciando verificación de acceso', {
      requestId,
      path: req.path,
      method: req.method,
      userType: req.auth?.type,
      requiredUserType: userType,
      requiredRoles: allowedRoles
    });

    try {
      // 1. Validación de entrada completa
      if (!req.auth) {
        logger.warn('Intento de acceso sin autenticación', {
          requestId,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });

        return res.status(401).json({
          success: false,
          error: {
            code: ROLE_ERROR_CODES.MISSING_AUTH,
            message: 'Autenticación requerida',
            details: 'El usuario debe estar autenticado para acceder a este recurso'
          },
          timestamp: new Date().toISOString()
        });
      }

      // 2. Validación de estructura de auth
      const authValidation = validateAuthStructure(req.auth);
      if (!authValidation.isValid) {
        logger.warn('Estructura de autenticación inválida', {
          requestId,
          auth: req.auth,
          error: authValidation.error
        });

        return res.status(400).json({
          success: false,
          error: {
            code: ROLE_ERROR_CODES.INVALID_USER_TYPE,
            message: 'Estructura de autenticación inválida',
            details: authValidation.error
          },
          timestamp: new Date().toISOString()
        });
      }

      // 3. Verificación de tipo de usuario
      if (userType !== USER_TYPES.ANY && req.auth.type !== userType) {
        logger.warn('Tipo de usuario incorrecto', {
          requestId,
          actualType: req.auth.type,
          requiredType: userType
        });

        return res.status(403).json({
          success: false,
          error: {
            code: ROLE_ERROR_CODES.INVALID_USER_TYPE,
            message: 'Tipo de usuario no permitido',
            details: `Se requiere tipo de usuario: ${userType}`
          },
          timestamp: new Date().toISOString()
        });
      }

      // 4. Normalización y validación de roles
      const normalizedAllowedRoles = normalizeRoles(allowedRoles);
      const normalizedUserRoles = normalizeRoles(req.auth.roles);

      if (strictValidation && normalizedAllowedRoles.length === 0) {
        logger.warn('Configuración de roles inválida en modo estricto', {
          requestId,
          allowedRoles
        });

        return res.status(500).json({
          success: false,
          error: {
            code: ROLE_ERROR_CODES.INVALID_ROLE_FORMAT,
            message: 'Configuración de roles inválida',
            details: 'Se requieren roles específicos en modo estricto'
          },
          timestamp: new Date().toISOString()
        });
      }

      // 5. Lógica de verificación de acceso
      let hasAccess = false;

      if (req.auth.type === USER_TYPES.CLIENT) {
        // Clientes: acceso basado en propiedad o reglas específicas
        hasAccess = verifyClientAccess(req, normalizedAllowedRoles);
      } else if (req.auth.type === USER_TYPES.EMPLOYEE) {
        // Empleados: acceso basado en roles
        if (normalizedAllowedRoles.length > 0) {
          hasAccess = normalizedUserRoles.some(role => 
            normalizedAllowedRoles.includes(role)
          );
        } else {
          // Si no hay roles específicos, cualquier empleado tiene acceso
          hasAccess = true;
        }
      }

      // 6. Decisión final de acceso
      if (!hasAccess) {
        const accessDeniedData = {
          requestId,
          userId: req.auth.userId,
          userType: req.auth.type,
          userRoles: normalizedUserRoles,
          requiredRoles: normalizedAllowedRoles,
          path: req.path,
          method: req.method,
          processingTime: Date.now() - startTime
        };

        logger.warn('Acceso denegado por permisos insuficientes', accessDeniedData);

        return res.status(403).json({
          success: false,
          error: {
            code: req.auth.type === USER_TYPES.CLIENT 
              ? ROLE_ERROR_CODES.CLIENT_ACCESS_DENIED 
              : ROLE_ERROR_CODES.INSUFFICIENT_PERMISSIONS,
            message: req.auth.type === USER_TYPES.CLIENT 
              ? 'Acceso denegado para clientes' 
              : 'Permisos insuficientes',
            details: `Se requieren los roles: ${normalizedAllowedRoles.join(', ')}`
          },
          timestamp: new Date().toISOString()
        });
      }

      // 7. Log de acceso exitoso
      logger.info('Verificación de acceso exitosa', {
        requestId,
        userId: req.auth.userId,
        userType: req.auth.type,
        processingTime: Date.now() - startTime
      });

      next();

    } catch (error) {
      // 8. Manejo de errores inesperados
      logger.error('Error en middleware de roles', {
        requestId,
        error: error.message,
        stack: error.stack,
        auth: req.auth
      });

      return res.status(500).json({
        success: false,
        error: {
          code: ROLE_ERROR_CODES.UNAUTHORIZED_ACCESS,
          message: 'Error interno en verificación de permisos',
          details: 'Contacte al administrador del sistema'
        },
        timestamp: new Date().toISOString()
      });
    }
  };
}

/**
 * Verifica acceso para clientes (lógica específica de negocio)
 * @param {Object} req - Request de Express
 * @param {string[]} allowedRoles - Roles permitidos
 * @returns {boolean} True si tiene acceso
 */
function verifyClientAccess(req, allowedRoles) {
  // Lógica específica para verificación de clientes
  // Por ejemplo, verificar propiedad de recursos
  
  // Si hay roles específicos para clientes, verificarlos
  if (allowedRoles.length > 0 && req.auth.roles) {
    const userRoles = normalizeRoles(req.auth.roles);
    return userRoles.some(role => allowedRoles.includes(role));
  }
  
  // Por defecto, los clientes autenticados tienen acceso
  return true;
}

// ========================================
// MIDDLEWARES ESPECIALIZADOS (7 variantes)
// ========================================

/**
 * 1. Middleware solo para empleados con roles específicos
 */
export function requireEmployeeRoles(allowedRoles) {
  return requireAccess({
    allowedRoles,
    userType: USER_TYPES.EMPLOYEE,
    strictValidation: true
  });
}

/**
 * 2. Middleware para cualquier usuario autenticado (empleado o cliente)
 */
export function requireAnyAuth() {
  return requireAccess({
    userType: USER_TYPES.ANY
  });
}

/**
 * 3. Middleware específico para clientes
 */
export function requireClientAuth() {
  return requireAccess({
    userType: USER_TYPES.CLIENT
  });
}

/**
 * 4. Middleware para empleados (cualquier rol)
 */
export function requireEmployeeAuth() {
  return requireAccess({
    userType: USER_TYPES.EMPLOYEE
  });
}

/**
 * 5. Middleware para roles administrativos
 */
export function requireAdmin() {
  return requireAccess({
    allowedRoles: ['admin', 'superadmin', 'administrator'],
    userType: USER_TYPES.EMPLOYEE,
    strictValidation: true
  });
}

/**
 * 6. Middleware para roles de supervisión
 */
export function requireSupervisor() {
  return requireAccess({
    allowedRoles: ['supervisor', 'manager', 'admin', 'superadmin'],
    userType: USER_TYPES.EMPLOYEE,
    strictValidation: true
  });
}

/**
 * 7. Middleware para roles técnicos/especializados
 */
export function requireTechnical() {
  return requireAccess({
    allowedRoles: ['technician', 'specialist', 'engineer', 'admin', 'superadmin'],
    userType: USER_TYPES.EMPLOYEE,
    strictValidation: true
  });
}

// ========================================
// UTILIDADES ADICIONALES
// ========================================

/**
 * Middleware para verificar propiedad de recurso (clientes)
 */
export function requireResourceOwnership(resourceType, idParam = 'id') {
  return (req, res, next) => {
    if (req.auth.type !== USER_TYPES.CLIENT) {
      return next();
    }

    const resourceId = req.params[idParam];
    const userId = req.auth.userId;

    // Aquí se implementaría la lógica para verificar propiedad
    // Por ejemplo, verificar en base de datos si el recurso pertenece al usuario
    
    logger.info('Verificación de propiedad de recurso', {
      resourceType,
      resourceId,
      userId,
      clientId: req.auth.clientId
    });

    // Por ahora, permitimos el acceso (implementar lógica real según necesidades)
    next();
  };
}

/**
 * Decorador para agregar metadatos de permisos a las rutas
 */
export function withPermissions(permissions) {
  return (target, propertyName, descriptor) => {
    if (descriptor) {
      descriptor.value._permissions = permissions;
    }
    return descriptor;
  };
}

export default {
  requireAccess,
  requireEmployeeRoles,
  requireAnyAuth,
  requireClientAuth,
  requireEmployeeAuth,
  requireAdmin,
  requireSupervisor,
  requireTechnical,
  requireResourceOwnership,
  ROLE_ERROR_CODES,
  USER_TYPES
};