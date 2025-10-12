// src/routes/clientRoutes.js - VERSIÓN MÍNIMA FUNCIONAL
import express from 'express';
import { 
  authenticateHybrid, 
  requireClientAuth
} from '../middlewares/authMiddleware.js';
import { 
  requireClientAuth as requireClientAuthEnhanced
} from '../middlewares/roleMiddleware.js';
import { sanitizeRequest } from '../middlewares/validator.js';

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
 */
router.get(
  '/order-status',
  clientController.getOrderStatusWithHistory
);

// ========================================
// AUTENTICACIÓN DE CLIENTES
// ========================================

/**
 * Solicitar código OTP para login
 */
router.post(
  '/auth/request-otp',
  clientController.requestOTP
);

/**
 * Login con email y OTP
 */
router.post(
  '/auth/login-otp',
  clientController.clientLoginWithOTP
);

/**
 * Login tradicional con contraseña (LEGACY)
 */
router.post(
  '/auth/login',
  clientController.clientLogin
);

// ========================================
// RUTAS PROTEGIDAS (Requieren autenticación)
// ========================================

/**
 * Cambiar contraseña del cliente
 */
router.post(
  '/auth/change-password',
  authenticateHybrid,
  requireClientAuth, // Middleware original
  clientController.clientChangePassword
);

/**
 * Cerrar sesión del cliente
 */
router.post(
  '/auth/logout',
  authenticateHybrid,
  requireClientAuthEnhanced(), // Middleware mejorado
  clientController.clientLogout
);

/**
 * Listar todas las órdenes del cliente autenticado
 */
router.get(
  '/my-orders',
  authenticateHybrid,
  requireClientAuthEnhanced(),
  clientController.listMyOrdersWithHistory
);

/**
 * Ver detalles completos de una orden específica
 */
router.get(
  '/orders/:orderId',
  authenticateHybrid,
  requireClientAuthEnhanced(),
  clientController.viewOrderDetails
);

/**
 * Aprobar o rechazar una proforma
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
 */
router.post(
  '/tickets/create',
  authenticateHybrid,
  requireClientAuthEnhanced(),
  clientController.createSupportTicket
);

/**
 * Listar todos los tickets del cliente
 */
router.get(
  '/tickets/my-tickets',
  authenticateHybrid,
  requireClientAuthEnhanced(),
  clientController.listMyTickets
);

/**
 * Ver detalles de un ticket específico
 */
router.get(
  '/tickets/:ticketId',
  authenticateHybrid,
  requireClientAuthEnhanced(),
  clientController.viewTicketDetails
);

// ========================================
// ENDPOINTS LEGACY (Compatibilidad)
// ========================================

/**
 * Endpoint legacy para consulta simple de estado
 */
router.get(
  '/status',
  clientController.getOrderStatus
);

/**
 * Endpoint legacy para listar órdenes
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
      'GET  /api/client/order-status',
      'POST /api/client/auth/request-otp',
      'POST /api/client/auth/login-otp',
      'POST /api/client/auth/login',
      'POST /api/client/auth/change-password',
      'POST /api/client/auth/logout',
      'GET  /api/client/my-orders',
      'GET  /api/client/orders/:orderId',
      'POST /api/client/proforma/respond',
      'POST /api/client/tickets/create',
      'GET  /api/client/tickets/my-tickets',
      'GET  /api/client/tickets/:ticketId',
      'GET  /api/client/status (legacy)',
      'GET  /api/client/orders (legacy)'
    ]
  });
});

export default router;