// clientController.js
import { PrismaClient } from '@prisma/client';
import { sendProformaConfirmationEmail } from '../config/nodemailer.js'; // New email for proforma confirmation
const prisma = new PrismaClient();

// --- Utilidades comunes para respuestas ---
const buildClientOrderResponse = (order) => {
  if (!order) return null;

  return {
    orderId: order.OrderId,
    identityTag: order.IdentityTag,
    currentStatus: order.status?.Name || 'Desconocido',
    statusCode: order.status?.Code,
    diagnosis: order.Diagnosis,
    proformaStatus: order.ProformaStatus, // "pendiente", "enviada", "aprobada", "rechazada"
    totalPrice: order.TotalPrice,
    notes: order.Notes,
    estimatedDeliveryDate: order.EstimatedDeliveryDate,
    proformaSentDate: order.ProformaSentDate,
    proformaApprovalDate: order.ProformaApprovalDate,
    equipment: {
      equipmentId: order.equipment?.EquipmentId,
      brand: order.equipment?.Brand,
      model: order.equipment?.Model,
      serialNumber: order.equipment?.SerialNumber,
      description: order.equipment?.Description,
      type: order.equipment?.equipmentType?.Name,
    },
    clientInfo: {
      displayName: order.client?.DisplayName,
      idNumber: order.client?.IdNumber,
      email: order.client?.Email,
      phone: order.client?.Phone,
      organizationName: order.client?.OrganizationName,
      isPublicService: order.client?.IsPublicService,
      deliveryAddress: order.client?.DeliveryAddress,
    },
    // Campos adicionales para fácil desestructuración en frontend
    id: order.OrderId,
    tag: order.IdentityTag,
    status: order.status?.Name,
    code: order.status?.Code,
    deliveryDate: order.EstimatedDeliveryDate,
    price: order.TotalPrice,
  };
};

const buildReceptionistOrderResponse = (order) => {
  if (!order) return null;

  return {
    orderId: order.OrderId,
    identityTag: order.IdentityTag,
    currentStatus: order.status?.Name || 'Desconocido',
    statusCode: order.status?.Code,
    diagnosis: order.Diagnosis,
    proformaStatus: order.ProformaStatus,
    totalPrice: order.TotalPrice,
    notes: order.Notes,
    estimatedDeliveryDate: order.EstimatedDeliveryDate,
    proformaSentDate: order.ProformaSentDate,
    proformaApprovalDate: order.ProformaApprovalDate,
    client: {
      clientId: order.client?.ClientId,
      displayName: order.client?.DisplayName,
      idNumber: order.client?.IdNumber,
      email: order.client?.Email,
      phone: order.client?.Phone,
      organizationName: order.client?.OrganizationName,
      isPublicService: order.client?.IsPublicService,
      deliveryAddress: order.client?.DeliveryAddress,
    },
    equipment: {
      equipmentId: order.equipment?.EquipmentId,
      brand: order.equipment?.Brand,
      model: order.equipment?.Model,
      serialNumber: order.equipment?.SerialNumber,
      description: order.equipment?.Description,
      type: order.equipment?.equipmentType?.Name,
    },
    receptionist: {
      userId: order.receptionist?.UserId,
      username: order.receptionist?.Username,
    },
    technician: {
      userId: order.technician?.UserId,
      username: order.technician?.Username,
    },
    // Campos adicionales para fácil desestructuración en frontend
    id: order.OrderId,
    tag: order.IdentityTag,
    status: order.status?.Name,
    code: order.status?.Code,
    deliveryDate: order.EstimatedDeliveryDate,
    price: order.TotalPrice,
    clientName: order.client?.DisplayName,
    techName: order.technician?.Username,
  };
};


const findOrderByCriteria = async (criteria, includeFields = {}) => {
  // Common includes for both client and receptionist views
  const defaultIncludes = {
    status: true,
    client: true,
    equipment: {
      include: {
        equipmentType: true,
      },
    },
  };

  const finalIncludes = { ...defaultIncludes, ...includeFields };

  if (criteria.orderId) {
    return await prisma.serviceOrder.findUnique({
      where: { OrderId: Number(criteria.orderId) },
      include: finalIncludes,
    });
  }

  if (criteria.identityTag) {
    return await prisma.serviceOrder.findUnique({
      where: { IdentityTag: criteria.identityTag },
      include: finalIncludes,
    });
  }

  return null;
};

const validateSearchCriteria = (orderId, identityTag) => {
  if (!orderId && !identityTag) {
    throw new Error('Debe proporcionar orderId o identityTag');
  }
};

// --- CLIENTE (Endpoints públicos o autenticados por cliente) ---

/**
 * Permite a un cliente consultar el estado de una orden usando OrderId o IdentityTag.
 * No requiere autenticación de usuario (solo de la orden).
 */
export const clientGetOrderStatus = async (req, res) => {
  const { orderId, identityTag } = req.query;

  try {
    validateSearchCriteria(orderId, identityTag);

    const order = await findOrderByCriteria({ orderId, identityTag });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Orden no encontrada' });
    }

    // Ensure the client requesting matches the client on the order if authenticated.
    // For now, assuming this is a public check, but for a secured client portal,
    // req.session.clientId should match order.ClientId.
    // if (req.session.clientId && order.ClientId !== req.session.clientId) {
    //   return res.status(403).json({ success: false, error: 'Acceso denegado a esta orden.' });
    // }

    const response = buildClientOrderResponse(order);

    res.json({
      success: true,
      data: response,
    });

  } catch (error) {
    if (error.message === 'Debe proporcionar orderId o identityTag') {
      return res.status(400).json({ success: false, error: error.message });
    }
    console.error('Error in clientGetOrderStatus:', error);
    res.status(500).json({ success: false, error: 'Error al consultar estado de la orden' });
  }
};

/**
 * Lista todas las órdenes de servicio para un cliente autenticado.
 * Requiere que el cliente esté autenticado (e.g., req.session.clientId).
 */
export const clientListOrders = async (req, res) => {
  // This endpoint assumes a client is authenticated and their ID is in the session.
  const clientId = req.session.clientId; // Make sure your authentication middleware sets this.

  if (!clientId) {
    return res.status(401).json({ success: false, error: 'Cliente no autenticado.' });
  }

  try {
    const orders = await prisma.serviceOrder.findMany({
      where: { ClientId: clientId },
      include: {
        status: true,
        equipment: {
          include: {
            equipmentType: true,
          },
        },
      },
      orderBy: { IntakeDate: 'desc' },
    });

    const formattedOrders = orders.map(buildClientOrderResponse);

    res.json({
      success: true,
      data: {
        orders: formattedOrders,
        total: formattedOrders.length,
      },
    });
  } catch (error) {
    console.error('Error in clientListOrders:', error);
    res.status(500).json({ success: false, error: 'Error al listar órdenes del cliente.' });
  }
};

/**
 * Permite a un cliente ver los detalles de una orden específica.
 * Requiere que el cliente esté autenticado y que la orden le pertenezca.
 */
export const clientViewOrder = async (req, res) => {
  const { orderId } = req.params; // Expect orderId from URL parameter
  const clientId = req.session.clientId; // Authenticated client's ID

  if (!clientId) {
    return res.status(401).json({ success: false, error: 'Cliente no autenticado.' });
  }

  try {
    const order = await prisma.serviceOrder.findUnique({
      where: { OrderId: Number(orderId), ClientId: clientId }, // Ensure order belongs to authenticated client
      include: {
        status: true,
        client: true, // Include client to show more details
        equipment: {
          include: {
            equipmentType: true,
          },
        },
        receptionist: { select: { Username: true } }, // Show who received it
        technician: { select: { Username: true } }, // Show who's assigned
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Orden no encontrada o no pertenece a este cliente.' });
    }

    const response = buildClientOrderResponse(order);
    res.json({ success: true, data: response });
  } catch (error) {
    console.error('Error in clientViewOrder:', error);
    res.status(500).json({ success: false, error: 'Error al obtener detalles de la orden.' });
  }
};


/**
 * Permite al cliente aprobar o rechazar una proforma enviada.
 * Esto es crucial para el flujo de trabajo.
 */
export const clientApproveOrRejectProforma = async (req, res) => {
  const { orderId, action } = req.body; // action: 'approve' or 'reject'
  const clientId = req.session.clientId; // Authenticated client's ID

  if (!clientId) {
    return res.status(401).json({ success: false, error: 'Cliente no autenticado.' });
  }

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ success: false, error: 'Acción inválida. Use "approve" o "reject".' });
  }

  try {
    const order = await prisma.serviceOrder.findUnique({
      where: { OrderId: Number(orderId), ClientId: clientId },
      include: { client: true, status: true }
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Orden no encontrada o no pertenece a este cliente.' });
    }

    if (order.ProformaStatus !== 'enviada') {
      return res.status(400).json({ success: false, error: 'La proforma no está en estado "enviada" para ser aprobada o rechazada.' });
    }

    let newStatusId;
    let proformaNewStatus;
    let notes = '';

    if (action === 'approve') {
      const approvedStatus = await prisma.status.findUnique({ where: { Code: 'PROFORMA_APROBADA' } });
      if (!approvedStatus) throw new Error('Estado "PROFORMA_APROBADA" no configurado.');
      newStatusId = approvedStatus.StatusId;
      proformaNewStatus = 'aprobada';
      notes = 'Proforma aprobada por el cliente.';
    } else { // reject
      const rejectedStatus = await prisma.status.findUnique({ where: { Code: 'PROFORMA_RECHAZADA' } });
      if (!rejectedStatus) throw new Error('Estado "PROFORMA_RECHAZADA" no configurado.');
      newStatusId = rejectedStatus.StatusId;
      proformaNewStatus = 'rechazada';
      notes = 'Proforma rechazada por el cliente.';
    }

    const updatedOrder = await prisma.serviceOrder.update({
      where: { OrderId: order.OrderId },
      data: {
        ProformaStatus: proformaNewStatus,
        ProformaApprovalDate: new Date(),
        CurrentStatusId: newStatusId,
      },
      include: { client: true, equipment: { include: { equipmentType: true } }, status: true }
    });

    // Registrar historial de estado
    await prisma.oRDER_STATUS_HISTORY.create({
      data: {
        OrderId: order.OrderId,
        StatusId: newStatusId,
        Notes: notes,
        // ChangedByUserId: clientId, // Optional, if clients are users in the User table
      },
    });

    // Send confirmation email to client
    await sendProformaConfirmationEmail(
      order.client.Email,
      order.client.DisplayName,
      order.IdentityTag,
      action
    );

    res.json({
      success: true,
      message: `Proforma ${action === 'approve' ? 'aprobada' : 'rechazada'} con éxito.`,
      data: buildClientOrderResponse(updatedOrder),
    });

  } catch (error) {
    console.error('Error in clientApproveOrRejectProforma:', error);
    res.status(500).json({ success: false, error: `Error al procesar la proforma: ${error.message}` });
  }
};

/**
 * Permite al cliente verificar una compra (esto es un placeholder,
 * la aprobación de proforma es la verificación real en este flujo).
 */
export const clientVerifyPurchase = async (req, res) => {
  // Given the new proforma approval flow, 'clientVerifyPurchase'
  // can be re-purposed or considered a legacy/redundant endpoint.
  // The clientApproveOrRejectProforma is the more appropriate action.
  // For now, let's return a dummy or guide the client.

  res.status(200).json({
    success: true,
    data: {
      verified: false,
      message: "Por favor, use el endpoint de aprobación/rechazo de proforma para confirmar la compra."
    }
  });
};

// --- RECEPCIONISTA (Consulta de estado, se mantiene aquí por su naturaleza de consulta general) ---
export const receptionistGetOrderStatus = async (req, res) => {
  const { orderId, identityTag } = req.query;

  try {
    validateSearchCriteria(orderId, identityTag);

    const order = await findOrderByCriteria(
      { orderId, identityTag },
      { receptionist: true, technician: true } // Include these for receptionist view
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Orden no encontrada'
      });
    }

    const response = buildReceptionistOrderResponse(order);

    res.json({
      success: true,
      data: response
    });

  } catch (error) {
    if (error.message === 'Debe proporcionar orderId o identityTag') {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    console.error('Error in receptionistGetOrderStatus:', error);
    res.status(500).json({
      success: false,
      error: 'Error al consultar estado de la orden'
    });
  }
};