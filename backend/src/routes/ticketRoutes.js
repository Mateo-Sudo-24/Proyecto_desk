// src/routes/ticketRoutes.js
import express from 'express';
import { 
  authenticateHybrid, 
  requireRoles 
} from '../middlewares/authMiddleware.js';
import { validate, schemas, sanitizeRequest } from '../middleware/validationMiddleware.js';

// Controladores
import * as clientTicketController from '../controllers/clientController.js';
import * as adminTicketController from '../controllers/adminTicketController.js';

const router = express.Router();

// Sanitización global
router.use(sanitizeRequest);

// === RUTAS PARA CLIENTES (Portal Web) ===

/**
 * Crear ticket de soporte
 * POST /api/tickets/create
 * Auth: Session (Cliente)
 */
router.post(
  '/create',
  authenticateHybrid,
  // validate(schemas.createTicket), // Agregar schema
  clientTicketController.createSupportTicket
);

/**
 * Listar mis tickets
 * GET /api/tickets/my-tickets
 * Auth: Session (Cliente)
 */
router.get(
  '/my-tickets',
  authenticateHybrid,
  clientTicketController.listMyTickets
);

/**
 * Ver detalles de mi ticket
 * GET /api/tickets/:ticketId
 * Auth: Session (Cliente)
 */
router.get(
  '/:ticketId',
  authenticateHybrid,
  clientTicketController.viewTicketDetails
);

// === RUTAS PARA STAFF (App Escritorio) ===

/**
 * Listar todos los tickets (con filtros)
 * GET /api/tickets/admin/list
 * Auth: JWT (Administrador, Recepcionista)
 */
router.get(
  '/admin/list',
  authenticateHybrid,
  requireRoles(['Administrador', 'Recepcionista']),
  adminTicketController.listAllTickets
);

/**
 * Ver detalles completos de cualquier ticket
 * GET /api/tickets/admin/:ticketId
 * Auth: JWT (Administrador, Recepcionista, Staff Técnico, Staff Ventas)
 */
router.get(
  '/admin/:ticketId',
  authenticateHybrid,
  requireRoles(['Administrador', 'Recepcionista', 'Staff Técnico', 'Staff Ventas']),
  adminTicketController.getTicketDetails
);

/**
 * Asignar ticket a usuario
 * POST /api/tickets/admin/assign
 * Auth: JWT (Administrador)
 */
router.post(
  '/admin/assign',
  authenticateHybrid,
  requireRoles(['Administrador']),
  // validate(schemas.assignTicket),
  adminTicketController.assignTicket
);

/**
 * Actualizar estado del ticket
 * PUT /api/tickets/admin/status
 * Auth: JWT (Administrador, Staff asignado)
 */
router.put(
  '/admin/status',
  authenticateHybrid,
  requireRoles(['Administrador', 'Recepcionista', 'Staff Técnico', 'Staff Ventas']),
  // validate(schemas.updateTicketStatus),
  adminTicketController.updateTicketStatus
);

/**
 * Agregar respuesta a ticket
 * POST /api/tickets/admin/response
 * Auth: JWT (Administrador, Staff asignado)
 */
router.post(
  '/admin/response',
  authenticateHybrid,
  requireRoles(['Administrador', 'Recepcionista', 'Staff Técnico', 'Staff Ventas']),
  // validate(schemas.addTicketResponse),
  adminTicketController.addTicketResponse
);

/**
 * Modificar orden desde ticket
 * PUT /api/tickets/admin/modify-order
 * Auth: JWT (Administrador SOLAMENTE)
 */
router.put(
  '/admin/modify-order',
  authenticateHybrid,
  requireRoles(['Administrador']),
  // validate(schemas.modifyOrderFromTicket),
  adminTicketController.modifyOrderFromTicket
);

/**
 * Cerrar tickets masivamente
 * POST /api/tickets/admin/bulk-close
 * Auth: JWT (Administrador)
 */
router.post(
  '/admin/bulk-close',
  authenticateHybrid,
  requireRoles(['Administrador']),
  // validate(schemas.bulkCloseTickets),
  adminTicketController.bulkCloseTickets
);

/**
 * Estadísticas de tickets
 * GET /api/tickets/admin/statistics
 * Auth: JWT (Administrador)
 */
router.get(
  '/admin/statistics',
  authenticateHybrid,
  requireRoles(['Administrador']),
  adminTicketController.getTicketStatistics
);

/**
 * Listar categorías de tickets
 * GET /api/tickets/categories
 * Auth: Hybrid (Cualquier usuario autenticado)
 */
router.get(
  '/categories',
  authenticateHybrid,
  adminTicketController.listTicketCategories
);

export default router;