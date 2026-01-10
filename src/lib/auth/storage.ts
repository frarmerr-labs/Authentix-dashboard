/**
 * AUTH STORAGE (Client-side)
 *
 * This module provides client-side utilities for auth state management.
 * Tokens are stored in HttpOnly cookies (set by server), not in localStorage.
 *
 * SECURITY: All token management is handled server-side via Route Handlers.
 * Client-side code cannot access HttpOnly cookies directly.
 */

const LEGACY_STORAGE_KEYS = [
  "auth_access_token",
  "auth_refresh_token",
  "auth_expires_at",
] as const;

/**
 * Clear any legacy localStorage tokens (migration helper)
 * Call this during logout to clean up any old tokens from before
 * the HttpOnly cookie migration.
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
 * Check if there might be a valid session based on cookie presence
 * This is a quick client-side hint - actual validation happens server-side
 *
 * NOTE: This only works if the cookie has been marked with httpOnly: false
 * which is NOT the case for our auth cookies. This function is mainly
 * useful for detecting if cookies have been cleared.
 */
export function hasSessionHint(): boolean {
  if (typeof window === "undefined") return false;

  // This will only work for non-HttpOnly cookies
  // Our auth cookies are HttpOnly, so this is just a hint
  return document.cookie.includes("auth_");
}

// ============================================================================
// REMOVED DEPRECATED FUNCTIONS
// ============================================================================
// The following functions have been removed as they were deprecated:
// - setAuthTokens(): No-op, tokens are set server-side
// - getAccessToken(): Always returned null
// - getRefreshToken(): Always returned null
// - getExpiresAt(): Always returned null
// - clearAuthTokens(): Just called clearLegacyTokens()
// - isTokenExpired(): Always returned true
//
// If you're seeing errors referencing these functions, update your code:
// - For login/signup: Use Server Actions that call /api/auth/*
// - For logout: Call /api/auth/logout from the server
// - For session checks: Call /api/auth/session from the server
// ============================================================================
