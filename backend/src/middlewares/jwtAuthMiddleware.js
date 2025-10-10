// src/middlewares/jwtAuthMiddleware.js
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';

/**
 * Middleware para verificar JWT en las peticiones
 * Extrae el token del header Authorization y valida su autenticidad
 */
export const authenticateJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token de autenticación no proporcionado'
      });
    }

    const token = authHeader.substring(7);

    // Verificar el token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'ecuatechnology-api',
        audience: 'ecuatechnology-desktop-app'
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token expirado. Por favor, inicie sesión nuevamente.',
          code: 'TOKEN_EXPIRED'
        });
      }

      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          error: 'Token inválido',
          code: 'TOKEN_INVALID'
        });
      }

      throw error;
    }

    // Verificar que el usuario sigue activo en la base de datos
    const user = await prisma.user.findUnique({
      where: { UserId: decoded.userId },
      select: {
        UserId: true,
        Username: true,
        Email: true,
        Active: true
      }
    });

    if (!user || !user.Active) {
      return res.status(401).json({
        success: false,
        error: 'Usuario inactivo o no encontrado',
        code: 'USER_INACTIVE'
      });
    }

    // Adjuntar información del usuario al request
    req.user = {
      id: decoded.userId,
      username: decoded.username,
      email: decoded.email,
      roles: decoded.roles
    };

    // Adjuntar también el token decodificado completo
    req.token = decoded;

    next();
  } catch (error) {
    console.error('[JWT AUTH ERROR]', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      error: 'Error al verificar la autenticación'
    });
  }
};

/**
 * Middleware para verificar que el usuario tiene los roles requeridos
 * IMPORTANTE: Debe usarse DESPUÉS de authenticateJWT
 * 
 * @param {string[]} allowedRoles - Array de roles permitidos
 * @returns {Function} Middleware function
 * 
 * @example
 * router.get('/admin/users', authenticateJWT, requireRoles(['Administrador']), controller)
 */
export const requireJWTRoles = (allowedRoles) => {
  return (req, res, next) => {
    // Verificar que el usuario fue autenticado previamente
    if (!req.user || !req.user.roles) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    // Verificar si el usuario tiene alguno de los roles permitidos
    const hasRole = req.user.roles.some(role => allowedRoles.includes(role));

    if (!hasRole) {
      console.log('[AUTHORIZATION FAILED]', {
        userId: req.user.id,
        username: req.user.username,
        userRoles: req.user.roles,
        requiredRoles: allowedRoles,
        path: req.path,
        timestamp: new Date().toISOString()
      });

      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para acceder a este recurso',
        code: 'FORBIDDEN'
      });
    }

    next();
  };
};

/**
 * Middleware opcional para autenticación JWT
 * No falla si no hay token, solo lo valida si existe
 * Útil para rutas que pueden ser públicas o privadas
 */
export const optionalJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No hay token, continuar sin autenticación
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      // Verificar usuario
      const user = await prisma.user.findUnique({
        where: { UserId: decoded.userId },
        select: {
          UserId: true,
          Username: true,
          Email: true,
          Active: true
        }
      });

      if (user && user.Active) {
        req.user = {
          id: decoded.userId,
          username: decoded.username,
          email: decoded.email,
          roles: decoded.roles
        };
      }
    } catch (error) {
      // Token inválido o expirado, continuar sin autenticación
    }

    next();
  } catch (error) {
    console.error('[OPTIONAL JWT ERROR]', error);
    next();
  }
};

/**
 * Middleware para verificar que el usuario solo accede a sus propios recursos
 * Útil para endpoints como /users/:userId donde el usuario solo debe ver sus datos
 * 
 * @param {string} paramName - Nombre del parámetro en la URL (default: 'userId')
 */
export const requireOwnership = (paramName = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    const resourceUserId = parseInt(req.params[paramName]);
    const currentUserId = req.user.id;

    // Administradores pueden acceder a cualquier recurso
    if (req.user.roles.includes('Administrador')) {
      return next();
    }

    // Verificar que el usuario es el dueño del recurso
    if (resourceUserId !== currentUserId) {
      console.log('[OWNERSHIP CHECK FAILED]', {
        currentUserId,
        resourceUserId,
        path: req.path,
        timestamp: new Date().toISOString()
      });

      return res.status(403).json({
        success: false,
        error: 'No tienes permiso para acceder a este recurso',
        code: 'NOT_OWNER'
      });
    }

    next();
  };
};