// Consulta el estado/fase de una orden por parte del cliente
export const clientGetOrderStatus = async (req, res) => {
	const { orderId, identityTag } = req.query;
	try {
		let order;
		if (orderId) {
			order = await prisma.serviceOrder.findUnique({
				where: { OrderId: Number(orderId) },
				include: { status: true }
			});
		} else if (identityTag) {
			order = await prisma.serviceOrder.findUnique({
				where: { IdentityTag: identityTag },
				include: { status: true }
			});
		} else {
			return res.status(400).json({ error: 'Debe proporcionar orderId o identityTag' });
		}
		if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
		// Mapear fase legible
		const phase = order.status?.Name || 'Desconocido';
		res.json({
			orderId: order.OrderId,
			identityTag: order.IdentityTag,
			phase,
			statusCode: order.status?.Code,
			diagnosis: order.Diagnosis,
			proformaStatus: order.ProformaStatus,
			totalPrice: order.TotalPrice,
			notes: order.Notes,
			estimatedDeliveryDate: order.EstimatedDeliveryDate
		});
	} catch (error) {
		res.status(500).json({ error: 'Error al consultar estado de la orden' });
	}
};

// Consulta el estado/fase de una orden por parte de la recepcionista
export const receptionistGetOrderStatus = async (req, res) => {
	const { orderId, identityTag } = req.query;
	try {
		let order;
		if (orderId) {
			order = await prisma.serviceOrder.findUnique({
				where: { OrderId: Number(orderId) },
				include: { status: true, client: true, technician: true }
			});
		} else if (identityTag) {
			order = await prisma.serviceOrder.findUnique({
				where: { IdentityTag: identityTag },
				include: { status: true, client: true, technician: true }
			});
		} else {
			return res.status(400).json({ error: 'Debe proporcionar orderId o identityTag' });
		}
		if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
		const phase = order.status?.Name || 'Desconocido';
		res.json({
			orderId: order.OrderId,
			identityTag: order.IdentityTag,
			phase,
			statusCode: order.status?.Code,
			client: order.client?.DisplayName,
			technician: order.technician?.Username,
			diagnosis: order.Diagnosis,
			proformaStatus: order.ProformaStatus,
			totalPrice: order.TotalPrice,
			notes: order.Notes,
			estimatedDeliveryDate: order.EstimatedDeliveryDate
		});
	} catch (error) {
		res.status(500).json({ error: 'Error al consultar estado de la orden' });
	}
};
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// --- CLIENTE ---
export const clientListOrders = async (req, res) => {
	// Lista órdenes del cliente autenticado
};
export const clientViewOrder = async (req, res) => {
	// Ver detalles de una orden
};
export const clientVerifyPurchase = async (req, res) => {
	// Verifica o establece la compra de la orden
};
