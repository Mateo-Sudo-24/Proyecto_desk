import express from 'express';
import {
  getAllOrders,
  getOrdersByClient,
  getOrderById,
  generateOrderInvoice,
} from '../controllers/orderController.js';

const router = express.Router();

// Listar todas las órdenes (ej. admins)
router.get('/', getAllOrders);

// Órdenes de un cliente
router.get('/client/:clientId', getOrdersByClient);

// Una orden específica
router.get('/:id', getOrderById);

// Factura PDF
router.post('/:id/invoice', generateOrderInvoice);

export default router;
