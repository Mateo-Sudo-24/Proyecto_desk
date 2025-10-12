// src/routes/clientRoutes.js - Rutas completas para el portal web de clientes
import express from 'express';
import { 
  authenticateHybrid, 
  requireClientAuth 
} from '../middlewares/authMiddleware.js';
import { 
  requireRoles,
  requireClientAuth as requireClientAuthRole 
} from '../middlewares/rolemiddleware.js';
import { validate, schemas, sanitizeRequest } from '../middleware/validationMiddleware.js';

// Controladores
import * as clientController from '../controllers/clientController.js';

const router = express.Router();

// === MIDDLEWARE GLOBAL ===
// Sanitización automática de todos los inputs
router.use(sanitizeRequest);

// ========================================
// RUTAS PÚBLICAS (Sin autenticación)
// ========================================

/**
 * Consulta pública del estado de una orden
 * Permite rastrear el progreso usando OrderId o IdentityTag
 * 
 * GET /api/client/order-status?orderId=123
 * GET /api/client/order-status?identityTag=ORD-123456
 * 
 * @public
 */
router.get(
  '/order-status',
  // validate(schemas.orderStatusQuery, 'query'),
  clientController.getOrderStatusWithHistory
);

// ========================================
// AUTENTICACIÓN DE CLIENTES
// ========================================

/**
 * Solicitar código OTP para login
 * El cliente ingresa su email y recibe un código de 6 dígitos
 * 
 * POST /api/client/auth/request-otp
 * @body { email: string }
 */
router.post(
  '/auth/request-otp',
  // validate(schemas.requestOTP),
  clientController.requestOTP
);

/**
 * Login con email y OTP
 * El cliente ingresa el código recibido por email
 * 
 * POST /api/client/auth/login-otp
 * @body { email: string, otp: string }
 */
router.post(
  '/auth/login-otp',
  // validate(schemas.loginWithOTP),
  clientController.clientLoginWithOTP
);

/**
 * Login tradicional con contraseña (LEGACY)
 * Mantener por compatibilidad con clientes antiguos
 * 
 * POST /api/client/auth/login
 * @body { email: string, password: string }
 */
router.post(
  '/auth/login',
  // validate(schemas.clientLogin),
  clientController.clientLogin
);

/**
 * Cambiar contraseña del cliente
 * Requiere autenticación previa
 * 
 * POST /api/client/auth/change-password
 * @body { oldPassword: string, newPassword: string }
 */
router.post(
  '/auth/change-password',
  authenticateHybrid,
  requireClientAuthRole,
  // validate(schemas.changePassword),
  clientController.clientChangePassword
);

/**
 * Cerrar sesión del cliente
 * 
 * POST /api/client/auth/logout
 */
router.post(
  '/auth/logout',
  authenticateHybrid,
  requireClientAuthRole,
  clientController.clientLogout
);

// ========================================
// GESTIÓN DE ÓRDENES (Cliente autenticado)
// ========================================

/**
 * Listar todas las órdenes del cliente autenticado
 * Incluye historial completo de estados y seguimiento
 * 
 * GET /api/client/my-orders
 * @auth Session (Cliente)
 */
router.get(
  '/my-orders',
  authenticateHybrid,
  requireClientAuthRole,
  clientController.listMyOrdersWithHistory
);

/**
 * Ver detalles completos de una orden específica
 * Solo el dueño de la orden puede verla
 * 
 * GET /api/client/orders/:orderId
 * @auth Session (Cliente)
 * @param orderId - ID de la orden
 */
router.get(
  '/orders/:orderId',
  authenticateHybrid,
  requireClientAuthRole,
  // validate(schemas.orderIdParam, 'params'),
  clientController.viewOrderDetails
);

// ========================================
// GESTIÓN DE PROFORMAS
// ========================================

/**
 * Aprobar o rechazar una proforma
 * El cliente decide si acepta o rechaza el presupuesto
 * 
 * POST /api/client/proforma/respond
 * @auth Session (Cliente)
 * @body { orderId: number, action: 'approve' | 'reject' }
 */
router.post(
  '/proforma/respond',
  authenticateHybrid,
  requireClientAuthRole,
  // validate(schemas.proformaResponse),
  clientController.approveOrRejectProforma
);

// ========================================
// SISTEMA DE TICKETS DE SOPORTE
// ========================================

/**
 * Crear ticket de soporte
 * El cliente puede solicitar:
 * - Modificación de orden
 * - Reportar problema
 * - Hacer consulta
 * 
 * POST /api/client/tickets/create
 * @auth Session (Cliente)
 * @body {
 *   orderId?: number,
 *   category: 'modificacion_orden' | 'problema_tecnico' | 'consulta_general',
 *   subject: string,
 *   description: string,
 *   priority?: 'low' | 'normal' | 'high' | 'urgent'
 * }
 */
router.post(
  '/tickets/create',
  authenticateHybrid,
  requireClientAuthRole,
  // validate(schemas.createTicket),
  clientController.createSupportTicket
);

/**
 * Listar todos los tickets del cliente
 * 
 * GET /api/client/tickets/my-tickets
 * @auth Session (Cliente)
 */
router.get(
  '/tickets/my-tickets',
  authenticateHybrid,
  requireClientAuthRole,
  clientController.listMyTickets
);

/**
 * Ver detalles de un ticket específico
 * Incluye todas las respuestas del staff
 * 
 * GET /api/client/tickets/:ticketId
 * @auth Session (Cliente)
 * @param ticketId - ID del ticket
 */
router.get(
  '/tickets/:ticketId',
  authenticateHybrid,
  requireClientAuthRole,
  // validate(schemas.ticketIdParam, 'params'),
  clientController.viewTicketDetails
);

// ========================================
// INFORMACIÓN DEL PERFIL (Futuro)
// ========================================

/**
 * Ver perfil del cliente
 * Información personal y de contacto
 * 
 * GET /api/client/profile
 * @auth Session (Cliente)
 */
// router.get(
//   '/profile',
//   authenticateHybrid,
//   requireClientAuthRole,
//   clientController.getClientProfile
// );

/**
 * Actualizar perfil del cliente
 * El cliente puede actualizar su información de contacto
 * 
 * PUT /api/client/profile
 * @auth Session (Cliente)
 * @body { phone?: string, address?: string, deliveryAddress?: string }
 */
// router.put(
//   '/profile',
//   authenticateHybrid,
//   requireClientAuthRole,
//   // validate(schemas.updateClientProfile),
//   clientController.updateClientProfile
// );

// ========================================
// ENDPOINTS LEGACY (Compatibilidad)
// ========================================

/**
 * Endpoint legacy para consulta simple de estado
 * Redirige a la versión con historial
 * 
 * @deprecated Usar /order-status en su lugar
 */
router.get(
  '/status',
  clientController.getOrderStatus
);

/**
 * Endpoint legacy para listar órdenes
 * Redirige a la versión con historial
 * 
 * @deprecated Usar /my-orders en su lugar
 */
router.get(
  '/orders',
  authenticateHybrid,
  requireClientAuthRole,
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
      'GET /api/client/order-status',
      'POST /api/client/auth/request-otp',
      'POST /api/client/auth/login-otp',
      'POST /api/client/auth/login',
      'GET /api/client/my-orders',
      'GET /api/client/orders/:orderId',
      'POST /api/client/proforma/respond',
      'POST /api/client/tickets/create',
      'GET /api/client/tickets/my-tickets'
    ]
  });
});

export default router;