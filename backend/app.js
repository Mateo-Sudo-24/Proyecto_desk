import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import cors from 'cors';
import xss from 'xss-clean';
import hpp from 'hpp';
import compression from 'compression';
import csrf from 'csurf';

import employeeRoutes from './src/routes/employeeRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import clientRoutes from './src/routes/clientRoutes.js';
import authRoutes from './auth.js';

const app = express();


// Seguridad HTTP
app.use(helmet());
app.use(cors({ origin: process.env.URL_FRONTEND || '*', credentials: true }));
app.use(xss()); // Limpieza XSS
app.use(hpp()); // Previene contaminación de parámetros HTTP
app.use(compression()); // Compresión de respuestas

// CSRF protection (solo para rutas que no sean GET ni OPTIONS)
const csrfProtection = csrf({ cookie: false });
app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  csrfProtection(req, res, next);
});

// Middlewares básicos
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Cambia a true si usas HTTPS
}));

// Rutas de autenticación
app.use('/api/auth', authRoutes);


// Rutas de empleados
app.use('/api/employees', employeeRoutes);

// Rutas de administración (roles, usuarios)
app.use('/api/admin', adminRoutes);

// Rutas de cliente (consulta de estado de orden)
app.use('/api/client', clientRoutes);

// Ruta de prueba
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

export default app;
