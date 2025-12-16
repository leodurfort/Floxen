/**
 * Enhanced logger with structured logging and error context.
 * Provides timestamps, error stacks, and metadata for debugging.
 */

interface LogMetadata {
  [key: string]: unknown;
  error?: Error;
  userId?: string;
  shopId?: string;
  productId?: string;
  requestId?: string;
}

function formatLog(level: string, msg: string, meta?: LogMetadata): string {
  const timestamp = new Date().toISOString();
  const logEntry: Record<string, unknown> = {
    timestamp,
    level,
    message: msg,
  };

  if (meta) {
    // Extract error details if present
    if (meta.error instanceof Error) {
      logEntry.error = {
        name: meta.error.name,
        message: meta.error.message,
        stack: meta.error.stack,
      };
      // Remove error from meta to avoid duplication
      const { error, ...restMeta } = meta;
      if (Object.keys(restMeta).length > 0) {
        logEntry.metadata = restMeta;
      }
    } else {
      logEntry.metadata = meta;
    }
  }

  return JSON.stringify(logEntry);
}

export const logger = {
  info: (msg: string, meta?: LogMetadata) => {
    console.log(formatLog('INFO', msg, meta));
  },

  warn: (msg: string, meta?: LogMetadata) => {
    console.warn(formatLog('WARN', msg, meta));
  },

  error: (msg: string, meta?: LogMetadata) => {
    console.error(formatLog('ERROR', msg, meta));
  },

  debug: (msg: string, meta?: LogMetadata) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(formatLog('DEBUG', msg, meta));
    }
  },
};
