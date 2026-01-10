/**
 * AUTH STORAGE
 *
 * Client-side storage for authentication tokens.
 */

const ACCESS_TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const EXPIRES_AT_KEY = 'auth_expires_at';

export function setAuthTokens(tokens: {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}): void {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  localStorage.setItem(EXPIRES_AT_KEY, tokens.expires_at.toString());
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getExpiresAt(): number | null {
  if (typeof window === 'undefined') return null;
  const value = localStorage.getItem(EXPIRES_AT_KEY);
  return value ? parseInt(value, 10) : null;
}

export function clearAuthTokens(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(EXPIRES_AT_KEY);
}

export function isTokenExpired(): boolean {
  const expiresAt = getExpiresAt();
  if (!expiresAt) return true;
  
  // Check if token expires in less than 5 minutes
  const now = Math.floor(Date.now() / 1000);
  return expiresAt - now < 300;
}
