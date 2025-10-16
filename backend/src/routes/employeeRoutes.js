// employeeRoutes.js - Refactorizado con roleMiddleware oficial
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
  requireReception,
  requireTechnical,
  requireSales,
  requireEmployeeRoles,
  SYSTEM_ROLES,
  USER_TYPES
} from '../middlewares/roleMiddleware.js';
import { 
  validate, 
  schemas, 
  sanitizeRequest 
} from '../middlewares/validator.js';

const router = express.Router();

// ========================================
// MIDDLEWARE GLOBAL DE SANITIZACIÓN
// ========================================
router.use(sanitizeRequest);

// ========================================
// RUTAS PÚBLICAS - AUTENTICACIÓN
// ========================================

/**
 * Login de empleados
 * 
 * @route   POST /api/employee/login
 * @access  Public
 * @body    { workId: string, password: string }
 * @returns { success: boolean, message: string, data: { user: object } }
 */
router.post(
  '/login', 
  validate(schemas.login),
  employeeLogin
);

/**
 * Solicitar recuperación de contraseña
 * Envía solicitud al administrador IT
 * 
 * @route   POST /api/employee/forgot-password
 * @access  Public
 * @body    { workId: string }
 * @returns { success: boolean, message: string }
 */
router.post(
  '/forgot-password', 
  validate(schemas.forgotPassword),
  employeeForgotPassword
);

// ========================================
// MIDDLEWARE GLOBAL DE AUTENTICACIÓN
// Todas las rutas siguientes requieren autenticación
// ========================================
router.use(authenticateHybrid);

// ========================================
// RUTAS GENERALES - EMPLEADOS AUTENTICADOS
// ========================================

/**
 * Cambiar contraseña
 * 
 * @route   POST /api/employee/change-password
 * @access  Private (Cualquier empleado autenticado)
 * @body    { oldPassword: string, newPassword: string }
 * @returns { success: boolean, message: string }
 */
router.post(
  '/change-password', 
  requireEmployeeAuth(),
  validate(schemas.changePassword),
  employeeChangePassword
);

/**
 * Cerrar sesión
 * 
 * @route   POST /api/employee/logout
 * @access  Private (Cualquier empleado autenticado)
 * @returns { success: boolean, message: string }
 */
router.post(
  '/logout',
  requireEmployeeAuth(),
  employeeLogout
);

/**
 * Notificaciones del sistema
 * 
 * @route   GET /api/employee/notifications
 * @access  Private (Cualquier empleado autenticado)
 * @returns { success: boolean, data: { unread: number, notifications: array } }
 */
router.get(
  '/notifications',
  requireEmployeeAuth(),
  (req, res) => {
    res.json({
      success: true,
      message: 'Notificaciones del usuario',
      data: {
        unread: 3,
        notifications: [
          { 
            id: 1, 
            type: 'info', 
            message: 'Nueva orden asignada', 
            timestamp: new Date(),
            read: false
          },
          { 
            id: 2, 
            type: 'warning', 
            message: 'Orden próxima a vencer', 
            timestamp: new Date(),
            read: false
          },
          { 
            id: 3, 
            type: 'success', 
            message: 'Proforma aprobada', 
            timestamp: new Date(),
            read: false
          }
        ],
        userId: req.auth.userId,
        username: req.auth.username
      }
    });
  }
);

/**
 * Búsqueda general de órdenes
 * 
 * @route   GET /api/employee/search/orders
 * @access  Private (Cualquier empleado autenticado)
 * @query   { search?: string, status?: string, clientId?: number }
 * @returns { success: boolean, data: { results: array, filters: object } }
 */
router.get(
  '/search/orders',
  requireEmployeeAuth(),
  validate(schemas.searchOrders, 'query'),
  (req, res) => {
    res.json({
      success: true,
      message: 'Búsqueda de órdenes',
      data: {
        results: [],
        filters: req.query,
        totalCount: 0,
        searchBy: req.auth.username
      }
    });
  }
);

// ========================================
// ROL: RECEPCIONISTA
// Gestión de clientes, equipos y órdenes
// ========================================

/**
 * Crear o actualizar cliente
 * 
 * @route   POST /api/employee/receptionist/client
 * @access  Private (Administrador, Recepcionista)
 * @body    { 
 *   clientId?: number, 
 *   clientTypeId: number, 
 *   displayName: string,
 *   idNumber: string,
 *   email?: string,
 *   phone?: string,
 *   address?: string,
 *   contactName?: string,
 *   isPublicService?: boolean,
 *   organizationName?: string,
 *   deliveryAddress?: string
 * }
 * @returns { success: boolean, message: string, data: { client: object } }
 */
router.post(
  '/receptionist/client', 
  requireReception(), // Usa middleware especializado: Admin + Recepcionista
  validate(schemas.createClient),
  receptionistCreateOrUpdateClient
);

/**
 * Registrar equipo nuevo
 * 
 * @route   POST /api/employee/receptionist/equipment
 * @access  Private (Administrador, Recepcionista)
 * @body    {
 *   clientId: number,
 *   equipmentTypeId: number,
 *   brand: string,
 *   model: string,
 *   serialNumber?: string,
 *   description?: string
 * }
 * @returns { success: boolean, message: string, data: { equipment: object } }
 */
router.post(
  '/receptionist/equipment', 
  requireReception(),
  validate(schemas.registerEquipment),
  receptionistRegisterEquipment
);

/**
 * Crear orden de servicio
 * Incluye registro automático de entrada de equipo
 * 
 * @route   POST /api/employee/receptionist/create-order
 * @access  Private (Administrador, Recepcionista)
 * @body    {
 *   clientId: number,
 *   equipmentId: number,
 *   notes?: string,
 *   estimatedDeliveryDate?: string (ISO 8601),
 *   technicianId?: number
 * }
 * @returns { success: boolean, message: string, data: { order: object } }
 */
router.post(
  '/receptionist/create-order', 
  requireReception(),
  validate(schemas.createOrder),
  receptionistCreateOrder
);

/**
 * Registrar salida de equipo
 * Marca la orden como entregada
 * 
 * @route   POST /api/employee/receptionist/equipment-exit
 * @access  Private (Administrador, Recepcionista)
 * @body    {
 *   orderId: number,
 *   receivedByClientName: string,
 *   notes?: string
 * }
 * @returns { success: boolean, message: string, data: { order: object } }
 */
router.post(
  '/receptionist/equipment-exit', 
  requireReception(),
  validate(schemas.registerEquipmentExit),
  receptionistRegisterEquipmentExit
);

/**
 * Dashboard de recepción
 * 
 * @route   GET /api/employee/receptionist/dashboard
 * @access  Private (Administrador, Recepcionista)
 * @returns { success: boolean, data: object }
 */
router.get(
  '/receptionist/dashboard',
  requireReception(),
  (req, res) => {
    res.json({
      success: true,
      message: 'Dashboard de recepción',
      data: {
        ordersCreatedToday: 8,
        equipmentsDeliveredToday: 5,
        pendingDeliveries: 12,
        newClientsThisWeek: 3,
        receptionist: {
          id: req.auth.userId,
          username: req.auth.username,
          roles: req.auth.roles
        }
      }
    });
  }
);

// ========================================
// ROL: STAFF TÉCNICO
// Gestión de diagnósticos y servicios
// ========================================

/**
 * Listar órdenes asignadas al técnico
 * 
 * @route   GET /api/employee/tech/orders
 * @access  Private (Administrador, Staff Técnico)
 * @returns { success: boolean, data: { orders: array, count: number } }
 */
router.get(
  '/tech/orders', 
  requireTechnical(), // Usa middleware especializado: Admin + Staff Técnico
  techListAssignedOrders
);

/**
 * Establecer diagnóstico técnico
 * Actualiza estado de orden a DIAGNOSTICADO
 * 
 * @route   POST /api/employee/tech/diagnosis
 * @access  Private (Administrador, Staff Técnico)
 * @body    {
 *   orderId: number,
 *   diagnosis: string
 * }
 * @returns { success: boolean, message: string, data: { order: object } }
 */
router.post(
  '/tech/diagnosis', 
  requireTechnical(),
  validate(schemas.setDiagnosis),
  techSetDiagnosis
);

/**
 * Iniciar servicio técnico
 * Actualiza estado a EN_PROGRESO y registra fecha de inicio
 * 
 * @route   POST /api/employee/tech/start-service
 * @access  Private (Administrador, Staff Técnico)
 * @body    { orderId: number }
 * @returns { success: boolean, message: string, data: { order: object } }
 */
router.post(
  '/tech/start-service', 
  requireTechnical(),
  validate(schemas.startService),
  techStartService
);

/**
 * Finalizar servicio técnico
 * Actualiza estado a COMPLETADO y registra fecha de finalización
 * 
 * @route   POST /api/employee/tech/end-service
 * @access  Private (Administrador, Staff Técnico)
 * @body    {
 *   orderId: number,
 *   finalNotes?: string
 * }
 * @returns { success: boolean, message: string, data: { order: object } }
 */
router.post(
  '/tech/end-service', 
  requireTechnical(),
  validate(schemas.endService),
  techEndService
);

/**
 * Dashboard técnico
 * Estadísticas y métricas del técnico
 * 
 * @route   GET /api/employee/technical/dashboard
 * @access  Private (Administrador, Staff Técnico)
 * @returns { success: boolean, data: object }
 */
router.get(
  '/technical/dashboard',
  requireTechnical(),
  (req, res) => {
    res.json({
      success: true,
      message: 'Dashboard técnico',
      data: {
        assignedOrders: 12,
        ordersInProgress: 5,
        completedToday: 8,
        completedThisWeek: 35,
        avgRepairTime: '2.5 horas',
        pendingDiagnosis: 3,
        technician: {
          id: req.auth.userId,
          username: req.auth.username,
          roles: req.auth.roles
        }
      }
    });
  }
);

// ========================================
// ROL: STAFF VENTAS
// Gestión de proformas y precios
// ========================================

/**
 * Listar órdenes para ventas
 * Soporta filtros avanzados
 * 
 * @route   GET /api/employee/sales/orders
 * @access  Private (Administrador, Staff Ventas)
 * @query   {
 *   status?: number,
 *   startDate?: string,
 *   endDate?: string,
 *   clientId?: number
 * }
 * @returns { success: boolean, data: { orders: array, count: number } }
 */
router.get(
  '/sales/orders', 
  requireSales(), // Usa middleware especializado: Admin + Staff Ventas
  validate(schemas.listOrdersQuery, 'query'),
  salesListOrders
);

/**
 * Agregar partes y precios (Generar proforma)
 * 
 * @route   POST /api/employee/sales/parts-price
 * @access  Private (Administrador, Staff Ventas)
 * @body    {
 *   orderId: number,
 *   parts: string,
 *   totalPrice: number
 * }
 * @returns { success: boolean, message: string, data: { order: object } }
 */
router.post(
  '/sales/parts-price', 
  requireSales(),
  validate(schemas.generateProforma),
  salesAddPartsAndPrice
);

/**
 * Enviar proforma al cliente por email
 * Actualiza estado a PROFORMA_ENVIADA
 * 
 * @route   POST /api/employee/sales/send-proforma
 * @access  Private (Administrador, Staff Ventas)
 * @body    { orderId: number }
 * @returns { success: boolean, message: string }
 */
router.post(
  '/sales/send-proforma', 
  requireSales(),
  validate(schemas.sendProforma),
  salesSendProforma
);

/**
 * Reportes de ventas
 * 
 * @route   GET /api/employee/sales/reports
 * @access  Private (Administrador, Staff Ventas)
 * @returns { success: boolean, data: object }
 */
router.get(
  '/sales/reports',
  requireSales(),
  (req, res) => {
    res.json({
      success: true,
      message: 'Reportes de ventas',
      data: {
        monthlyRevenue: 25000,
        pendingProformas: 7,
        generatedProformas: 45,
        approvedProformas: 38,
        rejectedProformas: 2,
        approvedThisWeek: 15,
        avgApprovalTime: '1.5 días',
        avgOrderValue: 555.55,
        topClients: [
          { clientId: 1, name: 'Cliente A', totalSpent: 5000 },
          { clientId: 2, name: 'Cliente B', totalSpent: 3500 }
        ],
        salesPerson: {
          id: req.auth.userId,
          username: req.auth.username,
          roles: req.auth.roles
        }
      }
    });
  }
);

/**
 * Dashboard de ventas
 * 
 * @route   GET /api/employee/sales/dashboard
 * @access  Private (Administrador, Staff Ventas)
 * @returns { success: boolean, data: object }
 */
router.get(
  '/sales/dashboard',
  requireSales(),
  (req, res) => {
    res.json({
      success: true,
      message: 'Dashboard de ventas',
      data: {
        proformasToday: 8,
        approvedToday: 5,
        pendingApproval: 12,
        revenueToday: 4500,
        revenueThisMonth: 45000,
        avgResponseTime: '2.3 horas',
        salesPerson: {
          id: req.auth.userId,
          username: req.auth.username
        }
      }
    });
  }
);

// ========================================
// ROL: ADMINISTRADORES
// Gestión del sistema y reportes avanzados
// ========================================

/**
 * Estadísticas generales del sistema
 * 
 * @route   GET /api/employee/admin/statistics
 * @access  Private (Administrador únicamente)
 * @returns { success: boolean, data: object }
 */
router.get(
  '/admin/statistics',
  requireAdmin(), // Solo Admin, sin herencia
  (req, res) => {
    res.json({
      success: true,
      message: 'Estadísticas del sistema',
      data: {
        overview: {
          totalEmployees: 25,
          activeOrders: 47,
          completedThisMonth: 123,
          monthlyRevenue: 45000,
          monthlyGrowth: '12%'
        },
        performance: {
          avgServiceTime: '3.2 días',
          avgResponseTime: '2.1 horas',
          customerSatisfaction: '4.5/5',
          employeeUtilization: '87%'
        },
        financial: {
          pendingPayments: 15000,
          collectedThisMonth: 45000,
          projectedRevenue: 52000
        },
        admin: {
          id: req.auth.userId,
          username: req.auth.username,
          lastAccess: new Date()
        }
      }
    });
  }
);

/**
 * Gestión de personal de recepción
 * 
 * @route   GET /api/employee/admin/reception-staff
 * @access  Private (Administrador únicamente)
 * @returns { success: boolean, data: object }
 */
router.get(
  '/admin/reception-staff',
  requireAdmin(),
  (req, res) => {
    res.json({
      success: true,
      message: 'Personal de recepción',
      data: {
        staff: [
          { 
            id: 1, 
            username: 'ana.garcia', 
            email: 'ana.garcia@ecuatechnology.com',
            role: SYSTEM_ROLES.RECEPTIONIST,
            active: true,
            ordersProcessedToday: 8,
            ordersProcessedThisMonth: 156,
            avgProcessingTime: '15 min'
          },
          { 
            id: 2, 
            username: 'carlos.lopez', 
            email: 'carlos.lopez@ecuatechnology.com',
            role: SYSTEM_ROLES.RECEPTIONIST,
            active: true,
            ordersProcessedToday: 12,
            ordersProcessedThisMonth: 203,
            avgProcessingTime: '12 min'
          }
        ],
        summary: {
          totalStaff: 2,
          activeStaff: 2,
          totalOrdersProcessed: 359,
          avgEfficiency: '93%'
        }
      }
    });
  }
);

/**
 * Gestión de personal técnico
 * 
 * @route   GET /api/employee/admin/technical-staff
 * @access  Private (Administrador únicamente)
 * @returns { success: boolean, data: object }
 */
router.get(
  '/admin/technical-staff',
  requireAdmin(),
  (req, res) => {
    res.json({
      success: true,
      message: 'Personal técnico',
      data: {
        staff: [
          { 
            id: 3, 
            username: 'juan.tech', 
            email: 'juan.tech@ecuatechnology.com',
            role: SYSTEM_ROLES.TECHNICIAN,
            active: true,
            assignedOrders: 5,
            completedToday: 2,
            completedThisMonth: 45,
            avgRepairTime: '2.5 horas',
            specialties: ['Laptops', 'PCs']
          },
          { 
            id: 4, 
            username: 'maria.specialist', 
            email: 'maria.specialist@ecuatechnology.com',
            role: SYSTEM_ROLES.TECHNICIAN,
            active: true,
            assignedOrders: 3,
            completedToday: 1,
            completedThisMonth: 38,
            avgRepairTime: '3.1 horas',
            specialties: ['Redes', 'Servidores']
          }
        ],
        summary: {
          totalStaff: 2,
          activeStaff: 2,
          totalRepairsCompleted: 83,
          avgEfficiency: '91%'
        }
      }
    });
  }
);

/**
 * Gestión de personal de ventas
 * 
 * @route   GET /api/employee/admin/sales-staff
 * @access  Private (Administrador únicamente)
 * @returns { success: boolean, data: object }
 */
router.get(
  '/admin/sales-staff',
  requireAdmin(),
  (req, res) => {
    res.json({
      success: true,
      message: 'Personal de ventas',
      data: {
        staff: [
          { 
            id: 5, 
            username: 'pedro.sales', 
            email: 'pedro.sales@ecuatechnology.com',
            role: SYSTEM_ROLES.SALES,
            active: true,
            proformasGeneratedToday: 6,
            proformasApprovedToday: 4,
            revenueGenerated: 12500,
            avgClosingTime: '1.5 días'
          }
        ],
        summary: {
          totalStaff: 1,
          activeStaff: 1,
          totalRevenue: 12500,
          avgConversionRate: '78%'
        }
      }
    });
  }
);

/**
 * Auditoría de cambios de estado
 * 
 * @route   GET /api/employee/admin/audit/status-changes
 * @access  Private (Administrador únicamente)
 * @query   { orderId?: number, startDate?: string, endDate?: string, userId?: number }
 * @returns { success: boolean, data: { history: array } }
 */
router.get(
  '/admin/audit/status-changes',
  requireAdmin(),
  (req, res) => {
    res.json({
      success: true,
      message: 'Historial de cambios de estado',
      data: {
        history: [
          {
            historyId: 1,
            orderId: 123,
            orderTag: 'ORD-2024-00123',
            statusCode: 'DIAGNOSTICADO',
            statusName: 'Diagnosticado',
            changedAt: new Date('2024-01-15T10:30:00Z'),
            changedBy: {
              userId: 3,
              username: 'juan.tech',
              role: SYSTEM_ROLES.TECHNICIAN
            },
            notes: 'Diagnóstico técnico completado: disco duro dañado',
            previousStatus: 'RECIBIDO'
          },
          {
            historyId: 2,
            orderId: 123,
            orderTag: 'ORD-2024-00123',
            statusCode: 'PROFORMA_ENVIADA',
            statusName: 'Proforma Enviada',
            changedAt: new Date('2024-01-15T14:20:00Z'),
            changedBy: {
              userId: 5,
              username: 'pedro.sales',
              role: SYSTEM_ROLES.SALES
            },
            notes: 'Proforma enviada al cliente para aprobación',
            previousStatus: 'DIAGNOSTICADO'
          }
        ],
        filters: req.query,
        totalRecords: 2,
        page: 1,
        pageSize: 20
      }
    });
  }
);

/**
 * Gestión de usuarios y roles
 * 
 * @route   GET /api/employee/admin/users
 * @access  Private (Administrador únicamente)
 * @query   { role?: string, active?: boolean, search?: string }
 * @returns { success: boolean, data: object }
 */
router.get(
  '/admin/users',
  requireAdmin(),
  (req, res) => {
    res.json({
      success: true,
      message: 'Gestión de usuarios',
      data: {
        users: [
          {
            userId: 1,
            username: 'admin.user',
            email: 'admin@ecuatechnology.com',
            roles: [SYSTEM_ROLES.ADMIN],
            active: true,
            lastLogin: new Date(),
            createdAt: new Date('2024-01-01')
          }
        ],
        filters: req.query,
        totalUsers: 1,
        activeUsers: 1
      }
    });
  }
);

// ========================================
// RUTAS HÍBRIDAS (Múltiples roles)
// ========================================

/**
 * Ver detalles de una orden específica
 * Empleados con roles específicos pueden ver todas las órdenes
 * 
 * @route   GET /api/employee/orders/:orderId
 * @access  Private (Admin, Recepcionista, Staff Técnico, Staff Ventas)
 * @param   {number} orderId - ID de la orden
 * @returns { success: boolean, data: { order: object } }
 */
router.get(
  '/orders/:orderId',
  requireEmployeeRoles([
    SYSTEM_ROLES.ADMIN,
    SYSTEM_ROLES.RECEPTIONIST,
    SYSTEM_ROLES.TECHNICIAN,
    SYSTEM_ROLES.SALES
  ]),
  (req, res) => {
    res.json({
      success: true,
      message: 'Detalle de orden',
      data: {
        order: {
          orderId: req.params.orderId,
          identityTag: 'ORD-2024-00123',
          status: 'EN_PROGRESO',
          client: {
            clientId: 1,
            displayName: 'Juan Pérez',
            email: 'juan@example.com'
          },
          equipment: {
            brand: 'Dell',
            model: 'Latitude 5420',
            serialNumber: 'SN123456'
          },
          assignedTo: {
            userId: 3,
            username: 'juan.tech'
          }
        },
        accessedBy: {
          userId: req.auth.userId,
          username: req.auth.username,
          roles: req.auth.roles
        }
      }
    });
  }
);

/**
 * Obtener tipos de equipo disponibles
 * Cualquier empleado puede acceder
 * 
 * @route   GET /api/employee/equipment-types
 * @access  Private (Cualquier empleado)
 * @returns { success: boolean, data: { types: array } }
 */
router.get(
  '/equipment-types',
  requireEmployeeAuth(),
  (req, res) => {
    res.json({
      success: true,
      message: 'Tipos de equipo',
      data: {
        types: [
          { id: 1, name: 'Laptop' },
          { id: 2, name: 'PC Desktop' },
          { id: 3, name: 'Impresora' },
          { id: 4, name: 'Monitor' },
          { id: 5, name: 'Servidor' }
        ]
      }
    });
  }
);

/**
 * Obtener tipos de cliente disponibles
 * Cualquier empleado puede acceder
 * 
 * @route   GET /api/employee/client-types
 * @access  Private (Cualquier empleado)
 * @returns { success: boolean, data: { types: array } }
 */
router.get(
  '/client-types',
  requireEmployeeAuth(),
  (req, res) => {
    res.json({
      success: true,
      message: 'Tipos de cliente',
      data: {
        types: [
          { id: 1, code: 'NATURAL', name: 'Persona Natural' },
          { id: 2, code: 'JURIDICA', name: 'Persona Jurídica' },
          { id: 3, code: 'PUBLICA', name: 'Institución Pública' }
        ]
      }
    });
  }
);

/**
 * Obtener estados del sistema
 * Cualquier empleado puede acceder
 * 
 * @route   GET /api/employee/statuses
 * @access  Private (Cualquier empleado)
 * @returns { success: boolean, data: { statuses: array } }
 */
router.get(
  '/statuses',
  requireEmployeeAuth(),
  (req, res) => {
    res.json({
      success: true,
      message: 'Estados del sistema',
      data: {
        statuses: [
          { code: 'RECIBIDO', name: 'Recibido', sortOrder: 1 },
          { code: 'DIAGNOSTICADO', name: 'Diagnosticado', sortOrder: 2 },
          { code: 'PROFORMA_ENVIADA', name: 'Proforma Enviada', sortOrder: 3 },
          { code: 'EN_PROGRESO', name: 'En Progreso', sortOrder: 4 },
          { code: 'COMPLETADO', name: 'Completado', sortOrder: 5 },
          { code: 'ENTREGADO', name: 'Entregado', sortOrder: 6, isTerminal: true }
        ]
      }
    });
  }
);

// ========================================
// MANEJO DE ERRORES 404
// ========================================

/**
 * Manejador de rutas no encontradas
 * Devuelve lista de endpoints disponibles según el rol del usuario
 */
router.use((req, res) => {
  // Determinar qué endpoints mostrar según los roles del usuario
  const userRoles = req.auth?.roles || [];
  const isAdmin = userRoles.includes(SYSTEM_ROLES.ADMIN);
  const isReceptionist = userRoles.includes(SYSTEM_ROLES.RECEPTIONIST);
  const isTechnician = userRoles.includes(SYSTEM_ROLES.TECHNICIAN);
  const isSales = userRoles.includes(SYSTEM_ROLES.SALES);

  // Endpoints base (disponibles para todos los empleados autenticados)
  const baseEndpoints = [
    'POST /api/employee/change-password',
    'POST /api/employee/logout',
    'GET /api/employee/notifications',
    'GET /api/employee/search/orders',
    'GET /api/employee/equipment-types',
    'GET /api/employee/client-types',
    'GET /api/employee/statuses',
    'GET /api/employee/orders/:orderId'
  ];

  // Endpoints de recepción
  const receptionEndpoints = (isAdmin || isReceptionist) ? [
    'POST /api/employee/receptionist/client',
    'POST /api/employee/receptionist/equipment',
    'POST /api/employee/receptionist/create-order',
    'POST /api/employee/receptionist/equipment-exit',
    'GET /api/employee/receptionist/dashboard'
  ] : [];

  // Endpoints técnicos
  const technicalEndpoints = (isAdmin || isTechnician) ? [
    'GET /api/employee/tech/orders',
    'POST /api/employee/tech/diagnosis',
    'POST /api/employee/tech/start-service',
    'POST /api/employee/tech/end-service',
    'GET /api/employee/technical/dashboard'
  ] : [];

  // Endpoints de ventas
  const salesEndpoints = (isAdmin || isSales) ? [
    'GET /api/employee/sales/orders',
    'POST /api/employee/sales/parts-price',
    'POST /api/employee/sales/send-proforma',
    'GET /api/employee/sales/reports',
    'GET /api/employee/sales/dashboard'
  ] : [];

  // Endpoints de administración
  const adminEndpoints = isAdmin ? [
    'GET /api/employee/admin/statistics',
    'GET /api/employee/admin/reception-staff',
    'GET /api/employee/admin/technical-staff',
    'GET /api/employee/admin/sales-staff',
    'GET /api/employee/admin/audit/status-changes',
    'GET /api/employee/admin/users'
  ] : [];

  res.status(404).json({
    success: false,
    error: {
      code: 'EMPLOYEE_ENDPOINT_NOT_FOUND',
      message: 'Endpoint no encontrado en el portal de empleados',
      path: req.originalUrl,
      method: req.method,
      details: 'Verifique la documentación de la API de empleados'
    },
    user: req.auth ? {
      userId: req.auth.userId,
      username: req.auth.username,
      roles: userRoles,
      type: req.auth.type
    } : null,
    availableEndpoints: {
      authentication: [
        'POST /api/employee/login',
        'POST /api/employee/forgot-password'
      ],
      general: baseEndpoints,
      ...(receptionEndpoints.length > 0 && { reception: receptionEndpoints }),
      ...(technicalEndpoints.length > 0 && { technical: technicalEndpoints }),
      ...(salesEndpoints.length > 0 && { sales: salesEndpoints }),
      ...(adminEndpoints.length > 0 && { admin: adminEndpoints })
    },
    totalAvailableEndpoints: 
      2 + // authentication
      baseEndpoints.length + 
      receptionEndpoints.length + 
      technicalEndpoints.length + 
      salesEndpoints.length + 
      adminEndpoints.length,
    timestamp: new Date().toISOString()
  });
});

// ========================================
// EXPORTACIÓN
// ========================================
export default router;