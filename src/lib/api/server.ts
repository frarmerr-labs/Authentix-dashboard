/**
 * SERVER-SIDE API CLIENT
 *
 * Utilities for making authenticated API calls from Server Components
 * and Route Handlers using HttpOnly cookies.
 */

import { cookies } from "next/headers";

/**
 * Backend API URL - Server-only, never exposed to client
 * BACKEND_API_URL must be set in environment variables for production
 */
function getBackendUrl(): string {
  const url = process.env.BACKEND_API_URL;
  if (url) return url;

  // Fallback for development only
  // Note: In development, BACKEND_API_URL should be set to point to your backend server
  // This fallback is only used if BACKEND_API_URL is not set
  if (process.env.NODE_ENV === "development") {
    // If no backend URL is configured, we can't make requests
    // The user should set BACKEND_API_URL in their .env file
    return "";
  }

  // In production, we'll check at runtime when actually making requests
  // This allows the build to succeed even without the env var set
  return "";
}

const BACKEND_URL = getBackendUrl();

/** Cookie names for auth tokens */
export const AUTH_COOKIES = {
  ACCESS_TOKEN: "auth_access_token",
  REFRESH_TOKEN: "auth_refresh_token",
  EXPIRES_AT: "auth_expires_at",
} as const;

/** Cookie configuration for secure HttpOnly cookies */
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  // 7 days default expiry
  maxAge: 60 * 60 * 24 * 7,
};

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta: {
    request_id: string;
    timestamp: string;
  };
}

/**
 * Custom error class for API errors (server-side)
 */
export class ServerApiError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    status: number = 500,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ServerApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/**
 * Get access token from HttpOnly cookie (server-side)
 */
export async function getServerAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COOKIES.ACCESS_TOKEN)?.value ?? null;
}

/**
 * Get refresh token from HttpOnly cookie (server-side)
 */
export async function getServerRefreshToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COOKIES.REFRESH_TOKEN)?.value ?? null;
}

/**
 * Check if the current session is valid (server-side)
 */
export async function isServerAuthenticated(): Promise<boolean> {
  const token = await getServerAccessToken();
  if (!token) return false;

  const cookieStore = await cookies();
  const expiresAt = cookieStore.get(AUTH_COOKIES.EXPIRES_AT)?.value;
  if (!expiresAt) return false;

  const expiryTime = parseInt(expiresAt, 10);
  const now = Math.floor(Date.now() / 1000);

  // Consider expired if less than 5 minutes remaining
  return expiryTime - now > 300;
}

/**
 * Set auth cookies (server-side, used in Route Handlers)
 */
export async function setServerAuthCookies(tokens: {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(AUTH_COOKIES.ACCESS_TOKEN, tokens.access_token, {
    ...COOKIE_OPTIONS,
    maxAge: tokens.expires_at - Math.floor(Date.now() / 1000),
  });

  cookieStore.set(AUTH_COOKIES.REFRESH_TOKEN, tokens.refresh_token, {
    ...COOKIE_OPTIONS,
    // Refresh token has longer lifetime
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  cookieStore.set(AUTH_COOKIES.EXPIRES_AT, tokens.expires_at.toString(), {
    ...COOKIE_OPTIONS,
    maxAge: tokens.expires_at - Math.floor(Date.now() / 1000),
  });
}

/**
 * Clear auth cookies (server-side, used in Route Handlers)
 */
export async function clearServerAuthCookies(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.delete(AUTH_COOKIES.ACCESS_TOKEN);
  cookieStore.delete(AUTH_COOKIES.REFRESH_TOKEN);
  cookieStore.delete(AUTH_COOKIES.EXPIRES_AT);
}

/**
 * Make an authenticated API request (server-side)
 */
export async function serverApiRequest<T>(
  endpoint: string,
  options: RequestInit & { skipAuth?: boolean } = {}
): Promise<ApiResponse<T>> {
  const { skipAuth, ...fetchOptions } = options;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...fetchOptions.headers,
  };

  // Add auth header if not skipped
  if (!skipAuth) {
    const token = await getServerAccessToken();
    if (!token) {
      throw new ServerApiError("UNAUTHORIZED", "Not authenticated", 401);
    }
    (headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  if (!BACKEND_URL) {
    throw new ServerApiError(
      "CONFIG_ERROR",
      "Backend API URL is not configured",
      503
    );
  }

  const url = `${BACKEND_URL}${endpoint}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      headers,
      // Don't cache authenticated requests by default
      cache: skipAuth ? "default" : "no-store",
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Network error";
    throw new ServerApiError(
      "NETWORK_ERROR",
      `Failed to connect to backend: ${errorMessage}`,
      503
    );
  }

  // Handle non-JSON responses
  const contentType = response.headers.get("content-type");
  let data: ApiResponse<T>;

  try {
    if (contentType?.includes("application/json")) {
      data = (await response.json()) as ApiResponse<T>;
    } else {
      const text = await response.text();
      throw new ServerApiError(
        "INVALID_RESPONSE",
        `Expected JSON but received ${contentType}`,
        response.status,
        { response: text.substring(0, 200) }
      );
    }
  } catch (error) {
    if (error instanceof ServerApiError) throw error;
    throw new ServerApiError(
      "PARSE_ERROR",
      `Failed to parse response: ${error instanceof Error ? error.message : "Unknown"}`,
      response.status
    );
  }

  if (!response.ok || !data.success) {
    const apiError = data.error ?? {
      code: "HTTP_ERROR",
      message: `HTTP ${response.status}: ${response.statusText}`,
    };
    throw new ServerApiError(
      apiError.code,
      apiError.message,
      response.status,
      apiError.details
    );
  }

  return data;
}

/**
 * Make a backend auth request (used by Route Handlers)
 */
export async function backendAuthRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (!BACKEND_URL) {
    throw new ServerApiError(
      "CONFIG_ERROR",
      "Backend API URL is not configured",
      503
    );
  }

  const url = `${BACKEND_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !data.success) {
    throw new ServerApiError(
      data.error?.code ?? "AUTH_ERROR",
      data.error?.message ?? "Authentication failed",
      response.status,
      data.error?.details
    );
  }

  return data.data as T;
}

// ============================================================================
// Server-Side Data Fetching (for Server Components)
// ============================================================================

/** User session data */
export interface ServerSession {
  user: {
    id: string;
    email: string;
    full_name: string | null;
  } | null;
  valid: boolean;
}

/** User profile data */
export interface ServerUserProfile {
  id: string;
  email: string;
  full_name: string | null;
  company_id: string;
  company: {
    name: string;
    logo: string | null;
  } | null;
}

/**
 * Get session data from backend (server-side)
 * Returns null if not authenticated
 */
export async function getServerSession(): Promise<ServerSession | null> {
  try {
    const response = await serverApiRequest<ServerSession>("/auth/session");
    return response.data ?? null;
  } catch {
    return null;
  }
}

/**
 * Get user profile from backend (server-side)
 * Returns null if not authenticated
 */
export async function getServerUserProfile(): Promise<ServerUserProfile | null> {
  try {
    const response = await serverApiRequest<ServerUserProfile>("/users/me");
    return response.data ?? null;
  } catch {
    return null;
  }
}

/**
 * Get session and profile in parallel (server-side)
 * More efficient than sequential calls
 */
export async function getServerAuthData(): Promise<{
  session: ServerSession | null;
  profile: ServerUserProfile | null;
}> {
  const [session, profile] = await Promise.all([
    getServerSession(),
    getServerUserProfile(),
  ]);
  return { session, profile };
}

/**
 * Sanitize error messages for client-side display
 * (keeps detailed errors server-side only)
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof ServerApiError) {
    // Return user-friendly messages for known error codes
    switch (error.code) {
      case "INVALID_CREDENTIALS":
        return "Invalid email or password";
      case "USER_NOT_FOUND":
        return "Account not found";
      case "EMAIL_NOT_VERIFIED":
        return "Please verify your email before signing in";
      case "ACCOUNT_DISABLED":
        return "This account has been disabled";
      case "RATE_LIMITED":
        return "Too many attempts. Please try again later.";
      case "NETWORK_ERROR":
        return "Unable to connect. Please check your connection.";
      default:
        // Don't expose internal error details
        return "An error occurred. Please try again.";
    }
  }
  return "An unexpected error occurred";
}
