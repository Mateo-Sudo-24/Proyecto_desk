// employeeRoutes.js - Refactorizado con roleMiddleware mejorado
import express from 'express';
import {
  // Autenticación
  employeeLogin,
  employeeChangePassword,
  employeeForgotPassword,
  employeeLogout,

  // Recepcionista
  receptionistCreateOrUpdateClient,
  receptionistRegisterEquipment,
  receptionistCreateOrder,
  receptionistRegisterEquipmentExit,

  // Staff Técnico
  techListAssignedOrders,
  techSetDiagnosis,
  techStartService,
  techEndService,

  // Staff Ventas
  salesListOrders,
  salesAddPartsAndPrice,
  salesSendProforma,

} from '../controllers/employeeController.js';
import { authenticateHybrid } from '../middlewares/authMiddleware.js';
import { 
  requireAccess,
  requireEmployeeAuth,
  requireAdmin,
  requireTechnical,
  requireEmployeeRoles,
  USER_TYPES
} from '../middlewares/roleMiddleware.js';
import { 
  validate, 
  schemas, 
  sanitizeRequest 
} from '../middlewares/validator.js';

const router = express.Router();

// === MIDDLEWARE GLOBAL ===
// Sanitización automática de todos los inputs
router.use(sanitizeRequest);

// ========================================
// AUTENTICACIÓN (Rutas públicas para empleados)
// ========================================

/**
 * Login de empleados
 * 
 * POST /api/employee/login
 * @body { username: string, password: string }
 */
router.post(
  '/login', 
  validate(schemas.login),
  employeeLogin
);

/**
 * Solicitar recuperación de contraseña
 * 
 * POST /api/employee/forgot-password
 * @body { email: string }
 */
router.post(
  '/forgot-password', 
  validate(schemas.forgotPassword),
  employeeForgotPassword
);

// ========================================
// RUTAS PROTEGIDAS (Requieren autenticación)
// ========================================

// Middleware global de autenticación para rutas protegidas
router.use(authenticateHybrid);

/**
 * Cambiar contraseña (empleado autenticado)
 * 
 * POST /api/employee/change-password
 * @auth Employee
 * @body { oldPassword: string, newPassword: string }
 */
router.post(
  '/change-password', 
  requireEmployeeAuth(), // Cualquier empleado autenticado
  validate(schemas.changePassword),
  employeeChangePassword
);

/**
 * Cerrar sesión
 * 
 * POST /api/employee/logout
 * @auth Employee
 */
router.post(
  '/logout',
  requireEmployeeAuth(), // Cualquier empleado autenticado
  employeeLogout
);

// ========================================
// ROL: RECEPCIONISTA
// ========================================

/**
 * Crear o actualizar cliente
 * 
 * POST /api/employee/receptionist/client
 * @auth Employee (Recepcionista/Admin)
 * @body { clientData: object }
 */
router.post(
  '/receptionist/client', 
  requireAccess({
    allowedRoles: ['recepcionista', 'admin', 'superadmin'],
    userType: USER_TYPES.EMPLOYEE
  }),
  validate(schemas.createClient),
  receptionistCreateOrUpdateClient
);

/**
 * Registrar equipo
 * 
 * POST /api/employee/receptionist/equipment
 * @auth Employee (Recepcionista/Admin)
 * @body { equipmentData: object }
 */
router.post(
  '/receptionist/equipment', 
  requireAccess({
    allowedRoles: ['recepcionista', 'admin', 'superadmin'],
    userType: USER_TYPES.EMPLOYEE
  }),
  validate(schemas.registerEquipment),
  receptionistRegisterEquipment
);

/**
 * Crear orden de servicio
 * 
 * POST /api/employee/receptionist/create-order
 * @auth Employee (Recepcionista/Admin)
 * @body { orderData: object }
 */
router.post(
  '/receptionist/create-order', 
  requireAccess({
    allowedRoles: ['recepcionista', 'admin', 'superadmin'],
    userType: USER_TYPES.EMPLOYEE
  }),
  validate(schemas.createOrder),
  receptionistCreateOrder
);

/**
 * Registrar salida de equipo
 * 
 * POST /api/employee/receptionist/equipment-exit
 * @auth Employee (Recepcionista/Admin)
 * @body { exitData: object }
 */
router.post(
  '/receptionist/equipment-exit', 
  requireAccess({
    allowedRoles: ['recepcionista', 'admin', 'superadmin'],
    userType: USER_TYPES.EMPLOYEE
  }),
  validate(schemas.registerEquipmentExit),
  receptionistRegisterEquipmentExit
);

// ========================================
// ROL: STAFF TÉCNICO
// ========================================

/**
 * Listar órdenes asignadas
 * 
 * GET /api/employee/tech/orders
 * @auth Employee (Técnico/Admin/Supervisor)
 */
router.get(
  '/tech/orders', 
  requireAccess({
    allowedRoles: ['technician', 'specialist', 'admin', 'superadmin', 'supervisor'],
    userType: USER_TYPES.EMPLOYEE
  }),
  techListAssignedOrders
);

/**
 * Establecer diagnóstico
 * 
 * POST /api/employee/tech/diagnosis
 * @auth Employee (Técnico/Admin)
 * @body { orderId: number, diagnosis: string }
 */
router.post(
  '/tech/diagnosis', 
  requireAccess({
    allowedRoles: ['technician', 'specialist', 'admin', 'superadmin'],
    userType: USER_TYPES.EMPLOYEE,
    strictValidation: true
  }),
  validate(schemas.setDiagnosis),
  techSetDiagnosis
);

/**
 * Iniciar servicio técnico
 * 
 * POST /api/employee/tech/start-service
 * @auth Employee (Técnico/Admin)
 * @body { orderId: number, startTime: Date }
 */
router.post(
  '/tech/start-service', 
  requireAccess({
    allowedRoles: ['technician', 'specialist', 'admin', 'superadmin'],
    userType: USER_TYPES.EMPLOYEE,
    strictValidation: true
  }),
  validate(schemas.startService),
  techStartService
);

/**
 * Finalizar servicio técnico
 * 
 * POST /api/employee/tech/end-service
 * @auth Employee (Técnico/Admin)
 * @body { orderId: number, endTime: Date, notes: string }
 */
router.post(
  '/tech/end-service', 
  requireAccess({
    allowedRoles: ['technician', 'specialist', 'admin', 'superadmin'],
    userType: USER_TYPES.EMPLOYEE,
    strictValidation: true
  }),
  validate(schemas.endService),
  techEndService
);

// ========================================
// ROL: STAFF VENTAS
// ========================================

/**
 * Listar órdenes para ventas
 * 
 * GET /api/employee/sales/orders
 * @auth Employee (Ventas/Admin/Supervisor)
 */
router.get(
  '/sales/orders', 
  requireAccess({
    allowedRoles: ['sales', 'admin', 'superadmin', 'supervisor'],
    userType: USER_TYPES.EMPLOYEE
  }),
  validate(schemas.listOrdersQuery, 'query'),
  salesListOrders
);

/**
 * Agregar partes y precios
 * 
 * POST /api/employee/sales/parts-price
 * @auth Employee (Ventas/Admin)
 * @body { orderId: number, parts: array, totalPrice: number }
 */
router.post(
  '/sales/parts-price', 
  requireAccess({
    allowedRoles: ['sales', 'admin', 'superadmin'],
    userType: USER_TYPES.EMPLOYEE,
    strictValidation: true
  }),
  validate(schemas.generateProforma),
  salesAddPartsAndPrice
);

/**
 * Enviar proforma al cliente
 * 
 * POST /api/employee/sales/send-proforma
 * @auth Employee (Ventas/Admin)
 * @body { orderId: number, proformaId: number }
 */
router.post(
  '/sales/send-proforma', 
  requireAccess({
    allowedRoles: ['sales', 'admin', 'superadmin'],
    userType: USER_TYPES.EMPLOYEE,
    strictValidation: true
  }),
  validate(schemas.sendProforma),
  salesSendProforma
);

// ========================================
// RUTAS ESPECIALIZADAS CON MIDDLEWARES DEDICADOS
// ========================================

/**
 * Dashboard técnico (middleware especializado)
 * 
 * GET /api/employee/technical/dashboard
 * @auth Employee (Técnico/Especialista/Admin)
 */
router.get(
  '/technical/dashboard',
  requireTechnical(), // Middleware especializado para roles técnicos
  (req, res) => {
    res.json({
      success: true,
      message: 'Dashboard técnico',
      data: {
        pendingOrders: 12,
        inProgress: 5,
        completedToday: 8
      }
    });
  }
);

/**
 * Reportes de ventas (múltiples roles)
 * 
 * GET /api/employee/sales/reports
 * @auth Employee (Ventas/Admin/Supervisor)
 */
router.get(
  '/sales/reports',
  requireEmployeeRoles(['sales', 'admin', 'superadmin', 'supervisor']),
  (req, res) => {
    res.json({
      success: true,
      message: 'Reportes de ventas',
      data: {
        monthlyRevenue: 25000,
        pendingProformas: 7,
        approvedThisWeek: 15
      }
    });
  }
);

// ========================================
// RUTAS DE GESTIÓN (Solo administradores)
// ========================================

/**
 * Estadísticas del sistema (solo admin)
 * 
 * GET /api/employee/admin/statistics
 * @auth Employee (Admin/SuperAdmin)
 */
router.get(
  '/admin/statistics',
  requireAdmin(), // Solo administradores
  (req, res) => {
    res.json({
      success: true,
      message: 'Estadísticas del sistema',
      data: {
        totalEmployees: 25,
        activeOrders: 47,
        monthlyGrowth: '12%'
      }
    });
  }
);

/**
 * Gestión de recepcionistas
 * 
 * GET /api/employee/admin/reception-staff
 * @auth Employee (Admin/SuperAdmin/Supervisor)
 */
router.get(
  '/admin/reception-staff',
  requireAccess({
    allowedRoles: ['admin', 'superadmin', 'supervisor'],
    userType: USER_TYPES.EMPLOYEE
  }),
  (req, res) => {
    res.json({
      success: true,
      message: 'Personal de recepción',
      data: {
        receptionists: [
          { id: 1, name: 'Ana García', active: true },
          { id: 2, name: 'Carlos López', active: true }
        ]
      }
    });
  }
);

// ========================================
// RUTAS HÍBRIDAS (Múltiples departamentos)
// ========================================

/**
 * Buscar órdenes (acceso múltiple)
 * 
 * GET /api/employee/search/orders
 * @auth Employee (Cualquier rol excepto cliente)
 */
router.get(
  '/search/orders',
  requireEmployeeAuth(), // Cualquier empleado
  validate(schemas.searchOrders, 'query'),
  (req, res) => {
    res.json({
      success: true,
      message: 'Búsqueda de órdenes',
      data: {
        results: [],
        filters: req.query
      }
    });
  }
);

/**
 * Notificaciones del sistema
 * 
 * GET /api/employee/notifications
 * @auth Employee (Cualquier rol)
 */
router.get(
  '/notifications',
  requireEmployeeAuth(), // Cualquier empleado
  (req, res) => {
    res.json({
      success: true,
      message: 'Notificaciones',
      data: {
        unread: 3,
        notifications: [
          { id: 1, type: 'info', message: 'Nueva orden asignada', timestamp: new Date() }
        ]
      }
    });
  }
);

// ========================================
// MANEJO DE ERRORES ESPECÍFICO
// ========================================

/**
 * Manejador de errores 404 para rutas de empleados
 */
router.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'EMPLOYEE_ENDPOINT_NOT_FOUND',
      message: 'Endpoint no encontrado en el portal de empleados',
      details: 'Verifique la documentación de la API de empleados'
    },
    availableEndpoints: [
      'POST /api/employee/login',
      'POST /api/employee/forgot-password',
      'POST /api/employee/change-password',
      'POST /api/employee/logout',
      'POST /api/employee/receptionist/client',
      'POST /api/employee/receptionist/equipment',
      'POST /api/employee/receptionist/create-order',
      'GET /api/employee/tech/orders',
      'POST /api/employee/tech/diagnosis',
      'GET /api/employee/sales/orders',
      'POST /api/employee/sales/parts-price',
      'GET /api/employee/technical/dashboard',
      'GET /api/employee/sales/reports',
      'GET /api/employee/search/orders',
      'GET /api/employee/notifications'
    ],
    timestamp: new Date().toISOString()
  });
});

export default router;