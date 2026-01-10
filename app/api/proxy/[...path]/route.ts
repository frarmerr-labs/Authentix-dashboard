/**
 * API Proxy Route Handler
 * 
 * Proxies all API requests through Next.js to avoid CORS issues
 * and keep backend URL hidden from the client.
 * 
 * Usage: /api/proxy/companies/me -> backend/api/v1/companies/me
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIES, sanitizeErrorMessage } from "@/lib/api/server";

const BACKEND_URL =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3000/api/v1";

/**
 * Forward request to backend with authentication
 */
async function proxyRequest(
  request: NextRequest,
  method: string
): Promise<NextResponse> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_COOKIES.ACCESS_TOKEN)?.value;
  
  // Get the path from the URL
  const url = new URL(request.url);
  const pathSegments = url.pathname.replace("/api/proxy/", "");
  const backendUrl = `${BACKEND_URL}/${pathSegments}${url.search}`;

  // Build headers
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  // Get request body for non-GET requests
  let body: string | undefined;
  if (method !== "GET" && method !== "HEAD") {
    try {
      body = await request.text();
    } catch {
      // No body
    }
  }

  try {
    const response = await fetch(backendUrl, {
      method,
      headers,
      body: body || undefined,
    });

    // Get response data
    const contentType = response.headers.get("content-type");
    let data: unknown;

    if (contentType?.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // Return response with same status
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        "Content-Type": contentType || "application/json",
      },
    });
  } catch (error) {
    console.error("[Proxy] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "PROXY_ERROR",
          message: sanitizeErrorMessage(error),
        },
      },
      { status: 502 }
    );
  }
}

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
