import { PrismaClient } from '@prisma/client';
import { generateInvoicePDF } from '../services/invoiceService.js';

const prisma = new PrismaClient();

// Obtener TODAS las órdenes (ej: para admins)
export const getAllOrders = async (req, res) => {
  try {
    const orders = await prisma.serviceOrder.findMany({
      include: {
        client: true,
        equipment: { include: { equipmentType: true } },
        receptionist: true,
        technician: true,
        status: true,
      },
      orderBy: { IntakeDate: 'desc' },
    });
    res.json(orders);
  } catch (error) {
    console.error('Error obteniendo órdenes:', error);
    res.status(500).json({ error: 'Error al obtener las órdenes' });
  }
};

// Obtener órdenes por cliente (para portal de clientes)
export const getOrdersByClient = async (req, res) => {
  const clientId = Number(req.params.clientId);
  try {
    const orders = await prisma.serviceOrder.findMany({
      where: { ClientId: clientId },
      include: {
        equipment: { include: { equipmentType: true } },
        status: true,
      },
      orderBy: { IntakeDate: 'desc' },
    });
    res.json(orders);
  } catch (error) {
    console.error('Error obteniendo órdenes de cliente:', error);
    res.status(500).json({ error: 'Error al obtener órdenes de cliente' });
  }
};

// Obtener una orden por ID
export const getOrderById = async (req, res) => {
  const orderId = Number(req.params.id);
  try {
    const order = await prisma.serviceOrder.findUnique({
      where: { OrderId: orderId },
      include: {
        client: true,
        equipment: { include: { equipmentType: true } },
        receptionist: true,
        technician: true,
        status: true,
        histories: { include: { status: true } },
      },
    });
    if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
    res.json(order);
  } catch (error) {
    console.error('Error obteniendo orden:', error);
    res.status(500).json({ error: 'Error al obtener la orden' });
  }
};

// Generar factura PDF
export const generateOrderInvoice = async (req, res) => {
  const orderId = Number(req.params.id);
  try {
    const order = await prisma.serviceOrder.findUnique({
      where: { OrderId: orderId },
      include: {
        client: true,
        equipment: { include: { equipmentType: true } },
        receptionist: true,
        technician: true,
        status: true,
      },
    });
    if (!order) return res.status(404).json({ error: 'Orden no encontrada' });

    const { buffer } = await generateInvoicePDF(order);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="invoice_order_${orderId}.pdf"`
    );
    res.send(buffer);
  } catch (error) {
    console.error('Error generando factura:', error);
    res.status(500).json({ error: 'Error generando la factura PDF' });
  }
};
