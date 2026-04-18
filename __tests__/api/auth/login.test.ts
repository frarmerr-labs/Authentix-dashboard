/**
 * Integration tests for POST /api/auth/login route handler.
 *
 * Verifies: Zod validation, backend call, cookie setting, response shape.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/api/server", () => ({
  backendAuthRequest: vi.fn(),
  setServerAuthCookies: vi.fn(),
  sanitizeErrorMessage: vi.fn((e: unknown) =>
    e instanceof Error ? e.message : "An unexpected error occurred"
  ),
  ServerApiError: class ServerApiError extends Error {
    code: string;
    status: number;
    constructor(code: string, message: string, status = 500) {
      super(message);
      this.code = code;
      this.status = status;
    }
  },
}));

import { POST } from "@/app/api/auth/login/route";
import * as serverLib from "@/lib/api/server";

const mockBackendRequest = serverLib.backendAuthRequest as ReturnType<typeof vi.fn>;
const mockSetCookies = serverLib.setServerAuthCookies as ReturnType<typeof vi.fn>;

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = { email: "user@example.com", password: "secret123" };

const MOCK_RESPONSE = {
  user: { id: "usr_1", email: "user@example.com", full_name: "Test User" },
  session: { access_token: "at", refresh_token: "rt", expires_at: 9999999999 },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockBackendRequest.mockResolvedValue(MOCK_RESPONSE);
  mockSetCookies.mockResolvedValue(undefined);
});

// ── Validation ────────────────────────────────────────────────────────────────

describe("POST /api/auth/login — validation", () => {
  it("returns 400 for invalid email", async () => {
    const res = await POST(makeRequest({ email: "bad-email", password: "secret" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/invalid email/i);
  });

  it("returns 400 when password is empty", async () => {
    const res = await POST(makeRequest({ email: "user@example.com", password: "" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns 400 when body is missing both fields", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    expect((await res.json()).success).toBe(false);
  });

  it("does not call backendAuthRequest on validation failure", async () => {
    await POST(makeRequest({ email: "bad" }));
    expect(mockBackendRequest).not.toHaveBeenCalled();
  });
});

// ── Success path ──────────────────────────────────────────────────────────────

describe("POST /api/auth/login — success", () => {
  it("returns 200 with user data on valid request", async () => {
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.user.email).toBe("user@example.com");
  });

  it("calls backendAuthRequest with correct path and body", async () => {
    await POST(makeRequest(VALID_BODY));
    expect(mockBackendRequest).toHaveBeenCalledWith(
      "/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(VALID_BODY),
      })
    );
  });

  it("calls setServerAuthCookies with the session from backend", async () => {
    await POST(makeRequest(VALID_BODY));
    expect(mockSetCookies).toHaveBeenCalledWith(MOCK_RESPONSE.session);
  });

  it("does not include session tokens in the response body", async () => {
    const res = await POST(makeRequest(VALID_BODY));
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain("access_token");
    expect(JSON.stringify(body)).not.toContain("refresh_token");
  });
});

// ── Error path ────────────────────────────────────────────────────────────────

describe("POST /api/auth/login — error handling", () => {
  it("returns 401 when backend throws a ServerApiError with status 401", async () => {
    const { ServerApiError } = await import("@/lib/api/server");
    mockBackendRequest.mockRejectedValue(new ServerApiError('UNAUTHORIZED', "Invalid credentials", 401));
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(401);
    expect((await res.json()).success).toBe(false);
  });

  it("returns 500 on unexpected errors", async () => {
    mockBackendRequest.mockRejectedValue(new Error("Network failure"));
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(500);
  });
});
