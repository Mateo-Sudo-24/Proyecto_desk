// src/middlewares/httpLogger.middleware.js
import morgan from 'morgan';
import logger from '../config/logger.js';

const stream = {
  // Usa el nivel 'http' de Winston
  write: (message) => logger.http(message.trim()),
};

const skip = () => {
  const env = process.env.NODE_ENV || 'development';
  return env !== 'development';
};

// Morgan captura la info de la petición y la pasa a Winston para que la guarde
const httpLogger = morgan(
  ':method :url :status :res[content-length] - :response-time ms',
  { stream, skip }
);

export default httpLogger;