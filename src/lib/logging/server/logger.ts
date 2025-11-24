import 'server-only';

import { customAlphabet } from 'nanoid';
import pino from 'pino';
import pinoPretty from 'pino-pretty';

import { env } from '~/env/server';
import type { KebabCase } from '~/lib/validation/shared/kebab-case';
import type { ScreamingSnakeCase } from '~/lib/validation/shared/screaming-snake-case';

/**
 * Simple `nanoid` generator for unique request IDs with the base58 alphabet (no easily confused characters)
 */
const generateId = customAlphabet('abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ123456789', 22);

const createPinoLogger = () => {
  const isLocal = !env.VERCEL_ENV;
  const isDevelopment = env.VERCEL_ENV ? ['development', 'preview'].includes(env.VERCEL_ENV) : true;

  // Create pretty stream in development with custom formatting
  const prettyStream = isLocal
    ? pinoPretty({
        colorize: true,
        ignore: 'pid,hostname',
        translateTime: 'SYS:HH:MM:ss.l',
        singleLine: true,
        messageFormat: (log, messageKey, _levelLabel, { colors }) => {
          let message = log[messageKey];

          const scope = log.scope as string | undefined;
          const topic = log.topic as string | undefined;

          if ('scope' in log) delete log.scope;
          if ('topic' in log) delete log.topic;

          // Logs with scope/topic
          if (scope) {
            let formattedMessage = `(${scope}`;
            if (topic) formattedMessage += `:${colors.magenta(topic)}`;
            formattedMessage += ')';
            message = `${colors.white(`${formattedMessage}:`)} ${log[messageKey]}`;
          }

          return `\b\b ${message}`; // prepend "\b\b" to move cursor back and overwrite the ": " added by pino-pretty after the level label
        },
      })
    : undefined;

  const pinoLoggerInstance = pino(
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
    },
    prettyStream,
  );

  return pinoLoggerInstance;
};

/**
 * Includes additional fields for structured log objects
 */
type LogObject<Scope extends string, Topic extends string> = {
  [key: string]: unknown;
  ignore?: string[];
} & (
  | {
      scope: ScreamingSnakeCase<'scope', Scope>;
      topic?: KebabCase<'topic', Topic>;
    }
  | {
      scope?: undefined;
      topic?: undefined;
    }
);

/**
 * Create and configure the server-side Pino logger instance
 */
const createLogger = () => {
  // Create the Pino logger instance
  const pinoLoggerInstance = createPinoLogger();

  // Create wrapper functions that put message first
  return {
    trace: <Scope extends string, Topic extends string>(msg: string, obj?: LogObject<Scope, Topic>) => pinoLoggerInstance.trace(obj ?? {}, msg),
    debug: <Scope extends string, Topic extends string>(msg: string, obj?: LogObject<Scope, Topic>) => pinoLoggerInstance.debug(obj ?? {}, msg),
    info: <Scope extends string, Topic extends string>(msg: string, obj?: LogObject<Scope, Topic>) => pinoLoggerInstance.info(obj ?? {}, msg),
    warn: <Scope extends string, Topic extends string>(msg: string, obj?: LogObject<Scope, Topic>) => pinoLoggerInstance.warn(obj ?? {}, msg),
    error: <Scope extends string, Topic extends string>(msg: string, obj?: LogObject<Scope, Topic>) => pinoLoggerInstance.error(obj ?? {}, msg),
    fatal: <Scope extends string, Topic extends string>(msg: string, obj?: LogObject<Scope, Topic>) => pinoLoggerInstance.fatal(obj ?? {}, msg),
    child: <Scope extends string, Topic extends string>(obj: LogObject<Scope, Topic>) => {
      const childLogger = pinoLoggerInstance.child(
        Object.assign(obj, {
          correlationId: `corr_${generateId()}`,
        }),
      );
      return {
        trace: <Scope extends string, Topic extends string>(msg: string, data?: LogObject<Scope, Topic>) => childLogger.trace(data ?? {}, msg),
        debug: <Scope extends string, Topic extends string>(msg: string, data?: LogObject<Scope, Topic>) => childLogger.debug(data ?? {}, msg),
        info: <Scope extends string, Topic extends string>(msg: string, data?: LogObject<Scope, Topic>) => childLogger.info(data ?? {}, msg),
        warn: <Scope extends string, Topic extends string>(msg: string, data?: LogObject<Scope, Topic>) => childLogger.warn(data ?? {}, msg),
        error: <Scope extends string, Topic extends string>(msg: string, data?: LogObject<Scope, Topic>) => childLogger.error(data ?? {}, msg),
        fatal: <Scope extends string, Topic extends string>(msg: string, data?: LogObject<Scope, Topic>) => childLogger.fatal(data ?? {}, msg),
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
 * import { Logger } from '~/lib/logging/server/logger';
 *
 * Logger.info('User signed up', { userId: '123', email: 'user@example.com' });
 * Logger.error('Database error', { error: error.message, query: 'SELECT...' });
 * ```
 */
export const Logger = createLogger();
