// clientController.js - Controlador completo para operaciones de cliente (REFACTORIZADO)
import { PrismaClient } from '@prisma/client';
import { sendProformaConfirmationEmail, sendOTPEmail } from '../../config/nodemailer.js';
import { validate, schemas, sanitizeText } from '../middleware/validationMiddleware.js';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// === CONSTANTES ===
const ERROR_MESSAGES = {
  UNAUTHENTICATED: 'Cliente no autenticado',
  INVALID_CREDENTIALS: 'Credenciales inválidas',
  ORDER_NOT_FOUND: 'Orden no encontrada o no pertenece a este cliente',
  INVALID_PROFORMA_STATUS: 'La proforma no está en estado correcto',
  INTERNAL_ERROR: 'Error interno del servidor',
  INVALID_OTP: 'Código OTP inválido o expirado'
};

const PROFORMA_STATUS = {
  PENDING: 'pendiente',
  SENT: 'enviada',
  APPROVED: 'aprobada',
  REJECTED: 'rechazada'
};

const STATUS_CODES = {
  PROFORMA_APPROVED: 'PROFORMA_APROBADA',
  PROFORMA_REJECTED: 'PROFORMA_RECHAZADA'
};

// === UTILIDADES Y HELPERS ===

/**
 * Logger centralizado
 */
const logError = (context, error, metadata = {}) => {
  console.error(`[CLIENT CONTROLLER - ${context}]`, {
    message: error.message,
    stack: error.stack,
    ...metadata,
    timestamp: new Date().toISOString()
  });
};

/**
 * Wrapper para manejar errores async
 */
const asyncHandler = (fn) => {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      logError(fn.name, error, { 
        clientId: req.session?.clientId,
        body: req.body,
        params: req.params 
      });
      
      const message = process.env.NODE_ENV === 'production' 
        ? ERROR_MESSAGES.INTERNAL_ERROR 
        : error.message;
      
      res.status(error.statusCode || 500).json({ 
        success: false,
        error: message 
      });
    }
  };
};

/**
 * Construye la respuesta completa de orden para el cliente
 * CORREGIDO: Usa nombres de campos del schema
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
    statusHistory: order.histories?.map(history => ({
      statusName: history.status?.Name,
      statusCode: history.status?.Code,
      changeDate: history.ChangedAt, // ✅ CORREGIDO
      notes: history.Notes,
      changedBy: history.changedBy?.Username || 'Sistema' // ✅ CORREGIDO
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
    
    // ✅ CORREGIDO: Relación 1:1, no 1:N
    equipmentEntry: order.equipmentEntry ? {
      receivedDate: order.equipmentEntry.EnteredAt, // ✅ Campo correcto
      receivedBy: order.equipmentEntry.receivedBy?.Username, // ✅ Nombre correcto
      notes: order.equipmentEntry.Notes
    } : null,
    
    equipmentExit: order.equipmentExit ? {
      deliveryDate: order.equipmentExit.ExitedAt, // ✅ Campo correcto
      deliveredBy: order.equipmentExit.deliveredBy?.Username, // ✅ Nombre correcto
      receivedByClient: order.equipmentExit.ReceivedByClientName,
      notes: order.equipmentExit.Notes
    } : null
  };
};

/**
 * Busca una orden con todos los includes necesarios
 * CORREGIDO: Nombres de relaciones del schema
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
    histories: { // ✅ CORREGIDO: "histories" no "orderStatusHistory"
      include: {
        status: true,
        changedBy: { select: { Username: true } } // ✅ CORREGIDO: "changedBy" no "changedByUser"
      },
      orderBy: { ChangedAt: 'desc' }
    },
    equipmentEntry: { // ✅ CORREGIDO: Singular, relación 1:1
      include: {
        receivedBy: { select: { Username: true } } // ✅ CORREGIDO: "receivedBy" no "receivedByUser"
      }
    },
    equipmentExit: { // ✅ CORREGIDO: Singular, relación 1:1
      include: {
        deliveredBy: { select: { Username: true } } // ✅ CORREGIDO: "deliveredBy" no "deliveredByUser"
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
 * Genera código OTP de 6 dígitos
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Valida criterios de búsqueda
 */
const validateSearchCriteria = (orderId, identityTag) => {
  if (!orderId && !identityTag) {
    const error = new Error('Debe proporcionar orderId o identityTag');
    error.statusCode = 400;
    throw error;
  }
};

/**
 * Verifica autenticación del cliente
 */
const validateClientAuthentication = (req) => {
  const clientId = req.session?.clientId;
  if (!clientId) {
    const error = new Error(ERROR_MESSAGES.UNAUTHENTICATED);
    error.statusCode = 401;
    throw error;
  }
  return clientId;
};

/**
 * Verifica que la orden pertenezca al cliente
 */
const validateOrderOwnership = (order, clientId) => {
  if (!order || order.ClientId !== clientId) {
    const error = new Error(ERROR_MESSAGES.ORDER_NOT_FOUND);
    error.statusCode = 404;
    throw error;
  }
};

/**
 * Actualiza el estado de una orden y registra el cambio en el historial
 * MEJORADO: Con transacciones
 */
const updateOrderStatusAndHistory = async (orderId, newStatusId, notes, clientId = null) => {
  return await prisma.$transaction(async (tx) => {
    const updatedOrder = await tx.serviceOrder.update({
      where: { OrderId: Number(orderId) },
      data: { CurrentStatusId: newStatusId },
    });

    await tx.orderStatusHistory.create({
      data: {
        OrderId: Number(orderId),
        StatusId: newStatusId,
        Notes: notes,
        ChangedByUserId: null, // Los clientes no son usuarios en tabla User
      },
    });
    
    return updatedOrder;
  });
};

// === AUTENTICACIÓN DE CLIENTE CON OTP ===

/**
 * Solicitar OTP para login
 * El cliente ingresa su email y recibe un código OTP
 */
export const requestOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Sanitizar email
  const sanitizedEmail = sanitizeText(email);

  // Buscar cliente por email
  const client = await prisma.client.findUnique({
    where: { Email: sanitizedEmail }
  });

  // Por seguridad, siempre retornar el mismo mensaje
  if (!client) {
    // No revelar si el email existe
    return res.json({
      success: true,
      message: 'Si el email está registrado, recibirá un código OTP'
    });
  }

  // Generar OTP
  const otpCode = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

  // Guardar OTP en la base de datos
  await prisma.client.update({
    where: { ClientId: client.ClientId },
    data: {
      OTP: otpCode,
      OTPExpires: expiresAt
    }
  });

  // Enviar OTP por email
  try {
    await sendOTPEmail(client.Email, client.DisplayName, otpCode);
  } catch (emailError) {
    logError('requestOTP', emailError, { clientId: client.ClientId });
    // No fallar si el email falla, el OTP está guardado
  }

  console.log('[OTP GENERATED]', {
    clientId: client.ClientId,
    email: client.Email,
    expiresAt,
    timestamp: new Date().toISOString()
  });

  res.json({
    success: true,
    message: 'Si el email está registrado, recibirá un código OTP',
    expiresIn: 600 // segundos
  });
});

/**
 * Login de cliente usando email y OTP
 * MEJORADO: Sin contraseña, usa OTP
 */
export const clientLoginWithOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const sanitizedEmail = sanitizeText(email);

  // Buscar cliente
  const client = await prisma.client.findUnique({
    where: { Email: sanitizedEmail },
    select: {
      ClientId: true,
      Email: true,
      DisplayName: true,
      OrganizationName: true,
      OTP: true,
      OTPExpires: true
    }
  });

  // Timing attack prevention
  await new Promise(resolve => setTimeout(resolve, 1000));

  if (!client || !client.OTP || !client.OTPExpires) {
    const error = new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
    error.statusCode = 401;
    throw error;
  }

  // Verificar si OTP expiró
  if (new Date() > client.OTPExpires) {
    const error = new Error(ERROR_MESSAGES.INVALID_OTP);
    error.statusCode = 401;
    throw error;
  }

  // Verificar OTP
  if (client.OTP !== otp) {
    const error = new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
    error.statusCode = 401;
    throw error;
  }

  // Limpiar OTP después de uso exitoso
  await prisma.client.update({
    where: { ClientId: client.ClientId },
    data: {
      OTP: null,
      OTPExpires: null
    }
  });

  // Crear sesión
  req.session.clientId = client.ClientId;
  req.session.clientEmail = client.Email;
  req.session.clientName = client.DisplayName;

  console.log('[CLIENT LOGIN SUCCESS]', {
    clientId: client.ClientId,
    email: client.Email,
    timestamp: new Date().toISOString()
  });

  res.json({
    success: true,
    message: 'Autenticación exitosa',
    data: {
      client: {
        id: client.ClientId,
        email: client.Email,
        name: client.DisplayName,
        organizationName: client.OrganizationName
      }
    }
  });
});

/**
 * Login tradicional con contraseña (LEGACY - mantener para compatibilidad)
 */
export const clientLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  const sanitizedEmail = sanitizeText(email);

  const client = await prisma.client.findUnique({
    where: { Email: sanitizedEmail }
  });

  if (!client || !client.PasswordHash) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const error = new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
    error.statusCode = 401;
    throw error;
  }

  const validPassword = await bcrypt.compare(password, client.PasswordHash.toString());
  
  if (!validPassword) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const error = new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
    error.statusCode = 401;
    throw error;
  }

  req.session.clientId = client.ClientId;
  req.session.clientEmail = client.Email;
  req.session.clientName = client.DisplayName;

  res.json({
    success: true,
    message: 'Autenticación exitosa',
    data: {
      client: {
        id: client.ClientId,
        email: client.Email,
        name: client.DisplayName,
        organizationName: client.OrganizationName
      }
    }
  });
});

/**
 * Cambio de contraseña del cliente
 */
export const clientChangePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  
  const clientId = validateClientAuthentication(req);
  
  const client = await prisma.client.findUnique({ 
    where: { ClientId: clientId } 
  });
  
  if (!client || !client.PasswordHash) {
    const error = new Error('Cliente no encontrado');
    error.statusCode = 404;
    throw error;
  }

  const validPassword = await bcrypt.compare(oldPassword, client.PasswordHash.toString());
  
  if (!validPassword) {
    const error = new Error('Contraseña actual incorrecta');
    error.statusCode = 401;
    throw error;
  }

  const hashedNewPassword = await bcrypt.hash(newPassword, 12);
  
  await prisma.client.update({
    where: { ClientId: clientId },
    data: { PasswordHash: hashedNewPassword }
  });

  res.json({
    success: true,
    message: 'Contraseña actualizada con éxito'
  });
});

/**
 * Logout del cliente
 */
export const clientLogout = (req, res) => {
  const clientId = req.session?.clientId;
  
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        error: 'Error al cerrar sesión' 
      });
    }
    
    console.log('[CLIENT LOGOUT]', {
      clientId,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    });
  });
};

// === CONSULTA Y SEGUIMIENTO DE ÓRDENES ===

/**
 * Consulta pública del estado de una orden con historial completo
 */
export const getOrderStatusWithHistory = asyncHandler(async (req, res) => {
  const { orderId, identityTag } = req.query;

  validateSearchCriteria(orderId, identityTag);
  
  const order = await findClientOrderWithHistory({ orderId, identityTag });

  if (!order) {
    const error = new Error('Orden no encontrada');
    error.statusCode = 404;
    throw error;
  }

  const response = buildClientOrderResponse(order);

  res.json({
    success: true,
    data: response,
  });
});

/**
 * Lista todas las órdenes del cliente autenticado
 */
export const listMyOrdersWithHistory = asyncHandler(async (req, res) => {
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
      histories: { // ✅ CORREGIDO
        include: {
          status: true,
          changedBy: { select: { Username: true } } // ✅ CORREGIDO
        },
        orderBy: { ChangedAt: 'desc' }
      },
      equipmentEntry: { // ✅ CORREGIDO: Singular
        include: {
          receivedBy: { select: { Username: true } } // ✅ CORREGIDO
        }
      },
      equipmentExit: { // ✅ CORREGIDO: Singular
        include: {
          deliveredBy: { select: { Username: true } } // ✅ CORREGIDO
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
});

/**
 * Ver detalles completos de una orden específica
 */
export const viewOrderDetails = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const clientId = validateClientAuthentication(req);
  const order = await findClientOrderWithHistory({ orderId });
  validateOrderOwnership(order, clientId);

  const response = buildClientOrderResponse(order);
  
  res.json({ 
    success: true, 
    data: response 
  });
});

// === GESTIÓN DE PROFORMAS ===

/**
 * Aprobar o rechazar proforma con actualización de estado
 * MEJORADO: Con transacciones
 */
export const approveOrRejectProforma = asyncHandler(async (req, res) => {
  const { orderId, action } = req.body;

  const clientId = validateClientAuthentication(req);

  if (!['approve', 'reject'].includes(action)) {
    const error = new Error('Acción inválida. Use "approve" o "reject"');
    error.statusCode = 400;
    throw error;
  }

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

  if (order.ProformaStatus !== PROFORMA_STATUS.SENT) {
    const error = new Error(ERROR_MESSAGES.INVALID_PROFORMA_STATUS);
    error.statusCode = 400;
    throw error;
  }

  // Preparar actualización
  const newStatusCode = action === 'approve' 
    ? STATUS_CODES.PROFORMA_APPROVED 
    : STATUS_CODES.PROFORMA_REJECTED;
    
  const proformaNewStatus = action === 'approve' 
    ? PROFORMA_STATUS.APPROVED 
    : PROFORMA_STATUS.REJECTED;
    
  const notes = action === 'approve'
    ? 'Proforma aprobada por el cliente'
    : 'Proforma rechazada por el cliente';

  const newStatus = await prisma.status.findUnique({ 
    where: { Code: newStatusCode } 
  });
  
  if (!newStatus) {
    throw new Error(`Estado "${newStatusCode}" no configurado en el sistema`);
  }

  // Actualizar en transacción
  const updatedOrder = await prisma.$transaction(async (tx) => {
    const order = await tx.serviceOrder.update({
      where: { OrderId: Number(orderId) },
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

    await tx.orderStatusHistory.create({
      data: {
        OrderId: order.OrderId,
        StatusId: newStatus.StatusId,
        Notes: notes,
        ChangedByUserId: null,
      }
    });

    return order;
  });

  // Enviar email de confirmación (no bloquear respuesta)
  sendProformaConfirmationEmail(
    order.client.Email,
    order.client.DisplayName,
    order.IdentityTag,
    action
  ).catch(err => logError('sendProformaEmail', err));

  res.json({
    success: true,
    message: `Proforma ${action === 'approve' ? 'aprobada' : 'rechazada'} exitosamente`,
    data: buildClientOrderResponse(updatedOrder),
  });
});

// === SISTEMA DE TICKETS DE SOPORTE ===

/**
 * Crear ticket de soporte/modificación
 * Los clientes pueden solicitar cambios o reportar problemas
 */
export const createSupportTicket = asyncHandler(async (req, res) => {
  const { orderId, category, subject, description, priority } = req.body;
  
  const clientId = validateClientAuthentication(req);

  // Verificar que la orden pertenezca al cliente
  if (orderId) {
    const order = await prisma.serviceOrder.findUnique({
      where: { OrderId: Number(orderId) }
    });
    validateOrderOwnership(order, clientId);
  }

  // ✅ NUEVO: Crear ticket (requiere agregar modelo Ticket al schema)
  const ticket = await prisma.ticket.create({
    data: {
      ClientId: clientId,
      OrderId: orderId ? Number(orderId) : null,
      Category: category,
      Subject: sanitizeText(subject),
      Description: sanitizeText(description),
      Priority: priority || 'normal',
      Status: 'open',
      CreatedBy: 'client'
    },
    include: {
      client: true,
      order: {
        include: {
          equipment: true
        }
      }
    }
  });

  console.log('[TICKET CREATED]', {
    ticketId: ticket.TicketId,
    clientId,
    orderId,
    category,
    timestamp: new Date().toISOString()
  });

  res.status(201).json({
    success: true,
    message: 'Ticket de soporte creado exitosamente',
    data: {
      ticket: {
        ticketId: ticket.TicketId,
        ticketNumber: ticket.TicketNumber,
        category: ticket.Category,
        subject: ticket.Subject,
        status: ticket.Status,
        priority: ticket.Priority,
        createdAt: ticket.CreatedAt
      }
    }
  });
});

/**
 * Listar tickets del cliente
 */
export const listMyTickets = asyncHandler(async (req, res) => {
  const clientId = validateClientAuthentication(req);

  const tickets = await prisma.ticket.findMany({
    where: { ClientId: clientId },
    include: {
      order: {
        select: {
          OrderId: true,
          IdentityTag: true
        }
      },
      assignedTo: {
        select: {
          UserId: true,
          Username: true
        }
      }
    },
    orderBy: { CreatedAt: 'desc' }
  });

  res.json({
    success: true,
    data: {
      tickets,
      total: tickets.length
    }
  });
});

/**
 * Ver detalles de un ticket específico
 */
export const viewTicketDetails = asyncHandler(async (req, res) => {
  const { ticketId } = req.params;
  const clientId = validateClientAuthentication(req);

  const ticket = await prisma.ticket.findUnique({
    where: { TicketId: Number(ticketId) },
    include: {
      client: true,
      order: {
        include: {
          equipment: true,
          status: true
        }
      },
      assignedTo: {
        select: {
          UserId: true,
          Username: true,
          Email: true
        }
      },
      responses: {
        include: {
          respondedBy: {
            select: {
              UserId: true,
              Username: true
            }
          }
        },
        orderBy: { CreatedAt: 'asc' }
      }
    }
  });

  if (!ticket || ticket.ClientId !== clientId) {
    const error = new Error('Ticket no encontrado');
    error.statusCode = 404;
    throw error;
  }

  res.json({
    success: true,
    data: { ticket }
  });
});

// === ENDPOINTS LEGACY (compatibilidad) ===
export const getOrderStatus = async (req, res) => {
  return getOrderStatusWithHistory(req, res);
};

export const listMyOrders = async (req, res) => {
  return listMyOrdersWithHistory(req, res);
};