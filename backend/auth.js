// src/routes/auth.js (Para Empleados)
import express from 'express';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

const prisma = new PrismaClient();
const router = express.Router();

// Rate limiting para login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Demasiados intentos de inicio de sesión, intenta más tarde.'
});

// Login para empleados (devuelve JWT)
router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  
  const user = await prisma.user.findUnique({
    where: { Username: username },
    include: { userRoles: { include: { role: true } } }
  });

  if (!user || !user.Active) {
    return res.status(401).json({ error: 'Credenciales inválidas o usuario inactivo' });
  }

  const valid = await bcrypt.compare(password, user.PasswordHash.toString());
  if (!valid) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const roles = user.userRoles.map(ur => ur.role.Name);
  
  // Generar JWT con userId y roles
  const token = jwt.sign(
    { userId: user.UserId, roles }, 
    process.env.JWT_SECRET, 
    { expiresIn: '8h' }
  );
  
  res.json({ message: 'Autenticado', token, user: { id: user.UserId, username: user.Username, roles } });
});

export default router;