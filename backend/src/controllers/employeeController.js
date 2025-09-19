import { createEmployee } from '../services/employeeService.js';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
const prisma = new PrismaClient();

export const createReceptionist = async (req, res) => {
  const { email } = req.body;
  try {
    await createEmployee(email, 'Recepcionista');
    res.status(201).json({ message: 'Recepcionista creado y credenciales enviadas.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear recepcionista.' });
  }
};

// Login de recepcionista por ID de trabajo
export const receptionistLogin = async (req, res) => {
  const { workId, password } = req.body;
  const user = await prisma.user.findUnique({ where: { Username: workId }, include: { userRoles: { include: { role: true } } } });
  if (!user || !user.Active) return res.status(401).json({ error: 'Credenciales inválidas o usuario inactivo' });
  const valid = await bcrypt.compare(password, Buffer.from(user.PasswordHash).toString());
  if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });
  req.session.userId = user.UserId;
  req.session.roles = user.userRoles.map(ur => ur.role.Name);
  res.json({ message: 'Autenticado', user: { id: user.UserId, workId: user.Username, roles: req.session.roles } });
};

// Cambio de contraseña (solo recepcionista autenticada)
export const receptionistChangePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.session.userId;
  const user = await prisma.user.findUnique({ where: { UserId: userId } });
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  const valid = await bcrypt.compare(oldPassword, Buffer.from(user.PasswordHash).toString());
  if (!valid) return res.status(401).json({ error: 'Contraseña actual incorrecta' });
  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { UserId: userId }, data: { PasswordHash: Buffer.from(hashed) } });
  res.json({ message: 'Contraseña actualizada' });
};

// Crear orden de servicio (solo recepcionista)
export const receptionistCreateOrder = async (req, res) => {
  const { clientId, equipmentId, notes, estimatedDeliveryDate, staffId } = req.body;
  try {
    // Crear la orden y asignar al staff técnico
    const order = await prisma.serviceOrder.create({
      data: {
        ClientId: clientId,
        ReceptionistId: req.session.userId,
        IntakeDate: new Date(),
        IdentityTag: `ORD-${Date.now()}`,
        CurrentStatusId: 1, // Asumimos 1 = recibido
        Notes: notes,
        EstimatedDeliveryDate: estimatedDeliveryDate ? new Date(estimatedDeliveryDate) : null
      }
    });
    // Aquí podrías crear una relación con staff técnico si tu modelo lo permite
    res.status(201).json({ message: 'Orden creada', order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear la orden' });
  }
};
