// adminRoutes.js (CORREGIDO)
import express from 'express';
import {
  adminCreateUser,
  adminSetUserPassword,
  adminDeleteUser,
  adminUpdateUser,
  adminListUsers,
  adminAssignRole,
  adminCreateRole,
  adminListRoles,
  adminUpdateRole,
  adminDeleteRole,
  getSystemLogs
} from '../controllers/adminController.js';
import { authenticateHybrid } from '../middlewares/authMiddleware.js';
import { 
  requireAdmin,
  requireSupervisor,
  requireTechnical,
  requireEmployeeRoles,
  requireAccess,
  requireEmployeeAuth,
  USER_TYPES
} from '../middlewares/roleMiddleware.js';

const router = express.Router();

// === MIDDLEWARE GLOBAL PARA ADMIN ===
// Todos los endpoints requieren autenticación híbrida primero
router.use(authenticateHybrid);

// ========================================
// GESTIÓN DE USUARIOS - NIVEL ADMINISTRADOR
// ========================================

/**
 * Crear nuevo usuario
 * Solo administradores y superadministradores
 * 
 * POST /api/admin/user/create
 * @auth Employee (Admin/SuperAdmin)
 */
router.post(
  '/user/create', 
  requireAdmin(), // Solo admin, superadmin
  adminCreateUser
);

/**
 * Eliminar usuario
 * Operación crítica - solo administradores principales
 * 
 * POST /api/admin/user/delete
 * @auth Employee (Admin/SuperAdmin)
 */
router.post(
  '/user/delete', 
  requireAccess({
    allowedRoles: ['superadmin', 'admin'], // CORREGIDO: en inglés
    userType: USER_TYPES.EMPLOYEE,
    strictValidation: true
  }),
  adminDeleteUser
);

/**
 * Actualizar usuario
 * Administradores y supervisores senior
 * 
 * POST /api/admin/user/update
 * @auth Employee (Admin/Supervisor/SuperAdmin)
 */
router.post(
  '/user/update', 
  requireAccess({
    allowedRoles: ['superadmin', 'admin', 'manager'], // CORREGIDO: en inglés
    userType: USER_TYPES.EMPLOYEE,
    strictValidation: true
  }),
  adminUpdateUser
);

/**
 * Listar todos los usuarios
 * Administradores y supervisores
 * 
 * GET /api/admin/user/list
 * @auth Employee (Admin/Supervisor/SuperAdmin)
 */
router.get(
  '/user/list', 
  requireAccess({
    allowedRoles: ['superadmin', 'admin', 'supervisor'], // CORREGIDO: en inglés
    userType: USER_TYPES.EMPLOYEE
  }),
  adminListUsers
);

/**
 * Asignar rol a usuario
 * Solo administradores con permisos elevados
 * 
 * POST /api/admin/user/assign-role
 * @auth Employee (Admin/SuperAdmin)
 */
router.post(
  '/user/assign-role', 
  requireAccess({
    allowedRoles: ['superadmin', 'admin'], // CORREGIDO: en inglés
    userType: USER_TYPES.EMPLOYEE,
    strictValidation: true
  }),
  adminAssignRole
);

/**
 * Establecer contraseña de usuario
 * Solo administradores - operación sensible
 * 
 * POST /api/admin/user/set-password
 * @auth Employee (Admin/SuperAdmin)
 */
router.post(
  '/user/set-password', 
  requireAdmin(), // Solo admin y superadmin
  adminSetUserPassword
);

// ========================================
// CRUD DE ROLES - OPERACIONES CRÍTICAS
// ========================================

/**
 * Crear nuevo rol
 * Solo superadministradores
 * 
 * POST /api/admin/role/create
 * @auth Employee (SuperAdmin)
 */
router.post(
  '/role/create', 
  requireAccess({
    allowedRoles: ['superadmin'], // CORREGIDO: en inglés
    userType: USER_TYPES.EMPLOYEE,
    strictValidation: true
  }),
  adminCreateRole
);

/**
 * Listar roles del sistema
 * Administradores y supervisores senior
 * 
 * GET /api/admin/role/list
 * @auth Employee (Admin/Supervisor/SuperAdmin)
 */
router.get(
  '/role/list', 
  requireAccess({
    allowedRoles: ['superadmin', 'admin', 'manager'], // CORREGIDO: en inglés
    userType: USER_TYPES.EMPLOYEE
  }),
  adminListRoles
);

/**
 * Actualizar rol existente
 * Solo superadministradores
 * 
 * POST /api/admin/role/update
 * @auth Employee (SuperAdmin)
 */
router.post(
  '/role/update', 
  requireAccess({
    allowedRoles: ['superadmin'], // CORREGIDO: en inglés
    userType: USER_TYPES.EMPLOYEE,
    strictValidation: true
  }),
  adminUpdateRole
);

/**
 * Eliminar rol
 * Operación ultra crítica - solo superadministradores
 * 
 * POST /api/admin/role/delete
 * @auth Employee (SuperAdmin)
 */
router.post(
  '/role/delete', 
  requireAccess({
    allowedRoles: ['superadmin'], // CORREGIDO: en inglés
    userType: USER_TYPES.EMPLOYEE,
    strictValidation: true
  }),
  adminDeleteRole
);

// ========================================
// SISTEMA Y LOGS - MÚLTIPLES NIVELES DE ACCESO
// ========================================

/**
 * Ver logs del sistema
 * Diferentes niveles de acceso según rol
 * 
 * GET /api/admin/system/logs
 * @auth Employee (Admin/Supervisor/Technical/SuperAdmin)
 */
router.get(
  '/system/logs', 
  requireAccess({
    allowedRoles: [
      'superadmin', 
      'admin', 
      'supervisor', 
      'technician',
      'specialist'
    ], // CORREGIDO: en inglés
    userType: USER_TYPES.EMPLOYEE
  }),
  getSystemLogs
);

// ========================================
// RUTAS ESPECIALIZADAS POR DEPARTAMENTO
// ========================================

/**
 * Dashboard de supervisión
 * Solo supervisores y administradores
 * 
 * GET /api/admin/dashboard/supervisor
 * @auth Employee (Supervisor/Admin/SuperAdmin)
 */
router.get(
  '/dashboard/supervisor',
  requireSupervisor(), // Usando middleware especializado
  (req, res) => {
    res.json({ 
      success: true,
      message: 'Dashboard de supervisión',
      data: {
        metrics: {
          totalUsers: 150,
          activeSessions: 45,
          systemHealth: 'optimal'
        }
      }
    });
  }
);

/**
 * Herramientas técnicas
 * Solo personal técnico y administradores
 * 
 * GET /api/admin/tools/technical
 * @auth Employee (Technical/Admin/SuperAdmin)
 */
router.get(
  '/tools/technical',
  requireTechnical(), // Usando middleware especializado
  (req, res) => {
    res.json({ 
      success: true,
      message: 'Herramientas técnicas',
      data: {
        availableTools: ['system_monitor', 'database_cleanup', 'cache_management']
      }
    });
  }
);

/**
 * Reportes avanzados
 * Múltiples roles con diferentes niveles de acceso
 * 
 * GET /api/admin/reports/advanced
 * @auth Employee (Admin/Supervisor/Technical/SuperAdmin)
 */
router.get(
  '/reports/advanced',
  requireEmployeeRoles(['admin', 'supervisor', 'technician', 'superadmin']), // CORREGIDO: en inglés
  (req, res) => {
    res.json({ 
      success: true,
      message: 'Reportes avanzados',
      data: {
        reports: ['performance', 'usage_analytics', 'security_audit']
      }
    });
  }
);

// ========================================
// GESTIÓN DE PERMISOS GRANULARES
// ========================================

/**
 * Ver auditoría del sistema
 * Acceso muy restringido - solo auditores y superadmins
 * 
 * GET /api/admin/audit/system
 * @auth Employee (SystemAuditor/SuperAdmin)
 */
router.get(
  '/audit/system',
  requireAccess({
    allowedRoles: ['superadmin', 'admin'], // CORREGIDO: usar roles existentes
    userType: USER_TYPES.EMPLOYEE,
    strictValidation: true
  }),
  (req, res) => {
    res.json({ 
      success: true,
      message: 'Auditoría del sistema',
      data: {
        lastAudit: '2024-01-15',
        issuesFound: 2,
        systemCompliance: '98%'
      }
    });
  }
);

/**
 * Gestión de configuraciones
 * Solo administradores senior
 * 
 * PUT /api/admin/config/system
 * @auth Employee (SeniorAdmin/SuperAdmin)
 */
router.put(
  '/config/system',
  requireAccess({
    allowedRoles: ['superadmin', 'admin'], // CORREGIDO: usar roles existentes
    userType: USER_TYPES.EMPLOYEE,
    strictValidation: true
  }),
  (req, res) => {
    res.json({ 
      success: true,
      message: 'Configuración del sistema actualizada',
      data: {
        updatedAt: new Date().toISOString(),
        changes: req.body.changes
      }
    });
  }
);

// ========================================
// RUTAS DE EMERGENCIA - MÁXIMA SEGURIDAD
// ========================================

/**
 * Modo mantenimiento del sistema
 * Solo superadministradores
 * 
 * POST /api/admin/system/maintenance
 * @auth Employee (SuperAdmin)
 */
router.post(
  '/system/maintenance',
  requireAccess({
    allowedRoles: ['superadmin'],
    userType: USER_TYPES.EMPLOYEE,
    strictValidation: true
  }),
  (req, res) => {
    res.json({ 
      success: true,
      message: 'Modo mantenimiento activado',
      data: {
        activatedAt: new Date().toISOString(),
        estimatedDuration: '30 minutes'
      }
    });
  }
);

/**
 * Respaldos del sistema
 * Solo administradores y técnicos senior
 * 
 * GET /api/admin/system/backup
 * @auth Employee (Admin/TechnicalSenior/SuperAdmin)
 */
router.get(
  '/system/backup',
  requireAccess({
    allowedRoles: ['superadmin', 'admin', 'technician'],
    userType: USER_TYPES.EMPLOYEE,
    strictValidation: true
  }),
  (req, res) => {
    res.json({ 
      success: true,
      message: 'Respaldo del sistema',
      data: {
        lastBackup: '2024-01-20 03:00:00',
        backupSize: '2.5 GB',
        status: 'completed'
      }
    });
  }
);

// ========================================
// RUTAS BÁSICAS CON MIDDLEWARES SIMPLES
// ========================================

/**
 * Ruta básica para cualquier empleado
 * 
 * GET /api/admin/employee/dashboard
 * @auth Employee (cualquier rol)
 */
router.get(
  '/employee/dashboard',
  requireEmployeeAuth(), // Cualquier empleado
  (req, res) => {
    res.json({ 
      success: true,
      message: 'Dashboard de empleado',
      user: req.auth
    });
  }
);

// ========================================
// MANEJO DE ERRORES ESPECÍFICO PARA ADMIN
// ========================================

/**
 * Manejador de errores 404 para rutas de administración
 */
router.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ADMIN_ENDPOINT_NOT_FOUND',
      message: 'Endpoint de administración no encontrado',
      details: 'Verifique la documentación de la API de administración'
    },
    availableEndpoints: [
      'POST /api/admin/user/create',
      'POST /api/admin/user/delete',
      'POST /api/admin/user/update',
      'GET /api/admin/user/list',
      'POST /api/admin/user/assign-role',
      'POST /api/admin/user/set-password',
      'POST /api/admin/role/create',
      'GET /api/admin/role/list',
      'POST /api/admin/role/update',
      'POST /api/admin/role/delete',
      'GET /api/admin/system/logs',
      'GET /api/admin/dashboard/supervisor',
      'GET /api/admin/tools/technical',
      'GET /api/admin/reports/advanced',
      'GET /api/admin/employee/dashboard'
    ],
    timestamp: new Date().toISOString()
  });
});

export default router;