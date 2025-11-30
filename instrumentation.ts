function stripAnsiCodes(str: string): string {
  // This regex matches all ANSI escape sequences that next.js likes to put in the console logs
  return str.replace(
    // biome-ignore lint/suspicious/noControlCharactersInRegex: Need to match control characters
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
    ""
  );
}

function buildLogContext(error: Error | null, data: Record<string, unknown> | null): Record<string, unknown> | null {
  if (error && data) {
    return { ...data, error };
  }
  if (error) {
    return { error };
  }
  if (data) {
    return data;
  }
  return null;
}

function parseConsoleArgs(args: unknown[]): {
  data: Record<string, unknown>;
  hasData: boolean;
  error: Error | null;
  messages: string[];
} {
  const data: Record<string, unknown> = {};
  let hasData = false;
  let error: Error | null = null;
  const messages: string[] = [];

  for (const arg of args) {
    if (arg instanceof Error) {
      error = arg;
    } else if (typeof arg === "object" && arg !== null) {
      Object.assign(data, arg);
      hasData = true;
    } else if (typeof arg === "string") {
      messages.push(arg);
    }
  }

  return { data, hasData, error, messages };
}

function formatMessage(messages: string[], error: Error | null): string {
  let finalMessage = stripAnsiCodes(messages.join(" ")).trim();

  // next.js uses an "x" for the error message when it's an error object
  if (finalMessage === "⨯" && error) {
    finalMessage = error.message || "";
  }

  return finalMessage;
}

export async function register() {
  const { Logger } = await import("~/lib/logging/server/logger");

  const createConsoleMethod = (method: "error" | "info" | "warn" | "debug") => {
    return (...args: unknown[]) => {
      // Mark as next.js built-in log to adjust formatting in logger
      args.push({ scope: "NEXT" });

      const { data, hasData, error, messages } = parseConsoleArgs(args);
      const finalMessage = formatMessage(messages, error);
      const logContext = buildLogContext(error, hasData ? data : null);

      if (logContext) {
        Logger[method](finalMessage, logContext);
      } else {
        Logger[method](finalMessage);
      }
    };
  };

  // biome-ignore lint/style/noProcessEnv: Required to detect runtime in instrumentation.ts
  if (process.env["NEXT_RUNTIME"] === "nodejs") {
    console.error = createConsoleMethod("error");
    console.log = createConsoleMethod("info" /* default log maps to info */);
    console.info = createConsoleMethod("info");
    console.warn = createConsoleMethod("warn");
    console.debug = createConsoleMethod("debug");
  }
}
