// clientController.js - Controlador exclusivo para operaciones de cliente
import { PrismaClient } from '@prisma/client';
import { sendProformaConfirmationEmail } from '../config/nodemailer.js';

const prisma = new PrismaClient();

// === UTILIDADES Y HELPERS ===

/**
 * Construye la respuesta de orden específica para el cliente
 * Incluye solo los campos que el cliente necesita ver
 */
const buildClientOrderResponse = (order) => {
  if (!order) return null;

  return {
    // Información básica de la orden
    orderId: order.OrderId,
    identityTag: order.IdentityTag,
    
    // Estado actual
    currentStatus: order.status?.Name || 'Desconocido',
    statusCode: order.status?.Code,
    
    // Información del servicio
    diagnosis: order.Diagnosis,
    totalPrice: order.TotalPrice,
    notes: order.Notes,
    
    // Fechas importantes
    estimatedDeliveryDate: order.EstimatedDeliveryDate,
    proformaSentDate: order.ProformaSentDate,
    proformaApprovalDate: order.ProformaApprovalDate,
    
    // Estado de proforma
    proformaStatus: order.ProformaStatus, // "pendiente", "enviada", "aprobada", "rechazada"
    
    // Información del equipo
    equipment: {
      equipmentId: order.equipment?.EquipmentId,
      brand: order.equipment?.Brand,
      model: order.equipment?.Model,
      serialNumber: order.equipment?.SerialNumber,
      description: order.equipment?.Description,
      type: order.equipment?.equipmentType?.Name,
    },
    
    // Información del cliente (en caso de que se necesite mostrar)
    clientInfo: {
      displayName: order.client?.DisplayName,
      email: order.client?.Email,
      phone: order.client?.Phone,
      organizationName: order.client?.OrganizationName,
      isPublicService: order.client?.IsPublicService,
      deliveryAddress: order.client?.DeliveryAddress,
    }
  };
};

/**
 * Busca una orden por criterios específicos con includes optimizados para cliente
 */
const findClientOrder = async (criteria) => {
  const includeFields = {
    status: true,
    client: true,
    equipment: {
      include: {
        equipmentType: true,
      },
    },
  };

  if (criteria.orderId) {
    return await prisma.serviceOrder.findUnique({
      where: { OrderId: Number(criteria.orderId) },
      include: includeFields,
    });
  }

  if (criteria.identityTag) {
    return await prisma.serviceOrder.findUnique({
      where: { IdentityTag: criteria.identityTag },
      include: includeFields,
    });
  }

  return null;
};

/**
 * Valida que se proporcionen los criterios necesarios para buscar una orden
 */
const validateSearchCriteria = (orderId, identityTag) => {
  if (!orderId && !identityTag) {
    throw new Error('Debe proporcionar orderId o identityTag');
  }
};

/**
 * Verifica que el cliente esté autenticado
 */
const validateClientAuthentication = (req) => {
  const clientId = req.session?.clientId;
  if (!clientId) {
    throw new Error('Cliente no autenticado');
  }
  return clientId;
};

/**
 * Verifica que la orden pertenezca al cliente autenticado
 */
const validateOrderOwnership = (order, clientId) => {
  if (!order || order.ClientId !== clientId) {
    throw new Error('Orden no encontrada o no pertenece a este cliente');
  }
};

// === ENDPOINTS DEL CLIENTE ===

/**
 * Consulta pública del estado de una orden
 * Permite verificar el estado usando OrderId o IdentityTag sin autenticación
 */
export const getOrderStatus = async (req, res) => {
  const { orderId, identityTag } = req.query;

  try {
    validateSearchCriteria(orderId, identityTag);
    
    const order = await findClientOrder({ orderId, identityTag });

    if (!order) {
      return res.status(404).json({ 
        success: false, 
        error: 'Orden no encontrada' 
      });
    }

    const response = buildClientOrderResponse(order);

    res.json({
      success: true,
      data: response,
    });

  } catch (error) {
    if (error.message === 'Debe proporcionar orderId o identityTag') {
      return res.status(400).json({ 
        success: false, 
        error: error.message 
      });
    }
    
    console.error('Error en getOrderStatus:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al consultar estado de la orden' 
    });
  }
};

/**
 * Lista todas las órdenes del cliente autenticado
 * Requiere autenticación de cliente
 */
export const listMyOrders = async (req, res) => {
  try {
    const clientId = validateClientAuthentication(req);

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
    if (error.message === 'Cliente no autenticado') {
      return res.status(401).json({ 
        success: false, 
        error: error.message 
      });
    }
    
    console.error('Error en listMyOrders:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al listar órdenes del cliente' 
    });
  }
};

/**
 * Ver detalles de una orden específica del cliente
 * Requiere autenticación y que la orden pertenezca al cliente
 */
export const viewOrderDetails = async (req, res) => {
  const { orderId } = req.params;

  try {
    const clientId = validateClientAuthentication(req);

    const order = await prisma.serviceOrder.findUnique({
      where: { OrderId: Number(orderId) },
      include: {
        status: true,
        client: true,
        equipment: {
          include: {
            equipmentType: true,
          },
        },
      },
    });

    validateOrderOwnership(order, clientId);

    const response = buildClientOrderResponse(order);
    
    res.json({ 
      success: true, 
      data: response 
    });

  } catch (error) {
    if (error.message === 'Cliente no autenticado') {
      return res.status(401).json({ 
        success: false, 
        error: error.message 
      });
    }
    
    if (error.message === 'Orden no encontrada o no pertenece a este cliente') {
      return res.status(404).json({ 
        success: false, 
        error: error.message 
      });
    }

    console.error('Error en viewOrderDetails:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al obtener detalles de la orden' 
    });
  }
};

/**
 * Aprobar o rechazar una proforma enviada
 * Endpoint crítico para el flujo de trabajo del cliente
 */
export const approveOrRejectProforma = async (req, res) => {
  const { orderId, action } = req.body; // action: 'approve' o 'reject'

  try {
    const clientId = validateClientAuthentication(req);

    // Validar acción
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Acción inválida. Use "approve" o "reject"' 
      });
    }

    // Buscar la orden
    const order = await prisma.serviceOrder.findUnique({
      where: { OrderId: Number(orderId) },
      include: { 
        client: true, 
        status: true,
        equipment: { 
          include: { 
            equipmentType: true 
          } 
        }
      }
    });

    validateOrderOwnership(order, clientId);

    // Verificar que la proforma esté en estado correcto
    if (order.ProformaStatus !== 'enviada') {
      return res.status(400).json({ 
        success: false, 
        error: 'La proforma no está en estado "enviada" para ser procesada' 
      });
    }

    // Preparar datos de actualización
    let newStatusCode;
    let proformaNewStatus;
    let notes;

    if (action === 'approve') {
      newStatusCode = 'PROFORMA_APROBADA';
      proformaNewStatus = 'aprobada';
      notes = 'Proforma aprobada por el cliente';
    } else {
      newStatusCode = 'PROFORMA_RECHAZADA';
      proformaNewStatus = 'rechazada';
      notes = 'Proforma rechazada por el cliente';
    }

    // Buscar el nuevo estado
    const newStatus = await prisma.status.findUnique({ 
      where: { Code: newStatusCode } 
    });
    
    if (!newStatus) {
      throw new Error(`Estado "${newStatusCode}" no configurado en el sistema`);
    }

    // Actualizar la orden
    const updatedOrder = await prisma.serviceOrder.update({
      where: { OrderId: order.OrderId },
      data: {
        ProformaStatus: proformaNewStatus,
        ProformaApprovalDate: new Date(),
        CurrentStatusId: newStatus.StatusId,
      },
      include: { 
        client: true, 
        equipment: { 
          include: { 
            equipmentType: true 
          } 
        }, 
        status: true 
      }
    });

    // Registrar en historial de estados
    await prisma.oRDER_STATUS_HISTORY.create({
      data: {
        OrderId: order.OrderId,
        StatusId: newStatus.StatusId,
        Notes: notes,
        ChangedDate: new Date(),
      },
    });

    // Enviar email de confirmación
    try {
      await sendProformaConfirmationEmail(
        order.client.Email,
        order.client.DisplayName,
        order.IdentityTag,
        action
      );
    } catch (emailError) {
      console.warn('Error enviando email de confirmación:', emailError);
      // No fallar la operación por error de email
    }

    res.json({
      success: true,
      message: `Proforma ${action === 'approve' ? 'aprobada' : 'rechazada'} exitosamente`,
      data: buildClientOrderResponse(updatedOrder),
    });

  } catch (error) {
    if (error.message === 'Cliente no autenticado') {
      return res.status(401).json({ 
        success: false, 
        error: error.message 
      });
    }
    
    if (error.message === 'Orden no encontrada o no pertenece a este cliente') {
      return res.status(404).json({ 
        success: false, 
        error: error.message 
      });
    }

    console.error('Error en approveOrRejectProforma:', error);
    res.status(500).json({ 
      success: false, 
      error: `Error al procesar la proforma: ${error.message}` 
    });
  }
};