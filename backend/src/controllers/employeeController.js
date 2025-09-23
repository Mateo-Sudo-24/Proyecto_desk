// ===============================
// --- FORGOT PASSWORD (solicitud de restablecimiento) ---
// ===============================
import { sendForgotPasswordRequest } from '../../config/nodemailer.js';

// Endpoint para que un empleado solicite restablecimiento de contraseña
export const employeeForgotPassword = async (req, res) => {
  const { workId } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { Username: workId } });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    // Aquí puedes poner el correo del admin IT o sacarlo de env vars
    const adminMail = process.env.IT_ADMIN_EMAIL || 'it-admin@ecuatechnology.com';
    await sendForgotPasswordRequest(adminMail, user.Username, user.Email);
    res.json({ message: 'Solicitud enviada al administrador. Pronto recibirá instrucciones.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al solicitar restablecimiento' });
  }
};
// ===============================
// IMPORTACIONES
// ===============================
import { generateAndSendOTP, createEmployee } from '../services/employeeService.js';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
const prisma = new PrismaClient();


// ===============================
// --- RECEPCIONISTA ---
// ===============================

// Crear orden de servicio (solo recepcionista)
export const receptionistCreateOrder = async (req, res) => {
  const { clientId, equipmentId, notes, estimatedDeliveryDate, staffId } = req.body;
  try {
    const order = await prisma.serviceOrder.create({
      data: {
        ClientId: clientId,
        ReceptionistId: req.session.userId,
        TechnicianId: staffId || null,
        IntakeDate: new Date(),
        IdentityTag: `ORD-${Date.now()}`,
        CurrentStatusId: 1, // 1 = recibido
        Notes: notes,
        EstimatedDeliveryDate: estimatedDeliveryDate ? new Date(estimatedDeliveryDate) : null
      }
    });
    res.status(201).json({ message: 'Orden creada', order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear la orden' });
  }
};


// ===============================
// --- STAFF TÉCNICO ---
// ===============================
export const techListAssignedOrders = async (req, res) => {
  const userId = req.session.userId;
  try {
    const orders = await prisma.serviceOrder.findMany({
      where: { TechnicianId: userId },
      include: { client: true, status: true }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar órdenes asignadas' });
  }
};

export const techSetDiagnosis = async (req, res) => {
  const { orderId, diagnosis } = req.body;
  try {
    const order = await prisma.serviceOrder.update({
      where: { OrderId: orderId },
      data: { Diagnosis: diagnosis }
    });
    res.json({ message: 'Diagnóstico agregado', order });
  } catch (error) {
    res.status(500).json({ error: 'Error al agregar diagnóstico' });
  }
};


// ===============================
// --- STAFF VENTAS ---
// ===============================
export const salesListOrders = async (req, res) => {
  try {
    const orders = await prisma.serviceOrder.findMany({
      include: { client: true, status: true }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar órdenes para ventas' });
  }
};

export const salesApproveProforma = async (req, res) => {
  const { orderId, approved } = req.body;
  try {
    const order = await prisma.serviceOrder.update({
      where: { OrderId: orderId },
      data: { ProformaStatus: approved ? 'aprobada' : 'rechazada' }
    });
    res.json({ message: 'Proforma procesada', order });
  } catch (error) {
    res.status(500).json({ error: 'Error al procesar proforma' });
  }
};

export const salesAddPartsAndPrice = async (req, res) => {
  const { orderId, parts, price } = req.body;
  try {
    const order = await prisma.serviceOrder.update({
      where: { OrderId: orderId },
      data: { Parts: parts, TotalPrice: price }
    });
    res.json({ message: 'Repuestos y precio agregados', order });
  } catch (error) {
    res.status(500).json({ error: 'Error al agregar repuestos/precio' });
  }
};

export const salesListClients = async (req, res) => {
  try {
    const clients = await prisma.client.findMany();
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar clientes' });
  }
};


// ===============================
// --- GERENTE ---
// ===============================
export const managerListOrders = async (req, res) => {
  try {
    const orders = await prisma.serviceOrder.findMany({
      select: {
        OrderId: true,
        client: { select: { DisplayName: true } },
        receptionist: { select: { userRoles: { select: { role: { select: { Name: true } } } } } }
      }
    });
    const result = orders.map(o => ({
      orderId: o.OrderId,
      clientName: o.client?.DisplayName,
      receptionistRole: o.receptionist?.userRoles?.[0]?.role?.Name || null
    }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar órdenes' });
  }
};

export const managerUpdateOrder = async (req, res) => {
  const { orderId, statusId, notes, estimatedDeliveryDate } = req.body;
  try {
    const order = await prisma.serviceOrder.update({
      where: { OrderId: Number(orderId) },
      data: {
        CurrentStatusId: statusId,
        Notes: notes,
        EstimatedDeliveryDate: estimatedDeliveryDate ? new Date(estimatedDeliveryDate) : undefined
      },
      select: {
        OrderId: true,
        client: { select: { DisplayName: true } },
        receptionist: { select: { userRoles: { select: { role: { select: { Name: true } } } } } }
      }
    });
    res.json({ message: 'Orden actualizada', order });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar la orden' });
  }
};


// ===============================
// --- ENTRADA/SALIDA DE EQUIPOS ---
// ===============================
export const registerEquipmentEntry = async (req, res) => {
  const { clientId, equipmentId, notes } = req.body;
  try {
    const order = await prisma.serviceOrder.create({
      data: {
        ClientId: clientId,
        ReceptionistId: req.session.userId,
        IntakeDate: new Date(),
        IdentityTag: `ENT-${Date.now()}`,
        CurrentStatusId: 1,
        Notes: notes
      }
    });
    res.status(201).json({ message: 'Entrada de equipo registrada', order });
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar entrada de equipo' });
  }
};

export const registerEquipmentExit = async (req, res) => {
  const { orderId, notes } = req.body;
  try {
    const order = await prisma.serviceOrder.update({
      where: { OrderId: orderId },
      data: {
        CurrentStatusId: 2, // 2 = entregado
        Notes: notes
      }
    });
    res.json({ message: 'Salida de equipo registrada', order });
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar salida de equipo' });
  }
};


// ===============================
// --- LOGIN Y AUTENTICACIÓN ---
// ===============================

// Enviar OTP (login 2FA)
export const receptionistSendOTP = async (req, res) => {
  const userId = req.session.userId;
  try {
    const user = await prisma.user.findUnique({ where: { UserId: userId } });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const otp = await generateAndSendOTP(userId, user.Email);
    res.json({ message: 'OTP enviado', otp });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al enviar OTP' });
  }
};

// Login general para cualquier empleado
export const employeeLogin = async (req, res) => {
  const { workId, password } = req.body;
  const user = await prisma.user.findUnique({
    where: { Username: workId },
    include: { userRoles: { include: { role: true } } }
  });
  if (!user || !user.Active) return res.status(401).json({ error: 'Credenciales inválidas o usuario inactivo' });
  const valid = await bcrypt.compare(password, user.PasswordHash.toString());
  if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });
  req.session.userId = user.UserId;
  req.session.roles = user.userRoles.map(ur => ur.role.Name);
  res.json({ message: 'Autenticado', user: { id: user.UserId, workId: user.Username, roles: req.session.roles } });
};

// Cambio de contraseña (cualquier empleado autenticado)
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
      data: { PasswordHash: Buffer.from(hashed) }
    });

    res.json({ message: 'Contraseña actualizada con éxito' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al cambiar contraseña' });
  }
};
