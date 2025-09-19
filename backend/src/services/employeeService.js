
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import validator from 'validator';
import { sendMailToReceptionist } from '../../config/nodemailer.js';
const prisma = new PrismaClient();

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
  const hashedPassword = await bcrypt.hash(password, 10);

  const role = await prisma.role.findUnique({ where: { Name: roleName } });
  if (!role) throw new Error(`Rol no encontrado: ${roleName}`);

  const user = await prisma.user.create({
    data: {
      Username: workId,
      PasswordHash: Buffer.from(hashedPassword),
      Email: email,
      Active: true,
      userRoles: {
        create: [{ RoleId: role.RoleId }]
      }
    }
  });

  if (roleName === 'Recepcionista') {
    await sendMailToReceptionist(email, workId, password);
  } else {
    // Aquí podrías enviar correo para otros roles si lo deseas
  }
  return user;
}
// El envío de credenciales ahora se realiza con sendMailToReceptionist desde nodemailer.js
