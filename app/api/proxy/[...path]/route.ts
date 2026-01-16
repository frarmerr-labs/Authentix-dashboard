/**
 * HARDENED API PROXY ROUTE HANDLER
 *
 * Securely proxies API requests to the backend.
 * Implements OWASP SSRF prevention measures.
 *
 * Security measures:
 * - Strict path allowlist
 * - Method restrictions
 * - Path traversal prevention
 * - Hop-by-hop header stripping
 * - Request timeout/abort handling
 * - Sanitized error responses
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIES } from "@/lib/api/server";

// ============================================================================
// Configuration (Server-only)
// ============================================================================

const BACKEND_API_URL = process.env.BACKEND_API_URL;

// Request timeout in milliseconds
const REQUEST_TIMEOUT_MS = 30_000;

// ============================================================================
// Security: Allowed Methods
// ============================================================================

const ALLOWED_METHODS = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
]);

// ============================================================================
// Security: Allowed Path Prefixes (relative to backend API root)
// ============================================================================

const ALLOWED_PATH_PREFIXES = [
  "/auth/",
  "/templates",
  "/organizations/",
  "/users/",
  "/certificates/",
  "/import-jobs",
  "/billing/",
  "/verification/",
  "/dashboard/",
  "/webhooks/",
  "/industries",
  "/catalog/",
] as const;

// ============================================================================
// Security: Hop-by-hop Headers to Strip
// ============================================================================

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

// ============================================================================
// Security: Path Validation
// ============================================================================

/**
 * Validate path against traversal attacks and suspicious patterns
 */
function isPathSafe(path: string): boolean {
  // Block path traversal patterns
  if (path.includes("..")) return false;
  if (path.includes("%2e%2e")) return false;
  if (path.includes("%2E%2E")) return false;

  // Block double slashes (potential bypass)
  if (path.includes("//")) return false;

  // Block null bytes
  if (path.includes("%00")) return false;
  if (path.includes("\0")) return false;

  // Block backslashes (Windows-style paths)
  if (path.includes("\\")) return false;
  if (path.includes("%5c")) return false;
  if (path.includes("%5C")) return false;

  return true;
}

/**
 * Check if path is in allowlist
 */
function isPathAllowed(path: string): boolean {
  // Normalize path (remove leading slash for comparison)
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return ALLOWED_PATH_PREFIXES.some(
    (prefix) =>
      normalizedPath.startsWith(prefix) ||
      normalizedPath === prefix.replace(/\/$/, "") // Handle exact match without trailing slash
  );
}

// ============================================================================
// Security: Header Filtering
// ============================================================================

/**
 * Create safe headers for backend request
 */
function createSafeHeaders(
  originalHeaders: Headers,
  accessToken: string | null
): Headers {
  const safeHeaders = new Headers();

  // Copy only safe headers
  originalHeaders.forEach((value, key) => {
    const lowerKey = key.toLowerCase();

    // Skip hop-by-hop headers
    if (HOP_BY_HOP_HEADERS.has(lowerKey)) return;

    // Skip host header (will be set by fetch)
    if (lowerKey === "host") return;

    // Skip cookie header (we handle auth separately)
    if (lowerKey === "cookie") return;

    safeHeaders.set(key, value);
  });

  // Only set Content-Type if it was in the original request
  // Don't add it automatically - let the request specify it if needed
  // This prevents issues with DELETE requests that have no body

  // Add auth header if token exists
  if (accessToken) {
    safeHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  return safeHeaders;
}

// ============================================================================
// Error Response Helpers
// ============================================================================

function errorResponse(
  code: string,
  message: string,
  status: number
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: { code, message },
    },
    { status }
  );
}

// ============================================================================
// Main Proxy Handler
// ============================================================================

async function proxyRequest(
  request: NextRequest,
  method: string
): Promise<NextResponse> {
  // Validate backend URL is configured
  if (!BACKEND_API_URL) {
    console.error("[Proxy] Backend URL not configured");
    return errorResponse(
      "SERVICE_UNAVAILABLE",
      "Service temporarily unavailable",
      503
    );
  }

  // Validate method
  if (!ALLOWED_METHODS.has(method)) {
    return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed", 405);
  }

  // Extract and validate path
  const url = new URL(request.url);
  const pathSegments = url.pathname.replace("/api/proxy", "");

  // Security: Check for path traversal
  if (!isPathSafe(pathSegments)) {
    console.warn(`[Proxy] Blocked suspicious path: ${pathSegments}`);
    return errorResponse("BAD_REQUEST", "Invalid request path", 400);
  }

  // Security: Check path allowlist
  if (!isPathAllowed(pathSegments)) {
    console.warn(`[Proxy] Blocked non-allowlisted path: ${pathSegments}`);
    return errorResponse("FORBIDDEN", "Access denied", 403);
  }

  // Build backend URL
  const backendUrl = `${BACKEND_API_URL}${pathSegments}${url.search}`;

  // Get auth cookies to forward to backend
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_COOKIES.ACCESS_TOKEN)?.value ?? null;
  const refreshToken = cookieStore.get(AUTH_COOKIES.REFRESH_TOKEN)?.value ?? null;
  const expiresAt = cookieStore.get(AUTH_COOKIES.EXPIRES_AT)?.value ?? null;

  // Create safe headers
  const safeHeaders = createSafeHeaders(request.headers, accessToken);

  // Forward auth cookies to backend (Step-1 auth uses cookies, not just Bearer tokens)
  // Build cookie string for backend
  const backendCookies: string[] = [];
  if (accessToken) {
    backendCookies.push(`${AUTH_COOKIES.ACCESS_TOKEN}=${accessToken}`);
  }
  if (refreshToken) {
    backendCookies.push(`${AUTH_COOKIES.REFRESH_TOKEN}=${refreshToken}`);
  }
  if (expiresAt) {
    backendCookies.push(`${AUTH_COOKIES.EXPIRES_AT}=${expiresAt}`);
  }
  
  // Add cookies to headers if any exist
  if (backendCookies.length > 0) {
    safeHeaders.set("Cookie", backendCookies.join("; "));
  }

  // Get request body for non-GET requests
  let body: ArrayBuffer | null = null;
  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    try {
      body = await request.arrayBuffer();
    } catch {
      // No body or error reading body
    }
  }

  // Remove Content-Type header for DELETE requests without body
  // Fastify throws error if Content-Type is set but body is empty
  if (method === "DELETE" && (!body || body.byteLength === 0)) {
    safeHeaders.delete("Content-Type");
  }

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(backendUrl, {
      method,
      headers: safeHeaders,
      body: body,
      signal: controller.signal,
      // Don't follow redirects - let backend handle them
      redirect: "manual",
      // Forward cookies to backend (in addition to Cookie header)
      credentials: "include",
    });

    clearTimeout(timeoutId);

    // Get response data
    const contentType = response.headers.get("content-type");
    let data: unknown;

    if (contentType?.includes("application/json")) {
      data = await response.json();
    } else {
      // For non-JSON responses (e.g., file downloads), stream through
      const responseBody = await response.arrayBuffer();
      return new NextResponse(responseBody, {
        status: response.status,
        headers: {
          "Content-Type": contentType || "application/octet-stream",
        },
      });
    }

    // Return JSON response with same status
    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle abort/timeout
    if (error instanceof Error && error.name === "AbortError") {
      console.error("[Proxy] Request timeout");
      return errorResponse("TIMEOUT", "Request timed out", 504);
    }

    // Log error server-side only (don't expose to client)
    console.error("[Proxy] Error:", error instanceof Error ? error.message : "Unknown error");

    // Return sanitized error
    return errorResponse(
      "PROXY_ERROR",
      "Unable to process request",
      502
    );
  }
}

// ============================================================================
// HTTP Method Handlers
// ============================================================================

export async function GET(request: NextRequest) {
  return proxyRequest(request, "GET");
}

export async function POST(request: NextRequest) {
  return proxyRequest(request, "POST");
}

export async function PUT(request: NextRequest) {
  return proxyRequest(request, "PUT");
}

export async function PATCH(request: NextRequest) {
  return proxyRequest(request, "PATCH");
}

export async function DELETE(request: NextRequest) {
  return proxyRequest(request, "DELETE");
}

export async function OPTIONS(request: NextRequest) {
  return proxyRequest(request, "OPTIONS");
}
