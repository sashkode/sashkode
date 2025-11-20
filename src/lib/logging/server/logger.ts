import 'server-only';

import pino from 'pino';
import pinoPretty from 'pino-pretty';

import { env } from '~/env/server';

/**
 * Create and configure the server-side Pino logger instance
 */
const createLogger = () => {
  const isDevelopment = env.VERCEL_ENV ? ['development', 'preview'].includes(env.VERCEL_ENV) : true;

  // Create pretty stream in development with custom formatting
  const prettyStream = isDevelopment
    ? pinoPretty({
        colorize: true,
        ignore: 'pid,hostname',
        translateTime: 'SYS:HH:MM:ss.l',
        singleLine: true,
        messageFormat: (log, messageKey, _levelLabel, { colors }) => {
          const action = log.action as string | undefined;
          delete log.action; // Remove action to avoid duplication in the message
          delete log.requestId; // Remove requestId (not needed in message, only in structured data)
          return action ? `${colors.white(`SERVER_ACTION(${colors.magenta(action)})${colors.white(':')}`)} ${log[messageKey]}` : `${log[messageKey]}`;
        },
      })
    : undefined;

  const pinoLogger = pino(
    {
      level: isDevelopment ? 'debug' : 'info',

      // Base fields for all logs
      base: {},

      // Timestamp configuration
      timestamp: pino.stdTimeFunctions.isoTime,

      // Serialize errors properly
      serializers: {
        error: pino.stdSerializers.err,
        req: pino.stdSerializers.req,
        res: pino.stdSerializers.res,
      },

      // Format error objects
      formatters: {
        // level: (label) => ({ level: label }),
      },
    },
    prettyStream,
  );

  // Create wrapper functions that put message first
  return {
    trace: (msg: string, obj?: object) => pinoLogger.trace(obj ?? {}, msg),
    debug: (msg: string, obj?: object) => pinoLogger.debug(obj ?? {}, msg),
    info: (msg: string, obj?: object) => pinoLogger.info(obj ?? {}, msg),
    warn: (msg: string, obj?: object) => pinoLogger.warn(obj ?? {}, msg),
    error: (msg: string, obj?: object) => pinoLogger.error(obj ?? {}, msg),
    fatal: (msg: string, obj?: object) => pinoLogger.fatal(obj ?? {}, msg),
    child: (obj: object) => {
      const childLogger = pinoLogger.child(obj);
      return {
        trace: (msg: string, data?: object) => childLogger.trace(data ?? {}, msg),
        debug: (msg: string, data?: object) => childLogger.debug(data ?? {}, msg),
        info: (msg: string, data?: object) => childLogger.info(data ?? {}, msg),
        warn: (msg: string, data?: object) => childLogger.warn(data ?? {}, msg),
        error: (msg: string, data?: object) => childLogger.error(data ?? {}, msg),
        fatal: (msg: string, data?: object) => childLogger.fatal(data ?? {}, msg),
      };
    },
  };
};

/**
 * Server-side logger instance - use this for all server-side logging
 *
 * Custom wrapper around Pino with message-first format: logger.method(message, dataObject)
 * The message is human-readable, the data object contains structured information
 *
 * @example
 * ```typescript
 * import { logger } from '~/lib/logging/server/logger';
 *
 * logger.info('User signed up', { userId: '123', email: 'user@example.com' });
 * logger.error('Database error', { error: error.message, query: 'SELECT...' });
 * ```
 */
export const logger = createLogger();
