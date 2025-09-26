// clientRoutes.js - Rutas completas para funcionalidades de cliente
import express from 'express';
import {
  // Autenticación
  clientLogin,
  clientChangePassword,
  clientLogout,
  
  // Consultas públicas (sin autenticación)
  getOrderStatus,
  getOrderStatusWithHistory,
  
  // Endpoints autenticados (requieren login de cliente)
  listMyOrders,
  listMyOrdersWithHistory,
  viewOrderDetails,
  approveOrRejectProforma
} from '../controllers/clientController.js';
import { requireClientAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

// === RUTAS DE AUTENTICACIÓN ===

/**
 * POST /api/client/auth/login
 * Login de cliente con email y contraseña
 * Body: { email, password }
 */
router.post('/auth/login', clientLogin);

/**
 * POST /api/client/auth/logout
 * Cierra la sesión del cliente autenticado
 */
router.post('/auth/logout', clientLogout);

/**
 * PUT /api/client/auth/change-password
 * Cambiar contraseña del cliente autenticado
 * Body: { oldPassword, newPassword }
 * Requiere: Autenticación de cliente
 */
router.put('/auth/change-password', clientChangePassword);

// === RUTAS PÚBLICAS (SIN AUTENTICACIÓN) ===

/**
 * GET /api/client/order/status
 * Consulta pública del estado básico de una orden
 * Query: ?orderId=123 o ?identityTag=ORD-123456
 * Uso: Para clientes que quieren verificar estado sin login
 */
router.get('/order/status', getOrderStatus);

/**
 * GET /api/client/order/status/detailed
 * Consulta pública con historial completo de estados
 * Query: ?orderId=123 o ?identityTag=ORD-123456
 * Uso: Para seguimiento detallado sin autenticación
 */
router.get('/order/status/detailed', getOrderStatusWithHistory);

// === RUTAS AUTENTICADAS (REQUIEREN LOGIN DE CLIENTE) ===
// Nota: La autenticación se valida directamente en los controladores

/**
 * GET /api/client/orders
 * Lista todas las órdenes del cliente autenticado (versión básica)
 * Requiere: Autenticación de cliente
 */
router.get('/orders', listMyOrders);

/**
 * GET /api/client/orders/detailed
 * Lista todas las órdenes con historial completo
 * Requiere: Autenticación de cliente
 */
router.get('/orders/detailed', listMyOrdersWithHistory);

/**
 * GET /api/client/orders/:orderId
 * Ver detalles completos de una orden específica
 * Params: orderId (número)
 * Requiere: Autenticación de cliente + orden debe pertenecer al cliente
 */
router.get('/orders/:orderId', viewOrderDetails);

/**
 * PUT /api/client/orders/proforma/respond
 * Aprobar o rechazar una proforma enviada
 * Body: { orderId, action } donde action = 'approve' | 'reject'
 * Requiere: Autenticación de cliente + orden debe pertenecer al cliente
 */
router.put('/orders/proforma/respond', approveOrRejectProforma);

// === RUTAS LEGACY (COMPATIBILIDAD HACIA ATRÁS) ===

/**
 * GET /api/client/order-status (LEGACY)
 * Mantiene compatibilidad con implementaciones anteriores
 * Query: ?orderId=123 o ?identityTag=ORD-123456
 */
router.get('/order-status', getOrderStatus);

/**
 * GET /api/client/my-orders (LEGACY)
 * Mantiene compatibilidad con implementaciones anteriores
 * Requiere: Autenticación de cliente
 */
router.get('/my-orders', requireClientAuth, listMyOrders);

// === MIDDLEWARE DE MANEJO DE ERRORES ===
router.use((error, req, res, next) => {
  console.error('Error en clientRoutes:', error);
  
  // Error de validación de datos
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Datos de entrada inválidos',
      details: error.message
    });
  }
  
  // Error de autenticación
  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      error: 'No autorizado'
    });
  }
  
  // Error genérico del servidor
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor'
  });
});

export default router;