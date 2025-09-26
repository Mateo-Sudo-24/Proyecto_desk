import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const level = process.env.NODE_ENV === 'development' ? 'debug' : 'info';

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    (info) => `[${info.timestamp}] ${info.level.toUpperCase()}: ${info.message}`,
  ),
);

const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    (info) => `[${info.timestamp}] ${info.level}: ${info.message}`,
  ),
);

const transports = [
  new winston.transports.Console({ format: consoleFormat }),
  new DailyRotateFile({
    filename: 'logs/%DATE%-combined.log',
    datePattern: 'YYYY-MM-DD',
    maxFiles: '14d',
  }),
  new DailyRotateFile({
    filename: 'logs/%DATE%-error.log',
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxFiles: '30d',
  }),
];

const logger = winston.createLogger({
  level,
  levels,
  format,
  transports,
});

export default logger;
