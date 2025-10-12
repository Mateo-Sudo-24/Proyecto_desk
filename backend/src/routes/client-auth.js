// src/routes/client-auth.js - Sistema de autenticación para clientes (Portal Web)
import express from 'express';
import { PrismaClient } from '@prisma/client';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcrypt';
import { sanitizeRequest, validateAndSanitizeEmail } from '../middlewares/validator.js';
import { sendOTPEmail } from '../../config/nodemailer.js';
import logger from '../../config/logger.js';

const prisma = new PrismaClient();
const router = express.Router();

// === CONSTANTES ===
const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 3;

// === RATE LIMITING ===

/**
 * Rate limiter para solicitudes de OTP
 * Previene spam de emails
 */
const otpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 3, // 3 intentos por IP
  message: { 
    success: false,
    error: 'Demasiadas solicitudes de código OTP. Intente en 15 minutos.' 
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiter para login
 * Previene brute force
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos
  message: { 
    success: false,
    error: 'Demasiados intentos de inicio de sesión. Intente en 15 minutos.' 
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit por IP + email para ser más estricto
    return `${req.ip}-${req.body?.email || 'unknown'}`;
  }
});

// === MIDDLEWARE GLOBAL ===
router.use(sanitizeRequest);

// === UTILIDADES ===

/**
 * Genera código OTP de 6 dígitos
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Calcula fecha de expiración del OTP
 */
const getOTPExpiry = () => {
  return new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
};

// ========================================
// SISTEMA DE AUTENTICACIÓN CON OTP
// ========================================

/**
 * Solicitar código OTP para login
 * El cliente ingresa su email y recibe un código de 6 dígitos
 * 
 * POST /api/client-auth/request-otp
 * @body { email: string }
 * @public
 */
router.post('/request-otp', otpRequestLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    // Validar y sanitizar email
    const { isValid, sanitized } = validateAndSanitizeEmail(email);
    
    if (!isValid) {
      logger.warn('Solicitud OTP con email inválido', { email, ip: req.ip });
      return res.status(400).json({
        success: false,
        error: 'Email inválido'
      });
    }

    // Buscar cliente por email
    const client = await prisma.client.findUnique({
      where: { Email: sanitized },
      select: {
        ClientId: true,
        Email: true,
        DisplayName: true
      }
    });

    // Por seguridad, siempre retornar el mismo mensaje
    // (no revelar si el email existe o no)
    const successMessage = 'Si el email está registrado, recibirá un código OTP';

    if (!client) {
      logger.info('Solicitud OTP para email no registrado', { 
        email: sanitized, 
        ip: req.ip 
      });
      
      return res.json({
        success: true,
        message: successMessage,
        expiresIn: OTP_EXPIRY_MINUTES * 60
      });
    }

    // Generar OTP
    const otpCode = generateOTP();
    const otpExpiry = getOTPExpiry();

    // Guardar OTP en la base de datos
    await prisma.client.update({
      where: { ClientId: client.ClientId },
      data: {
        OTP: otpCode,
        OTPExpires: otpExpiry
      }
    });

    // Enviar OTP por email
    try {
      await sendOTPEmail(client.Email, client.DisplayName, otpCode);
      
      logger.info('OTP enviado exitosamente', {
        clientId: client.ClientId,
        email: client.Email,
        expiresAt: otpExpiry,
        ip: req.ip
      });
    } catch (emailError) {
      logger.error('Error al enviar email OTP', {
        clientId: client.ClientId,
        error: emailError.message
      });
      
      // No fallar si el email falla, el OTP está guardado
      // El cliente puede intentar de nuevo
    }

    res.json({
      success: true,
      message: successMessage,
      expiresIn: OTP_EXPIRY_MINUTES * 60 // segundos
    });

  } catch (error) {
    logger.error('Error en solicitud OTP', {
      error: error.message,
      stack: error.stack,
      ip: req.ip
    });

    res.status(500).json({
      success: false,
      error: 'Error al procesar la solicitud. Intente nuevamente.'
    });
  }
});

/**
 * Login de cliente con email y código OTP
 * 
 * POST /api/client-auth/login-otp
 * @body { email: string, otp: string }
 * @public
 */
router.post('/login-otp', loginLimiter, async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validar campos requeridos
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Email y código OTP son requeridos'
      });
    }

    // Validar y sanitizar email
    const { isValid, sanitized } = validateAndSanitizeEmail(email);
    
    if (!isValid) {
      logger.warn('Intento login OTP con email inválido', { email, ip: req.ip });
      return res.status(400).json({
        success: false,
        error: 'Email inválido'
      });
    }

    // Buscar cliente
    const client = await prisma.client.findUnique({
      where: { Email: sanitized },
      select: {
        ClientId: true,
        Email: true,
        DisplayName: true,
        OrganizationName: true,
        OTP: true,
        OTPExpires: true
      }
    });

    // Timing attack prevention
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (!client || !client.OTP || !client.OTPExpires) {
      logger.warn('Intento login con OTP no existente', { 
        email: sanitized, 
        ip: req.ip 
      });
      
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }

    // Verificar si OTP expiró
    if (new Date() > client.OTPExpires) {
      logger.warn('Intento login con OTP expirado', {
        clientId: client.ClientId,
        expiredAt: client.OTPExpires,
        ip: req.ip
      });

      // Limpiar OTP expirado
      await prisma.client.update({
        where: { ClientId: client.ClientId },
        data: { OTP: null, OTPExpires: null }
      });

      return res.status(401).json({
        success: false,
        error: 'Código OTP expirado. Solicite uno nuevo.',
        code: 'OTP_EXPIRED'
      });
    }

    // Verificar OTP
    if (client.OTP !== otp.trim()) {
      logger.warn('Intento login con OTP incorrecto', {
        clientId: client.ClientId,
        ip: req.ip
      });

      return res.status(401).json({
        success: false,
        error: 'Código OTP inválido'
      });
    }

    // ✅ OTP VÁLIDO - Limpiar OTP después de uso exitoso
    await prisma.client.update({
      where: { ClientId: client.ClientId },
      data: {
        OTP: null,
        OTPExpires: null
      }
    });

    // Crear sesión
    req.session.clientId = client.ClientId;
    req.session.clientEmail = client.Email;
    req.session.clientName = client.DisplayName;

    logger.info('Login exitoso con OTP', {
      clientId: client.ClientId,
      email: client.Email,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Autenticación exitosa',
      data: {
        client: {
          id: client.ClientId,
          email: client.Email,
          name: client.DisplayName,
          organizationName: client.OrganizationName
        }
      }
    });

  } catch (error) {
    logger.error('Error en login OTP', {
      error: error.message,
      stack: error.stack,
      ip: req.ip
    });

    res.status(500).json({
      success: false,
      error: 'Error al procesar el login. Intente nuevamente.'
    });
  }
});

// ========================================
// LOGIN TRADICIONAL (LEGACY - Mantener para compatibilidad)
// ========================================

/**
 * Login tradicional con email y contraseña
 * Mantener para clientes que ya tienen contraseña configurada
 * 
 * POST /api/client-auth/login
 * @body { email: string, password: string }
 * @public
 */
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email y contraseña son requeridos'
      });
    }

    // Validar y sanitizar email
    const { isValid, sanitized } = validateAndSanitizeEmail(email);
    
    if (!isValid) {
      logger.warn('Intento login con email inválido', { email, ip: req.ip });
      return res.status(400).json({
        success: false,
        error: 'Email inválido'
      });
    }

    // Buscar cliente
    const client = await prisma.client.findUnique({
      where: { Email: sanitized },
      select: {
        ClientId: true,
        Email: true,
        DisplayName: true,
        OrganizationName: true,
        PasswordHash: true
      }
    });

    // Timing attack prevention
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (!client || !client.PasswordHash) {
      logger.warn('Intento login tradicional fallido', { 
        email: sanitized, 
        ip: req.ip 
      });

      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(
      password, 
      client.PasswordHash.toString()
    );

    if (!isValidPassword) {
      logger.warn('Contraseña incorrecta en login tradicional', {
        clientId: client.ClientId,
        ip: req.ip
      });

      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }

    // Crear sesión
    req.session.clientId = client.ClientId;
    req.session.clientEmail = client.Email;
    req.session.clientName = client.DisplayName;

    logger.info('Login tradicional exitoso', {
      clientId: client.ClientId,
      email: client.Email,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Autenticación exitosa',
      data: {
        client: {
          id: client.ClientId,
          email: client.Email,
          name: client.DisplayName,
          organizationName: client.OrganizationName
        }
      }
    });

  } catch (error) {
    logger.error('Error en login tradicional', {
      error: error.message,
      stack: error.stack,
      ip: req.ip
    });

    res.status(500).json({
      success: false,
      error: 'Error al procesar el login. Intente nuevamente.'
    });
  }
});

// ========================================
// LOGOUT
// ========================================

/**
 * Cerrar sesión del cliente
 * 
 * POST /api/client-auth/logout
 * @session Required
 */
router.post('/logout', (req, res) => {
  const clientId = req.session?.clientId;

  req.session.destroy(err => {
    if (err) {
      logger.error('Error al cerrar sesión', {
        clientId,
        error: err.message
      });

      return res.status(500).json({ 
        success: false,
        error: 'No se pudo cerrar la sesión.' 
      });
    }

    logger.info('Logout exitoso', {
      clientId,
      timestamp: new Date().toISOString()
    });

    res.clearCookie('connect.sid'); // Limpia la cookie del navegador
    res.json({ 
      success: true,
      message: 'Sesión cerrada con éxito.' 
    });
  });
});

// ========================================
// VERIFICAR SESIÓN (ÚTIL PARA FRONTEND)
// ========================================

/**
 * Verificar si la sesión es válida
 * 
 * GET /api/client-auth/verify
 * @session Required
 */
router.get('/verify', async (req, res) => {
  if (!req.session || !req.session.clientId) {
    return res.status(401).json({
      success: false,
      isAuthenticated: false
    });
  }

  try {
    // Verificar que el cliente sigue existiendo
    const client = await prisma.client.findUnique({
      where: { ClientId: req.session.clientId },
      select: {
        ClientId: true,
        DisplayName: true,
        Email: true
      }
    });

    if (!client) {
      req.session.destroy();
      return res.status(401).json({
        success: false,
        isAuthenticated: false
      });
    }

    res.json({
      success: true,
      isAuthenticated: true,
      client: {
        id: client.ClientId,
        name: client.DisplayName,
        email: client.Email
      }
    });

  } catch (error) {
    logger.error('Error verificando sesión', {
      clientId: req.session.clientId,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Error al verificar sesión'
    });
  }
});

export default router;