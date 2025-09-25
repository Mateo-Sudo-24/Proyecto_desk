// employeeService.js
import crypto from 'crypto';

import { PrismaClient } from '@prisma/client';
import validator from 'validator';
import {
  sendOTPEmail,
  sendProformaEmail,          // <--- Importación clave para la proforma
  sendProformaConfirmationEmail // <--- Importación clave para la confirmación de proforma
} from '../../config/nodemailer.js';
const prisma = new PrismaClient();

// --- OTP y Autenticación ---

/**
 * Genera y envía un OTP de 6 dígitos al usuario especificado.
 * El OTP se guarda en la tabla OTP y expira en 10 minutos.
 * @param {number} userId - ID del usuario.
 * @param {string} email - Email del usuario para el envío del OTP.
 * @returns {string} El OTP generado.
 * @throws {Error} Si hay un error al generar o enviar el OTP.
 */
export async function generateAndSendOTP(userId, email) {
  try {
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    // Guarda el OTP en la nueva tabla OTP
    await prisma.oTP.create({
      data: {
        UserId: userId,
        Code: otpCode,
        ExpiresAt: expiresAt,
        IsUsed: false,
      },
    });

    await sendOTPEmail(email, otpCode);
    return otpCode;
  } catch (error) {
    console.error('Error in generateAndSendOTP:', error);
    throw new Error('No se pudo generar ni enviar el OTP.');
  }
}

/**
 * Verifica un OTP proporcionado por el usuario.
 * @param {number} userId - ID del usuario.
 * @param {string} otpCode - El código OTP a verificar.
 * @returns {boolean} True si el OTP es válido y no ha expirado, false de lo contrario.
 * @throws {Error} Si hay un error al verificar el OTP.
 */
export async function verifyOTP(userId, otpCode) {
  try {
    const otpRecord = await prisma.oTP.findFirst({
      where: {
        UserId: userId,
        Code: otpCode,
        ExpiresAt: { gte: new Date() }, // OTP no expirado
        IsUsed: false, // OTP no usado
      },
      orderBy: { CreatedAt: 'desc' }, // Obtener el más reciente
    });

    if (otpRecord) {
      // Marcar OTP como usado para evitar reuso
      await prisma.oTP.update({
        where: { OTPId: otpRecord.OTPId },
        data: { IsUsed: true },
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error in verifyOTP:', error);
    throw new Error('Error al verificar el OTP.');
  }
}

// --- Gestión de Empleados ---

export async function createEmployee(email, roleName) {
  if (!validator.isEmail(email)) {
    throw new Error('Email inválido');
  }

  let username = email; // Por defecto el email
  let password = crypto.randomBytes(8).toString('hex'); // Contraseña aleatoria

  if (roleName === 'Recepcionista' || roleName === 'Tecnico' || roleName === 'Ventas' || roleName === 'Gerente') {
    // Generar workId para roles específicos
    username = `${roleName.substring(0, 3).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    // Asegurar unicidad
    while (await prisma.user.findUnique({ where: { Username: username } })) {
      username = `${roleName.substring(0, 3).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    }
  }

  const { createUserWithRole } = await import('./adminService.js');
  const user = await createUserWithRole({ email, username, password, roleName });
  // El adminService ya se encarga de enviar el correo con las credenciales
  return user;
}


// --- Gestión de Clientes y Equipos (para Recepcionista) ---

/**
 * Crea o actualiza un cliente.
 * @param {object} clientData - Datos del cliente.
 * @param {boolean} isNew - Si es un nuevo cliente o se actualiza uno existente.
 * @returns {Promise<object>} El cliente creado/actualizado.
 */
export async function createOrUpdateClient(clientData, isNew = true) {
  try {
    if (isNew) {
      // Verificar si ya existe un cliente con el IdNumber
      const existingClient = await prisma.client.findUnique({
        where: { IdNumber: clientData.idNumber },
      });
      if (existingClient) {
        throw new Error('Ya existe un cliente con este número de identificación.');
      }
      return await prisma.client.create({
        data: {
          ClientTypeId: clientData.clientTypeId,
          DisplayName: clientData.displayName,
          IdNumber: clientData.idNumber,
          Email: clientData.email,
          Phone: clientData.phone,
          Address: clientData.address,
          ContactName: clientData.contactName,
          IsPublicService: clientData.isPublicService,
          OrganizationName: clientData.organizationName,
          DeliveryAddress: clientData.deliveryAddress,
        },
      });
    } else {
      return await prisma.client.update({
        where: { ClientId: clientData.clientId },
        data: {
          DisplayName: clientData.displayName,
          Email: clientData.email,
          Phone: client.phone,
          Address: clientData.address,
          ContactName: clientData.contactName,
          IsPublicService: clientData.isPublicService,
          OrganizationName: clientData.organizationName,
          DeliveryAddress: clientData.deliveryAddress,
        },
      });
    }
  } catch (error) {
    console.error('Error in createOrUpdateClient:', error);
    throw new Error(`Error al ${isNew ? 'crear' : 'actualizar'} el cliente: ${error.message}`);
  }
}

/**
 * Registra un nuevo equipo para un cliente existente.
 * @param {object} equipmentData - Datos del equipo.
 * @returns {Promise<object>} El equipo creado.
 */
export async function registerEquipment(equipmentData) {
  try {
    return await prisma.equipment.create({
      data: {
        ClientId: equipmentData.clientId,
        EquipmentTypeId: equipmentData.equipmentTypeId,
        Brand: equipmentData.brand,
        Model: equipmentData.model,
        SerialNumber: equipmentData.serialNumber,
        Description: equipmentData.description,
      },
    });
  } catch (error) {
    console.error('Error in registerEquipment:', error);
    throw new Error('Error al registrar el equipo.');
  }
}

// --- Funciones para Staff de Ventas ---

/**
 * Envía la proforma al cliente por correo electrónico.
 * @param {number} orderId - ID de la orden de servicio.
 * @param {string} clientEmail - Email del cliente.
 * @param {string} clientName - Nombre del cliente.
 * @param {string} identityTag - Tag de la orden.
 * @param {string} parts - Descripción de los repuestos.
 * @param {number} totalPrice - Precio total.
 */
export async function sendProformaToClient(orderId, clientEmail, clientName, identityTag, parts, totalPrice) {
  try {
    if (!validator.isEmail(clientEmail)) {
      throw new Error('Email del cliente inválido para enviar proforma.');
    }

    await sendProformaEmail(clientEmail, clientName, identityTag, parts, totalPrice);

    // Actualizar el estado de la proforma en la base de datos (handled in controller)
    // Se deja al controlador la actualización del estado de la orden para tener
    // más control sobre el historial y la transacción.
    console.log(`Proforma para orden ${orderId} enviada a ${clientEmail}`);
  } catch (error) {
    console.error('Error in sendProformaToClient:', error);
    throw new Error('Error al enviar la proforma al cliente.');
  }
}

/**
 * Envía la confirmación de aprobación/rechazo de proforma al cliente por correo electrónico.
 * @param {string} clientEmail - Email del cliente.
 * @param {string} clientName - Nombre del cliente.
 * @param {string} identityTag - Tag de la orden.
 * @param {'approve' | 'reject'} action - Acción realizada por el cliente.
 */
export async function sendProformaClientConfirmation(clientEmail, clientName, identityTag, action) {
  try {
    if (!validator.isEmail(clientEmail)) {
      throw new Error('Email del cliente inválido para enviar confirmación de proforma.');
    }
    await sendProformaConfirmationEmail(clientEmail, clientName, identityTag, action);
    console.log(`Confirmación de proforma (${action}) enviada a ${clientEmail}`);
  } catch (error) {
    console.error('Error in sendProformaClientConfirmation:', error);
    throw new Error(`Error al enviar la confirmación de proforma (${action}) al cliente.`);
  }
}