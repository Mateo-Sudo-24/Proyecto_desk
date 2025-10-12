// src/middlewares/httpLogger.middleware.js (MEJORADO)
import morgan from 'morgan';
import logger from '../../config/logger.js';

/**
 * Stream personalizado para enviar logs de Morgan a Winston
 */
const stream = {
  write: (message) => {
    // Usa el nivel 'http' de Winston para logs de peticiones HTTP
    logger.http(message.trim());
  },
};

/**
 * Función para determinar si se debe omitir el log
 * En producción, podemos omitir logs de health checks y assets estáticos
 */
const skip = (req, res) => {
  const env = process.env.NODE_ENV || 'development';
  
  // En desarrollo, loguear todo
  if (env === 'development') {
    return false;
  }

  // En producción, omitir:
  // 1. Health checks
  if (req.url === '/health' || req.url === '/api/health') {
    return true;
  }

  // 2. Assets estáticos (si tienes)
  if (req.url.startsWith('/static') || req.url.startsWith('/assets')) {
    return true;
  }

  // 3. Requests exitosos simples (opcional)
  // if (res.statusCode < 400) {
  //   return true;
  // }

  return false;
};

/**
 * Token personalizado para incluir ID de usuario
 * Muestra quién hizo la petición
 */
morgan.token('user-id', (req) => {
  // Intenta obtener el ID desde diferentes fuentes (híbrido)
  if (req.auth?.userId) return `User:${req.auth.userId}`;
  if (req.auth?.clientId) return `Client:${req.auth.clientId}`;
  if (req.user?.id) return `User:${req.user.id}`;
  if (req.session?.userId) return `User:${req.session.userId}`;
  if (req.session?.clientId) return `Client:${req.session.clientId}`;
  return 'Anonymous';
});

/**
 * Token personalizado para tipo de autenticación
 */
morgan.token('auth-type', (req) => {
  if (req.auth?.authMethod) return req.auth.authMethod.toUpperCase();
  if (req.headers.authorization?.startsWith('Bearer')) return 'JWT';
  if (req.session?.userId || req.session?.clientId) return 'SESSION';
  return 'NONE';
});

/**
 * Token personalizado para roles
 */
morgan.token('user-roles', (req) => {
  if (req.auth?.roles) {
    return Array.isArray(req.auth.roles) 
      ? req.auth.roles.join(',') 
      : req.auth.roles;
  }
  return 'N/A';
});

/**
 * Formato para desarrollo
 * Incluye colores y más detalles
 */
const devFormat = morgan(
  '[:date[iso]] :method :url :status :response-time ms - :res[content-length] bytes | :user-id (:auth-type) | Roles: :user-roles',
  { stream, skip }
);

/**
 * Formato para producción
 * Más compacto, incluye info esencial
 */
const prodFormat = morgan(
  ':remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms',
  { stream, skip }
);

/**
 * Formato combinado que incluye información de autenticación
 */
const combinedFormat = morgan(
  ':remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" | Auth: :auth-type | Roles: :user-roles | :response-time ms',
  { stream, skip }
);

/**
 * Middleware de logging HTTP principal
 * Elige el formato según el entorno
 */
const httpLogger = process.env.NODE_ENV === 'production' 
  ? prodFormat 
  : devFormat;

/**
 * Middleware adicional para loguear errores HTTP detallados
 * Captura errores 4xx y 5xx con más contexto
 */
export const httpErrorLogger = (err, req, res, next) => {
  // Solo loguear errores HTTP (4xx, 5xx)
  if (res.statusCode >= 400) {
    logger.error('HTTP Error', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      errorMessage: err.message,
      errorStack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      userId: req.auth?.userId || req.auth?.clientId || 'Anonymous',
      authType: req.auth?.authMethod || 'NONE',
      ip: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date().toISOString(),
      body: process.env.NODE_ENV === 'development' ? req.body : undefined,
      query: process.env.NODE_ENV === 'development' ? req.query : undefined
    });
  }
  next(err);
};

/**
 * Middleware para loguear peticiones lentas
 * Útil para detectar problemas de rendimiento
 */
export const slowRequestLogger = (threshold = 1000) => {
  return (req, res, next) => {
    const start = Date.now();

    // Interceptar el final de la respuesta
    res.on('finish', () => {
      const duration = Date.now() - start;
      
      // Si la petición tardó más del threshold, loguear
      if (duration > threshold) {
        logger.warn('Slow Request Detected', {
          method: req.method,
          url: req.url,
          duration: `${duration}ms`,
          statusCode: res.statusCode,
          userId: req.auth?.userId || req.auth?.clientId || 'Anonymous',
          timestamp: new Date().toISOString()
        });
      }
    });

    next();
  };
};

/**
 * Middleware para auditoría de acciones críticas
 * Loguea operaciones importantes (CREATE, UPDATE, DELETE)
 */
export const auditLogger = (req, res, next) => {
  // Solo auditar operaciones de escritura
  const criticalMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  
  if (criticalMethods.includes(req.method)) {
    // Interceptar la respuesta exitosa
    const originalJson = res.json.bind(res);
    
    res.json = (body) => {
      // Si la operación fue exitosa (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        logger.info('Audit Log', {
          action: req.method,
          endpoint: req.url,
          userId: req.auth?.userId || req.auth?.clientId,
          userType: req.auth?.type,
          roles: req.auth?.roles,
          statusCode: res.statusCode,
          timestamp: new Date().toISOString(),
          // No loguear el body completo por seguridad, solo metadata
          affectedResource: req.params?.id || req.body?.id || 'N/A'
        });
      }
      
      return originalJson(body);
    };
  }

  next();
};

// Exportar el logger principal por defecto
export default httpLogger;

// También exportar los diferentes formatos por si se necesitan
export { devFormat, prodFormat, combinedFormat };