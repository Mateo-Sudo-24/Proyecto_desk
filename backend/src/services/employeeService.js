import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import validator from 'validator';
import { sendMailToReceptionist, sendOTPEmail } from '../../config/nodemailer.js';
const prisma = new PrismaClient();

// OTP y relación de orden
export async function generateAndSendOTP(userId, email) {
  // Generar OTP de 6 dígitos
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  // Guardar OTP y expiración en la base de datos (tabla User, o crea una tabla OTP si prefieres)
  await prisma.user.update({
    where: { UserId: userId },
    data: {
      OTP: otp,
      OTPExpires: new Date(Date.now() + 10 * 60 * 1000) // 10 minutos
    }
  });
  // Enviar OTP por correo con diseño corporativo
  await sendOTPEmail(email, otp);
  return otp;
}


export async function createEmployee(email, roleName) {
  // Validar email
  if (!validator.isEmail(email)) {
    throw new Error('Email inválido');
  }
  // Generar ID de trabajo único para recepcionista
  let workId = email;
  if (roleName === 'Recepcionista') {
    workId = 'REC-' + crypto.randomBytes(4).toString('hex');
    // Asegurar unicidad
    while (await prisma.user.findUnique({ where: { Username: workId } })) {
      workId = 'REC-' + crypto.randomBytes(4).toString('hex');
    }
  }
  const password = crypto.randomBytes(8).toString('hex');
  // Usar createUserWithRole para evitar doble hasheo
  const { createUserWithRole } = await import('./adminService.js');
  const user = await createUserWithRole({ email, username: workId, password, roleName });
  return user;
}
// El envío de credenciales ahora se realiza con sendMailToReceptionist desde nodemailer.js
