import express from 'express';
import {
	receptionistCreateOrder,
	techListAssignedOrders, techSetDiagnosis,
	salesListOrders, salesApproveProforma, salesAddPartsAndPrice, salesListClients,
	managerListOrders, managerUpdateOrder,
	registerEquipmentEntry, registerEquipmentExit,
	employeeLogin, employeeChangePassword, receptionistSendOTP
} from '../controllers/employeeController.js';
import { requireRoles } from '../middlewares/rolemiddleware.js';
const router = express.Router();


// --- LOGIN Y AUTENTICACIÓN ---
router.post('/login', employeeLogin); // General para todos los empleados
router.post('/change-password', employeeChangePassword); // General para todos los empleados autenticados
router.post('/send-otp', receptionistSendOTP); // OTP para recepcionista (opcional)
router.post('/forgot-password', employeeForgotPassword); // Solicitud de restablecimiento de contraseña

// --- RECEPCIONISTA ---
router.post('/create-order', requireRoles(['Recepcionista']), receptionistCreateOrder);

// --- STAFF TÉCNICO ---
router.get('/tech/orders', requireRoles(['Staff Técnico']), techListAssignedOrders);
router.post('/tech/diagnosis', requireRoles(['Staff Técnico']), techSetDiagnosis);

// --- STAFF VENTAS ---
router.get('/sales/orders', requireRoles(['Staff Ventas']), salesListOrders);
router.post('/sales/proforma', requireRoles(['Staff Ventas']), salesApproveProforma);
router.post('/sales/parts-price', requireRoles(['Staff Ventas']), salesAddPartsAndPrice);
router.get('/sales/clients', requireRoles(['Staff Ventas']), salesListClients);

// --- GERENTE ---
router.get('/manager/orders', requireRoles(['Gerente']), managerListOrders);
router.post('/manager/update-order', requireRoles(['Gerente']), managerUpdateOrder);

// --- ENTRADA/SALIDA DE EQUIPOS ---
router.post('/equipment/entry', requireRoles(['Recepcionista']), registerEquipmentEntry);
router.post('/equipment/exit', requireRoles(['Recepcionista']), registerEquipmentExit);

export default router;
