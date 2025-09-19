import express from 'express';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import validator from 'validator';

const prisma = new PrismaClient();
const router = express.Router();

// Rate limiting para evitar ataques de fuerza bruta
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // máximo 10 intentos por IP
  message: 'Demasiados intentos de inicio de sesión, intenta más tarde.'
});

// Login seguro con JWT
router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  if (!validator.isAlphanumeric(username) || !validator.isLength(password, { min: 8 })) {
    return res.status(400).json({ error: 'Datos inválidos' });
  }
  const user = await prisma.user.findUnique({ where: { Username: username }, include: { userRoles: { include: { role: true } } } });
  if (!user || !user.Active) return res.status(401).json({ error: 'Credenciales inválidas o usuario inactivo' });
  const valid = await bcrypt.compare(password, Buffer.from(user.PasswordHash).toString());
  if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });
  const roles = user.userRoles.map(ur => ur.role.Name);
  // Generar JWT
  const token = jwt.sign({ userId: user.UserId, roles }, process.env.JWT_SECRET, { expiresIn: '2h' });
  res.json({ message: 'Autenticado', token, user: { id: user.UserId, username: user.Username, roles } });
});

// Middleware para verificar JWT en endpoints protegidos
export function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Token requerido' });
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido o expirado' });
    req.user = user;
    next();
  });
}

// Logout (solo borra el token en frontend)
router.post('/logout', (req, res) => {
  res.json({ message: 'Sesión cerrada (token inválido en frontend)' });
});

export default router;
