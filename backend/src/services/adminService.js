import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { sendMailToReceptionist } from '../../config/nodemailer.js';
const prisma = new PrismaClient();

// Crea un nuevo rol
export async function createRole(name, description) {
  return prisma.role.create({ data: { Name: name, Description: description } });
}

// Lista todos los roles
export async function listRoles() {
  return prisma.role.findMany();
}

// Actualiza un rol existente
export async function updateRole(roleId, name, description) {
  return prisma.role.update({ where: { RoleId: roleId }, data: { Name: name, Description: description } });
}

// Elimina un rol (solo si no está asignado a usuarios)
export async function deleteRole(roleId) {
  // Verifica si hay usuarios con este rol
  const count = await prisma.userRole.count({ where: { RoleId: roleId } });
  if (count > 0) throw new Error('No se puede eliminar un rol asignado a usuarios');
  return prisma.role.delete({ where: { RoleId: roleId } });
}

// Crea un usuario con rol y envía credenciales por email
export async function createUserWithRole({ email, username, password, roleName, sendEmail = true }) {
  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      Username: username,
      PasswordHash: hashed,
      Email: email,
      Active: true,
      userRoles: {
        create: [{ role: { connect: { Name: roleName } } }]
      }
    },
    include: { userRoles: { include: { role: true } } }
  });
  if (sendEmail) {
    await sendMailToReceptionist(email, username, password);
  }
  return user;
}

// Cambia la contraseña de un usuario (solo admin autorizado)
export async function adminChangePassword(userId, newPassword, notifyEmail = false) {
  const hashed = await bcrypt.hash(newPassword, 10);
  const user = await prisma.user.update({ where: { UserId: userId }, data: { PasswordHash: hashed }, include: { userRoles: { include: { role: true } } } });
  if (notifyEmail && user.Email) {
    const { sendPasswordChangedByAdmin } = await import('../../config/nodemailer.js');
    await sendPasswordChangedByAdmin(user.Email, user.Username, newPassword);
  }
  return user;
}

// Busca usuario por username o email
export async function findUserByUsernameOrEmail(identifier) {
  return prisma.user.findFirst({
    where: {
      OR: [
        { Username: identifier },
        { Email: identifier }
      ]
    },
    include: { userRoles: { include: { role: true } } }
  });
}
