import express from 'express';
import {
  adminCreateUser,
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

// Solo accesible por administradores
router.post('/user/create', requireRoles(['Administrador']), adminCreateUser);
router.post('/user/delete', requireRoles(['Administrador']), adminDeleteUser);
router.post('/user/update', requireRoles(['Administrador']), adminUpdateUser);
router.get('/user/list', requireRoles(['Administrador']), adminListUsers);
router.post('/user/assign-role', requireRoles(['Administrador']), adminAssignRole);

// CRUD de roles
router.post('/role/create', requireRoles(['Administrador']), adminCreateRole);
router.get('/role/list', requireRoles(['Administrador']), adminListRoles);
router.post('/role/update', requireRoles(['Administrador']), adminUpdateRole);
router.post('/role/delete', requireRoles(['Administrador']), adminDeleteRole);

export default router;
