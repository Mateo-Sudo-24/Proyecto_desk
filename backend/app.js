// app.js
import express from 'express';
import session from 'express-session'; // Necesitamos session para los clientes
import helmet from 'helmet';
import cors from 'cors';
// ... otros imports

// --- Importar rutas y middlewares ---
import employeeRoutes from './src/routes/employeeRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import clientRoutes from './src/routes/clientRoutes.js';
import authRoutes from './src/routes/auth.js'; // Login de empleados (JWT)
import clientAuthRoutes from './src/routes/client-auth.js'; // Login de clientes (Session)
import { authenticateHybrid } from './src/middlewares/authMiddleware.js';

const app = express();

app.use(helmet());
app.use(cors({ 
  origin: [process.env.URL_FRONTEND_WEB, 'http://localhost:5173'], // Array de orígenes permitidos
  credentials: true 
}));
// ... otros middlewares de seguridad

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración de Sesión (SOLO para el portal web de clientes)
app.use(session({
  secret: process.env.SESSION_SECRET || 'a-very-strong-secret-for-clients',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', // true en producción (HTTPS)
    httpOnly: true, // Previene acceso desde JS en el navegador
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

// --- Rutas de Autenticación (Públicas) ---
app.use('/api/auth', authRoutes); // Para empleados
app.use('/api/client-auth', clientAuthRoutes); // Para clientes

// --- Rutas Protegidas ---
// Todas las rutas de aquí en adelante primero pasarán por nuestro middleware híbrido
app.use('/api/employee', authenticateHybrid, employeeRoutes);
app.use('/api/admin', authenticateHybrid, adminRoutes);
app.use('/api/client', authenticateHybrid, clientRoutes);

// ...
export default app;