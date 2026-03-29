/**
 * ERROR TAXONOMY
 *
 * Canonical error categories and codes for the application.
 * Use these in route handlers, API calls, and service layers.
 *
 * Categories:
 *   NETWORK    — connectivity / transport failures
 *   AUTH       — unauthenticated or forbidden
 *   VALIDATION — bad input from caller
 *   UPSTREAM   — backend service errors
 *   TIMEOUT    — request or operation exceeded time limit
 */

// ── Category ─────────────────────────────────────────────────────────────────

export type ErrorCategory = "NETWORK" | "AUTH" | "VALIDATION" | "UPSTREAM" | "TIMEOUT";

// ── Code constants ────────────────────────────────────────────────────────────

export const ErrorCodes = {
  // Network
  NETWORK_UNREACHABLE:    "NETWORK_UNREACHABLE",
  NETWORK_UNEXPECTED:     "NETWORK_UNEXPECTED",

  // Auth
  AUTH_UNAUTHORIZED:      "AUTH_UNAUTHORIZED",
  AUTH_FORBIDDEN:         "AUTH_FORBIDDEN",
  AUTH_TOKEN_EXPIRED:     "AUTH_TOKEN_EXPIRED",
  AUTH_SESSION_MISSING:   "AUTH_SESSION_MISSING",

  // Validation
  VALIDATION_INVALID:     "VALIDATION_INVALID",
  VALIDATION_MISSING:     "VALIDATION_MISSING",
  VALIDATION_CONFLICT:    "VALIDATION_CONFLICT",

  // Upstream
  UPSTREAM_ERROR:         "UPSTREAM_ERROR",
  UPSTREAM_NOT_FOUND:     "UPSTREAM_NOT_FOUND",
  UPSTREAM_UNAVAILABLE:   "UPSTREAM_UNAVAILABLE",

  // Timeout
  REQUEST_TIMEOUT:        "REQUEST_TIMEOUT",
  OPERATION_TIMEOUT:      "OPERATION_TIMEOUT",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// ── AppError shape ────────────────────────────────────────────────────────────

export interface AppError {
  category: ErrorCategory;
  code: string;
  message: string;
  context?: Record<string, unknown>;
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function createAppError(
  category: ErrorCategory,
  code: string,
  message: string,
  context?: Record<string, unknown>,
): AppError {
  return { category, code, message, ...(context ? { context } : {}) };
}

// ── HTTP status → category ────────────────────────────────────────────────────

export function categorizeHttpError(status: number): ErrorCategory {
  if (status === 401 || status === 403) return "AUTH";
  if (status === 400 || status === 422) return "VALIDATION";
  if (status === 408 || status === 504 || status === 524) return "TIMEOUT";
  if (status >= 500) return "UPSTREAM";
  if (status === 404) return "UPSTREAM";
  return "NETWORK";
}

/**
 * Map an HTTP status to a canonical ErrorCode.
 */
export function codeForStatus(status: number): string {
  switch (status) {
    case 401: return ErrorCodes.AUTH_UNAUTHORIZED;
    case 403: return ErrorCodes.AUTH_FORBIDDEN;
    case 404: return ErrorCodes.UPSTREAM_NOT_FOUND;
    case 400:
    case 422: return ErrorCodes.VALIDATION_INVALID;
    case 408:
    case 504:
    case 524: return ErrorCodes.REQUEST_TIMEOUT;
    default:  return status >= 500 ? ErrorCodes.UPSTREAM_ERROR : ErrorCodes.NETWORK_UNEXPECTED;
  }
}

/**
 * Build an AppError from an HTTP response.
 * Pass the parsed error message if available.
 */
export function appErrorFromStatus(
  status: number,
  message?: string,
  context?: Record<string, unknown>,
): AppError {
  return createAppError(
    categorizeHttpError(status),
    codeForStatus(status),
    message ?? `Request failed with status ${status}`,
    context,
  );
}
