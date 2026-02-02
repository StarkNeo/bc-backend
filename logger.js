const winston = require('winston');
require('winston-daily-rotate-file');

const logFormat = winston.format.printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level.toUpperCase()}] ${message}`;
});

const transportAll = new winston.transports.DailyRotateFile({
  filename: 'logs/app-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '10m',
  maxFiles: '30d'
});

const transportErrors = new winston.transports.DailyRotateFile({
  filename: 'logs/errors-%DATE%.log',
  level: 'error',
  datePattern: 'YYYY-MM-DD',
  maxSize: '10m',
  maxFiles: '60d'
});

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    logFormat
  ),
  transports: [
    transportAll,
    transportErrors,
    new winston.transports.Console()
  ]
});

module.exports = logger;