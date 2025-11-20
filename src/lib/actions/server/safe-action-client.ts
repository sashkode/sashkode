import 'server-only';

import { createSafeActionClient } from 'next-safe-action';
import { z } from 'zod';

import { logger } from '~/lib/logging/server/logger';
import { type KebabCase, kebabCaseSchema } from '~/lib/validation/shared/kebab-case';

/**
 * Default error message returned to clients when an unexpected server error occurs
 */
const DEFAULT_SERVER_ERROR_MESSAGE = 'An unexpected error occurred. Please try again later.';

/**
 * HTTP error codes used throughout the application for client and server errors
 */
const errorErrorCodes = {
  // 4xx Client Errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  IM_A_TEAPOT: 418,
  CONFLICT: 409,
  GONE: 410,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,

  // 5xx Server Errors
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Branded type for error codes to ensure type safety
 */
type ErrorCode = (typeof errorErrorCodes)[keyof typeof errorErrorCodes] & {
  _brand: 'ErrorCode';
};

/**
 * Exported HTTP status codes for use in error handling and responses
 */
export const ErrorCode = errorErrorCodes as Record<keyof typeof errorErrorCodes, ErrorCode>;

/**
 * Custom error class for known application errors with enhanced metadata
 *
 * @example
 * ```typescript
 * throw new ServerError('User not found', ErrorCode.NOT_FOUND);
 *
 * throw new ServerError('Invalid data', {
 *   errorCode: ErrorCode.BAD_REQUEST,
 *   context: { field: 'email' }
 * });
 * ```
 */
export class ServerError extends Error {
  public readonly code?: string;
  public readonly errorCode: ErrorCode;
  public readonly context?: Record<string, unknown>;

  constructor(message: string, errorCode?: ErrorCode);
  constructor(
    message: string,
    options?: {
      errorCode?: ErrorCode;
      context?: Record<string, unknown>;
    },
  );
  constructor(message: string, optionsOrErrorCode?: { errorCode?: ErrorCode; context?: Record<string, unknown> } | ErrorCode) {
    super(message);
    this.name = 'ServerError';
    this.errorCode = (typeof optionsOrErrorCode === 'object' ? optionsOrErrorCode.errorCode : optionsOrErrorCode) ?? (500 as ErrorCode);
    this.code = Object.entries(errorErrorCodes).find(([_, value]) => value === this.errorCode)?.[0];
    this.context = typeof optionsOrErrorCode === 'object' ? optionsOrErrorCode.context : undefined;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ServerError);
    }
  }
}

/**
 * Zod schema for validating action metadata
 */
const metadataSchema = z.object({
  actionName: kebabCaseSchema(),
});

/**
 * Type for action metadata with kebab-case validation on the action name
 *
 * @template T - String literal type for the action name
 */
type ActionMetadata<T extends string> = {
  actionName: KebabCase<'actionName', T>;
} & Omit<z.infer<typeof metadataSchema>, 'actionName'>;

/**
 * Creates a configured server action client with logging, error handling, and execution tracking
 *
 * Features:
 * - Automatic request ID generation and logging
 * - Comprehensive error handling with structured logging
 * - Execution time tracking
 * - Validation error formatting
 * - Context injection (requestId, logger)
 *
 * @template T - String literal type for the action name (must be kebab-case)
 * @param metadata - Configuration object containing the action name
 * @returns A configured safe action client instance
 *
 * @example
 * ```typescript
 * export const myAction = createServerAction({ actionName: 'my-action' })
 *   .inputSchema(z.object({ email: z.string().email() }))
 *   .action(async ({ parsedInput, ctx }) => {
 *     ctx.logger.info('Processing action');
 *     return { success: true };
 *   });
 * ```
 */
export const createServerAction = <T extends string>(metadata: ActionMetadata<T>) => {
  const requestId = crypto.randomUUID();
  const actionLogger = logger.child({ action: metadata.actionName, requestId });
  return createSafeActionClient({
    defineMetadataSchema: () => metadataSchema,
    handleServerError: (e, utils) => {
      const { clientInput } = utils;

      actionLogger.debug('Caught a server error! 🧪', {
        errorType: e.constructor.name,
        errorMessage: e.message,
        errorCode: e instanceof ServerError ? e.errorCode : undefined,
        errorContext: e instanceof ServerError ? e.context : undefined,
        clientInput: typeof clientInput === 'object' ? clientInput : { raw: clientInput },
        stack: e.stack,
      });

      if (e instanceof ServerError) return e.message;
      return DEFAULT_SERVER_ERROR_MESSAGE;
    },
    defaultValidationErrorsShape: 'flattened',
  })
    .metadata(metadata as z.infer<typeof metadataSchema>)
    .use(({ next }) =>
      next({
        ctx: { requestId, logger: actionLogger },
      }),
    )
    .use(async ({ next, clientInput }) => {
      const startTime = Date.now();

      actionLogger.info('Starting execution!', {
        clientInput: typeof clientInput === 'object' ? clientInput : { raw: clientInput },
      });

      try {
        const result = await next();
        const executionDuration = Date.now() - startTime;

        if (result.success) {
          actionLogger.info('Completed successfully!', {
            data: result.data,
            executionDuration,
          });
        } else if (result.validationErrors) {
          actionLogger.warn('Completed with validation errors!', {
            validationErrors: result.validationErrors,
            executionDuration,
          });
        } else if (result.serverError) {
          if (result.serverError === DEFAULT_SERVER_ERROR_MESSAGE) {
            actionLogger.error('Completed with unknown server error!', {
              executionDuration,
            });
          } else {
            actionLogger.warn('Completed with known server error!', {
              serverError: result.serverError,
              executionDuration,
            });
          }
        }

        return result;
      } catch (error) {
        const executionDuration = Date.now() - startTime;
        actionLogger.error('Failed with exception!', {
          executionDuration,
        });
        throw error;
      }
    });
};
