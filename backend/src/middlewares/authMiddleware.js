// src/middlewares/authMiddleware.js
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import logger from '../../config/logger.js'; // Asumiendo que tienes el logger que configuramos

const prisma = new PrismaClient();

/**
 * Middleware de Autenticación Híbrido.
 * 
 * Este middleware es el punto de entrada de seguridad para todas las rutas protegidas.
 * Su trabajo es identificar al usuario sin importar cómo se haya autenticado.
 * 
 * Estrategias que maneja:
 * 1.  Token JWT (en la cabecera 'Authorization'): Usado por la aplicación de escritorio (empleados, admins).
 * 2.  Sesión con Cookie (`express-session`): Usado por el portal web (clientes).
 * 
 * Si la autenticación es exitosa, crea un objeto `req.auth` unificado que
 * los siguientes middlewares y controladores pueden usar de forma consistente.
 * 
 * Ejemplo de req.auth para un empleado: { userId: 1, roles: ['Administrador'], type: 'employee' }
 * Ejemplo de req.auth para un cliente: { clientId: 123, type: 'client' }
 */
export const authenticateHybrid = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const session = req.session;

  // --- Estrategia 1: Autenticación por Token JWT (para Empleados / Admins) ---
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    
    try {
      // Verificamos que el token sea válido y no haya expirado
      const decodedPayload = jwt.verify(token, process.env.JWT_SECRET);
      
      // Si el token es válido, creamos el objeto `req.auth` para el empleado
      req.auth = { 
        userId: decodedPayload.userId, 
        roles: decodedPayload.roles, 
        type: 'employee' 
      };

      logger.info(`Acceso permitido vía JWT para el usuario ID: ${req.auth.userId}`);
      return next(); // Autenticado con éxito, pasamos al siguiente middleware/controlador.
    } catch (err) {
      // El token es inválido (malformado, expirado, etc.)
      logger.warn(`Intento de acceso con token JWT inválido. Error: ${err.message}`);
      return res.status(403).json({ error: 'Token inválido o expirado. Por favor, inicie sesión de nuevo.' });
    }
  }

  // --- Estrategia 2: Autenticación por Sesión/Cookie (para Clientes) ---
  if (session && session.clientId) {
    try {
      // ¡Paso de seguridad crucial! Verificamos que el cliente de la sesión todavía exista en la base de datos.
      const client = await prisma.client.findUnique({
        where: { ClientId: session.clientId }
      });
      
      if (client) {
        // Si el cliente existe, creamos el objeto `req.auth` para el cliente
        req.auth = { 
          clientId: session.clientId, 
          type: 'client' 
        };
        logger.info(`Acceso permitido vía Sesión para el cliente ID: ${req.auth.clientId}`);
        return next(); // Autenticado con éxito, continuamos.
      } else {
        // La sesión apunta a un cliente que ya no existe. Invalidamos la sesión.
        logger.warn(`Sesión inválida para clientId: ${session.clientId} (cliente no encontrado). Destruyendo sesión.`);
        req.session.destroy(); // Limpiamos la sesión corrupta
      }
    } catch (dbError) {
        logger.error(`Error de base de datos al verificar la sesión del cliente: ${dbError.message}`);
        return res.status(500).json({ error: "Error del servidor al verificar la sesión." });
    }
  }

  // --- Fallo de Autenticación ---
  // Si no se encontró ni un Token JWT válido ni una Sesión de cliente válida.
  logger.warn(`Acceso denegado a ruta protegida desde IP: ${req.ip}. No se proporcionó autenticación.`);
  return res.status(401).json({ error: 'Acceso no autorizado. Se requiere autenticación.' });
};

 /**
 * Middleware para proteger rutas solo para clientes autenticados.
 * Debe usarse después de authenticateHybrid.
 */
export function requireClientAuth(req, res, next) {
  if (req.auth && req.auth.type === 'client' && req.auth.clientId) {
    return next();
  }
  return res.status(401).json({ error: 'Solo clientes autenticados pueden acceder a esta ruta.' });
}