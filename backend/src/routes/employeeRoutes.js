import express from 'express';
import {
  // Autenticación
  employeeLogin,
  employeeChangePassword,
  employeeForgotPassword,
  employeeLogout, // NUEVO - agregado en refactorización

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
import { requireRoles } from '../middlewares/rolemiddleware.js';
import { 
  validate, 
  schemas, 
  sanitizeRequest 
} from '../middleware/validationMiddleware.js'; // NUEVO

const router = express.Router();

// NUEVO - Sanitización global para prevenir XSS
router.use(sanitizeRequest);

// --- LOGIN Y AUTENTICACIÓN (Rutas para todos los empleados) ---
router.post(
  '/login', 
  validate(schemas.login), // NUEVO - validación automática
  employeeLogin
);

router.post(
  '/change-password', 
  validate(schemas.changePassword), // NUEVO
  employeeChangePassword
);

router.post(
  '/forgot-password', 
  validate(schemas.forgotPassword), // NUEVO
  employeeForgotPassword
);

router.post(
  '/logout', // NUEVO - cierre de sesión explícito
  employeeLogout
);

// --- ROL: RECEPCIONISTA ---
router.post(
  '/receptionist/client', 
  requireRoles(['Recepcionista']), 
  validate(schemas.createClient), // NUEVO - valida datos del cliente
  receptionistCreateOrUpdateClient
);

router.post(
  '/receptionist/equipment', 
  requireRoles(['Recepcionista']), 
  validate(schemas.registerEquipment), // NUEVO
  receptionistRegisterEquipment
);

router.post(
  '/receptionist/create-order', 
  requireRoles(['Recepcionista']), 
  validate(schemas.createOrder), // NUEVO
  receptionistCreateOrder
);

router.post(
  '/receptionist/equipment-exit', 
  requireRoles(['Recepcionista']), 
  validate(schemas.registerEquipmentExit), // NUEVO
  receptionistRegisterEquipmentExit
);

// --- ROL: STAFF TÉCNICO ---
router.get(
  '/tech/orders', 
  requireRoles(['Staff Técnico', 'Administrador']), 
  techListAssignedOrders
);

router.post(
  '/tech/diagnosis', 
  requireRoles(['Staff Técnico', 'Administrador']), 
  validate(schemas.setDiagnosis), // NUEVO
  techSetDiagnosis
);

router.post(
  '/tech/start-service', 
  requireRoles(['Staff Técnico', 'Administrador']), 
  validate(schemas.startService), // NUEVO
  techStartService
);

router.post(
  '/tech/end-service', 
  requireRoles(['Staff Técnico', 'Administrador']), 
  validate(schemas.endService), // NUEVO
  techEndService
);

// --- ROL: STAFF VENTAS ---
router.get(
  '/sales/orders', 
  requireRoles(['Staff Ventas', 'Administrador']), 
  validate(schemas.listOrdersQuery, 'query'), // NUEVO - valida query params
  salesListOrders
);

router.post(
  '/sales/parts-price', 
  requireRoles(['Staff Ventas', 'Administrador']), 
  validate(schemas.generateProforma), // NUEVO
  salesAddPartsAndPrice
);

router.post(
  '/sales/send-proforma', 
  requireRoles(['Staff Ventas', 'Administrador']), 
  validate(schemas.sendProforma), // NUEVO
  salesSendProforma
);

export default router;