// src/config/logger.js
import winston from 'winston';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level.toUpperCase()}: ${info.message}`,
  ),
);

const transports = [
  // Mostrar todos los logs en la consola durante el desarrollo
  new winston.transports.Console({
    format: winston.format.combine(winston.format.colorize({ all: true })),
  }),
  // Guardar todos los logs en un archivo
  new winston.transports.File({
    filename: 'logs/all.log',
  }),
  // Guardar solo los logs de error en un archivo separado
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
  }),
];

const logger = winston.createLogger({
  levels,
  format,
  transports,
});

export default logger;