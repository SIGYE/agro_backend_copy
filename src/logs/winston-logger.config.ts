import * as winston from 'winston';
import 'winston-daily-rotate-file';

export const winstonLoggerConfig = {
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp }) => {
          return `${timestamp} [${level}] ${message}`;
        }),
      ),
    }),
    // Daily rotate file transport
    new winston.transports.DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',  // Keep logs for 14 days
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
      
    }),
  ],
};
