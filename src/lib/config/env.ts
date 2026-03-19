/**
 * ENVIRONMENT CONFIGURATION
 *
 * Named backend environments. Set BACKEND_ENV in your .env.local to switch.
 * Auto-switches from local → prod if local backend is not running.
 */

export type BackendEnv = "local" | "test" | "prod";

const BACKEND_URLS: Record<BackendEnv, string> = {
  local: process.env.BACKEND_URL_LOCAL ?? "http://localhost:3001/api/v1",
  test:  process.env.BACKEND_URL_TEST  ?? "https://authentix-backend-test.vercel.app/api/v1",
  prod:  process.env.BACKEND_URL_PROD  ?? "https://authentix-backend.vercel.app/api/v1",
};

function resolveEnv(): BackendEnv {
  const explicit = process.env.BACKEND_ENV as BackendEnv | undefined;
  if (explicit && explicit in BACKEND_URLS) return explicit;
  return process.env.NODE_ENV === "production" ? "prod" : "local";
}

const activeEnv = resolveEnv();

export const BACKEND_PRIMARY_URL = BACKEND_URLS[activeEnv];

// Fallback: if primary is local, fall back to prod automatically
export const BACKEND_FALLBACK_URL =
  activeEnv === "local" ? BACKEND_URLS.prod : "";

/** True if the error is a connection refused (local backend not running) */
export function isConnectionRefused(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const cause = (error as { cause?: { code?: string } }).cause;
  return (
    cause?.code === "ECONNREFUSED" ||
    error.message.includes("ECONNREFUSED") ||
    error.message.includes("fetch failed")
  );
}
