/**
 * STRUCTURED LOGGER FACADE
 *
 * Thin wrapper around console that produces structured JSON logs in production
 * and human-readable output in development.
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.error("Request failed", { endpoint, status });
 *   logger.warn("Blocked path", { path });
 *   logger.info("Template created", { templateId });
 *   logger.debug("Cache hit", { key });  // only emitted in development
 *
 * Correlation IDs:
 *   const reqLogger = logger.child({ requestId, organizationId });
 *   reqLogger.info("Template created", { templateId });
 *   // → logs include requestId + organizationId on every call
 */

type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  [key: string]: unknown;
}

/** A child logger with a fixed base context merged into every call. */
export interface ChildLogger {
  debug: (message: string, context?: LogContext) => void;
  info:  (message: string, context?: LogContext) => void;
  warn:  (message: string, context?: LogContext) => void;
  error: (message: string, context?: LogContext) => void;
  /** Create a further-nested child, merging additional fixed context. */
  child: (additionalContext: LogContext) => ChildLogger;
}

const isDev = process.env.NODE_ENV === "development";

function emit(level: LogLevel, message: string, context?: LogContext): void {
  if (typeof window === "undefined") {
    // Server-side (Next.js route handlers, server components):
    // Emit JSON for log aggregators (Vercel log drain, Datadog, etc.)
    const entry: Record<string, unknown> = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...context,
    };
    const line = JSON.stringify(entry);
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  } else if (isDev) {
    // Browser dev: readable format with context
    const tag = `[${level.toUpperCase()}]`;
    if (level === "error") console.error(tag, message, context ?? "");
    else if (level === "warn") console.warn(tag, message, context ?? "");
    else console.log(tag, message, context ?? "");
  } else {
    // Browser production: only emit errors and warnings to avoid leaking internals
    if (level === "error") console.error(message, context ?? "");
    else if (level === "warn") console.warn(message, context ?? "");
    // info/debug silenced in browser production
  }
}

function makeChild(base: LogContext): ChildLogger {
  const merge = (ctx?: LogContext): LogContext => ({ ...base, ...ctx });
  return {
    debug: (message, context) => { if (isDev) emit("debug", message, merge(context)); },
    info:  (message, context) => emit("info",  message, merge(context)),
    warn:  (message, context) => emit("warn",  message, merge(context)),
    error: (message, context) => emit("error", message, merge(context)),
    child: (additionalContext) => makeChild({ ...base, ...additionalContext }),
  };
}

export const logger = {
  /** Verbose — only emitted in development */
  debug: (message: string, context?: LogContext) => {
    if (isDev) emit("debug", message, context);
  },
  info:  (message: string, context?: LogContext) => emit("info",  message, context),
  warn:  (message: string, context?: LogContext) => emit("warn",  message, context),
  error: (message: string, context?: LogContext) => emit("error", message, context),

  /**
   * Create a child logger with fixed context merged into every subsequent call.
   * Use this to attach correlation IDs (requestId, organizationId, userId) at
   * the start of a request/flow so every log from that scope carries them.
   *
   * @example
   * const reqLogger = logger.child({ requestId: req.id, organizationId });
   * reqLogger.info("Processing import job", { jobId });
   * reqLogger.error("Import failed",        { reason });
   */
  child: (baseContext: LogContext): ChildLogger => makeChild(baseContext),
};
