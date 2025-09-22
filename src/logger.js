import winston from 'winston';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create logs directory if it doesn't exist
const logsDir = join(dirname(__dirname), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Create logger instance
export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Console output
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // General log file
    new winston.transports.File({ 
      filename: join(logsDir, 'automation.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Error log file
    new winston.transports.File({ 
      filename: join(logsDir, 'errors.log'), 
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});