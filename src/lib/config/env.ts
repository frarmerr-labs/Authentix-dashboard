/**
 * ENVIRONMENT CONFIGURATION
 *
 * Controls which backend the Next.js proxy talks to.
 *
 * In production (Vercel/Railway frontend):
 *   Set NEXT_PUBLIC_API_URL to your Railway API service URL, e.g.:
 *     Production:  https://api.authentix.xencus.com/api/v1
 *     Staging:     https://api-staging.up.railway.app/api/v1
 *
 * In local dev (no local backend running):
 *   Set BACKEND_URL=https://api-staging.up.railway.app/api/v1 in .env.local
 *   to proxy directly to Railway staging instead of starting a local server.
 *
 * BACKEND_ENV override (optional):
 *   Force a specific env: BACKEND_ENV=staging
 */

// Primary backend URL — set this in every environment
// Falls back to localhost for local dev; must be set explicitly for staging/prod
export const BACKEND_PRIMARY_URL =
  process.env.BACKEND_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001/api/v1";

// No automatic fallback to a remote URL — a missing BACKEND_URL surfaces
// clearly instead of silently proxying to a dead or wrong environment.
export const BACKEND_FALLBACK_URL = "";

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
