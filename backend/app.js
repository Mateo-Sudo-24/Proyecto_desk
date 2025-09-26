// app.js (VERSIÓN FINAL HÍBRIDA con ÓRDENES)
import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';

// --- Importar Lógica Personalizada ---
import httpLogger from './src/middlewares/httpLogger.middleware.js'; // <-- Logging
import employeeAuthRoutes from './src/routes/auth.js';              // <-- Login para Empleados (JWT)
import clientAuthRoutes from './src/routes/client-auth.js';         // <-- Login para Clientes (Session)
import adminRoutes from './src/routes/adminRoutes.js';
import employeeRoutes from './src/routes/employeeRoutes.js';
import clientRoutes from './src/routes/clientRoutes.js';
import orderRoutes from './src/routes/orderRoutes.js';              // ✅ Nueva ruta de órdenes
import { authenticateHybrid } from './src/middlewares/authMiddleware.js'; // <-- Middleware híbrido

dotenv.config();
const app = express();

// --- Middlewares de Seguridad y Utilidad ---
app.use(helmet());
app.use(cors({
  origin: [
    process.env.URL_FRONTEND_WEB || 'http://localhost:5173',
    process.env.URL_FRONTEND_DESK
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(httpLogger); // <-- Log de todas las peticiones

// --- Configuración de Sesión (SOLO PARA CLIENTES WEB) ---
app.use(session({
  secret: process.env.SESSION_SECRET || 'a-very-strong-secret-for-clients',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

// --- Rutas de Autenticación (Públicas y Separadas) ---
app.use('/api/auth', employeeAuthRoutes);      // Empleados/Admins (JWT)
app.use('/api/client-auth', clientAuthRoutes); // Clientes (Session)

// --- Rutas Protegidas ---
// Todas las rutas pasan por el middleware híbrido
app.use('/api/admin', authenticateHybrid, adminRoutes);
app.use('/api/employee', authenticateHybrid, employeeRoutes);
app.use('/api/client', authenticateHybrid, clientRoutes);
app.use('/api/orders', authenticateHybrid, orderRoutes); // ✅ Órdenes (PDF facturas, consultas)

// --- Manejo Centralizado de Errores ---
app.use((err, req, res, next) => {
  console.error(err.stack); // ⚠️ Aquí idealmente usarías tu logger
  res.status(500).json({ error: 'Ha ocurrido un error interno en el servidor.' });
});

export default app;
