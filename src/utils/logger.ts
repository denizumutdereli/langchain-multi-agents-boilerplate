import winston from 'winston';
import { config } from '../config/config';

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
} as const;

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
} as const;

winston.addColors(colors);

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    // Only include timestamp for error and warn levels
    if (info.level.includes('error') || info.level.includes('warn')) {
      return `${info.timestamp} ${info.level}: ${info.message}`;
    }
    return `${info.level}: ${info.message}`;
  }),
);

const transports = [
  new winston.transports.Console({
    level: config.logging.level,
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf((info) => {
        if (info.level.includes('error') || info.level.includes('warn')) {
          return `${info.timestamp} ${info.level}: ${info.message}`;
        }
        return `${info.level}: ${info.message}`;
      })
    )
  }),
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
  }),
  new winston.transports.File({
    filename: 'logs/all.log',
    level: config.logging.level,
  })
];

export const logger = winston.createLogger({
  level: config.logging.level,
  levels: logLevels,
  format,
  transports,
});

// Capture unhandled exceptions and rejections
logger.exceptions.handle(
  new winston.transports.File({ filename: 'logs/exceptions.log' })
);
logger.rejections.handle(
  new winston.transports.File({ filename: 'logs/rejections.log' })
);

console.log('Logger initialized successfully');