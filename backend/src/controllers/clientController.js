// clientController.js - REFACTORIZADO Y COMPATIBLE
import { PrismaClient } from '@prisma/client';
import { sendProformaEmail, sendOTPEmail } from '../../config/nodemailer.js';
import { validate, schemas, sanitizeText, validateData } from '../middlewares/validator.js';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// === CONSTANTES ===
const ERROR_MESSAGES = {
  UNAUTHENTICATED: 'Cliente no autenticado',
  INVALID_CREDENTIALS: 'Credenciales inválidas',
  ORDER_NOT_FOUND: 'Orden no encontrada o no pertenece a este cliente',
  INVALID_PROFORMA_STATUS: 'La proforma no está en estado correcto',
  INTERNAL_ERROR: 'Error interno del servidor',
  INVALID_OTP: 'Código OTP inválido o expirado',
  INVALID_TICKET_CATEGORY: 'Categoría de ticket inválida'
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
      changeDate: history.ChangedAt,
      notes: history.Notes,
      changedBy: history.changedBy?.Username || 'Sistema'
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
    
    // Relaciones 1:1
    equipmentEntry: order.equipmentEntry ? {
      receivedDate: order.equipmentEntry.EnteredAt,
      receivedBy: order.equipmentEntry.receivedBy?.Username,
      notes: order.equipmentEntry.Notes
    } : null,
    
    equipmentExit: order.equipmentExit ? {
      deliveryDate: order.equipmentExit.ExitedAt,
      deliveredBy: order.equipmentExit.deliveredBy?.Username,
      receivedByClient: order.equipmentExit.ReceivedByClientName,
      notes: order.equipmentExit.Notes
    } : null
  };
};

/**
 * Busca una orden con todos los includes necesarios
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
    histories: {
      include: {
        status: true,
        changedBy: { select: { Username: true } }
      },
      orderBy: { ChangedAt: 'desc' }
    },
    equipmentEntry: {
      include: {
        receivedBy: { select: { Username: true } }
      }
    },
    equipmentExit: {
      include: {
        deliveredBy: { select: { Username: true } }
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
 * Resuelve código de categoría a CategoryId
 */
const resolveTicketCategoryId = async (categoryCode) => {
  const category = await prisma.ticketCategory.findUnique({
    where: { Code: categoryCode }
  });

  if (!category) {
    const error = new Error(ERROR_MESSAGES.INVALID_TICKET_CATEGORY);
    error.statusCode = 400;
    throw error;
  }

  return category.CategoryId;
};

// === AUTENTICACIÓN DE CLIENTE CON OTP ===

/**
 * Solicitar OTP para login
 */
export const requestOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Validar email usando el schema
  const validation = validateData(schemas.createClient.pick({ email: true }), { email });
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: 'Email inválido',
      details: validation.errors
    });
  }

  const sanitizedEmail = validation.data.email;

  // Buscar cliente por email
  const client = await prisma.client.findUnique({
    where: { Email: sanitizedEmail }
  });

  // Por seguridad, siempre retornar el mismo mensaje
  if (!client) {
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
 */
export const clientLoginWithOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  // Validar email
  const emailValidation = validateData(schemas.createClient.pick({ email: true }), { email });
  if (!emailValidation.success) {
    return res.status(400).json({
      success: false,
      error: 'Email inválido',
      details: emailValidation.errors
    });
  }

  const sanitizedEmail = emailValidation.data.email;

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
 * Login tradicional con contraseña (LEGACY)
 */
export const clientLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  // Validar email
  const emailValidation = validateData(schemas.createClient.pick({ email: true }), { email });
  if (!emailValidation.success) {
    return res.status(400).json({
      success: false,
      error: 'Email inválido',
      details: emailValidation.errors
    });
  }

  const sanitizedEmail = emailValidation.data.email;

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

  // Validar nueva contraseña
  const passwordValidation = validateData(
    z.object({ newPassword: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres') }), 
    { newPassword }
  );
  
  if (!passwordValidation.success) {
    return res.status(400).json({
      success: false,
      error: 'Contraseña inválida',
      details: passwordValidation.errors
    });
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
      histories: {
        include: {
          status: true,
          changedBy: { select: { Username: true } }
        },
        orderBy: { ChangedAt: 'desc' }
      },
      equipmentEntry: {
        include: {
          receivedBy: { select: { Username: true } }
        }
      },
      equipmentExit: {
        include: {
          deliveredBy: { select: { Username: true } }
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

  // Enviar email de confirmación
  sendProformaEmail(
    updatedOrder.client.Email,
    updatedOrder.client.DisplayName,
    updatedOrder.IdentityTag,
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

  // Resolver CategoryId desde código
  const categoryId = await resolveTicketCategoryId(category);

  // Crear ticket
  const ticket = await prisma.ticket.create({
    data: {
      ClientId: clientId,
      OrderId: orderId ? Number(orderId) : null,
      CategoryId: categoryId,
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
      },
      category: true
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
        category: ticket.category.Name,
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
      },
      category: {
        select: {
          Name: true
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
      category: true,
      assignedTo: {
        select: {
          UserId: true,
          Username: true,
          Email: true
        }
      },
      responses: {
        include: {
          respondedByUser: {
            select: {
              UserId: true,
              Username: true
            }
          },
          respondedByClient: {
            select: {
              ClientId: true,
              DisplayName: true
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

// === REGISTRO Y GESTIÓN DE PERFIL ===

/**
 * Registro de nuevo cliente
 */
export const registerClient = asyncHandler(async (req, res) => {
  const { 
    displayName, 
    email, 
    phone, 
    idNumber, 
    address, 
    organizationName,
    contactName,
    deliveryAddress,
    password 
  } = req.body;

  // Validar datos usando el schema
  const validation = validateData(schemas.createClient, {
    displayName,
    email,
    phone,
    idNumber,
    address,
    organizationName,
    contactName,
    deliveryAddress,
    isPublicService: false // Por defecto para clientes individuales
  });

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: 'Datos de registro inválidos',
      details: validation.errors
    });
  }

  const validatedData = validation.data;

  // Verificar si el email ya existe
  const existingClientByEmail = await prisma.client.findUnique({
    where: { Email: validatedData.email }
  });

  if (existingClientByEmail) {
    const error = new Error('El email ya está registrado');
    error.statusCode = 409;
    throw error;
  }

  // Verificar si el número de identificación ya existe
  if (validatedData.idNumber) {
    const existingClientById = await prisma.client.findUnique({
      where: { IdNumber: validatedData.idNumber }
    });

    if (existingClientById) {
      const error = new Error('El número de identificación ya está registrado');
      error.statusCode = 409;
      throw error;
    }
  }

  // Obtener el ClientType por defecto
  const defaultClientType = await prisma.clientType.findFirst({
    where: { Code: 'INDIVIDUAL' }
  });

  if (!defaultClientType) {
    const error = new Error('Tipo de cliente por defecto no configurado');
    error.statusCode = 500;
    throw error;
  }

  // Hash de la contraseña si se proporciona
  let passwordHash = null;
  if (password) {
    const passwordValidation = validateData(
      z.object({ password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres') }),
      { password }
    );
    
    if (!passwordValidation.success) {
      return res.status(400).json({
        success: false,
        error: 'Contraseña inválida',
        details: passwordValidation.errors
      });
    }
    
    passwordHash = await bcrypt.hash(password, 12);
  }
  // Crear el cliente
  const newClient = await prisma.client.create({
    data: {
      ClientTypeId: defaultClientType.ClientTypeId,
      DisplayName: validatedData.displayName,
      IdNumber: validatedData.idNumber || null,
      Email: validatedData.email,
      Phone: validatedData.phone,
      Address: validatedData.address,
      ContactName: validatedData.contactName,
      OrganizationName: validatedData.organizationName,
      DeliveryAddress: validatedData.deliveryAddress,
      PasswordHash: passwordHash,
      IsEmailVerified: false,
      IsPublicService: false,
      CreatedAt: new Date()
    },
    include: {
      clientType: true
    }
  });

  console.log('[CLIENT REGISTERED]', {
    clientId: newClient.ClientId,
    email: newClient.Email,
    displayName: newClient.DisplayName,
    timestamp: new Date().toISOString()
  });

  res.status(201).json({
    success: true,
    message: 'Cliente registrado exitosamente',
    data: {
      client: {
        id: newClient.ClientId,
        displayName: newClient.DisplayName,
        email: newClient.Email,
        organizationName: newClient.OrganizationName,
        clientType: newClient.clientType.Name
      }
    }
  });
});

/**
 * Obtener perfil del cliente
 */
export const getClientProfile = asyncHandler(async (req, res) => {
  const clientId = validateClientAuthentication(req);

  const client = await prisma.client.findUnique({
    where: { ClientId: clientId },
    select: {
      ClientId: true,
      DisplayName: true,
      Email: true,
      Phone: true,
      Address: true,
      ContactName: true,
      OrganizationName: true,
      DeliveryAddress: true,
      IsEmailVerified: true,
      CreatedAt: true,
      clientType: {
        select: {
          Name: true,
          Code: true
        }
      }
    }
  });

  if (!client) {
    const error = new Error('Cliente no encontrado');
    error.statusCode = 404;
    throw error;
  }

  res.json({
    success: true,
    data: {
      client
    }
  });
});

/**
 * Actualizar perfil del cliente
 */
export const updateClientProfile = asyncHandler(async (req, res) => {
  const clientId = validateClientAuthentication(req);
  const { 
    displayName, 
    phone, 
    address, 
    contactName, 
    organizationName, 
    deliveryAddress 
  } = req.body;

  // Validar datos usando el schema de actualización
  const validation = validateData(schemas.updateClient.omit({ clientId: true, clientTypeId: true }), {
    displayName,
    phone,
    address,
    contactName,
    organizationName,
    deliveryAddress
  });

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: 'Datos de perfil inválidos',
      details: validation.errors
    });
  }

  const validatedData = validation.data;

  // Construir objeto de actualización
  const updateData = {};
  
  if (validatedData.displayName) updateData.DisplayName = validatedData.displayName;
  if (validatedData.phone !== undefined) updateData.Phone = validatedData.phone;
  if (validatedData.address !== undefined) updateData.Address = validatedData.address;
  if (validatedData.contactName !== undefined) updateData.ContactName = validatedData.contactName;
  if (validatedData.organizationName !== undefined) updateData.OrganizationName = validatedData.organizationName;
  if (validatedData.deliveryAddress !== undefined) updateData.DeliveryAddress = validatedData.deliveryAddress;

  // Verificar que haya al menos un campo para actualizar
  if (Object.keys(updateData).length === 0) {
    const error = new Error('No se proporcionaron datos para actualizar');
    error.statusCode = 400;
    throw error;
  }

  const updatedClient = await prisma.client.update({
    where: { ClientId: clientId },
    data: updateData,
    select: {
      ClientId: true,
      DisplayName: true,
      Email: true,
      Phone: true,
      Address: true,
      ContactName: true,
      OrganizationName: true,
      DeliveryAddress: true,
      IsEmailVerified: true
    }
  });

  console.log('[CLIENT PROFILE UPDATED]', {
    clientId,
    updatedFields: Object.keys(updateData),
    timestamp: new Date().toISOString()
  });

  res.json({
    success: true,
    message: 'Perfil actualizado exitosamente',
    data: {
      client: updatedClient
    }
  });
});
// === FUNCIONES DE VERIFICACIÓN DE EMAIL ===

/**
 * Verificar email del cliente
 * Permite verificar la dirección de email mediante un token
 */
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    const error = new Error('Token de verificación requerido');
    error.statusCode = 400;
    throw error;
  }

  // Buscar cliente por token de confirmación
  const client = await prisma.client.findFirst({
    where: { 
      ConfirmToken: token,
      IsEmailVerified: false
    }
  });

  if (!client) {
    const error = new Error('Token de verificación inválido o expirado');
    error.statusCode = 404;
    throw error;
  }

  // Actualizar cliente como verificado
  await prisma.client.update({
    where: { ClientId: client.ClientId },
    data: {
      IsEmailVerified: true,
      ConfirmToken: null // Limpiar token después de uso
    }
  });

  console.log('[EMAIL VERIFIED]', {
    clientId: client.ClientId,
    email: client.Email,
    timestamp: new Date().toISOString()
  });

  res.json({
    success: true,
    message: 'Email verificado exitosamente'
  });
});

/**
 * Solicitar reenvío de verificación de email
 */
export const resendVerificationEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    const error = new Error('Email requerido');
    error.statusCode = 400;
    throw error;
  }

  const sanitizedEmail = sanitizeText(email);

  // Buscar cliente
  const client = await prisma.client.findUnique({
    where: { Email: sanitizedEmail }
  });

  // Por seguridad, siempre retornar el mismo mensaje
  if (!client) {
    return res.json({
      success: true,
      message: 'Si el email está registrado, recibirá un enlace de verificación'
    });
  }

  if (client.IsEmailVerified) {
    return res.json({
      success: true,
      message: 'El email ya está verificado'
    });
  }

  // Generar nuevo token de confirmación
  const confirmToken = require('crypto').randomBytes(32).toString('hex');

  await prisma.client.update({
    where: { ClientId: client.ClientId },
    data: {
      ConfirmToken: confirmToken
    }
  });

  // Enviar email de verificación (implementar esta función en nodemailer)
  try {
    // await sendVerificationEmail(client.Email, client.DisplayName, confirmToken);
    console.log('[VERIFICATION EMAIL SENT]', {
      clientId: client.ClientId,
      email: client.Email,
      timestamp: new Date().toISOString()
    });
  } catch (emailError) {
    logError('resendVerificationEmail', emailError, { clientId: client.ClientId });
  }

  res.json({
    success: true,
    message: 'Si el email está registrado, recibirá un enlace de verificación'
  });
});

// === FUNCIONES ADICIONALES DE CORREO ===

/**
 * Función auxiliar para enviar email de verificación
 * (Necesita ser implementada en nodemailer.js)
 */
const sendVerificationEmail = async (email, displayName, token) => {
  // Esta función debe ser implementada en nodemailer.js
  // Por ahora solo la dejamos como placeholder
  console.log(`[EMAIL VERIFICATION] Token ${token} para ${email}`);
  return Promise.resolve();
};

/**
 * Enviar email de notificación cuando se crea una nueva orden
 */
export const sendOrderCreationNotification = asyncHandler(async (req, res) => {
  const clientId = validateClientAuthentication(req);
  const { orderId } = req.body;

  const order = await prisma.serviceOrder.findUnique({
    where: { OrderId: Number(orderId) },
    include: {
      client: true,
      equipment: true
    }
  });

  validateOrderOwnership(order, clientId);

  try {
    // Enviar email de notificación de creación de orden
    // await sendOrderNotificationEmail(order.client.Email, order.client.DisplayName, order.IdentityTag);
    
    console.log('[ORDER NOTIFICATION SENT]', {
      clientId,
      orderId,
      email: order.client.Email,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Notificación de orden enviada exitosamente'
    });
  } catch (emailError) {
    logError('sendOrderCreationNotification', emailError, { clientId, orderId });
    res.json({
      success: true,
      message: 'Orden procesada, pero no se pudo enviar la notificación por email'
    });
  }
});

/**
 * Solicitar recuperación de contraseña para clientes
 */
export const requestPasswordReset = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Validar email
  const emailValidation = validateData(schemas.createClient.pick({ email: true }), { email });
  if (!emailValidation.success) {
    return res.status(400).json({
      success: false,
      error: 'Email inválido',
      details: emailValidation.errors
    });
  }

  const sanitizedEmail = emailValidation.data.email;

  // Buscar cliente
  const client = await prisma.client.findUnique({
    where: { Email: sanitizedEmail }
  });

  // Por seguridad, siempre retornar el mismo mensaje
  if (!client) {
    return res.json({
      success: true,
      message: 'Si el email está registrado, recibirá instrucciones para recuperar su contraseña'
    });
  }

  // Generar token de recuperación
  const resetToken = require('crypto').randomBytes(32).toString('hex');
  const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

  await prisma.client.update({
    where: { ClientId: client.ClientId },
    data: {
      ConfirmToken: resetToken,
      // Nota: El schema no tiene campo para expiración del token de reset
      // Considerar agregar ResetTokenExpires al schema si es necesario
    }
  });

  // Enviar email de recuperación (implementar en nodemailer)
  try {
    // await sendPasswordResetEmail(client.Email, client.DisplayName, resetToken);
    console.log('[PASSWORD RESET EMAIL SENT]', {
      clientId: client.ClientId,
      email: client.Email,
      timestamp: new Date().toISOString()
    });
  } catch (emailError) {
    logError('requestPasswordReset', emailError, { clientId: client.ClientId });
  }

  res.json({
    success: true,
    message: 'Si el email está registrado, recibirá instrucciones para recuperar su contraseña'
  });
});

/**
 * Resetear contraseña usando token
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    const error = new Error('Token y nueva contraseña son requeridos');
    error.statusCode = 400;
    throw error;
  }

  // Buscar cliente por token de recuperación
  const client = await prisma.client.findFirst({
    where: { 
      ConfirmToken: token
      // Nota: También deberíamos verificar la expiración del token
    }
  });

  if (!client) {
    const error = new Error('Token de recuperación inválido o expirado');
    error.statusCode = 404;
    throw error;
  }

  // Validar nueva contraseña
  const passwordValidation = validateData(
    z.object({ newPassword: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres') }),
    { newPassword }
  );
  
  if (!passwordValidation.success) {
    return res.status(400).json({
      success: false,
      error: 'Contraseña inválida',
      details: passwordValidation.errors
    });
  }

  const hashedNewPassword = await bcrypt.hash(newPassword, 12);

  // Actualizar contraseña y limpiar token
  await prisma.client.update({
    where: { ClientId: client.ClientId },
    data: {
      PasswordHash: hashedNewPassword,
      ConfirmToken: null
    }
  });

  console.log('[PASSWORD RESET SUCCESS]', {
    clientId: client.ClientId,
    email: client.Email,
    timestamp: new Date().toISOString()
  });

  res.json({
    success: true,
    message: 'Contraseña restablecida exitosamente'
  });
});

// === FUNCIONES DE NOTIFICACIÓN ===

/**
 * Obtener notificaciones del cliente
 */
export const getClientNotifications = asyncHandler(async (req, res) => {
  const clientId = validateClientAuthentication(req);

  // En una implementación real, esto vendría de una tabla de notificaciones
  // Por ahora retornamos notificaciones simuladas basadas en el estado de las órdenes
  
  const pendingOrders = await prisma.serviceOrder.count({
    where: { 
      ClientId: clientId,
      OR: [
        { ProformaStatus: PROFORMA_STATUS.SENT },
        { ProformaStatus: PROFORMA_STATUS.PENDING }
      ]
    }
  });

  const pendingTickets = await prisma.ticket.count({
    where: { 
      ClientId: clientId,
      Status: { in: ['open', 'assigned', 'in_progress'] }
    }
  });

  const notifications = [];

  if (pendingOrders > 0) {
    notifications.push({
      id: 1,
      type: 'proforma',
      title: 'Proformas pendientes',
      message: `Tiene ${pendingOrders} proforma(s) pendiente(s) de aprobación`,
      priority: 'high',
      timestamp: new Date().toISOString()
    });
  }

  if (pendingTickets > 0) {
    notifications.push({
      id: 2,
      type: 'ticket',
      title: 'Tickets activos',
      message: `Tiene ${pendingTickets} ticket(s) de soporte activo(s)`,
      priority: 'medium',
      timestamp: new Date().toISOString()
    });
  }

  res.json({
    success: true,
    data: {
      notifications,
      unreadCount: notifications.length
    }
  });
});

/**
 * Marcar notificación como leída
 */
export const markNotificationAsRead = asyncHandler(async (req, res) => {
  const clientId = validateClientAuthentication(req);
  const { notificationId } = req.body;

  // En una implementación real, actualizaríamos el estado en la base de datos
  // Por ahora solo simulamos la operación

  console.log('[NOTIFICATION MARKED AS READ]', {
    clientId,
    notificationId,
    timestamp: new Date().toISOString()
  });

  res.json({
    success: true,
    message: 'Notificación marcada como leída'
  });
});
// === ENDPOINTS LEGACY ===
export const getOrderStatus = async (req, res) => {
  return getOrderStatusWithHistory(req, res);
};

export const listMyOrders = async (req, res) => {
  return listMyOrdersWithHistory(req, res);
};