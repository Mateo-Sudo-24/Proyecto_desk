// --- IMPORTACIONES ---
import {
  createOrUpdateClient, 
  registerEquipment,
  sendProformaToClient } from '../services/employeeService.js';
import { sendForgotPasswordRequest } from '../../config/nodemailer.js';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// --- FUNCIÓN AUXILIAR ---
/**
 * Centraliza la actualización del estado de una orden y registra el cambio en el historial.
 * @param {number} orderId - ID de la orden.
 * @param {number} newStatusId - ID del nuevo estado.
 * @param {string} notes - Notas sobre el cambio de estado.
 * @param {number | null} userId - ID del usuario que realiza el cambio.
 * @returns {Promise<object>} La orden actualizada.
 */
async function updateOrderStatusAndHistory(orderId, newStatusId, notes, userId = null) {
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
        ChangedByUserId: userId,
      },
    });
    return updatedOrder;
  } catch (error) {
    console.error(`Error actualizando el estado de la orden ${orderId}:`, error);
    throw new Error(`Fallo al actualizar el estado de la orden y su historial.`);
  }
}

// --- ROL: RECEPCIONISTA ---
/**
 * Crea un nuevo cliente o actualiza uno existente.
 * Utiliza los campos del nuevo schema como IsPublicService y OrganizationName.
 */
export const receptionistCreateOrUpdateClient = async (req, res) => {
  const { clientId, clientTypeId, displayName, idNumber, email, phone, address, contactName, isPublicService, organizationName, deliveryAddress } = req.body;
  try {
    const isNew = !clientId;
    const client = await createOrUpdateClient({
      clientId: isNew ? undefined : Number(clientId),
      clientTypeId: Number(clientTypeId),
      displayName, idNumber, email, phone, address, contactName,
      isPublicService: Boolean(isPublicService),
      organizationName, deliveryAddress
    }, isNew);
    res.status(201).json({ message: `Cliente ${isNew ? 'creado' : 'actualizado'} con éxito.`, client });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Registra un nuevo equipo asociado a un cliente.
 */
export const receptionistRegisterEquipment = async (req, res) => {
  const { clientId, equipmentTypeId, brand, model, serialNumber, description } = req.body;
  try {
    const equipment = await registerEquipment({
      clientId: Number(clientId),
      equipmentTypeId: Number(equipmentTypeId),
      brand, model, serialNumber, description
    });
    res.status(201).json({ message: 'Equipo registrado con éxito.', equipment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Crea una orden de servicio, la vincula a un equipo y registra su entrada.
 */
export const receptionistCreateOrder = async (req, res) => {
  const { clientId, equipmentId, notes, estimatedDeliveryDate, technicianId } = req.body;
  const receptionistId = req.session.userId;
  try {
    const receivedStatus = await prisma.status.findUnique({ where: { Code: 'RECIBIDO' } });
    if (!receivedStatus) {
      return res.status(500).json({ error: 'Estado "RECIBIDO" no configurado en la base de datos.' });
    }

    const order = await prisma.serviceOrder.create({
      data: {
        ClientId: Number(clientId),
        EquipmentId: Number(equipmentId),
        ReceptionistId: receptionistId,
        TechnicianId: technicianId ? Number(technicianId) : null,
        IdentityTag: `ORD-${Date.now()}`,
        CurrentStatusId: receivedStatus.StatusId,
        Notes: notes,
        EstimatedDeliveryDate: estimatedDeliveryDate ? new Date(estimatedDeliveryDate) : null,
      }
    });

    // Registra la entrada física del equipo en el modelo EquipmentEntry
    await prisma.equipmentEntry.create({
      data: {
        OrderId: order.OrderId,
        ReceivedByUserId: receptionistId,
        Notes: `Equipo recibido para la orden ${order.IdentityTag}.`
      }
    });

    // Registra el primer estado en el historial
    await updateOrderStatusAndHistory(order.OrderId, receivedStatus.StatusId, 'Orden creada y equipo recibido.', receptionistId);

    res.status(201).json({ message: 'Orden y entrada de equipo registradas con éxito.', order });
  } catch (error) {
    res.status(500).json({ error: `Error al crear la orden: ${error.message}` });
  }
};

/**
 * Registra la salida de un equipo, actualiza el estado y notifica al cliente.
 */
export const receptionistRegisterEquipmentExit = async (req, res) => {
  const { orderId, notes, receivedByClientName } = req.body;
  const userId = req.session.userId;
  try {
    const deliveredStatus = await prisma.status.findUnique({ where: { Code: 'ENTREGADO' } });
    if (!deliveredStatus) {
      return res.status(500).json({ error: 'Estado "ENTREGADO" no configurado.' });
    }

    // Actualiza el estado de la orden a "ENTREGADO" y registra en el historial
    const order = await updateOrderStatusAndHistory(Number(orderId), deliveredStatus.StatusId, 'Equipo entregado al cliente.', userId);

    // Registra la salida física en el modelo EquipmentExit
    await prisma.equipmentExit.create({
      data: {
        OrderId: order.OrderId,
        DeliveredByUserId: userId,
        ReceivedByClientName: receivedByClientName,
        Notes: `Equipo entregado para la orden ${order.IdentityTag}. ${notes || ''}`
      }
    });
    
    // Aquí puedes agregar el envío de un correo de notificación al cliente (opcional)

    res.json({ message: 'Salida de equipo registrada y orden actualizada.', order });
  } catch (error) {
    res.status(500).json({ error: `Error al registrar la salida del equipo: ${error.message}` });
  }
};

// --- ROL: STAFF TÉCNICO ---

/**
 * Lista las órdenes asignadas al técnico autenticado.
 */
export const techListAssignedOrders = async (req, res) => {
  const userId = req.session.userId;
  try {
    const orders = await prisma.serviceOrder.findMany({
      where: { TechnicianId: userId },
      include: {
        client: true,
        equipment: { include: { equipmentType: true } },
        status: true
      },
      orderBy: { IntakeDate: 'asc' },
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar órdenes asignadas.' });
  }
};

/**
 * Agrega un diagnóstico a una orden y actualiza su estado a "DIAGNOSTICADO".
 */
export const techSetDiagnosis = async (req, res) => {
  const { orderId, diagnosis } = req.body;
  const userId = req.session.userId;
  try {
    const diagnosisStatus = await prisma.status.findUnique({ where: { Code: 'DIAGNOSTICADO' } });
    if (!diagnosisStatus) {
      return res.status(500).json({ error: 'Estado "DIAGNOSTICADO" no configurado.' });
    }

    // Actualiza el diagnóstico en la orden
    await prisma.serviceOrder.update({
      where: { OrderId: Number(orderId) },
      data: { Diagnosis: diagnosis }
    });
    
    // Actualiza el estado y el historial
    const order = await updateOrderStatusAndHistory(orderId, diagnosisStatus.StatusId, 'Diagnóstico técnico completado.', userId);
    
    res.json({ message: 'Diagnóstico agregado y estado actualizado.', order });
  } catch (error) {
    res.status(500).json({ error: `Error al agregar diagnóstico: ${error.message}` });
  }
};

/**
 * Marca el inicio del servicio, actualizando el estado a "EN_PROGRESO".
 */
export const techStartService = async (req, res) => {
  const { orderId } = req.body;
  const userId = req.session.userId;
  try {
    const inProgressStatus = await prisma.status.findUnique({ where: { Code: 'EN_PROGRESO' } });
    if (!inProgressStatus) {
      return res.status(500).json({ error: 'Estado "EN_PROGRESO" no configurado.' });
    }

    // Actualiza la fecha de inicio del servicio
    await prisma.serviceOrder.update({
      where: { OrderId: Number(orderId) },
      data: { ServiceStartDate: new Date() }
    });

    const order = await updateOrderStatusAndHistory(orderId, inProgressStatus.StatusId, 'El servicio técnico ha comenzado.', userId);

    res.json({ message: 'Servicio iniciado.', order });
  } catch (error) {
    res.status(500).json({ error: `Error al iniciar el servicio: ${error.message}` });
  }
};

/**
 * Marca el final del servicio, actualizando el estado a "COMPLETADO".
 */
export const techEndService = async (req, res) => {
  const { orderId, finalNotes } = req.body;
  const userId = req.session.userId;
  try {
    const completedStatus = await prisma.status.findUnique({ where: { Code: 'COMPLETADO' } });
    if (!completedStatus) {
      return res.status(500).json({ error: 'Estado "COMPLETADO" no configurado.' });
    }

    // Actualiza la fecha de fin del servicio y las notas finales
    await prisma.serviceOrder.update({
      where: { OrderId: Number(orderId) },
      data: {
        ServiceEndDate: new Date(),
        Notes: finalNotes,
      }
    });

    const order = await updateOrderStatusAndHistory(orderId, completedStatus.StatusId, 'Servicio técnico finalizado.', userId);

    res.json({ message: 'Servicio finalizado.', order });
  } catch (error) {
    res.status(500).json({ error: `Error al finalizar el servicio: ${error.message}` });
  }
};

// --- ROL: STAFF VENTAS ---
/**
 * Lista todas las órdenes, ideal para la vista de ventas.
 */
export const salesListOrders = async (req, res) => {
  try {
    const orders = await prisma.serviceOrder.findMany({
      include: {
        client: true,
        equipment: { include: { equipmentType: true } },
        status: true,
        technician: { select: { Username: true } },
      },
      orderBy: { IntakeDate: 'desc' },
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar órdenes para ventas.' });
  }
};

/**
 * Agrega repuestos y precio a la orden para generar la proforma.
 */
export const salesAddPartsAndPrice = async (req, res) => {
  const { orderId, parts, totalPrice } = req.body;
  try {
    const order = await prisma.serviceOrder.update({
      where: { OrderId: Number(orderId) },
      data: {
        Parts: parts,
        TotalPrice: parseFloat(totalPrice),
        ProformaStatus: 'generada', // La proforma está lista para ser enviada
      }
    });
    res.json({ message: 'Proforma generada con repuestos y precio.', order });
  } catch (error) {
    res.status(500).json({ error: `Error al agregar repuestos y precio: ${error.message}` });
  }
};

/**
 * Envía la proforma al cliente por correo y actualiza el estado de la orden.
 */
export const salesSendProforma = async (req, res) => {
  const { orderId } = req.body;
  const userId = req.session.userId;
  try {
    const order = await prisma.serviceOrder.findUnique({
      where: { OrderId: Number(orderId) },
      include: { client: true }
    });

    if (!order) return res.status(404).json({ error: 'Orden no encontrada.' });
    if (!order.client?.Email) return res.status(400).json({ error: 'El cliente no tiene un correo electrónico registrado.' });
    if (order.ProformaStatus !== 'generada') {
      return res.status(400).json({ error: 'La proforma no ha sido generada o ya fue procesada.' });
    }

    // Llama al servicio para enviar el correo
    await sendProformaToClient(
      order.OrderId,
      order.client.Email,
      order.client.DisplayName,
      order.IdentityTag,
      order.Parts,
      order.TotalPrice.toNumber() // Convertir de Decimal a número
    );

    // Actualiza el estado de la proforma y la fecha de envío
    await prisma.serviceOrder.update({
      where: { OrderId: order.OrderId },
      data: {
        ProformaStatus: 'enviada',
        ProformaSentDate: new Date(),
      }
    });

    // Actualiza el estado general de la orden
    const proformaSentStatus = await prisma.status.findUnique({ where: { Code: 'PROFORMA_ENVIADA' } });
    if (!proformaSentStatus) throw new Error('Estado "PROFORMA_ENVIADA" no configurado.');
    
    await updateOrderStatusAndHistory(order.OrderId, proformaSentStatus.StatusId, 'Proforma enviada al cliente para aprobación.', userId);
    
    res.json({ message: 'Proforma enviada al cliente con éxito.' });
  } catch (error) {
    res.status(500).json({ error: `Error al enviar la proforma: ${error.message}` });
  }
};

// --- LOGIN Y AUTENTICACIÓN ---

export const employeeLogin = async (req, res) => {
  const { workId, password } = req.body;
  try {
    const user = await prisma.user.findUnique({
      where: { Username: workId },
      include: { userRoles: { include: { role: true } } }
    });
    if (!user || !user.Active) {
      return res.status(401).json({ error: 'Credenciales inválidas o usuario inactivo' });
    }
    const valid = await bcrypt.compare(password, user.PasswordHash.toString());
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    req.session.userId = user.UserId;
    req.session.username = user.Username; // Guardar también el username para logs
    req.session.roles = user.userRoles.map(ur => ur.role.Name);
    res.json({ message: 'Autenticado', user: { id: user.UserId, workId: user.Username, roles: req.session.roles } });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor durante el login.' });
  }
};

export const employeeChangePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.session.userId;
  try {
    const user = await prisma.user.findUnique({ where: { UserId: userId } });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const valid = await bcrypt.compare(oldPassword, Buffer.from(user.PasswordHash).toString());
    if (!valid) return res.status(401).json({ error: 'Contraseña actual incorrecta' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { UserId: userId },
      data: { PasswordHash: hashed }
    });

    res.json({ message: 'Contraseña actualizada con éxito' });
  } catch (error) {
    res.status(500).json({ error: 'Error al cambiar contraseña' });
  }
};

export const employeeForgotPassword = async (req, res) => {
  const { workId } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { Username: workId } });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const adminMail = process.env.IT_ADMIN_EMAIL || 'it-admin@ecuatechnology.com';
    await sendForgotPasswordRequest(adminMail, user.Username, user.Email);
    res.json({ message: 'Solicitud enviada al administrador. Pronto recibirá instrucciones.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al solicitar restablecimiento' });
  }
};