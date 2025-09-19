import express from 'express';
import { createReceptionist, receptionistLogin, receptionistChangePassword, receptionistCreateOrder } from '../controllers/employeeController.js';
import { requireRoles } from '../middlewares/rolemiddleware.js';
const router = express.Router();

// Crear recepcionista (solo Gerente/Admin)
router.post('/create-receptionist', requireRoles(['Gerente', 'Administrador']), createReceptionist);

// Login de recepcionista por ID de trabajo
router.post('/login', receptionistLogin);

// Cambio de contraseña (solo recepcionista autenticada)
router.post('/change-password', requireRoles(['Recepcionista']), receptionistChangePassword);

// Crear orden de servicio (solo recepcionista)
router.post('/create-order', requireRoles(['Recepcionista']), receptionistCreateOrder);

export default router;
