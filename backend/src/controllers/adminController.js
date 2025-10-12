// src/controllers/adminController.js - Sistema de Administración Completo
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import fs from 'fs/promises';
import path from 'path';
import logger from '../../config/logger.js';

const prisma = new PrismaClient();

// === CONSTANTES ===
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;
const PROTECTED_USER_ID = 1; // Usuario administrador principal (no se puede eliminar)

const ERROR_MESSAGES = {
  USER_NOT_FOUND: 'Usuario no encontrado',
  ROLE_NOT_FOUND: 'Rol no encontrado',
  CANNOT_DELETE_MAIN_ADMIN: 'No se puede eliminar el administrador principal',
  CANNOT_DELETE_SELF: 'No puedes eliminar tu propia cuenta',
  CANNOT_REMOVE_OWN_ADMIN: 'No puedes remover tu propio rol de administrador',
  ONLY_ADMIN_CAN_CREATE_ADMIN: 'Solo un administrador puede crear otro administrador',
  ONLY_ADMIN_CAN_DELETE_ADMIN: 'Solo un administrador puede eliminar otro administrador',
  ROLE_ALREADY_ASSIGNED: 'El usuario ya tiene este rol asignado',
  ROLE_NOT_ASSIGNED: 'El usuario no tiene este rol asignado',
  INVALID_ACTION: 'Acción inválida. Use "add" o "remove"',
  LOGS_NOT_AVAILABLE: 'Los logs del sistema no están disponibles'
};

// === UTILIDADES ===

/**
 * Logger de auditoría para acciones administrativas críticas
 */
const auditLog = (action, performedBy, target, details = {}) => {
  logger.info(`[AUDIT] ${action}`, {
    performedBy: {
      userId: performedBy.userId,
      username: performedBy.username,
      roles: performedBy.roles
    },
    target,
    details,
    timestamp: new Date().toISOString(),
    ip: details.ip
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
      logger.error(`Error en ${fn.name}`, {
        error: error.message,
        stack: error.stack,
        userId: req.auth?.userId,
        path: req.path
      });
      
      const message = process.env.NODE_ENV === 'production' 
        ? 'Error interno del servidor' 
        : error.message;
      
      res.status(error.statusCode || 500).json({ 
        success: false,
        error: message 
      });
    }
  };
};

/**
 * Verifica si el usuario es administrador
 */
const isAdmin = (userRoles) => {
  return Array.isArray(userRoles) && userRoles.includes('Administrador');
};

// ========================================
// GESTIÓN DE USUARIOS
// ========================================

/**
 * Crear nuevo usuario con rol
 * Solo administradores pueden crear usuarios
 * Solo administradores pueden crear otros administradores
 * 
 * POST /api/admin/user/create
 * @auth Employee (Administrador)
 * @body { email, username, password, roleName }
 */
export const adminCreateUser = asyncHandler(async (req, res) => {
  const { email, username, password, roleName } = req.body;
  const performedBy = {
    userId: req.auth.userId,
    username: req.auth.username,
    roles: req.auth.roles
  };

  // Validar campos requeridos
  if (!email || !username || !password || !roleName) {
    const error = new Error('Todos los campos son requeridos: email, username, password, roleName');
    error.statusCode = 400;
    throw error;
  }

  // Verificar si el rol a asignar es 'Administrador'
  if (roleName === 'Administrador' && !isAdmin(req.auth.roles)) {
    const error = new Error(ERROR_MESSAGES.ONLY_ADMIN_CAN_CREATE_ADMIN);
    error.statusCode = 403;
    throw error;
  }

  // Verificar que el rol existe
  const role = await prisma.role.findUnique({
    where: { Name: roleName }
  });

  if (!role) {
    const error = new Error(ERROR_MESSAGES.ROLE_NOT_FOUND);
    error.statusCode = 404;
    throw error;
  }

  // Verificar que el username no exista
  const existingUser = await prisma.user.findUnique({
    where: { Username: username }
  });

  if (existingUser) {
    const error = new Error('El nombre de usuario ya está en uso');
    error.statusCode = 400;
    throw error;
  }

  // Hash de la contraseña
  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Crear usuario y asignar rol en transacción
  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        Username: username,
        PasswordHash: hashedPassword,
        Email: email,
        Active: true
      }
    });

    await tx.userRole.create({
      data: {
        UserId: newUser.UserId,
        RoleId: role.RoleId
      }
    });

    return await tx.user.findUnique({
      where: { UserId: newUser.UserId },
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
  });

  // Auditoría
  auditLog('USER_CREATED', performedBy, {
    userId: user.UserId,
    username: user.Username,
    role: roleName
  }, { ip: req.ip });

  res.status(201).json({ 
    success: true,
    message: 'Usuario creado exitosamente', 
    data: {
      user: {
        userId: user.UserId,
        username: user.Username,
        email: user.Email,
        roles: user.userRoles.map(ur => ur.role.Name)
      }
    }
  });
});

/**
 * Actualizar información de usuario
 * 
 * PUT /api/admin/user/update
 * @auth Employee (Administrador)
 * @body { userId, email?, phone?, active? }
 */
export const adminUpdateUser = asyncHandler(async (req, res) => {
  const { userId, email, phone, active } = req.body;
  const performedBy = {
    userId: req.auth.userId,
    username: req.auth.username,
    roles: req.auth.roles
  };

  if (!userId) {
    const error = new Error('userId es requerido');
    error.statusCode = 400;
    throw error;
  }

  // Verificar que el usuario existe
  const existingUser = await prisma.user.findUnique({
    where: { UserId: Number(userId) }
  });

  if (!existingUser) {
    const error = new Error(ERROR_MESSAGES.USER_NOT_FOUND);
    error.statusCode = 404;
    throw error;
  }

  // Preparar datos a actualizar
  const updateData = {};
  if (email !== undefined) updateData.Email = email;
  if (phone !== undefined) updateData.Phone = phone;
  if (active !== undefined) updateData.Active = Boolean(active);

  // Actualizar usuario
  const user = await prisma.user.update({
    where: { UserId: Number(userId) },
    data: updateData,
    include: {
      userRoles: {
        include: {
          role: {
            select: { Name: true }
          }
        }
      }
    }
  });

  // Auditoría
  auditLog('USER_UPDATED', performedBy, {
    userId: user.UserId,
    username: user.Username,
    changes: updateData
  }, { ip: req.ip });

  res.json({ 
    success: true,
    message: 'Usuario actualizado exitosamente', 
    data: {
      user: {
        userId: user.UserId,
        username: user.Username,
        email: user.Email,
        phone: user.Phone,
        active: user.Active,
        roles: user.userRoles.map(ur => ur.role.Name)
      }
    }
  });
});

/**
 * Eliminar usuario
 * Protecciones:
 * - No se puede eliminar al admin principal (userId: 1)
 * - No se puede auto-eliminar
 * - Solo admin puede eliminar a otro admin
 * 
 * DELETE /api/admin/user/delete
 * @auth Employee (Administrador)
 * @body { userId }
 */
export const adminDeleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const performedBy = {
    userId: req.auth.userId,
    username: req.auth.username,
    roles: req.auth.roles
  };

  if (!userId) {
    const error = new Error('userId es requerido');
    error.statusCode = 400;
    throw error;
  }

  const userIdNum = Number(userId);

  // Protección 1: No eliminar admin principal
  if (userIdNum === PROTECTED_USER_ID) {
    const error = new Error(ERROR_MESSAGES.CANNOT_DELETE_MAIN_ADMIN);
    error.statusCode = 403;
    throw error;
  }

  // Protección 2: No auto-eliminarse
  if (userIdNum === req.auth.userId) {
    const error = new Error(ERROR_MESSAGES.CANNOT_DELETE_SELF);
    error.statusCode = 403;
    throw error;
  }

  // Buscar usuario a eliminar
  const userToDelete = await prisma.user.findUnique({
    where: { UserId: userIdNum },
    include: { 
      userRoles: { 
        include: { 
          role: { 
            select: { Name: true } 
          } 
        } 
      } 
    }
  });

  if (!userToDelete) {
    const error = new Error(ERROR_MESSAGES.USER_NOT_FOUND);
    error.statusCode = 404;
    throw error;
  }

  // Protección 3: Solo admin puede eliminar a otro admin
  const isDeletingAdmin = userToDelete.userRoles.some(ur => ur.role.Name === 'Administrador');
  
  if (isDeletingAdmin && !isAdmin(req.auth.roles)) {
    const error = new Error(ERROR_MESSAGES.ONLY_ADMIN_CAN_DELETE_ADMIN);
    error.statusCode = 403;
    throw error;
  }

  // Eliminar usuario (cascade eliminará userRoles)
  await prisma.user.delete({ 
    where: { UserId: userIdNum } 
  });

  // Auditoría
  auditLog('USER_DELETED', performedBy, {
    userId: userToDelete.UserId,
    username: userToDelete.Username,
    hadRoles: userToDelete.userRoles.map(ur => ur.role.Name)
  }, { ip: req.ip });

  res.json({ 
    success: true,
    message: 'Usuario eliminado exitosamente'
  });
});

/**
 * Listar todos los usuarios con sus roles
 * 
 * GET /api/admin/user/list
 * @auth Employee (Administrador)
 */
export const adminListUsers = asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    select: {
      UserId: true,
      Username: true,
      Email: true,
      Phone: true,
      Active: true,
      CreatedAt: true,
      userRoles: { 
        select: { 
          role: { 
            select: { 
              RoleId: true, 
              Name: true,
              Description: true
            } 
          } 
        } 
      }
    },
    orderBy: { CreatedAt: 'desc' }
  });

  const formattedUsers = users.map(user => ({
    userId: user.UserId,
    username: user.Username,
    email: user.Email,
    phone: user.Phone,
    active: user.Active,
    createdAt: user.CreatedAt,
    roles: user.userRoles.map(ur => ({
      roleId: ur.role.RoleId,
      name: ur.role.Name,
      description: ur.role.Description
    }))
  }));

  res.json({ 
    success: true,
    data: {
      users: formattedUsers,
      total: formattedUsers.length
    }
  });
});

/**
 * Establecer/cambiar contraseña de un usuario
 * Solo admin puede hacerlo
 * 
 * POST /api/admin/user/set-password
 * @auth Employee (Administrador)
 * @body { userId, newPassword }
 */
export const adminSetUserPassword = asyncHandler(async (req, res) => {
  const { userId, newPassword } = req.body;
  const performedBy = {
    userId: req.auth.userId,
    username: req.auth.username,
    roles: req.auth.roles
  };

  if (!userId || !newPassword) {
    const error = new Error('userId y newPassword son requeridos');
    error.statusCode = 400;
    throw error;
  }

  if (newPassword.length < 8) {
    const error = new Error('La contraseña debe tener al menos 8 caracteres');
    error.statusCode = 400;
    throw error;
  }

  // Verificar que el usuario existe
  const user = await prisma.user.findUnique({
    where: { UserId: Number(userId) },
    select: { UserId: true, Username: true }
  });

  if (!user) {
    const error = new Error(ERROR_MESSAGES.USER_NOT_FOUND);
    error.statusCode = 404;
    throw error;
  }

  // Hash de la nueva contraseña
  const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  // Actualizar contraseña
  await prisma.user.update({
    where: { UserId: Number(userId) },
    data: { PasswordHash: hashedPassword }
  });

  // Auditoría
  auditLog('PASSWORD_RESET_BY_ADMIN', performedBy, {
    targetUserId: user.UserId,
    targetUsername: user.Username
  }, { ip: req.ip });

  res.json({ 
    success: true,
    message: 'Contraseña actualizada exitosamente por administrador' 
  });
});

// ========================================
// GESTIÓN DE ROLES
// ========================================

/**
 * Asignar o remover rol de un usuario
 * 
 * POST /api/admin/user/assign-role
 * @auth Employee (Administrador)
 * @body { userId, roleName, action: 'add' | 'remove' }
 */
export const adminAssignRole = asyncHandler(async (req, res) => {
  const { userId, roleName, action } = req.body;
  const performedBy = {
    userId: req.auth.userId,
    username: req.auth.username,
    roles: req.auth.roles
  };

  // Validar campos
  if (!userId || !roleName || !action) {
    const error = new Error('userId, roleName y action son requeridos');
    error.statusCode = 400;
    throw error;
  }

  if (!['add', 'remove'].includes(action)) {
    const error = new Error(ERROR_MESSAGES.INVALID_ACTION);
    error.statusCode = 400;
    throw error;
  }

  // Protección: No puede remover su propio rol de admin
  if (action === 'remove' && 
      roleName === 'Administrador' && 
      Number(userId) === req.auth.userId) {
    const error = new Error(ERROR_MESSAGES.CANNOT_REMOVE_OWN_ADMIN);
    error.statusCode = 403;
    throw error;
  }

  // Buscar el rol
  const role = await prisma.role.findUnique({ 
    where: { Name: roleName } 
  });

  if (!role) {
    const error = new Error(ERROR_MESSAGES.ROLE_NOT_FOUND);
    error.statusCode = 404;
    throw error;
  }

  // Buscar el usuario
  const user = await prisma.user.findUnique({
    where: { UserId: Number(userId) },
    select: { UserId: true, Username: true }
  });

  if (!user) {
    const error = new Error(ERROR_MESSAGES.USER_NOT_FOUND);
    error.statusCode = 404;
    throw error;
  }

  if (action === 'add') {
    // Verificar si ya tiene el rol
    const exists = await prisma.userRole.findUnique({
      where: { 
        UserId_RoleId: { 
          UserId: Number(userId), 
          RoleId: role.RoleId 
        } 
      }
    });

    if (exists) {
      const error = new Error(ERROR_MESSAGES.ROLE_ALREADY_ASSIGNED);
      error.statusCode = 400;
      throw error;
    }

    await prisma.userRole.create({ 
      data: { 
        UserId: Number(userId), 
        RoleId: role.RoleId 
      } 
    });

    // Auditoría
    auditLog('ROLE_ASSIGNED', performedBy, {
      targetUserId: user.UserId,
      targetUsername: user.Username,
      roleName: roleName
    }, { ip: req.ip });

    res.json({ 
      success: true,
      message: `Rol '${roleName}' asignado exitosamente` 
    });

  } else if (action === 'remove') {
    // Verificar si tiene el rol
    const exists = await prisma.userRole.findUnique({
      where: { 
        UserId_RoleId: { 
          UserId: Number(userId), 
          RoleId: role.RoleId 
        } 
      }
    });

    if (!exists) {
      const error = new Error(ERROR_MESSAGES.ROLE_NOT_ASSIGNED);
      error.statusCode = 400;
      throw error;
    }

    await prisma.userRole.delete({
      where: { 
        UserId_RoleId: { 
          UserId: Number(userId), 
          RoleId: role.RoleId 
        } 
      }
    });

    // Auditoría
    auditLog('ROLE_REMOVED', performedBy, {
      targetUserId: user.UserId,
      targetUsername: user.Username,
      roleName: roleName
    }, { ip: req.ip });

    res.json({ 
      success: true,
      message: `Rol '${roleName}' removido exitosamente` 
    });
  }
});

/**
 * Crear nuevo rol en el sistema
 * 
 * POST /api/admin/role/create
 * @auth Employee (Administrador)
 * @body { name, description }
 */
export const adminCreateRole = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const performedBy = {
    userId: req.auth.userId,
    username: req.auth.username,
    roles: req.auth.roles
  };

  if (!name) {
    const error = new Error('name es requerido');
    error.statusCode = 400;
    throw error;
  }

  // Verificar que no exista
  const existingRole = await prisma.role.findUnique({
    where: { Name: name }
  });

  if (existingRole) {
    const error = new Error('Ya existe un rol con ese nombre');
    error.statusCode = 400;
    throw error;
  }

  const role = await prisma.role.create({
    data: {
      Name: name,
      Description: description || null
    }
  });

  // Auditoría
  auditLog('ROLE_CREATED', performedBy, {
    roleId: role.RoleId,
    roleName: role.Name
  }, { ip: req.ip });

  res.status(201).json({ 
    success: true,
    message: 'Rol creado exitosamente', 
    data: { role }
  });
});

/**
 * Listar todos los roles del sistema
 * 
 * GET /api/admin/role/list
 * @auth Employee (Administrador)
 */
export const adminListRoles = asyncHandler(async (req, res) => {
  const roles = await prisma.role.findMany({
    select: {
      RoleId: true,
      Name: true,
      Description: true,
      _count: {
        select: {
          userRoles: true // Cuenta cuántos usuarios tienen este rol
        }
      }
    },
    orderBy: { Name: 'asc' }
  });

  const formattedRoles = roles.map(role => ({
    roleId: role.RoleId,
    name: role.Name,
    description: role.Description,
    usersCount: role._count.userRoles
  }));

  res.json({ 
    success: true,
    data: {
      roles: formattedRoles,
      total: formattedRoles.length
    }
  });
});

/**
 * Actualizar rol existente
 * 
 * PUT /api/admin/role/update
 * @auth Employee (Administrador)
 * @body { roleId, name?, description? }
 */
export const adminUpdateRole = asyncHandler(async (req, res) => {
  const { roleId, name, description } = req.body;
  const performedBy = {
    userId: req.auth.userId,
    username: req.auth.username,
    roles: req.auth.roles
  };

  if (!roleId) {
    const error = new Error('roleId es requerido');
    error.statusCode = 400;
    throw error;
  }

  // Verificar que el rol existe
  const existingRole = await prisma.role.findUnique({
    where: { RoleId: Number(roleId) }
  });

  if (!existingRole) {
    const error = new Error(ERROR_MESSAGES.ROLE_NOT_FOUND);
    error.statusCode = 404;
    throw error;
  }

  // Preparar datos a actualizar
  const updateData = {};
  if (name) updateData.Name = name;
  if (description !== undefined) updateData.Description = description;

  const role = await prisma.role.update({
    where: { RoleId: Number(roleId) },
    data: updateData
  });

  // Auditoría
  auditLog('ROLE_UPDATED', performedBy, {
    roleId: role.RoleId,
    roleName: role.Name,
    changes: updateData
  }, { ip: req.ip });

  res.json({ 
    success: true,
    message: 'Rol actualizado exitosamente', 
    data: { role }
  });
});

/**
 * Eliminar rol del sistema
 * Advertencia: Esto eliminará las asignaciones de este rol a usuarios
 * 
 * DELETE /api/admin/role/delete
 * @auth Employee (Administrador)
 * @body { roleId }
 */
export const adminDeleteRole = asyncHandler(async (req, res) => {
  const { roleId } = req.body;
  const performedBy = {
    userId: req.auth.userId,
    username: req.auth.username,
    roles: req.auth.roles
  };

  if (!roleId) {
    const error = new Error('roleId es requerido');
    error.statusCode = 400;
    throw error;
  }

  // Verificar que el rol existe
  const role = await prisma.role.findUnique({
    where: { RoleId: Number(roleId) },
    include: {
      _count: {
        select: { userRoles: true }
      }
    }
  });

  if (!role) {
    const error = new Error(ERROR_MESSAGES.ROLE_NOT_FOUND);
    error.statusCode = 404;
    throw error;
  }

  // Advertir si hay usuarios con este rol
  if (role._count.userRoles > 0) {
    logger.warn(`Eliminando rol con usuarios asignados`, {
      roleId: role.RoleId,
      roleName: role.Name,
      usersAffected: role._count.userRoles
    });
  }

  await prisma.role.delete({ 
    where: { RoleId: Number(roleId) } 
  });

  // Auditoría
  auditLog('ROLE_DELETED', performedBy, {
    roleId: role.RoleId,
    roleName: role.Name,
    usersAffected: role._count.userRoles
  }, { ip: req.ip });

  res.json({ 
    success: true,
    message: 'Rol eliminado exitosamente',
    warning: role._count.userRoles > 0 
      ? `${role._count.userRoles} usuario(s) tenían este rol asignado` 
      : null
  });
});

// ========================================
// SISTEMA Y LOGS
// ========================================

/**
 * Obtener logs del sistema
 * Admin y técnicos pueden ver logs
 * 
 * GET /api/admin/system/logs
 * @auth Employee (Administrador, Staff Técnico)
 * @query { lines?, level?, startDate?, endDate? }
 */
export const getSystemLogs = asyncHandler(async (req, res) => {
  const { lines = 100, level, startDate, endDate } = req.query;

  try {
    const logPath = path.join(process.cwd(), 'logs', 'all.log');
    const logData = await fs.readFile(logPath, 'utf8');

    // Dividir en líneas
    let logLines = logData.split('\n').filter(line => line.trim());

    // Filtrar por nivel si se especifica
    if (level) {
      logLines = logLines.filter(line => line.includes(`"level":"${level}"`));
    }

    // Filtrar por fechas si se especifican
    if (startDate || endDate) {
      logLines = logLines.filter(line => {
        try {
          const logEntry = JSON.parse(line);
          const logDate = new Date(logEntry.timestamp);
          
          if (startDate && logDate < new Date(startDate)) return false;
          if (endDate && logDate > new Date(endDate)) return false;
          
          return true;
        } catch {
          return false;
        }
      });
    }

    // Tomar últimas N líneas
    const recentLogs = logLines.slice(-Number(lines));

    // Parsear JSON
    const parsedLogs = recentLogs.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return { raw: line };
      }
    });

    res.json({
      success: true,
      data: {
        logs: parsedLogs,
        total: parsedLogs.length,
        filters: { lines, level, startDate, endDate }
      }
    });

  } catch (error) {
    if (error.code === 'ENOENT') {
      logger.error('Archivo de logs no encontrado', { logPath: 'logs/all.log' });
      const err = new Error(ERROR_MESSAGES.LOGS_NOT_AVAILABLE);
      err.statusCode = 404;
      throw err;
    }
    throw error;
  }
});

/**
 * Obtener estadísticas del sistema
 * 
 * GET /api/admin/system/statistics
 * @auth Employee (Administrador)
 */
export const getSystemStatistics = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    activeUsers,
    totalRoles,
    totalOrders,
    totalClients
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { Active: true } }),
    prisma.role.count(),
    prisma.serviceOrder.count(),
    prisma.client.count()
  ]);

  res.json({
    success: true,
    data: {
      system: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        totalRoles
      },
      business: {
        totalOrders,
        totalClients
      },
      timestamp: new Date().toISOString()
    }
  });
});