import {
  createRole, listRoles, updateRole, deleteRole,
  createUserWithRole, adminChangePassword, findUserByUsernameOrEmail
} from '../services/adminService.js';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

// --- ADMINISTRADOR ---

// Crear usuario con rol (solo admin puede crear admin)
export const adminCreateUser = async (req, res) => {
  const { email, username, password, roleName } = req.body;
  try {
    // CORRECTO: Usa req.auth.roles que viene del JWT
    if (roleName === 'Administrador' && !req.auth.roles.includes('Administrador')) {
      return res.status(403).json({ error: 'Solo un administrador puede crear otro administrador' });
    }
    const user = await createUserWithRole({ email, username, password, roleName });
    res.status(201).json({ message: 'Usuario creado', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Cambio de contraseña de usuario por admin
export const adminSetUserPassword = async (req, res) => {
  const { userId, newPassword } = req.body;
  try {
    await adminChangePassword(userId, newPassword);
    res.json({ message: 'Contraseña actualizada por admin' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Eliminar usuario
export const adminDeleteUser = async (req, res) => {
  const { userId } = req.body;
  try {
    if (Number(userId) === 1) return res.status(403).json({ error: 'No se puede eliminar el administrador principal' });
    
    // CORRECTO: Usa req.auth.userId para la auto-eliminación y req.auth.roles para permisos
    if (Number(userId) === req.auth.userId) {
        return res.status(403).json({ error: 'No puedes eliminar tu propia cuenta.' });
    }

    const userToDelete = await prisma.user.findUnique({
      where: { UserId: Number(userId) },
      include: { userRoles: { include: { role: true } } }
    });
    if (!userToDelete) return res.status(404).json({ error: 'Usuario no encontrado' });

    const isDeletingAdmin = userToDelete.userRoles.some(ur => ur.role.Name === 'Administrador');
    if (isDeletingAdmin && !req.auth.roles.includes('Administrador')) {
      return res.status(403).json({ error: 'Solo un administrador puede eliminar otro administrador' });
    }
    
    await prisma.user.delete({ where: { UserId: Number(userId) } });
    res.json({ message: 'Usuario eliminado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Actualizar usuario
export const adminUpdateUser = async (req, res) => {
  const { userId, email, phone, active } = req.body;
  try {
    const user = await prisma.user.update({
      where: { UserId: userId },
      data: { Email: email, Phone: phone, Active: active }
    });
    res.json({ message: 'Usuario actualizado', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Listar usuarios
export const adminListUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        UserId: true,
        Username: true,
        Email: true,
        Phone: true,
        Active: true,
        userRoles: { select: { role: { select: { RoleId: true, Name: true } } } }
      }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Asignar o remover rol
export const adminAssignRole = async (req, res) => {
  const { userId, roleName, action } = req.body;
  try {
    const role = await prisma.role.findUnique({ where: { Name: roleName } });
    if (!role) return res.status(404).json({ error: 'Rol no encontrado' });

    if (action === 'add') {
      // Verifica si ya tiene el rol
      const exists = await prisma.userRole.findUnique({
        where: { UserId_RoleId: { UserId: userId, RoleId: role.RoleId } }
      });
      if (exists) return res.status(400).json({ error: 'El usuario ya tiene este rol asignado' });

      await prisma.userRole.create({ data: { UserId: userId, RoleId: role.RoleId } });
    } else if (action === 'remove') {
      await prisma.userRole.delete({
        where: { UserId_RoleId: { UserId: userId, RoleId: role.RoleId } }
      });
    } else {
      return res.status(400).json({ error: 'Acción inválida' });
    }

    res.json({ message: `Rol ${action === 'add' ? 'asignado' : 'removido'}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --- CRUD de roles ---
export const adminCreateRole = async (req, res) => {
  const { name, description } = req.body;
  try {
    const role = await createRole(name, description);
    res.status(201).json({ message: 'Rol creado', role });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const adminListRoles = async (req, res) => {
  try {
    const roles = await listRoles();
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const adminUpdateRole = async (req, res) => {
  const { roleId, name, description } = req.body;
  try {
    const role = await updateRole(roleId, name, description);
    res.json({ message: 'Rol actualizado', role });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const adminDeleteRole = async (req, res) => {
  const { roleId } = req.body;
  try {
    await deleteRole(roleId);
    res.json({ message: 'Rol eliminado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --- ¡NUEVO! FUNCIÓN PARA VER LOGS ---
export const getSystemLogs = async (req, res) => {
    try {
        // Lee el archivo de logs. En producción, se usaría un sistema de gestión de logs.
        const logData = fs.readFileSync('logs/all.log', 'utf8');
        res.header('Content-Type', 'text/plain');
        res.send(logData);
    } catch (error) {
        res.status(500).json({ error: "No se pudieron obtener los logs.", details: error.message });
    }
};