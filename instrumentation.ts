function stripAnsiCodes(str: string): string {
  // This regex matches all ANSI escape sequences that next.js likes to put in the console logs
  return str.replace(
    // biome-ignore lint/suspicious/noControlCharactersInRegex: Need to match control characters
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
    '',
  );
}

export async function register() {
  const { logger } = await import('~/lib/logging/server/logger');

  const createConsoleMethod = (method: 'error' | 'info' | 'warn' | 'debug') => {
    return (...args: unknown[]) => {
      const data: Record<string, unknown> = {};
      let hasData = false;
      let error: Error | null = null;
      const messages: string[] = [];

      // Mark as next.js built-in log to adjust formatting in logger
      args.push({
        scope: 'NEXT',
      });

      for (const arg of args) {
        if (arg instanceof Error) {
          error = arg;
          continue;
        }

        if (typeof arg === 'object' && arg !== null) {
          Object.assign(data, arg);
          hasData = true;
          continue;
        }

        if (typeof arg === 'string') {
          messages.push(arg);
        }
      }

      let finalMessage = stripAnsiCodes(messages.join(' ')).trim();

      // next.js uses an "x" for the error message when it's an error object
      if (finalMessage === '⨯' && error) {
        finalMessage = error?.message || '';
      }

      if (error && hasData && messages.length > 0) {
        logger[method](finalMessage, { ...data, error });
      } else if (error && messages.length > 0) {
        logger[method](finalMessage, { error });
        // biome-ignore lint/nursery/noUnnecessaryConditions: Required
      } else if (hasData && messages.length > 0) {
        logger[method](finalMessage, data);
      } else if (error && hasData && messages.length === 0) {
        logger[method](finalMessage, { ...data, error });
      } else if (error && messages.length === 0) {
        logger[method](finalMessage, { error });
        // biome-ignore lint/nursery/noUnnecessaryConditions: Required
      } else if (hasData && messages.length === 0) {
        logger[method](finalMessage, data);
      } else {
        logger[method](finalMessage);
      }
    };
  };

  // biome-ignore lint/style/noProcessEnv: Built-in Next.js variable
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.error = createConsoleMethod('error');
    console.log = createConsoleMethod('info' /* default log maps to info */);
    console.info = createConsoleMethod('info');
    console.warn = createConsoleMethod('warn');
    console.debug = createConsoleMethod('debug');
  }
}
