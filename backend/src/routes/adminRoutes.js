// adminRoutes.js
import express from 'express';
import {
  adminCreateUser,
  adminSetUserPassword, // <-- IMPORTACIÓN AÑADIDA
  adminDeleteUser,
  adminUpdateUser,
  adminListUsers,
  adminAssignRole,
  adminCreateRole,
  adminListRoles,
  adminUpdateRole,
  adminDeleteRole
} from '../controllers/adminController.js';
import { requireRoles } from '../middlewares/rolemiddleware.js';
const router = express.Router();

// --- GESTIÓN DE USUARIOS ---
// Solo accesible por administradores
router.post('/user/create', requireRoles(['Administrador']), adminCreateUser);
router.post('/user/delete', requireRoles(['Administrador']), adminDeleteUser);
router.post('/user/update', requireRoles(['Administrador']), adminUpdateUser);
router.get('/user/list', requireRoles(['Administrador']), adminListUsers);
router.post('/user/assign-role', requireRoles(['Administrador']), adminAssignRole);

// RUTA AÑADIDA: Para que un admin pueda cambiar la contraseña de otro usuario
router.post('/user/set-password', requireRoles(['Administrador']), adminSetUserPassword);

// --- CRUD DE ROLES ---
router.post('/role/create', requireRoles(['Administrador']), adminCreateRole);
router.get('/role/list', requireRoles(['Administrador']), adminListRoles);
router.post('/role/update', requireRoles(['Administrador']), adminUpdateRole);
router.post('/role/delete', requireRoles(['Administrador']), adminDeleteRole);

export default router;