import express from 'express';
import { clientGetOrderStatus, receptionistGetOrderStatus } from '../controllers/clientController.js';
import { requireRoles } from '../middlewares/rolemiddleware.js';
const router = express.Router();

// --- CLIENTE ---
// Consulta el estado de la orden (público, solo necesita el ID o tag)
router.get('/order/status', clientGetOrderStatus);

// --- RECEPCIONISTA ---
// Consulta el estado de la orden (requiere autenticación de recepcionista)
router.get('/receptionist/order/status', requireRoles(['Recepcionista']), receptionistGetOrderStatus);

export default router;
