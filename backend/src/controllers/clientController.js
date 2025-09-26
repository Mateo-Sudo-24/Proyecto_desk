// clientController.js - Controlador completo para operaciones de cliente
import { PrismaClient } from '@prisma/client';
import { sendProformaConfirmationEmail } from '../config/nodemailer.js';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// === UTILIDADES Y HELPERS ===

/**
 * Construye la respuesta completa de orden para el cliente
 * Incluye historial de estados y detalles de seguimiento
 */
const buildClientOrderResponse = (order) => {
  if (!order) return null;

  return {
    // Información básica de la orden
    orderId: order.OrderId,
    identityTag: order.IdentityTag,
    
    // Estado actual y seguimiento
    currentStatus: order.status?.Name || 'Desconocido',
    statusCode: order.status?.Code,
    statusHistory: order.orderStatusHistory?.map(history => ({
      statusName: history.status?.Name,
      statusCode: history.status?.Code,
      changeDate: history.ChangedDate,
      notes: history.Notes,
      changedBy: history.changedByUser?.Username || 'Sistema'
    })) || [],
    
    // Información del servicio
    diagnosis: order.Diagnosis,
    totalPrice: order.TotalPrice,
    parts: order.Parts,
    notes: order.Notes,
    
    // Fechas importantes del proceso
    intakeDate: order.IntakeDate,
    estimatedDeliveryDate: order.EstimatedDeliveryDate,
    serviceStartDate: order.ServiceStartDate,
    serviceEndDate: order.ServiceEndDate,
    
    // Estado de proforma
    proformaStatus: order.ProformaStatus,
    proformaSentDate: order.ProformaSentDate,
    proformaApprovalDate: order.ProformaApprovalDate,
    
    // Información del equipo
    equipment: {
      equipmentId: order.equipment?.EquipmentId,
      brand: order.equipment?.Brand,
      model: order.equipment?.Model,
      serialNumber: order.equipment?.SerialNumber,
      description: order.equipment?.Description,
      type: order.equipment?.equipmentType?.Name,
    },
    
    // Personal asignado
    receptionist: order.receptionist?.Username,
    technician: order.technician?.Username,
    
    // Entradas y salidas del equipo
    equipmentEntry: order.equipmentEntries?.map(entry => ({
      receivedDate: entry.ReceivedDate,
      receivedBy: entry.receivedByUser?.Username,
      notes: entry.Notes
    })) || [],
    
    equipmentExit: order.equipmentExits?.map(exit => ({
      deliveryDate: exit.DeliveryDate,
      deliveredBy: exit.deliveredByUser?.Username,
      receivedByClient: exit.ReceivedByClientName,
      notes: exit.Notes
    })) || []
  };
};

/**
 * Busca una orden con todos los includes necesarios para el seguimiento completo
 */
const findClientOrderWithHistory = async (criteria) => {
  const includeFields = {
    status: true,
    client: true,
    equipment: {
      include: {
        equipmentType: true,
      },
    },
    receptionist: { select: { Username: true } },
    technician: { select: { Username: true } },
    orderStatusHistory: {
      include: {
        status: true,
        changedByUser: { select: { Username: true } }
      },
      orderBy: { ChangedDate: 'desc' }
    },
    equipmentEntries: {
      include: {
        receivedByUser: { select: { Username: true } }
      }
    },
    equipmentExits: {
      include: {
        deliveredByUser: { select: { Username: true } }
      }
    }
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
 * Valida criterios de búsqueda
 */
const validateSearchCriteria = (orderId, identityTag) => {
  if (!orderId && !identityTag) {
    throw new Error('Debe proporcionar orderId o identityTag');
  }
};

/**
 * Verifica autenticación del cliente
 */
const validateClientAuthentication = (req) => {
  const clientId = req.session?.clientId;
  if (!clientId) {
    throw new Error('Cliente no autenticado');
  }
  return clientId;
};

/**
 * Verifica que la orden pertenezca al cliente
 */
const validateOrderOwnership = (order, clientId) => {
  if (!order || order.ClientId !== clientId) {
    throw new Error('Orden no encontrada o no pertenece a este cliente');
  }
};

/**
 * Actualiza el estado de una orden y registra el cambio en el historial
 */
const updateOrderStatusAndHistory = async (orderId, newStatusId, notes, clientId = null) => {
  try {
    const updatedOrder = await prisma.serviceOrder.update({
      where: { OrderId: Number(orderId) },
      data: { CurrentStatusId: newStatusId },
    });

    await prisma.orderStatusHistory.create({
      data: {
        OrderId: Number(orderId),
        StatusId: newStatusId,
        Notes: notes,
        ChangedByUserId: null, // Los clientes no son usuarios en la tabla User
      },
    });
    
    return updatedOrder;
  } catch (error) {
    console.error(`Error actualizando estado de orden ${orderId}:`, error);
    throw new Error('Fallo al actualizar el estado de la orden');
  }
};

// === AUTENTICACIÓN DE CLIENTE ===

/**
 * Login de cliente usando email y contraseña
 */
export const clientLogin = async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Buscar cliente por email
    const client = await prisma.client.findUnique({
      where: { Email: email }
    });

    if (!client || !client.PasswordHash) {
      return res.status(401).json({ 
        success: false, 
        error: 'Credenciales inválidas' 
      });
    }

    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, client.PasswordHash.toString());
    
    if (!validPassword) {
      return res.status(401).json({ 
        success: false, 
        error: 'Credenciales inválidas' 
      });
    }

    // Crear sesión
    req.session.clientId = client.ClientId;
    req.session.clientEmail = client.Email;
    req.session.clientName = client.DisplayName;

    res.json({
      success: true,
      message: 'Autenticación exitosa',
      client: {
        id: client.ClientId,
        email: client.Email,
        name: client.DisplayName,
        organizationName: client.OrganizationName
      }
    });

  } catch (error) {
    console.error('Error en clientLogin:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor durante el login' 
    });
  }
};

/**
 * Cambio de contraseña del cliente
 */
export const clientChangePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  
  try {
    const clientId = validateClientAuthentication(req);
    
    const client = await prisma.client.findUnique({ 
      where: { ClientId: clientId } 
    });
    
    if (!client || !client.PasswordHash) {
      return res.status(404).json({ 
        success: false, 
        error: 'Cliente no encontrado' 
      });
    }

    // Verificar contraseña actual
    const validPassword = await bcrypt.compare(oldPassword, client.PasswordHash.toString());
    
    if (!validPassword) {
      return res.status(401).json({ 
        success: false, 
        error: 'Contraseña actual incorrecta' 
      });
    }

    // Hashear nueva contraseña
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    
    await prisma.client.update({
      where: { ClientId: clientId },
      data: { PasswordHash: hashedNewPassword }
    });

    res.json({
      success: true,
      message: 'Contraseña actualizada con éxito'
    });

  } catch (error) {
    if (error.message === 'Cliente no autenticado') {
      return res.status(401).json({ 
        success: false, 
        error: error.message 
      });
    }
    
    console.error('Error en clientChangePassword:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al cambiar contraseña' 
    });
  }
};

/**
 * Logout del cliente
 */
export const clientLogout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        error: 'Error al cerrar sesión' 
      });
    }
    
    res.json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    });
  });
};

// === CONSULTA Y SEGUIMIENTO DE ÓRDENES ===

/**
 * Consulta pública del estado de una orden con historial completo
 * Permite rastrear el progreso usando OrderId o IdentityTag
 */
export const getOrderStatusWithHistory = async (req, res) => {
  const { orderId, identityTag } = req.query;

  try {
    validateSearchCriteria(orderId, identityTag);
    
    const order = await findClientOrderWithHistory({ orderId, identityTag });

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
    
    console.error('Error en getOrderStatusWithHistory:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al consultar estado de la orden' 
    });
  }
};

/**
 * Lista todas las órdenes del cliente autenticado con historial
 */
export const listMyOrdersWithHistory = async (req, res) => {
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
        receptionist: { select: { Username: true } },
        technician: { select: { Username: true } },
        orderStatusHistory: {
          include: {
            status: true,
            changedByUser: { select: { Username: true } }
          },
          orderBy: { ChangedDate: 'desc' }
        },
        equipmentEntries: {
          include: {
            receivedByUser: { select: { Username: true } }
          }
        },
        equipmentExits: {
          include: {
            deliveredByUser: { select: { Username: true } }
          }
        }
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
    
    console.error('Error en listMyOrdersWithHistory:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al listar órdenes del cliente' 
    });
  }
};

/**
 * Ver detalles completos de una orden específica
 */
export const viewOrderDetails = async (req, res) => {
  const { orderId } = req.params;

  try {
    const clientId = validateClientAuthentication(req);

    const order = await findClientOrderWithHistory({ orderId });
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

// === GESTIÓN DE PROFORMAS ===

/**
 * Aprobar o rechazar proforma con actualización de estado
 */
export const approveOrRejectProforma = async (req, res) => {
  const { orderId, action } = req.body;

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

    // Verificar estado de proforma
    if (order.ProformaStatus !== 'enviada') {
      return res.status(400).json({ 
        success: false, 
        error: 'La proforma no está en estado "enviada" para ser procesada' 
      });
    }

    // Preparar actualización
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

    // Buscar nuevo estado
    const newStatus = await prisma.status.findUnique({ 
      where: { Code: newStatusCode } 
    });
    
    if (!newStatus) {
      throw new Error(`Estado "${newStatusCode}" no configurado en el sistema`);
    }

    // Actualizar orden
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

    // Registrar en historial
    await updateOrderStatusAndHistory(
      order.OrderId, 
      newStatus.StatusId, 
      notes, 
      clientId
    );

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

// === ENDPOINTS DE COMPATIBILIDAD (LEGACY) ===

/**
 * Endpoint legacy para consulta simple de estado
 */
export const getOrderStatus = async (req, res) => {
  // Redirigir a la versión con historial
  return getOrderStatusWithHistory(req, res);
};

/**
 * Endpoint legacy para listar órdenes
 */
export const listMyOrders = async (req, res) => {
  // Redirigir a la versión con historial
  return listMyOrdersWithHistory(req, res);
};