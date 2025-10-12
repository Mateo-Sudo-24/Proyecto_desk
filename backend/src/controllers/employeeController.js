// --- IMPORTACIONES ---
import {
  createOrUpdateClient, 
  registerEquipment,
  sendProformaToClient 
} from '../services/employeeService.js';
import { sendForgotPasswordRequest } from '../../config/nodemailer.js';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// --- CONSTANTES ---
const STATUS_CODES = {
  RECEIVED: 'RECIBIDO',
  DIAGNOSED: 'DIAGNOSTICADO',
  IN_PROGRESS: 'EN_PROGRESO',
  COMPLETED: 'COMPLETADO',
  DELIVERED: 'ENTREGADO',
  PROFORMA_SENT: 'PROFORMA_ENVIADA'
};

const PROFORMA_STATUS = {
  GENERATED: 'generada',
  SENT: 'enviada',
  APPROVED: 'aprobada',
  REJECTED: 'rechazada'
};

const ERROR_MESSAGES = {
  INTERNAL_ERROR: 'Ha ocurrido un error interno. Por favor, intente nuevamente.',
  INVALID_CREDENTIALS: 'Credenciales inválidas o usuario inactivo.',
  USER_NOT_FOUND: 'Usuario no encontrado.',
  ORDER_NOT_FOUND: 'Orden no encontrada.',
  STATUS_NOT_CONFIGURED: 'Estado del sistema no configurado correctamente.',
  INVALID_PROFORMA_STATUS: 'La proforma no está en el estado correcto para esta operación.',
  CLIENT_NO_EMAIL: 'El cliente no tiene un correo electrónico registrado.'
};

// --- UTILIDADES ---

/**
 * Logger centralizado para errores
 * @param {string} context - Contexto donde ocurrió el error
 * @param {Error} error - Error capturado
 * @param {object} metadata - Datos adicionales
 */
const logError = (context, error, metadata = {}) => {
  console.error(`[${context}] Error:`, {
    message: error.message,
    stack: error.stack,
    ...metadata,
    timestamp: new Date().toISOString()
  });
};

/**
 * Busca un estado por su código con caché en memoria
 * @param {string} statusCode - Código del estado
 * @returns {Promise<object>} Estado encontrado
 */
const statusCache = new Map();

const getStatusByCode = async (statusCode) => {
  if (statusCache.has(statusCode)) {
    return statusCache.get(statusCode);
  }

  const status = await prisma.status.findUnique({ 
    where: { Code: statusCode } 
  });
  
  if (!status) {
    throw new Error(`Estado "${statusCode}" no configurado en la base de datos.`);
  }

  statusCache.set(statusCode, status);
  return status;
};

/**
 * Valida que los campos requeridos estén presentes
 * @param {object} data - Datos a validar
 * @param {string[]} requiredFields - Campos requeridos
 * @throws {Error} Si falta algún campo
 */
const validateRequiredFields = (data, requiredFields) => {
  const missingFields = requiredFields.filter(field => {
    const value = data[field];
    return value === undefined || value === null || value === '';
  });

  if (missingFields.length > 0) {
    throw new Error(`Campos requeridos faltantes: ${missingFields.join(', ')}`);
  }
};

/**
 * Convierte un valor a número de forma segura
 * @param {any} value - Valor a convertir
 * @param {string} fieldName - Nombre del campo (para errores)
 * @returns {number} Número convertido
 */
const toNumber = (value, fieldName = 'field') => {
  const num = Number(value);
  if (isNaN(num)) {
    throw new Error(`${fieldName} debe ser un número válido`);
  }
  return num;
};

/**
 * Envuelve controladores async para manejar errores automáticamente
 * @param {Function} fn - Función controlador
 * @returns {Function} Controlador envuelto
 */
const asyncHandler = (fn) => {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      logError(fn.name, error, { 
        userId: req.session?.userId,
        body: req.body,
        params: req.params 
      });
      
      // No exponer detalles técnicos en producción
      const message = process.env.NODE_ENV === 'production' 
        ? ERROR_MESSAGES.INTERNAL_ERROR 
        : error.message;
      
      res.status(error.statusCode || 500).json({ 
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
    }
  };
};

// --- FUNCIÓN AUXILIAR MEJORADA ---

/**
 * Actualiza el estado de una orden y registra el cambio en el historial.
 * Usa transacciones para garantizar atomicidad.
 * 
 * @param {number} orderId - ID de la orden
 * @param {number} newStatusId - ID del nuevo estado
 * @param {string} notes - Notas sobre el cambio de estado
 * @param {number | null} userId - ID del usuario que realiza el cambio
 * @returns {Promise<object>} La orden actualizada
 */
async function updateOrderStatusAndHistory(orderId, newStatusId, notes, userId = null) {
  return await prisma.$transaction(async (tx) => {
    const updatedOrder = await tx.serviceOrder.update({
      where: { OrderId: orderId },
      data: { CurrentStatusId: newStatusId },
    });

    await tx.orderStatusHistory.create({
      data: {
        OrderId: orderId,
        StatusId: newStatusId,
        Notes: notes,
        ChangedByUserId: userId,
      },
    });

    return updatedOrder;
  });
}

// --- ROL: RECEPCIONISTA ---

/**
 * Crea un nuevo cliente o actualiza uno existente.
 * @route POST /api/receptionist/client
 */
export const receptionistCreateOrUpdateClient = asyncHandler(async (req, res) => {
  const { 
    clientId, clientTypeId, displayName, idNumber, email, 
    phone, address, contactName, isPublicService, 
    organizationName, deliveryAddress 
  } = req.body;

  // Validar campos requeridos
  const requiredFields = ['clientTypeId', 'displayName'];
  validateRequiredFields(req.body, requiredFields);

  const isNew = !clientId;
  
  const clientData = {
    clientId: isNew ? undefined : toNumber(clientId, 'clientId'),
    clientTypeId: toNumber(clientTypeId, 'clientTypeId'),
    displayName,
    idNumber,
    email,
    phone,
    address,
    contactName,
    isPublicService: Boolean(isPublicService),
    organizationName,
    deliveryAddress
  };

  const client = await createOrUpdateClient(clientData, isNew);

  res.status(isNew ? 201 : 200).json({ 
    success: true,
    message: `Cliente ${isNew ? 'creado' : 'actualizado'} con éxito.`, 
    data: { client } 
  });
});

/**
 * Registra un nuevo equipo asociado a un cliente.
 * @route POST /api/receptionist/equipment
 */
export const receptionistRegisterEquipment = asyncHandler(async (req, res) => {
  const { clientId, equipmentTypeId, brand, model, serialNumber, description } = req.body;

  validateRequiredFields(req.body, ['clientId', 'equipmentTypeId', 'brand', 'model']);

  const equipment = await registerEquipment({
    clientId: toNumber(clientId, 'clientId'),
    equipmentTypeId: toNumber(equipmentTypeId, 'equipmentTypeId'),
    brand,
    model,
    serialNumber,
    description
  });

  res.status(201).json({ 
    success: true,
    message: 'Equipo registrado con éxito.', 
    data: { equipment } 
  });
});

/**
 * Crea una orden de servicio con registro de entrada del equipo.
 * @route POST /api/receptionist/order
 */
export const receptionistCreateOrder = asyncHandler(async (req, res) => {
  const { clientId, equipmentId, notes, estimatedDeliveryDate, technicianId } = req.body;
  const receptionistId = req.session.userId;

  validateRequiredFields(req.body, ['clientId', 'equipmentId']);

  const receivedStatus = await getStatusByCode(STATUS_CODES.RECEIVED);

  // Usar transacción para garantizar atomicidad
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.serviceOrder.create({
      data: {
        ClientId: toNumber(clientId, 'clientId'),
        EquipmentId: toNumber(equipmentId, 'equipmentId'),
        ReceptionistId: receptionistId,
        TechnicianId: technicianId ? toNumber(technicianId, 'technicianId') : null,
        IdentityTag: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        CurrentStatusId: receivedStatus.StatusId,
        Notes: notes || '',
        EstimatedDeliveryDate: estimatedDeliveryDate ? new Date(estimatedDeliveryDate) : null,
      }
    });

    await tx.equipmentEntry.create({
      data: {
        OrderId: order.OrderId,
        ReceivedByUserId: receptionistId,
        Notes: `Equipo recibido para la orden ${order.IdentityTag}.`
      }
    });

    await tx.orderStatusHistory.create({
      data: {
        OrderId: order.OrderId,
        StatusId: receivedStatus.StatusId,
        Notes: 'Orden creada y equipo recibido.',
        ChangedByUserId: receptionistId,
      }
    });

    return order;
  });

  res.status(201).json({ 
    success: true,
    message: 'Orden y entrada de equipo registradas con éxito.', 
    data: { order: result } 
  });
});

/**
 * Registra la salida de un equipo y actualiza el estado a entregado.
 * @route POST /api/receptionist/equipment-exit
 */
export const receptionistRegisterEquipmentExit = asyncHandler(async (req, res) => {
  const { orderId, notes, receivedByClientName } = req.body;
  const userId = req.session.userId;

  validateRequiredFields(req.body, ['orderId', 'receivedByClientName']);

  const deliveredStatus = await getStatusByCode(STATUS_CODES.DELIVERED);
  const orderIdNum = toNumber(orderId, 'orderId');

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.serviceOrder.update({
      where: { OrderId: orderIdNum },
      data: { CurrentStatusId: deliveredStatus.StatusId },
    });

    await tx.equipmentExit.create({
      data: {
        OrderId: order.OrderId,
        DeliveredByUserId: userId,
        ReceivedByClientName: receivedByClientName,
        Notes: notes ? `${notes}` : `Equipo entregado para la orden ${order.IdentityTag}.`
      }
    });

    await tx.orderStatusHistory.create({
      data: {
        OrderId: order.OrderId,
        StatusId: deliveredStatus.StatusId,
        Notes: 'Equipo entregado al cliente.',
        ChangedByUserId: userId,
      }
    });

    return order;
  });

  // TODO: Implementar envío de notificación al cliente
  // await sendDeliveryNotification(result);

  res.json({ 
    success: true,
    message: 'Salida de equipo registrada y orden actualizada.', 
    data: { order: result } 
  });
});

// --- ROL: STAFF TÉCNICO ---

/**
 * Lista las órdenes asignadas al técnico autenticado.
 * @route GET /api/technician/orders
 */
export const techListAssignedOrders = asyncHandler(async (req, res) => {
  const userId = req.session.userId;

  const orders = await prisma.serviceOrder.findMany({
    where: { TechnicianId: userId },
    include: {
      client: {
        select: {
          ClientId: true,
          DisplayName: true,
          Email: true,
          Phone: true
        }
      },
      equipment: { 
        include: { 
          equipmentType: {
            select: {
              EquipmentTypeId: true,
              TypeName: true
            }
          } 
        } 
      },
      status: {
        select: {
          StatusId: true,
          StatusName: true,
          Code: true
        }
      }
    },
    orderBy: { IntakeDate: 'asc' },
  });

  res.json({ 
    success: true,
    data: { orders, count: orders.length } 
  });
});

/**
 * Agrega un diagnóstico a una orden y actualiza su estado.
 * @route POST /api/technician/diagnosis
 */
export const techSetDiagnosis = asyncHandler(async (req, res) => {
  const { orderId, diagnosis } = req.body;
  const userId = req.session.userId;

  validateRequiredFields(req.body, ['orderId', 'diagnosis']);

  const diagnosisStatus = await getStatusByCode(STATUS_CODES.DIAGNOSED);
  const orderIdNum = toNumber(orderId, 'orderId');

  const result = await prisma.$transaction(async (tx) => {
    await tx.serviceOrder.update({
      where: { OrderId: orderIdNum },
      data: { Diagnosis: diagnosis }
    });
    
    return await tx.serviceOrder.update({
      where: { OrderId: orderIdNum },
      data: { CurrentStatusId: diagnosisStatus.StatusId },
    });
  });

  await updateOrderStatusAndHistory(
    orderIdNum, 
    diagnosisStatus.StatusId, 
    'Diagnóstico técnico completado.', 
    userId
  );

  res.json({ 
    success: true,
    message: 'Diagnóstico agregado y estado actualizado.', 
    data: { order: result } 
  });
});

/**
 * Marca el inicio del servicio técnico.
 * @route POST /api/technician/start-service
 */
export const techStartService = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  const userId = req.session.userId;

  validateRequiredFields(req.body, ['orderId']);

  const inProgressStatus = await getStatusByCode(STATUS_CODES.IN_PROGRESS);
  const orderIdNum = toNumber(orderId, 'orderId');

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.serviceOrder.update({
      where: { OrderId: orderIdNum },
      data: { 
        ServiceStartDate: new Date(),
        CurrentStatusId: inProgressStatus.StatusId 
      }
    });

    await tx.orderStatusHistory.create({
      data: {
        OrderId: orderIdNum,
        StatusId: inProgressStatus.StatusId,
        Notes: 'El servicio técnico ha comenzado.',
        ChangedByUserId: userId,
      }
    });

    return order;
  });

  res.json({ 
    success: true,
    message: 'Servicio iniciado.', 
    data: { order: result } 
  });
});

/**
 * Marca el final del servicio técnico.
 * @route POST /api/technician/end-service
 */
export const techEndService = asyncHandler(async (req, res) => {
  const { orderId, finalNotes } = req.body;
  const userId = req.session.userId;

  validateRequiredFields(req.body, ['orderId']);

  const completedStatus = await getStatusByCode(STATUS_CODES.COMPLETED);
  const orderIdNum = toNumber(orderId, 'orderId');

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.serviceOrder.update({
      where: { OrderId: orderIdNum },
      data: {
        ServiceEndDate: new Date(),
        Notes: finalNotes || '',
        CurrentStatusId: completedStatus.StatusId
      }
    });

    await tx.orderStatusHistory.create({
      data: {
        OrderId: orderIdNum,
        StatusId: completedStatus.StatusId,
        Notes: 'Servicio técnico finalizado.',
        ChangedByUserId: userId,
      }
    });

    return order;
  });

  res.json({ 
    success: true,
    message: 'Servicio finalizado.', 
    data: { order: result } 
  });
});

// --- ROL: STAFF VENTAS ---

/**
 * Lista todas las órdenes con información completa.
 * @route GET /api/sales/orders
 */
export const salesListOrders = asyncHandler(async (req, res) => {
  const { status, startDate, endDate, clientId } = req.query;

  // Construir filtros dinámicos
  const where = {};
  if (status) where.CurrentStatusId = toNumber(status, 'status');
  if (clientId) where.ClientId = toNumber(clientId, 'clientId');
  if (startDate || endDate) {
    where.IntakeDate = {};
    if (startDate) where.IntakeDate.gte = new Date(startDate);
    if (endDate) where.IntakeDate.lte = new Date(endDate);
  }

  const orders = await prisma.serviceOrder.findMany({
    where,
    include: {
      client: {
        select: {
          ClientId: true,
          DisplayName: true,
          Email: true,
          Phone: true
        }
      },
      equipment: { 
        include: { 
          equipmentType: {
            select: {
              EquipmentTypeId: true,
              TypeName: true
            }
          } 
        } 
      },
      status: {
        select: {
          StatusId: true,
          StatusName: true,
          Code: true
        }
      },
      technician: { 
        select: { 
          UserId: true,
          Username: true,
          Email: true
        } 
      },
    },
    orderBy: { IntakeDate: 'desc' },
  });

  res.json({ 
    success: true,
    data: { orders, count: orders.length } 
  });
});

/**
 * Genera proforma agregando repuestos y precio.
 * @route POST /api/sales/generate-proforma
 */
export const salesAddPartsAndPrice = asyncHandler(async (req, res) => {
  const { orderId, parts, totalPrice } = req.body;

  validateRequiredFields(req.body, ['orderId', 'parts', 'totalPrice']);

  const orderIdNum = toNumber(orderId, 'orderId');
  const price = parseFloat(totalPrice);

  if (isNaN(price) || price < 0) {
    throw new Error('El precio total debe ser un número positivo');
  }

  const order = await prisma.serviceOrder.update({
    where: { OrderId: orderIdNum },
    data: {
      Parts: parts,
      TotalPrice: price,
      ProformaStatus: PROFORMA_STATUS.GENERATED,
    }
  });

  res.json({ 
    success: true,
    message: 'Proforma generada con repuestos y precio.', 
    data: { order } 
  });
});

/**
 * Envía la proforma al cliente por correo electrónico.
 * @route POST /api/sales/send-proforma
 */
export const salesSendProforma = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  const userId = req.session.userId;

  validateRequiredFields(req.body, ['orderId']);

  const orderIdNum = toNumber(orderId, 'orderId');

  const order = await prisma.serviceOrder.findUnique({
    where: { OrderId: orderIdNum },
    include: { 
      client: {
        select: {
          ClientId: true,
          DisplayName: true,
          Email: true
        }
      } 
    }
  });

  if (!order) {
    const error = new Error(ERROR_MESSAGES.ORDER_NOT_FOUND);
    error.statusCode = 404;
    throw error;
  }

  if (!order.client?.Email) {
    const error = new Error(ERROR_MESSAGES.CLIENT_NO_EMAIL);
    error.statusCode = 400;
    throw error;
  }

  if (order.ProformaStatus !== PROFORMA_STATUS.GENERATED) {
    const error = new Error(ERROR_MESSAGES.INVALID_PROFORMA_STATUS);
    error.statusCode = 400;
    throw error;
  }

  // Enviar correo con la proforma
  await sendProformaToClient(
    order.OrderId,
    order.client.Email,
    order.client.DisplayName,
    order.IdentityTag,
    order.Parts,
    order.TotalPrice // Float ya es número, no necesita toNumber()
  );

  // Actualizar estado en transacción
  const proformaSentStatus = await getStatusByCode(STATUS_CODES.PROFORMA_SENT);

  await prisma.$transaction(async (tx) => {
    await tx.serviceOrder.update({
      where: { OrderId: order.OrderId },
      data: {
        ProformaStatus: PROFORMA_STATUS.SENT,
        ProformaSentDate: new Date(),
        CurrentStatusId: proformaSentStatus.StatusId
      }
    });

    await tx.orderStatusHistory.create({
      data: {
        OrderId: order.OrderId,
        StatusId: proformaSentStatus.StatusId,
        Notes: 'Proforma enviada al cliente para aprobación.',
        ChangedByUserId: userId,
      }
    });
  });

  res.json({ 
    success: true,
    message: 'Proforma enviada al cliente con éxito.' 
  });
});

// --- AUTENTICACIÓN ---

/**
 * Autentica un empleado en el sistema.
 * @route POST /api/auth/login
 */
export const employeeLogin = asyncHandler(async (req, res) => {
  const { workId, password } = req.body;

  validateRequiredFields(req.body, ['workId', 'password']);

  const user = await prisma.user.findUnique({
    where: { Username: workId },
    include: { 
      userRoles: { 
        include: { 
          role: {
            select: {
              RoleId: true,
              Name: true
            }
          } 
        } 
      } 
    }
  });

  if (!user || !user.Active) {
    // Delay para prevenir timing attacks
    await new Promise(resolve => setTimeout(resolve, 1000));
    const error = new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
    error.statusCode = 401;
    throw error;
  }

  const valid = await bcrypt.compare(password, user.PasswordHash.toString());

  if (!valid) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const error = new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
    error.statusCode = 401;
    throw error;
  }

  // Configurar sesión
  req.session.userId = user.UserId;
  req.session.username = user.Username;
  req.session.roles = user.userRoles.map(ur => ur.role.Name);

  res.json({ 
    success: true,
    message: 'Autenticación exitosa', 
    data: { 
      user: { 
        id: user.UserId, 
        workId: user.Username, 
        email: user.Email,
        roles: req.session.roles 
      } 
    } 
  });
});

/**
 * Cambia la contraseña del usuario autenticado.
 * @route POST /api/auth/change-password
 */
export const employeeChangePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.session.userId;

  validateRequiredFields(req.body, ['oldPassword', 'newPassword']);

  if (newPassword.length < 8) {
    throw new Error('La nueva contraseña debe tener al menos 8 caracteres');
  }

  const user = await prisma.user.findUnique({ 
    where: { UserId: userId } 
  });

  if (!user) {
    const error = new Error(ERROR_MESSAGES.USER_NOT_FOUND);
    error.statusCode = 404;
    throw error;
  }

  const valid = await bcrypt.compare(oldPassword, user.PasswordHash.toString());

  if (!valid) {
    const error = new Error('Contraseña actual incorrecta');
    error.statusCode = 401;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { UserId: userId },
    data: { PasswordHash: hashedPassword }
  });

  res.json({ 
    success: true,
    message: 'Contraseña actualizada con éxito' 
  });
});

/**
 * Solicita restablecimiento de contraseña al administrador.
 * @route POST /api/auth/forgot-password
 */
export const employeeForgotPassword = asyncHandler(async (req, res) => {
  const { workId } = req.body;

  validateRequiredFields(req.body, ['workId']);

  const user = await prisma.user.findUnique({ 
    where: { Username: workId },
    select: {
      UserId: true,
      Username: true,
      Email: true
    }
  });

  // Por seguridad, siempre devolver el mismo mensaje
  // incluso si el usuario no existe
  if (user) {
    const adminMail = process.env.IT_ADMIN_EMAIL || 'it-admin@ecuatechnology.com';
    await sendForgotPasswordRequest(adminMail, user.Username, user.Email);
  }

  res.json({ 
    success: true,
    message: 'Si el usuario existe, se ha enviado una solicitud al administrador.' 
  });
});

/**
 * Cierra la sesión del usuario.
 * @route POST /api/auth/logout
 */
export const employeeLogout = asyncHandler(async (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      logError('employeeLogout', err);
      throw new Error('Error al cerrar sesión');
    }
    res.json({ 
      success: true,
      message: 'Sesión cerrada exitosamente' 
    });
  });
});