// app.js (VERSIÓN REFACTORIZADA CON VALIDACIÓN Y SEGURIDAD MEJORADA)
import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

// --- Importar Lógica Personalizada ---
import httpLogger from './src/middlewares/httpLogger.js';
import employeeAuthRoutes from './auth.js';
import clientAuthRoutes from './src/routes/client-auth.js';
import adminRoutes from './src/routes/adminRoutes.js';
import employeeRoutes from './src/routes/employeeRoutes.js';
import clientRoutes from './src/routes/clientRoutes.js';
import orderRoutes from './src/routes/orderRoutes.js';
import { authenticateHybrid } from './src/middlewares/authMiddleware.js';
import { sanitizeRequest } from './src/middleware/validator.js'; // NUEVO

dotenv.config();
const app = express();

// --- Middlewares de Seguridad Avanzada ---
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// --- CORS Configurado Correctamente ---
const allowedOrigins = [
  process.env.URL_FRONTEND_WEB || 'http://localhost:5173',
  process.env.URL_FRONTEND_DESK
].filter(Boolean); // Elimina valores undefined/null

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (mobile apps, postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// --- Rate Limiting (Protección contra Brute Force) ---
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos
  message: { 
    success: false,
    error: 'Demasiados intentos de inicio de sesión. Intente nuevamente en 15 minutos.' 
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests
  message: { 
    success: false,
    error: 'Demasiadas solicitudes. Por favor, intente más tarde.' 
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// --- Parsers de Body ---
app.use(express.json({ limit: '10mb' })); // Límite de tamaño de payload
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- Sanitización Global (Protección XSS) ---
app.use(sanitizeRequest); // ✅ NUEVO - Limpia todos los inputs automáticamente

// --- Logging ---
app.use(httpLogger);

// --- Configuración de Sesión (SOLO PARA CLIENTES WEB) ---
app.use(session({
  secret: process.env.SESSION_SECRET || 'a-very-strong-secret-for-clients',
  resave: false,
  saveUninitialized: false,
  name: 'sessionId', // Ocultar que usas express-session
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS en producción
    httpOnly: true, // Prevenir acceso desde JavaScript
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    sameSite: 'strict' // ✅ NUEVO - Protección CSRF
  }
}));

// --- Health Check (Para monitoreo) ---
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// --- Rutas de Autenticación (Públicas) ---
// Aplicar rate limiting solo a rutas de autenticación
app.use('/api/auth', authLimiter, employeeAuthRoutes);      // Empleados/Admins (JWT)
app.use('/api/client-auth', authLimiter, clientAuthRoutes); // Clientes (Session)

// --- Rutas Protegidas ---
// Rate limiting general para todas las rutas protegidas
app.use('/api/admin', generalLimiter, authenticateHybrid, adminRoutes);
app.use('/api/employee', generalLimiter, authenticateHybrid, employeeRoutes);
app.use('/api/client', generalLimiter, authenticateHybrid, clientRoutes);
app.use('/api/orders', generalLimiter, authenticateHybrid, orderRoutes);

// --- Ruta 404 (Not Found) ---
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'Endpoint no encontrado',
    path: req.originalUrl
  });
});

// --- Manejo Centralizado de Errores ---
app.use((err, req, res, next) => {
  // Log del error (en producción usa un servicio como Sentry)
  console.error('[ERROR]', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.session?.userId || req.user?.id,
    timestamp: new Date().toISOString()
  });

  // Error de CORS
  if (err.message === 'No permitido por CORS') {
    return res.status(403).json({ 
      success: false,
      error: 'Acceso denegado por política CORS' 
    });
  }

  // Error de validación (ya manejado por middleware)
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      success: false,
      error: 'Datos inválidos',
      details: err.details 
    });
  }

  // Error de autenticación
  if (err.name === 'UnauthorizedError' || err.statusCode === 401) {
    return res.status(401).json({ 
      success: false,
      error: 'No autorizado. Por favor, inicie sesión.' 
    });
  }

  // Error genérico (no exponer detalles en producción)
  const message = process.env.NODE_ENV === 'production' 
    ? 'Ha ocurrido un error interno en el servidor.' 
    : err.message;

  res.status(err.statusCode || 500).json({ 
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// --- Manejo de Promesas Rechazadas ---
process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION]', {
    reason,
    promise,
    timestamp: new Date().toISOString()
  });
});

// --- Manejo de Excepciones No Capturadas ---
process.on('uncaughtException', (error) => {
  console.error('[UNCAUGHT EXCEPTION]', {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  
  // En producción, considera reiniciar el proceso
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

export default app;