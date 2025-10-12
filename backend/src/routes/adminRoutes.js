// src/routes/adminRoutes.js (VERSIÓN CORREGIDA Y UNIFICADA)
import express from 'express';

// --- Importaciones de Controladores ---
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

// --- Importaciones de Middlewares (CORREGIDO) ---
import { authenticateHybrid } from '../middlewares/authMiddleware.js';
// ¡AÑADIMOS LAS FUNCIONES ESPECIALIZADAS QUE FALTABAN!
import {
  requireAdmin,
  requireEmployeeRoles,
  requireReception, // Asumiendo que puedes necesitarlo
  requireTechnical,
  // requireSupervisor, // Esta función no existe, usaremos requireEmployeeRoles en su lugar
  SYSTEM_ROLES,
  USER_TYPES
} from '../middlewares/roleMiddleware.js';

const router = express.Router();

// === MIDDLEWARE GLOBAL PARA RUTAS DE ADMIN ===
// Todas las rutas aquí requieren que el usuario sea un empleado autenticado
router.use(authenticateHybrid);

// ========================================
// GESTIÓN DE USUARIOS
// ========================================

// Usamos el atajo requireAdmin() que es más limpio
router.post('/user/create', requireAdmin(), adminCreateUser);
router.post('/user/delete', requireAdmin(), adminDeleteUser);
router.post('/user/update', requireAdmin(), adminUpdateUser);

// Para listar, permitimos al Admin y a un rol hipotético 'Supervisor'
router.get('/user/list', requireEmployeeRoles([SYSTEM_ROLES.ADMIN, 'Supervisor']), adminListUsers);
router.post('/user/assign-role', requireAdmin(), adminAssignRole);
router.post('/user/set-password', requireAdmin(), adminSetUserPassword);

// ========================================
// GESTIÓN DE ROLES (Operaciones más críticas)
// ========================================

// Solo un 'SuperAdmin' (o en este caso, Admin para simplificar) puede gestionar roles
router.post('/role/create', requireAdmin(), adminCreateRole);
router.get('/role/list', requireAdmin(), adminListRoles);
router.post('/role/update', requireAdmin(), adminUpdateRole);
router.post('/role/delete', requireAdmin(), adminDeleteRole);

// ========================================
// SISTEMA Y LOGS
// ========================================

router.get(
  '/system/logs', 
  requireEmployeeRoles([SYSTEM_ROLES.ADMIN, SYSTEM_ROLES.TECHNICIAN]), // Solo Admin y Técnicos ven logs
  getSystemLogs
);

// ========================================
// RUTAS DE EJEMPLO ADICIONALES (Corregidas)
// ========================================

// Esta ruta es solo para empleados con rol 'Supervisor' o 'Administrador'
router.get(
  '/dashboard/supervisor',
  requireEmployeeRoles(['Supervisor', SYSTEM_ROLES.ADMIN]),
  (req, res) => {
    res.json({ message: 'Bienvenido al Dashboard de Supervisión' });
  }
);

// Usamos el middleware especializado `requireTechnical()`
router.get('/tools/technical', requireTechnical(), (req, res) => {
    res.json({ message: 'Bienvenido a las Herramientas Técnicas' });
});

export default router;