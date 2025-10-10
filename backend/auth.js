// src/routes/auth.js (Autenticación JWT para Empleados - App de Escritorio)
import express from 'express';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { validate, schemas, sanitizeRequest } from '../middleware/validator.js';

const prisma = new PrismaClient();
const router = express.Router();

// --- CONSTANTES ---
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Credenciales inválidas o usuario inactivo',
  USER_NOT_FOUND: 'Usuario no encontrado',
  TOKEN_GENERATION_FAILED: 'Error al generar token de autenticación',
  INTERNAL_ERROR: 'Ha ocurrido un error interno. Por favor, intente nuevamente.'
};

// --- UTILIDADES ---

/**
 * Logger centralizado para errores de autenticación
 */
const logAuthError = (context, error, metadata = {}) => {
  console.error(`[AUTH ERROR - ${context}]`, {
    message: error.message,
    stack: error.stack,
    ...metadata,
    timestamp: new Date().toISOString()
  });
};

/**
 * Wrapper para manejar errores async
 */
const asyncHandler = (fn) => {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      logAuthError(fn.name, error, { 
        body: { username: req.body?.username },
        ip: req.ip 
      });
      
      const message = process.env.NODE_ENV === 'production' 
        ? ERROR_MESSAGES.INTERNAL_ERROR 
        : error.message;
      
      res.status(error.statusCode || 500).json({ 
        success: false,
        error: message 
      });
    }
  };
};

/**
 * Genera un JWT con payload seguro
 */
const generateToken = (user, roles) => {
  try {
    const payload = {
      userId: user.UserId,
      username: user.Username,
      email: user.Email,
      roles,
      iat: Math.floor(Date.now() / 1000)
    };

    const token = jwt.sign(payload, JWT_SECRET, { 
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'ecuatechnology-api',
      audience: 'ecuatechnology-desktop-app'
    });

    return token;
  } catch (error) {
    logAuthError('generateToken', error, { userId: user.UserId });
    throw new Error(ERROR_MESSAGES.TOKEN_GENERATION_FAILED);
  }
};

/**
 * Verifica las credenciales del usuario con protección contra timing attacks
 */
const verifyCredentials = async (username, password) => {
  const user = await prisma.user.findUnique({
    where: { Username: username },
    include: { 
      userRoles: { 
        include: { 
          role: {
            select: {
              RoleId: true,
              Name: true,
              Description: true
            }
          } 
        } 
      } 
    }
  });

  // Siempre ejecutar bcrypt.compare incluso si el usuario no existe
  // para prevenir timing attacks
  const dummyHash = '$2b$12$dummyhashtopreventtimingattacks1234567890';
  const passwordHash = user?.PasswordHash?.toString() || dummyHash;
  
  const isValidPassword = await bcrypt.compare(password, passwordHash);

  // Verificar que el usuario existe, está activo y la contraseña es correcta
  if (!user || !user.Active || !isValidPassword) {
    // Delay adicional para prevenir timing attacks
    await new Promise(resolve => setTimeout(resolve, 1000));
    return null;
  }

  return user;
};

// --- RATE LIMITING ---

/**
 * Rate limiter estricto para intentos de login
 * 5 intentos cada 15 minutos por IP
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logAuthError('loginLimiter', new Error('Rate limit exceeded'), {
      ip: req.ip,
      username: req.body?.username
    });
    
    res.status(429).json({
      success: false,
      error: 'Demasiados intentos de inicio de sesión. Por favor, intente nuevamente en 15 minutos.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  },
  // Rate limit por IP + username para ser más estricto
  keyGenerator: (req) => {
    return `${req.ip}-${req.body?.username || 'unknown'}`;
  }
});

/**
 * Rate limiter para refresh token
 * 20 intentos cada 15 minutos
 */
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Demasiadas solicitudes de renovación de token.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

// --- MIDDLEWARE GLOBAL ---
router.use(sanitizeRequest);

// --- RUTAS ---

/**
 * POST /api/auth/login
 * Autentica un empleado y devuelve un JWT
 * 
 * @body {string} username - Nombre de usuario (WorkId)
 * @body {string} password - Contraseña
 * @returns {object} Token JWT y datos del usuario
 */
router.post('/login', loginLimiter, validate(schemas.login), asyncHandler(async (req, res) => {
  const { workId: username, password } = req.body;

  // Verificar credenciales
  const user = await verifyCredentials(username, password);

  if (!user) {
    const error = new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
    error.statusCode = 401;
    throw error;
  }

  // Extraer roles
  const roles = user.userRoles.map(ur => ur.role.Name);

  // Verificar que tenga al menos un rol
  if (roles.length === 0) {
    logAuthError('login', new Error('User without roles'), { 
      userId: user.UserId,
      username: user.Username 
    });
    
    const error = new Error('Usuario sin roles asignados. Contacte al administrador.');
    error.statusCode = 403;
    throw error;
  }

  // Generar JWT
  const token = generateToken(user, roles);

  // Log exitoso de autenticación
  console.log('[AUTH SUCCESS]', {
    userId: user.UserId,
    username: user.Username,
    roles,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Actualizar último login (opcional, en background)
  prisma.user.update({
    where: { UserId: user.UserId },
    data: { LastLogin: new Date() }
  }).catch(error => {
    logAuthError('updateLastLogin', error, { userId: user.UserId });
  });

  res.json({ 
    success: true,
    message: 'Autenticación exitosa',
    data: {
      token,
      user: { 
        id: user.UserId, 
        username: user.Username,
        email: user.Email,
        fullName: user.FullName,
        roles 
      }
    }
  });
}));

/**
 * POST /api/auth/refresh
 * Renueva un JWT que está por expirar
 * 
 * @header {string} Authorization - Bearer token actual
 * @returns {object} Nuevo token JWT
 */
router.post('/refresh', refreshLimiter, asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const error = new Error('Token no proporcionado');
    error.statusCode = 401;
    throw error;
  }

  const token = authHeader.substring(7);

  // Verificar el token actual (permitir tokens expirados para refresh)
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET, { 
      ignoreExpiration: true 
    });
  } catch (error) {
    const err = new Error('Token inválido');
    err.statusCode = 401;
    throw err;
  }

  // Verificar que el token no haya expirado hace más de 24 horas
  const tokenAge = Date.now() / 1000 - decoded.iat;
  const maxRefreshAge = 24 * 60 * 60; // 24 horas

  if (tokenAge > maxRefreshAge) {
    const error = new Error('Token expirado. Por favor, inicie sesión nuevamente.');
    error.statusCode = 401;
    throw error;
  }

  // Verificar que el usuario sigue activo
  const user = await prisma.user.findUnique({
    where: { UserId: decoded.userId },
    include: { 
      userRoles: { 
        include: { 
          role: {
            select: {
              RoleId: true,
              Name: true
            }
          } 
        } 
      } 
    }
  });

  if (!user || !user.Active) {
    const error = new Error('Usuario inactivo o no encontrado');
    error.statusCode = 401;
    throw error;
  }

  // Generar nuevo token
  const roles = user.userRoles.map(ur => ur.role.Name);
  const newToken = generateToken(user, roles);

  console.log('[TOKEN REFRESH]', {
    userId: user.UserId,
    username: user.Username,
    timestamp: new Date().toISOString()
  });

  res.json({ 
    success: true,
    message: 'Token renovado exitosamente',
    data: { 
      token: newToken 
    }
  });
}));

/**
 * POST /api/auth/verify
 * Verifica si un JWT es válido
 * 
 * @header {string} Authorization - Bearer token
 * @returns {object} Información del usuario si el token es válido
 */
router.post('/verify', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      valid: false,
      error: 'Token no proporcionado'
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verificar que el usuario sigue activo
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
        valid: false,
        error: 'Usuario inactivo o no encontrado'
      });
    }

    res.json({ 
      success: true,
      valid: true,
      data: {
        user: {
          id: decoded.userId,
          username: decoded.username,
          roles: decoded.roles
        },
        expiresAt: new Date(decoded.exp * 1000).toISOString()
      }
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        valid: false,
        error: 'Token expirado',
        expiredAt: new Date(error.expiredAt).toISOString()
      });
    }

    return res.status(401).json({
      success: false,
      valid: false,
      error: 'Token inválido'
    });
  }
}));

/**
 * POST /api/auth/logout
 * Logout del usuario (en JWT es principalmente del lado del cliente)
 * Registra el evento de logout para auditoría
 * 
 * @header {string} Authorization - Bearer token
 */
router.post('/logout', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET);

      console.log('[AUTH LOGOUT]', {
        userId: decoded.userId,
        username: decoded.username,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      // No hacer nada si el token es inválido
    }
  }

  res.json({ 
    success: true,
    message: 'Sesión cerrada exitosamente. Por favor, elimine el token del cliente.' 
  });
}));

// --- MANEJO DE ERRORES ESPECÍFICO ---
router.use((err, req, res, next) => {
  logAuthError('routeError', err, {
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  res.status(err.statusCode || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? ERROR_MESSAGES.INTERNAL_ERROR 
      : err.message
  });
});

export default router;