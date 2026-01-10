/**
 * AUTH STORAGE (Client-side)
 *
 * Utilities for auth state management on the client.
 * All tokens are stored in HttpOnly cookies (set by server).
 */

const LEGACY_STORAGE_KEYS = [
  "auth_access_token",
  "auth_refresh_token",
  "auth_expires_at",
] as const;

/**
 * Clear any legacy localStorage tokens from before the HttpOnly cookie migration.
 * Call during logout to clean up old tokens.
 */
export function clearLegacyTokens(): void {
  if (typeof window === "undefined") return;

  LEGACY_STORAGE_KEYS.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore errors (e.g., if localStorage is disabled)
    }
  });
}

/**
 * Check if there might be a valid session based on cookie presence.
 * This is a quick client-side hint - actual validation happens server-side.
 */
export function hasSessionHint(): boolean {
  if (typeof window === "undefined") return false;
  return document.cookie.includes("auth_");
}
