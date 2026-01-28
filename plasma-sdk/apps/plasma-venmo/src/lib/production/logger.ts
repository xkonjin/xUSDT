
import pino from 'pino';
import { randomUUID } from 'crypto';

/**
 * A list of keys that should be redacted from logs.
 */
const SENSITIVE_KEYS: ReadonlyArray<string> = [
  'password',
  'token',
  'authorization',
  'auth',
  'secret',
  'key',
  'apiKey',
  'pass',
  'access_token',
  'refresh_token',
  'creditCard',
  'cvv',
  'ssn',
];

/**
 * Deeply sanitizes an object by redacting sensitive keys.
 * @param obj The object to sanitize.
 * @returns A new sanitized object.
 */
const sanitize = (obj: unknown): unknown => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitize);
  }

  const sanitizedObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
        sanitizedObj[key] = '[REDACTED]';
      } else {
        sanitizedObj[key] = sanitize((obj as { [key: string]: any })[key]);
      }
    }
  }
  return sanitizedObj;
};

/**
 * The configuration for the Pino logger.
 */
const loggerConfig: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    log(object) {
      return sanitize(object) as object;
    },
  },
  mixin() {
    return { requestId: randomUUID() };
  },
  base: {
    env: process.env.NODE_ENV || 'development',
    appName: 'xUSDT/Plenmo',
  },
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname,reqId,res,req.remoteAddress,req.remotePort,req.id,requestId,appName,env',
      },
    },
  }),
};

/**
 * The production-ready structured logger.
 */
const logger = pino(loggerConfig);

export default logger;
