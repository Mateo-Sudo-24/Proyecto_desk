// src/middlewares/roleMiddleware.js

/**
 * Middleware de verificación de roles para Sistema Ecuatechnology
 * @version 2.0.0
 * @description Sistema híbrido JWT (empleados) + Session (clientes)
 * Roles: Administrador, Recepcionista, Staff Técnico, Staff Ventas, Cliente
 */

import logger from '../../config/logger.js';

// ========================================
// CONSTANTES DEL SISTEMA
// ========================================

/**
 * Códigos de error específicos del sistema
 */
export const ROLE_ERROR_CODES = {
  MISSING_AUTH: 'ROLE_001',
  INVALID_USER_TYPE: 'ROLE_002',
  MISSING_ROLES: 'ROLE_003',
  INSUFFICIENT_PERMISSIONS: 'ROLE_004',
  INVALID_ROLE_FORMAT: 'ROLE_005',
  CLIENT_ACCESS_DENIED: 'ROLE_006',
  EMPLOYEE_ACCESS_DENIED: 'ROLE_007',
  UNAUTHORIZED_ACCESS: 'ROLE_008',
  RESOURCE_NOT_OWNED: 'ROLE_009'
};

/**
 * Tipos de usuario en el sistema
 */
export const USER_TYPES = {
  EMPLOYEE: 'employee',
  CLIENT: 'client',
  ANY: 'any'
};

/**
 * Roles definidos en el sistema (según tu BD)
 */
export const SYSTEM_ROLES = {
  // Roles de empleados
  ADMIN: 'Administrador',
  RECEPTIONIST: 'Recepcionista',
  TECHNICIAN: 'Staff Técnico',
  SALES: 'Staff Ventas',
  
  // Rol de cliente
  CLIENT: 'Cliente'
};

/**
 * Jerarquía de roles (para herencia de permisos)
 * Admin tiene todos los permisos
 */
const ROLE_HIERARCHY = {
  [SYSTEM_ROLES.ADMIN]: [
    SYSTEM_ROLES.ADMIN,
    SYSTEM_ROLES.RECEPTIONIST,
    SYSTEM_ROLES.TECHNICIAN,
    SYSTEM_ROLES.SALES
  ],
  [SYSTEM_ROLES.RECEPTIONIST]: [SYSTEM_ROLES.RECEPTIONIST],
  [SYSTEM_ROLES.TECHNICIAN]: [SYSTEM_ROLES.TECHNICIAN],
  [SYSTEM_ROLES.SALES]: [SYSTEM_ROLES.SALES],
  [SYSTEM_ROLES.CLIENT]: [SYSTEM_ROLES.CLIENT]
};

// ========================================
// FUNCIONES AUXILIARES
// ========================================

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
 * @param {object} auth - Objeto de autenticación (req.auth)
 * @returns {Object} Resultado de validación
 */
function validateAuthStructure(auth) {
  if (!auth) {
    return { 
      isValid: false, 
      error: 'Estructura de autenticación no encontrada',
      code: ROLE_ERROR_CODES.MISSING_AUTH
    };
  }
  
  if (!auth.type || !Object.values(USER_TYPES).includes(auth.type)) {
    return { 
      isValid: false, 
      error: 'Tipo de usuario inválido',
      code: ROLE_ERROR_CODES.INVALID_USER_TYPE
    };
  }
  
  // Empleados deben tener roles
  if (auth.type === USER_TYPES.EMPLOYEE && !auth.roles) {
    return { 
      isValid: false, 
      error: 'Roles requeridos para empleados',
      code: ROLE_ERROR_CODES.MISSING_ROLES
    };
  }
  
  // Clientes deben tener clientId
  if (auth.type === USER_TYPES.CLIENT && !auth.clientId) {
    return { 
      isValid: false, 
      error: 'ClientId requerido para clientes',
      code: ROLE_ERROR_CODES.INVALID_USER_TYPE
    };
  }
  
  return { isValid: true };
}

/**
 * Expande roles según jerarquía (Admin hereda todos los permisos)
 * @param {string[]} userRoles - Roles del usuario
 * @returns {string[]} Roles expandidos con herencia
 */
function expandRolesWithHierarchy(userRoles) {
  const expandedRoles = new Set();
  
  userRoles.forEach(role => {
    if (ROLE_HIERARCHY[role]) {
      ROLE_HIERARCHY[role].forEach(inheritedRole => {
        expandedRoles.add(inheritedRole);
      });
    } else {
      expandedRoles.add(role);
    }
  });
  
  return Array.from(expandedRoles);
}

/**
 * Verifica acceso para clientes (lógica específica de negocio)
 * @param {Object} req - Request de Express
 * @param {string[]} allowedRoles - Roles permitidos
 * @returns {boolean} True si tiene acceso
 */
function verifyClientAccess(req, allowedRoles) {
  // Si no hay roles específicos, cualquier cliente autenticado tiene acceso
  if (allowedRoles.length === 0) {
    return true;
  }
  
  // Si hay roles específicos para clientes, verificarlos
  if (req.auth.roles) {
    const userRoles = normalizeRoles(req.auth.roles);
    return userRoles.some(role => allowedRoles.includes(role));
  }
  
  // Por defecto, clientes con rol 'Cliente' tienen acceso
  return allowedRoles.includes(SYSTEM_ROLES.CLIENT);
}

// ========================================
// MIDDLEWARE PRINCIPAL
// ========================================

/**
 * Middleware principal para verificación de roles y permisos
 * 
 * @param {Object} options - Opciones de configuración
 * @param {string[]} options.allowedRoles - Roles permitidos para acceder
 * @param {string} options.userType - Tipo de usuario requerido (employee, client, any)
 * @param {boolean} options.strictValidation - Validación estricta de roles
 * @param {boolean} options.useHierarchy - Usar jerarquía de roles (Admin tiene todos)
 * @returns {Function} Middleware de Express
 * 
 * @example
 * // Solo administradores
 * router.delete('/users/:id', requireAccess({ 
 *   allowedRoles: [SYSTEM_ROLES.ADMIN], 
 *   userType: USER_TYPES.EMPLOYEE 
 * }), deleteUser);
 * 
 * // Administradores o Recepcionistas
 * router.post('/orders', requireAccess({ 
 *   allowedRoles: [SYSTEM_ROLES.ADMIN, SYSTEM_ROLES.RECEPTIONIST] 
 * }), createOrder);
 */
export function requireAccess(options = {}) {
  const {
    allowedRoles = [],
    userType = USER_TYPES.ANY,
    strictValidation = false,
    useHierarchy = true // Admin hereda permisos por defecto
  } = options;

  return (req, res, next) => {
    const requestId = req.id || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    // Log de inicio de verificación
    logger.debug('Iniciando verificación de acceso', {
      requestId,
      path: req.path,
      method: req.method,
      userType: req.auth?.type,
      requiredUserType: userType,
      requiredRoles: allowedRoles
    });

    try {
      // 1. Validación de autenticación
      if (!req.auth) {
        logger.warn('Intento de acceso sin autenticación', {
          requestId,
          path: req.path,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });

        return res.status(401).json({
          success: false,
          error: 'No autenticado. Por favor, inicie sesión.',
          code: ROLE_ERROR_CODES.MISSING_AUTH,
          timestamp: new Date().toISOString()
        });
      }

      // 2. Validación de estructura de auth
      const authValidation = validateAuthStructure(req.auth);
      if (!authValidation.isValid) {
        logger.warn('Estructura de autenticación inválida', {
          requestId,
          error: authValidation.error,
          authType: req.auth?.type
        });

        return res.status(400).json({
          success: false,
          error: authValidation.error,
          code: authValidation.code,
          timestamp: new Date().toISOString()
        });
      }

      // 3. Verificación de tipo de usuario
      if (userType !== USER_TYPES.ANY && req.auth.type !== userType) {
        const errorMessage = req.auth.type === USER_TYPES.CLIENT
          ? 'Esta acción es solo para empleados.'
          : 'Esta acción es solo para clientes.';
        
        logger.warn('Tipo de usuario incorrecto', {
          requestId,
          actualType: req.auth.type,
          requiredType: userType,
          path: req.path
        });

        return res.status(403).json({
          success: false,
          error: errorMessage,
          code: req.auth.type === USER_TYPES.CLIENT 
            ? ROLE_ERROR_CODES.CLIENT_ACCESS_DENIED 
            : ROLE_ERROR_CODES.EMPLOYEE_ACCESS_DENIED,
          timestamp: new Date().toISOString()
        });
      }

      // 4. Normalización de roles
      const normalizedAllowedRoles = normalizeRoles(allowedRoles);
      const normalizedUserRoles = normalizeRoles(req.auth.roles);

      // Validación estricta: se requieren roles específicos
      if (strictValidation && normalizedAllowedRoles.length === 0) {
        logger.error('Configuración de roles inválida en modo estricto', {
          requestId,
          allowedRoles,
          path: req.path
        });

        return res.status(500).json({
          success: false,
          error: 'Configuración de permisos inválida. Contacte al administrador.',
          code: ROLE_ERROR_CODES.INVALID_ROLE_FORMAT,
          timestamp: new Date().toISOString()
        });
      }

      // 5. Lógica de verificación de acceso
      let hasAccess = false;

      if (req.auth.type === USER_TYPES.CLIENT) {
        // CLIENTES: Verificación específica para clientes
        hasAccess = verifyClientAccess(req, normalizedAllowedRoles);
        
      } else if (req.auth.type === USER_TYPES.EMPLOYEE) {
        // EMPLEADOS: Verificación basada en roles
        
        if (normalizedAllowedRoles.length === 0) {
          // Sin roles específicos, cualquier empleado tiene acceso
          hasAccess = true;
        } else {
          // Expandir roles con jerarquía si está habilitado
          const rolesToCheck = useHierarchy 
            ? expandRolesWithHierarchy(normalizedUserRoles)
            : normalizedUserRoles;
          
          hasAccess = rolesToCheck.some(role => 
            normalizedAllowedRoles.includes(role)
          );
        }
      }

      // 6. Decisión final de acceso
      if (!hasAccess) {
        logger.warn('Acceso denegado por permisos insuficientes', {
          requestId,
          userId: req.auth.userId || req.auth.clientId,
          userType: req.auth.type,
          userRoles: normalizedUserRoles.join(', '),
          requiredRoles: normalizedAllowedRoles.join(', '),
          path: req.path,
          method: req.method,
          processingTime: Date.now() - startTime
        });

        return res.status(403).json({
          success: false,
          error: 'No tienes permisos para acceder a este recurso.',
          code: ROLE_ERROR_CODES.INSUFFICIENT_PERMISSIONS,
          requiredRoles: normalizedAllowedRoles,
          timestamp: new Date().toISOString()
        });
      }

      // 7. Log de acceso exitoso
      logger.info('Verificación de acceso exitosa', {
        requestId,
        userId: req.auth.userId || req.auth.clientId,
        username: req.auth.username || req.auth.displayName,
        userType: req.auth.type,
        roles: normalizedUserRoles.join(', '),
        path: req.path,
        processingTime: `${Date.now() - startTime}ms`
      });

      // Agregar información de permisos al request para uso posterior
      req.permissions = {
        roles: normalizedUserRoles,
        expandedRoles: useHierarchy ? expandRolesWithHierarchy(normalizedUserRoles) : normalizedUserRoles,
        isAdmin: normalizedUserRoles.includes(SYSTEM_ROLES.ADMIN)
      };

      next();

    } catch (error) {
      // 8. Manejo de errores inesperados
      logger.error('Error en middleware de roles', {
        requestId,
        error: error.message,
        stack: error.stack,
        auth: {
          type: req.auth?.type,
          userId: req.auth?.userId || req.auth?.clientId
        }
      });

      return res.status(500).json({
        success: false,
        error: 'Error interno en verificación de permisos. Contacte al administrador.',
        code: ROLE_ERROR_CODES.UNAUTHORIZED_ACCESS,
        timestamp: new Date().toISOString()
      });
    }
  };
}

// ========================================
// MIDDLEWARES ESPECIALIZADOS
// ========================================

/**
 * 1. Middleware para roles específicos de empleados
 * Bloquea clientes automáticamente
 * 
 * @param {string[]} allowedRoles - Roles permitidos
 * @example
 * router.post('/orders', requireEmployeeRoles([SYSTEM_ROLES.RECEPTIONIST, SYSTEM_ROLES.ADMIN]), createOrder);
 */
export function requireEmployeeRoles(allowedRoles) {
  return requireAccess({
    allowedRoles,
    userType: USER_TYPES.EMPLOYEE,
    strictValidation: true,
    useHierarchy: true
  });
}

/**
 * 2. Middleware para cualquier empleado autenticado
 * No requiere roles específicos
 */
export function requireEmployeeAuth() {
  return requireAccess({
    userType: USER_TYPES.EMPLOYEE,
    useHierarchy: false
  });
}

/**
 * 3. Middleware solo para clientes autenticados
 * Bloquea empleados automáticamente
 */
export function requireClientAuth() {
  return requireAccess({
    userType: USER_TYPES.CLIENT
  });
}

/**
 * 4. Middleware para cualquier usuario autenticado
 * Permite tanto empleados como clientes
 */
export function requireAnyAuth() {
  return requireAccess({
    userType: USER_TYPES.ANY
  });
}

/**
 * 5. Middleware solo para administradores
 * Atajo para requireEmployeeRoles([SYSTEM_ROLES.ADMIN])
 */
export function requireAdmin() {
  return requireAccess({
    allowedRoles: [SYSTEM_ROLES.ADMIN],
    userType: USER_TYPES.EMPLOYEE,
    strictValidation: true,
    useHierarchy: false // Admin explícito
  });
}

/**
 * 6. Middleware para roles de recepción
 * Permite: Administrador, Recepcionista
 */
export function requireReception() {
  return requireAccess({
    allowedRoles: [SYSTEM_ROLES.ADMIN, SYSTEM_ROLES.RECEPTIONIST],
    userType: USER_TYPES.EMPLOYEE,
    strictValidation: true,
    useHierarchy: true
  });
}

/**
 * 7. Middleware para roles técnicos
 * Permite: Administrador, Staff Técnico
 */
export function requireTechnical() {
  return requireAccess({
    allowedRoles: [SYSTEM_ROLES.ADMIN, SYSTEM_ROLES.TECHNICIAN],
    userType: USER_TYPES.EMPLOYEE,
    strictValidation: true,
    useHierarchy: true
  });
}

/**
 * 8. Middleware para roles de ventas
 * Permite: Administrador, Staff Ventas
 */
export function requireSales() {
  return requireAccess({
    allowedRoles: [SYSTEM_ROLES.ADMIN, SYSTEM_ROLES.SALES],
    userType: USER_TYPES.EMPLOYEE,
    strictValidation: true,
    useHierarchy: true
  });
}

/**
 * 9. Middleware híbrido: Empleados con roles específicos O clientes
 * Útil para endpoints compartidos con lógica diferente
 * 
 * @param {string[]} employeeRoles - Roles permitidos para empleados
 * @param {boolean} allowClients - Si se permite acceso a clientes
 * 
 * @example
 * // Empleados (Admin, Ventas) y Clientes pueden ver órdenes
 * router.get('/orders/:id', 
 *   requireHybridRoles([SYSTEM_ROLES.ADMIN, SYSTEM_ROLES.SALES], true), 
 *   getOrder
 * );
 */
export function requireHybridRoles(employeeRoles = [], allowClients = false) {
  return (req, res, next) => {
    // Si es empleado, verificar roles
    if (req.auth && req.auth.type === USER_TYPES.EMPLOYEE) {
      return requireEmployeeRoles(employeeRoles)(req, res, next);
    }
    
    // Si es cliente, verificar si están permitidos
    if (req.auth && req.auth.type === USER_TYPES.CLIENT) {
      if (!allowClients) {
        return res.status(403).json({
          success: false,
          error: 'Esta acción no está disponible para clientes.',
          code: ROLE_ERROR_CODES.CLIENT_ACCESS_DENIED
        });
      }
      return requireClientAuth()(req, res, next);
    }
    
    // Sin autenticación
    return res.status(401).json({
      success: false,
      error: 'No autenticado.',
      code: ROLE_ERROR_CODES.MISSING_AUTH
    });
  };
}

/**
 * 10. Middleware para verificar propiedad de recurso (clientes)
 * Los clientes solo pueden acceder a sus propios recursos
 * Los empleados (Admin) pueden acceder a cualquier recurso
 * 
 * @param {string} resourceIdParam - Nombre del parámetro en la URL que contiene el ID del recurso
 * @param {string} ownerField - Campo en req.auth que contiene el ID del propietario
 * 
 * @example
 * // Cliente solo puede ver sus propias órdenes
 * router.get('/orders/:orderId', 
 *   authenticateHybrid,
 *   requireResourceOwnership('orderId', 'clientId'),
 *   getOrderDetails
 * );
 */
export function requireResourceOwnership(resourceIdParam = 'id', ownerField = 'clientId') {
  return async (req, res, next) => {
    // Empleados (especialmente Admin) pueden acceder a cualquier recurso
    if (req.auth.type === USER_TYPES.EMPLOYEE) {
      logger.debug('Empleado accediendo a recurso - propiedad no verificada', {
        userId: req.auth.userId,
        username: req.auth.username,
        resource: resourceIdParam
      });
      return next();
    }

    // Clientes: verificar propiedad
    if (req.auth.type === USER_TYPES.CLIENT) {
      const resourceId = req.params[resourceIdParam];
      const ownerId = req.auth[ownerField];

      if (!ownerId) {
        logger.warn('Cliente sin ID de propietario en auth', {
          clientId: req.auth.clientId,
          ownerField
        });
        
        return res.status(403).json({
          success: false,
          error: 'Sesión de cliente inválida.',
          code: ROLE_ERROR_CODES.INVALID_USER_TYPE
        });
      }

      // En este punto, el controlador debe verificar en la BD
      // que el recurso pertenece al cliente
      // Por ahora, pasamos la información para que el controlador lo verifique
      req.resourceOwnership = {
        resourceId,
        ownerId,
        resourceIdParam,
        ownerField,
        mustVerify: true
      };

      logger.debug('Cliente accediendo a recurso - verificación de propiedad requerida', {
        clientId: ownerId,
        resourceId,
        resourceIdParam
      });

      return next();
    }

    // Tipo de usuario no reconocido
    return res.status(403).json({
      success: false,
      error: 'Tipo de usuario no reconocido.',
      code: ROLE_ERROR_CODES.INVALID_USER_TYPE
    });
  };
}

// ========================================
// EXPORTACIONES
// ========================================

export default {
  // Middleware principal
  requireAccess,
  
  // Middlewares especializados
  requireEmployeeRoles,
  requireEmployeeAuth,
  requireClientAuth,
  requireAnyAuth,
  requireAdmin,
  requireReception,
  requireTechnical,
  requireSales,
  requireHybridRoles,
  requireResourceOwnership,
  
  // Constantes
  ROLE_ERROR_CODES,
  USER_TYPES,
  SYSTEM_ROLES
};