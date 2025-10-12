// src/routes/clientRoutes.js - VERSIÓN COMPLETA CON NUEVAS FUNCIONES
import express from 'express';
import { 
  authenticateHybrid, 
  requireClientAuth
} from '../middlewares/authMiddleware.js';
import { 
  requireClientAuth as requireClientAuthEnhanced
} from '../middlewares/roleMiddleware.js';
import { sanitizeRequest, validate, schemas } from '../middlewares/validator.js';

// Controladores EXISTENTES confirmados
import * as clientController from '../controllers/clientController.js';

const router = express.Router();

// === MIDDLEWARE GLOBAL ===
router.use(sanitizeRequest);

// ========================================
// RUTAS PÚBLICAS (Sin autenticación)
// ========================================

/**
 * Consulta pública del estado de una orden
 * GET /api/client/order-status?orderId=123&identityTag=ORD-123456
 */
router.get(
  '/order-status',
  clientController.getOrderStatusWithHistory
);

/**
 * Registro de nuevo cliente
 * POST /api/client/auth/register
 */
router.post(
  '/auth/register',
  validate(schemas.createClient),
  clientController.registerClient
);

// ========================================
// AUTENTICACIÓN Y VERIFICACIÓN DE CLIENTES
// ========================================

/**
 * Solicitar código OTP para login
 * POST /api/client/auth/request-otp
 */
router.post(
  '/auth/request-otp',
  clientController.requestOTP
);

/**
 * Login con email y OTP
 * POST /api/client/auth/login-otp
 */
router.post(
  '/auth/login-otp',
  clientController.clientLoginWithOTP
);

/**
 * Login tradicional con contraseña (LEGACY)
 * POST /api/client/auth/login
 */
router.post(
  '/auth/login',
  clientController.clientLogin
);

/**
 * Verificar email del cliente
 * POST /api/client/auth/verify-email
 */
router.post(
  '/auth/verify-email',
  clientController.verifyEmail
);

/**
 * Reenviar email de verificación
 * POST /api/client/auth/resend-verification
 */
router.post(
  '/auth/resend-verification',
  clientController.resendVerificationEmail
);

/**
 * Solicitar recuperación de contraseña
 * POST /api/client/auth/forgot-password
 */
router.post(
  '/auth/forgot-password',
  clientController.requestPasswordReset
);

/**
 * Restablecer contraseña con token
 * POST /api/client/auth/reset-password
 */
router.post(
  '/auth/reset-password',
  clientController.resetPassword
);

// ========================================
// RUTAS PROTEGIDAS (Requieren autenticación)
// ========================================

/**
 * Cambiar contraseña del cliente
 * POST /api/client/auth/change-password
 */
router.post(
  '/auth/change-password',
  authenticateHybrid,
  requireClientAuth,
  validate(schemas.changePassword),
  clientController.clientChangePassword
);

/**
 * Cerrar sesión del cliente
 * POST /api/client/auth/logout
 */
router.post(
  '/auth/logout',
  authenticateHybrid,
  requireClientAuthEnhanced(),
  clientController.clientLogout
);

// ========================================
// GESTIÓN DE PERFIL DEL CLIENTE
// ========================================

/**
 * Obtener perfil del cliente
 * GET /api/client/profile
 */
router.get(
  '/profile',
  authenticateHybrid,
  requireClientAuthEnhanced(),
  clientController.getClientProfile
);

/**
 * Actualizar perfil del cliente
 * PUT /api/client/profile
 */
router.put(
  '/profile',
  authenticateHybrid,
  requireClientAuthEnhanced(),
  // validate(schemas.updateClient.omit({ clientId: true, clientTypeId: true })),
  clientController.updateClientProfile
);

// ========================================
// GESTIÓN DE ÓRDENES
// ========================================

/**
 * Listar todas las órdenes del cliente autenticado
 * GET /api/client/my-orders
 */
router.get(
  '/my-orders',
  authenticateHybrid,
  requireClientAuthEnhanced(),
  clientController.listMyOrdersWithHistory
);

/**
 * Ver detalles completos de una orden específica
 * GET /api/client/orders/:orderId
 */
router.get(
  '/orders/:orderId',
  authenticateHybrid,
  requireClientAuthEnhanced(),
  clientController.viewOrderDetails
);

/**
 * Enviar notificación de creación de orden
 * POST /api/client/orders/notify-creation
 */
router.post(
  '/orders/notify-creation',
  authenticateHybrid,
  requireClientAuthEnhanced(),
  clientController.sendOrderCreationNotification
);

// ========================================
// GESTIÓN DE PROFORMAS
// ========================================

/**
 * Aprobar o rechazar una proforma
 * POST /api/client/proforma/respond
 */
router.post(
  '/proforma/respond',
  authenticateHybrid,
  requireClientAuthEnhanced(),
  clientController.approveOrRejectProforma
);

// ========================================
// SISTEMA DE TICKETS DE SOPORTE
// ========================================

/**
 * Crear ticket de soporte
 * POST /api/client/tickets/create
 */
router.post(
  '/tickets/create',
  authenticateHybrid,
  requireClientAuthEnhanced(),
  clientController.createSupportTicket
);

/**
 * Listar todos los tickets del cliente
 * GET /api/client/tickets/my-tickets
 */
router.get(
  '/tickets/my-tickets',
  authenticateHybrid,
  requireClientAuthEnhanced(),
  clientController.listMyTickets
);

/**
 * Ver detalles de un ticket específico
 * GET /api/client/tickets/:ticketId
 */
router.get(
  '/tickets/:ticketId',
  authenticateHybrid,
  requireClientAuthEnhanced(),
  clientController.viewTicketDetails
);

// ========================================
// SISTEMA DE NOTIFICACIONES
// ========================================

/**
 * Obtener notificaciones del cliente
 * GET /api/client/notifications
 */
router.get(
  '/notifications',
  authenticateHybrid,
  requireClientAuthEnhanced(),
  clientController.getClientNotifications
);

/**
 * Marcar notificación como leída
 * POST /api/client/notifications/mark-read
 */
router.post(
  '/notifications/mark-read',
  authenticateHybrid,
  requireClientAuthEnhanced(),
  clientController.markNotificationAsRead
);

// ========================================
// ENDPOINTS LEGACY (Compatibilidad)
// ========================================

/**
 * Endpoint legacy para consulta simple de estado
 * GET /api/client/status
 */
router.get(
  '/status',
  clientController.getOrderStatus
);

/**
 * Endpoint legacy para listar órdenes
 * GET /api/client/orders
 */
router.get(
  '/orders',
  authenticateHybrid,
  requireClientAuth,
  clientController.listMyOrders
);

// ========================================
// MANEJO DE ERRORES ESPECÍFICO
// ========================================

/**
 * Manejador de errores 404 para rutas de cliente
 */
router.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint no encontrado en el portal de clientes',
    availableEndpoints: [
      // === PÚBLICAS ===
      'GET  /api/client/order-status',
      'POST /api/client/auth/register',
      
      // Autenticación y verificación
      'POST /api/client/auth/request-otp',
      'POST /api/client/auth/login-otp',
      'POST /api/client/auth/login',
      'POST /api/client/auth/verify-email',
      'POST /api/client/auth/resend-verification',
      'POST /api/client/auth/forgot-password',
      'POST /api/client/auth/reset-password',
      
      // === PROTEGIDAS - Autenticación ===
      'POST /api/client/auth/change-password',
      'POST /api/client/auth/logout',
      
      // === PROTEGIDAS - Perfil ===
      'GET  /api/client/profile',
      'PUT  /api/client/profile',
      
      // === PROTEGIDAS - Órdenes ===
      'GET  /api/client/my-orders',
      'GET  /api/client/orders/:orderId',
      'POST /api/client/orders/notify-creation',
      
      // === PROTEGIDAS - Proformas ===
      'POST /api/client/proforma/respond',
      
      // === PROTEGIDAS - Tickets ===
      'POST /api/client/tickets/create',
      'GET  /api/client/tickets/my-tickets',
      'GET  /api/client/tickets/:ticketId',
      
      // === PROTEGIDAS - Notificaciones ===
      'GET  /api/client/notifications',
      'POST /api/client/notifications/mark-read',
      
      // === LEGACY ===
      'GET  /api/client/status',
      'GET  /api/client/orders'
    ],
    documentation: 'Consulte la documentación de la API para más detalles sobre cada endpoint'
  });
});

export default router;