// src/routes/adminRoutes.js - Sistema de Administración Completo
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
  getSystemLogs,
  getSystemStatistics
} from '../controllers/adminController.js';
import { authenticateHybrid } from '../middlewares/authMiddleware.js';
import { 
  requireAdmin,
  requireEmployeeRoles,
  requireTechnical,
  requireEmployeeAuth,
  SYSTEM_ROLES
} from '../middlewares/roleMiddleware.js';

const router = express.Router();

// === MIDDLEWARE GLOBAL ===
// Todas las rutas requieren autenticación híbrida
router.use(authenticateHybrid);

// ========================================
// GESTIÓN DE USUARIOS
// ========================================

/**
 * Crear nuevo usuario con rol
 * Solo administradores
 * 
 * POST /api/admin/user/create
 * @auth Employee (Administrador)
 * @body { email, username, password, roleName }
 */
router.post('/user/create', requireAdmin(), adminCreateUser);

/**
 * Actualizar información de usuario
 * Solo administradores
 * 
 * PUT /api/admin/user/update
 * @auth Employee (Administrador)
 * @body { userId, email?, phone?, active? }
 */
router.put('/user/update', requireAdmin(), adminUpdateUser);

/**
 * Eliminar usuario
 * Solo administradores
 * 
 * DELETE /api/admin/user/delete
 * @auth Employee (Administrador)
 * @body { userId }
 */
router.delete('/user/delete', requireAdmin(), adminDeleteUser);

/**
 * Listar todos los usuarios
 * Administradores y usuarios con permisos de gestión
 * 
 * GET /api/admin/user/list
 * @auth Employee (Administrador)
 */
router.get('/user/list', requireAdmin(), adminListUsers);

/**
 * Establecer/cambiar contraseña de usuario
 * Solo administradores
 * 
 * POST /api/admin/user/set-password
 * @auth Employee (Administrador)
 * @body { userId, newPassword }
 */
router.post('/user/set-password', requireAdmin(), adminSetUserPassword);

/**
 * Asignar o remover rol de usuario
 * Solo administradores
 * 
 * POST /api/admin/user/assign-role
 * @auth Employee (Administrador)
 * @body { userId, roleName, action: 'add' | 'remove' }
 */
router.post('/user/assign-role', requireAdmin(), adminAssignRole);

// ========================================
// GESTIÓN DE ROLES
// ========================================

/**
 * Crear nuevo rol
 * Solo administradores
 * 
 * POST /api/admin/role/create
 * @auth Employee (Administrador)
 * @body { name, description }
 */
router.post('/role/create', requireAdmin(), adminCreateRole);

/**
 * Listar todos los roles
 * Administradores
 * 
 * GET /api/admin/role/list
 * @auth Employee (Administrador)
 */
router.get('/role/list', requireAdmin(), adminListRoles);

/**
 * Actualizar rol existente
 * Solo administradores
 * 
 * PUT /api/admin/role/update
 * @auth Employee (Administrador)
 * @body { roleId, name?, description? }
 */
router.put('/role/update', requireAdmin(), adminUpdateRole);

/**
 * Eliminar rol
 * Solo administradores
 * 
 * DELETE /api/admin/role/delete
 * @auth Employee (Administrador)
 * @body { roleId }
 */
router.delete('/role/delete', requireAdmin(), adminDeleteRole);

// ========================================
// SISTEMA Y MONITOREO
// ========================================

/**
 * Ver logs del sistema
 * Administradores y técnicos
 * 
 * GET /api/admin/system/logs
 * @auth Employee (Administrador, Staff Técnico)
 * @query { lines?, level?, startDate?, endDate? }
 */
router.get(
  '/system/logs',
  requireEmployeeRoles([SYSTEM_ROLES.ADMIN, SYSTEM_ROLES.TECHNICIAN]),
  getSystemLogs
);

/**
 * Obtener estadísticas del sistema
 * Solo administradores
 * 
 * GET /api/admin/system/statistics
 * @auth Employee (Administrador)
 */
router.get('/system/statistics', requireAdmin(), getSystemStatistics);

// ========================================
// DASHBOARDS ESPECIALIZADOS
// ========================================

/**
 * Dashboard de administración
 * Vista general del sistema
 * 
 * GET /api/admin/dashboard
 * @auth Employee (Administrador)
 */
router.get('/dashboard', requireAdmin(), (req, res) => {
  res.json({ 
    success: true,
    message: 'Dashboard de administración',
    data: {
      user: {
        id: req.auth.userId,
        username: req.auth.username,
        roles: req.auth.roles
      },
      permissions: req.permissions
    }
  });
});

/**
 * Dashboard técnico
 * Vista de herramientas técnicas
 * 
 * GET /api/admin/tools/technical
 * @auth Employee (Administrador, Staff Técnico)
 */
router.get('/tools/technical', requireTechnical(), (req, res) => {
  res.json({ 
    success: true,
    message: 'Herramientas técnicas',
    data: {
      availableTools: [
        'system_monitor',
        'database_cleanup',
        'cache_management',
        'log_viewer'
      ]
    }
  });
});

/**
 * Auditoría del sistema
 * Ver logs de auditoría de acciones críticas
 * 
 * GET /api/admin/audit/actions
 * @auth Employee (Administrador)
 */
router.get('/audit/actions', requireAdmin(), async (req, res) => {
  try {
    const { startDate, endDate, action, userId } = req.query;
    
    // Aquí podrías filtrar logs específicos de auditoría
    // Por ahora, retornamos un ejemplo
    res.json({
      success: true,
      message: 'Logs de auditoría',
      data: {
        filters: { startDate, endDate, action, userId },
        actions: [
          {
            action: 'USER_CREATED',
            performedBy: { userId: 1, username: 'admin' },
            timestamp: new Date().toISOString(),
            details: { targetUserId: 10, role: 'Recepcionista' }
          }
        ]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener logs de auditoría'
    });
  }
});

/**
 * Salud del sistema
 * Verificar estado de servicios
 * 
 * GET /api/admin/system/health
 * @auth Employee (Administrador, Staff Técnico)
 */
router.get(
  '/system/health',
  requireEmployeeRoles([SYSTEM_ROLES.ADMIN, SYSTEM_ROLES.TECHNICIAN]),
  async (req, res) => {
    try {
      // Verificar conexión a BD
      await prisma.$queryRaw`SELECT 1`;
      
      res.json({
        success: true,
        data: {
          status: 'healthy',
          database: 'connected',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(503).json({
        success: false,
        data: {
          status: 'unhealthy',
          database: 'disconnected',
          error: error.message
        }
      });
    }
  }
);

// ========================================
// MANEJO DE ERRORES
// ========================================

/**
 * Manejador de errores 404 para rutas de admin
 */
router.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint de administración no encontrado',
    path: req.originalUrl,
    availableEndpoints: {
      users: [
        'POST /api/admin/user/create',
        'PUT /api/admin/user/update',
        'DELETE /api/admin/user/delete',
        'GET /api/admin/user/list',
        'POST /api/admin/user/set-password',
        'POST /api/admin/user/assign-role'
      ],
      roles: [
        'POST /api/admin/role/create',
        'GET /api/admin/role/list',
        'PUT /api/admin/role/update',
        'DELETE /api/admin/role/delete'
      ],
      system: [
        'GET /api/admin/system/logs',
        'GET /api/admin/system/statistics',
        'GET /api/admin/system/health',
        'GET /api/admin/dashboard',
        'GET /api/admin/tools/technical',
        'GET /api/admin/audit/actions'
      ]
    },
    timestamp: new Date().toISOString()
  });
});

export default router;