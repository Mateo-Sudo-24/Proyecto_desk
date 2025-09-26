// src/routes/client-auth.js (NUEVO)
import express from 'express';
import { PrismaClient } from '@prisma/client';
import rateLimit from 'express-rate-limit';
import validator from 'validator';

const prisma = new PrismaClient();
const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Demasiados intentos, por favor intente más tarde.'
});

// Login para clientes (CREA UNA SESIÓN, NO DEVUELVE TOKEN)
router.post('/login', loginLimiter, async (req, res) => {
  const { email, idNumber } = req.body; // Login con email y cédula

  if (!validator.isEmail(email) || !idNumber) {
    return res.status(400).json({ error: 'Email y número de identificación son requeridos.' });
  }
  // En un caso real, aquí iría la lógica de contraseña, confirmación y OTP.
  // Por ahora, lo mantenemos simple para la prueba.
  const client = await prisma.client.findFirst({
    where: {
      Email: email,
      IdNumber: idNumber
    }
  });

  if (!client) {
    return res.status(401).json({ error: 'Las credenciales proporcionadas son incorrectas.' });
  }

  // Si el cliente es válido, guardamos su ID en la sesión
  req.session.clientId = client.ClientId;

  res.json({
    message: 'Cliente autenticado con éxito',
    client: { id: client.ClientId, name: client.DisplayName }
  });
});

// Logout para clientes (DESTRUYE LA SESIÓN)
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ message: 'No se pudo cerrar la sesión.' });
    }
    res.clearCookie('connect.sid'); // Limpia la cookie del navegador
    res.json({ message: 'Sesión cerrada con éxito.' });
  });
});

export default router;