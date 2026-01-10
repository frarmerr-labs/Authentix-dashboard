/**
 * AUTH STORAGE (Client-side)
 *
 * This module provides client-side utilities for auth state management.
 * Tokens are stored in HttpOnly cookies (set by server), not in localStorage.
 *
 * MIGRATION NOTE: This module no longer stores tokens in localStorage.
 * All token management is handled server-side via Route Handlers.
 */

/**
 * Clear any legacy localStorage tokens (migration helper)
 * Call this during logout to clean up any old tokens
 */
export function clearLegacyTokens(): void {
  if (typeof window === "undefined") return;

  // Remove old localStorage tokens if they exist
  const legacyKeys = [
    "auth_access_token",
    "auth_refresh_token",
    "auth_expires_at",
  ];

  legacyKeys.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore errors (e.g., if localStorage is disabled)
    }
  });
}

/**
 * Check if there might be a valid session
 * This is a quick client-side check - actual validation happens server-side
 */
export function hasSessionHint(): boolean {
  if (typeof window === "undefined") return false;

  // Check if we have any session-related cookies
  // This is just a hint - actual auth is verified server-side
  return document.cookie.includes("auth_access_token");
}

/**
 * DEPRECATED: These functions are kept for backwards compatibility
 * but no longer store actual tokens client-side.
 */

/** @deprecated Use cookie-based auth instead */
export function setAuthTokens(_tokens: {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}): void {
  // No-op: Tokens are now set server-side via HttpOnly cookies
  console.warn(
    "[Auth] setAuthTokens is deprecated. Tokens are managed server-side."
  );
}

/** @deprecated Access token is not available client-side */
export function getAccessToken(): string | null {
  // Tokens are HttpOnly and not accessible via JavaScript
  // This function is kept for migration compatibility
  return null;
}

/** @deprecated Refresh token is not available client-side */
export function getRefreshToken(): string | null {
  return null;
}

/** @deprecated Expiry is not available client-side */
export function getExpiresAt(): number | null {
  return null;
}

/** @deprecated Use /api/auth/logout instead */
export function clearAuthTokens(): void {
  // Clear any legacy tokens
  clearLegacyTokens();
}

/** @deprecated Session validation happens server-side */
export function isTokenExpired(): boolean {
  // Always return true since we can't check HttpOnly cookies
  // Actual expiry is checked server-side
  return true;
}
