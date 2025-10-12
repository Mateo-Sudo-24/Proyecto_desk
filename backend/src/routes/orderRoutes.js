// src/routes/orderRoutes.js - SISTEMA SEGURO DE ÓRDENES Y FACTURACIÓN
import express from 'express';

// --- Importaciones de Controladores ---
import {
  getAllOrders,
  getOrdersByClient,
  getOrderById,
  getOrderTracking,
  generateOrderInvoice,
  sendInvoiceToClient,
  downloadInvoicePDF,
  downloadInvoiceXML,
  listInvoices
} from '../controllers/orderController.js';

// --- Importaciones de Middlewares ---
import { authenticateHybrid } from '../middlewares/authMiddleware.js';
import {
  requireAdmin,
  requireEmployeeRoles,
  requireSales,
  requireEmployeeAuth,
  requireClientAuth,
  requireHybridRoles,
  requireResourceOwnership,
  SYSTEM_ROLES,
  USER_TYPES
} from '../middlewares/roleMiddleware.js';

const router = express.Router();

// ========================================
// MIDDLEWARE GLOBAL
// ========================================

// Todas las rutas requieren autenticación híbrida (JWT para empleados, Session para clientes)
router.use(authenticateHybrid);

// ========================================
// RUTAS PÚBLICAS DE ÓRDENES (Clientes y Empleados)
// ========================================

/**
 * Obtener órdenes del cliente autenticado
 * GET /api/orders/my-orders
 * @auth Client (Session) - Cliente ve solo sus órdenes
 */
router.get(
  '/my-orders',
  requireClientAuth(),
  getOrdersByClient
);

/**
 * Obtener orden específica con verificación de propiedad
 * GET /api/orders/:id
 * @auth Hybrid - Empleados ven cualquier orden, Clientes solo las suyas
 */
router.get(
  '/:id',
  requireHybridRoles([], true), // Permite empleados (todos) y clientes (solo propios)
  getOrderById
);

/**
 * Seguimiento de orden (Timeline visual)
 * GET /api/orders/:id/tracking
 * @auth Hybrid - Empleados ven cualquier orden, Clientes solo las suyas
 */
router.get(
  '/:id/tracking',
  requireHybridRoles([], true),
  getOrderTracking
);

// ========================================
// RUTAS DE ADMINISTRACIÓN (Solo Empleados)
// ========================================

/**
 * Obtener todas las órdenes (Dashboard admin/staff)
 * GET /api/orders/admin/all-orders
 * @auth Employee - Admin, Recepcionista, Técnico, Ventas
 * @query { status?, clientId?, startDate?, endDate?, page?, limit? }
 */
router.get(
  '/admin/all-orders',
  requireEmployeeAuth(), // Cualquier empleado autenticado
  getAllOrders
);

/**
 * Listar facturas del sistema
 * GET /api/orders/admin/invoices
 * @auth Employee - Admin y Staff Ventas
 */
router.get(
  '/admin/invoices',
  requireEmployeeRoles([SYSTEM_ROLES.ADMIN, SYSTEM_ROLES.SALES]),
  listInvoices
);

// ========================================
// SISTEMA DE FACTURACIÓN ELECTRÓNICA
// ========================================

/**
 * Generar factura electrónica para orden completada
 * POST /api/orders/:id/admin/generate-invoice
 * @auth Employee - Solo Admin y Staff Ventas
 */
router.post(
  '/:id/admin/generate-invoice',
  requireEmployeeRoles([SYSTEM_ROLES.ADMIN, SYSTEM_ROLES.SALES]),
  generateOrderInvoice
);

/**
 * Enviar factura por correo al cliente
 * POST /api/orders/:id/admin/send-invoice
 * @auth Employee - Solo Admin y Staff Ventas
 */
router.post(
  '/:id/admin/send-invoice',
  requireEmployeeRoles([SYSTEM_ROLES.ADMIN, SYSTEM_ROLES.SALES]),
  sendInvoiceToClient
);

// ========================================
// DESCARGAS DE FACTURAS (Clientes y Empleados)
// ========================================

/**
 * Descargar factura PDF
 * GET /api/orders/:id/download-invoice
 * @auth Hybrid - Empleados o Cliente propietario
 */
router.get(
  '/:id/download-invoice',
  requireHybridRoles([], true),
  downloadInvoicePDF
);

/**
 * Descargar factura XML (Factura electrónica SRI)
 * GET /api/orders/:id/download-invoice-xml
 * @auth Hybrid - Empleados o Cliente propietario
 */
router.get(
  '/:id/download-invoice-xml',
  requireHybridRoles([], true),
  downloadInvoiceXML
);

// ========================================
// RUTAS DEPRECADAS (Mantenidas para compatibilidad)
// ========================================

/**
 * @deprecated - Usar /api/orders/my-orders en su lugar
 * GET /api/orders/client/:clientId
 * @auth Employee - Solo empleados (para compatibilidad)
 */
router.get(
  '/client/:clientId',
  requireEmployeeAuth(),
  getOrdersByClient
);

/**
 * @deprecated - Usar /api/orders/:id en su lugar
 * GET /api/orders/:id
 * @auth Hybrid - Mantenido para compatibilidad
 */
router.get(
  '/:id',
  requireHybridRoles([], true),
  getOrderById
);

/**
 * @deprecated - Usar /api/orders/:id/admin/generate-invoice en su lugar
 * POST /api/orders/:id/invoice
 * @auth Employee - Solo empleados (para compatibilidad)
 */
router.post(
  '/:id/invoice',
  requireEmployeeAuth(),
  generateOrderInvoice
);

export default router;