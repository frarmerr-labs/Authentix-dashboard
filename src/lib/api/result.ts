/**
 * API RESULT NORMALIZATION
 *
 * Central utility for normalising backend responses into a typed Result.
 *
 * Usage:
 *   const result = normalizeApiResponse<Template>(raw);
 *   if (!result.ok) { logger.error(..., result.error); return; }
 *   doSomethingWith(result.data);
 *
 * Why:
 *   All backend responses share the { success, data, error } envelope.
 *   This utility converts that envelope into a discriminated union so
 *   call-sites don't repeat the same ok/error-check logic inline.
 */

import type { AppError } from "@/lib/errors";
import { appErrorFromStatus, createAppError, ErrorCodes } from "@/lib/errors";

// ── Result type ───────────────────────────────────────────────────────────────

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: AppError };

// ── Constructors ──────────────────────────────────────────────────────────────

export function ok<T>(data: T): ApiResult<T> {
  return { ok: true, data };
}

export function err(error: AppError): ApiResult<never> {
  return { ok: false, error };
}

// ── Backend envelope shape ────────────────────────────────────────────────────

interface BackendEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code?: string; message?: string } | string;
  meta?: unknown;
}

// ── Normalizer ────────────────────────────────────────────────────────────────

/**
 * Normalize a backend `{ success, data, error }` envelope into `ApiResult<T>`.
 *
 * @param raw     The raw response object from the fetch/proxy call.
 * @param status  Optional HTTP status code — used to classify errors correctly.
 */
export function normalizeApiResponse<T>(
  raw: BackendEnvelope<T>,
  status?: number,
): ApiResult<T> {
  if (raw.success && raw.data !== undefined) {
    return ok(raw.data);
  }

  // Extract a human-readable message from the error field
  let message = "An unexpected error occurred";
  let code = ErrorCodes.UPSTREAM_ERROR as string;

  if (raw.error) {
    if (typeof raw.error === "string") {
      message = raw.error;
    } else {
      message = raw.error.message ?? message;
      code    = raw.error.code    ?? code;
    }
  }

  const appError: AppError = status
    ? appErrorFromStatus(status, message, { backendCode: code })
    : createAppError("UPSTREAM", code, message);

  return err(appError);
}

/**
 * Wrap a thrown error (unknown) into an ApiResult.
 * Use in catch blocks to return a normalised failure instead of rethrowing.
 */
export function fromThrown(thrown: unknown, fallbackMessage = "An unexpected error occurred"): ApiResult<never> {
  if (thrown instanceof Error) {
    const isTimeout = thrown.name === "AbortError" || thrown.message.toLowerCase().includes("timeout");
    const category = isTimeout ? "TIMEOUT" : "NETWORK";
    const code     = isTimeout ? ErrorCodes.REQUEST_TIMEOUT : ErrorCodes.NETWORK_UNREACHABLE;
    return err(createAppError(category, code, thrown.message));
  }
  return err(createAppError("NETWORK", ErrorCodes.NETWORK_UNEXPECTED, fallbackMessage));
}

/**
 * Apply a transform to the data inside an ok result.
 * Passes errors through unchanged — safe to chain.
 */
export function mapResult<T, U>(result: ApiResult<T>, transform: (data: T) => U): ApiResult<U> {
  if (!result.ok) return result;
  return ok(transform(result.data));
}

/**
 * Unwrap an ApiResult, throwing the error as a standard Error if not ok.
 * Useful in contexts where you want to surface errors as exceptions.
 */
export function unwrapResult<T>(result: ApiResult<T>): T {
  if (result.ok) return result.data;
  throw new Error(result.error.message);
}
