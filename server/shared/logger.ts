/**
 * Minimal structured logger for the Healory API server.
 *
 * Outputs log lines in the format:
 *   [LEVEL] [timestamp] message  {meta?}
 *
 * In production, swap the console.* calls here for a
 * JSON-line logger (e.g. pino) without touching call sites.
 */

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

const LEVEL_RANK: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO:  1,
  WARN:  2,
  ERROR: 3,
};

const MIN_LEVEL: LogLevel =
  process.env.LOG_LEVEL === "DEBUG"
    ? "DEBUG"
    : process.env.NODE_ENV === "production"
    ? "INFO"
    : "DEBUG";

function shouldLog(level: LogLevel): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[MIN_LEVEL];
}

function timestamp(): string {
  return new Date().toISOString();
}

function format(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  const base = `[${level}] ${timestamp()} ${message}`;
  if (meta && Object.keys(meta).length > 0) {
    try {
      return `${base} ${JSON.stringify(meta)}`;
    } catch {
      return base;
    }
  }
  return base;
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog("DEBUG")) console.debug(format("DEBUG", message, meta));
  },

  info(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog("INFO")) console.info(format("INFO", message, meta));
  },

  warn(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog("WARN")) console.warn(format("WARN", message, meta));
  },

  error(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog("ERROR")) console.error(format("ERROR", message, meta));
  },
};
