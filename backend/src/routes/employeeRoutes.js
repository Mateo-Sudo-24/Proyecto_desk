import express from 'express';
import {
  // Autenticación
  employeeLogin,
  employeeChangePassword,
  employeeForgotPassword,

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
const router = express.Router();


// --- LOGIN Y AUTENTICACIÓN (Rutas para todos los empleados) ---
router.post('/login', employeeLogin);
router.post('/change-password', employeeChangePassword); // Requiere estar autenticado
router.post('/forgot-password', employeeForgotPassword);


// --- ROL: RECEPCIONISTA ---
router.post('/receptionist/client', requireRoles(['Recepcionista']), receptionistCreateOrUpdateClient);
router.post('/receptionist/equipment', requireRoles(['Recepcionista']), receptionistRegisterEquipment);
router.post('/receptionist/create-order', requireRoles(['Recepcionista']), receptionistCreateOrder);
router.post('/receptionist/equipment-exit', requireRoles(['Recepcionista']), receptionistRegisterEquipmentExit);


// --- ROL: STAFF TÉCNICO ---
router.get('/tech/orders', requireRoles(['Staff Técnico', 'Administrador']), techListAssignedOrders);
router.post('/tech/diagnosis', requireRoles(['Staff Técnico', 'Administrador']), techSetDiagnosis);
router.post('/tech/start-service', requireRoles(['Staff Técnico', 'Administrador']), techStartService);
router.post('/tech/end-service', requireRoles(['Staff Técnico', 'Administrador']), techEndService);


// --- ROL: STAFF VENTAS ---
router.get('/sales/orders', requireRoles(['Staff Ventas', 'Administrador']), salesListOrders);
router.post('/sales/parts-price', requireRoles(['Staff Ventas', 'Administrador']), salesAddPartsAndPrice);
router.post('/sales/send-proforma', requireRoles(['Staff Ventas', 'Administrador']), salesSendProforma);

export default router;