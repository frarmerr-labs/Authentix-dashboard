/**
 * Integration tests for POST /api/auth/signup route handler.
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

import { POST } from "@/app/api/auth/signup/route";
import * as serverLib from "@/lib/api/server";

const mockBackendRequest = serverLib.backendAuthRequest as ReturnType<typeof vi.fn>;
const mockSetCookies = serverLib.setServerAuthCookies as ReturnType<typeof vi.fn>;

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  email: "new@example.com",
  password: "StrongPass1",
  full_name: "New User",
  company_name: "Acme Corp",
};

const MOCK_RESPONSE = {
  user: { id: "usr_2", email: "new@example.com", full_name: "New User" },
  session: { access_token: "at2", refresh_token: "rt2", expires_at: 9999999999 },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockBackendRequest.mockResolvedValue(MOCK_RESPONSE);
  mockSetCookies.mockResolvedValue(undefined);
});

// ── Validation ────────────────────────────────────────────────────────────────

describe("POST /api/auth/signup — validation", () => {
  it("returns 400 for invalid email", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, email: "not-email" }));
    expect(res.status).toBe(400);
    expect((await res.json()).success).toBe(false);
  });

  it("returns 400 when password is too short", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, password: "short" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/8 characters/i);
  });

  it("returns 400 when full_name is empty", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, full_name: "" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when company_name is missing", async () => {
    const { company_name: _omit, ...rest } = VALID_BODY;
    const res = await POST(makeRequest(rest));
    expect(res.status).toBe(400);
  });

  it("does not call backendAuthRequest on validation failure", async () => {
    await POST(makeRequest({ email: "bad" }));
    expect(mockBackendRequest).not.toHaveBeenCalled();
  });
});

// ── Success path ──────────────────────────────────────────────────────────────

describe("POST /api/auth/signup — success", () => {
  it("returns 200 with user data", async () => {
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.user.email).toBe("new@example.com");
  });

  it("calls backendAuthRequest with all signup fields", async () => {
    await POST(makeRequest(VALID_BODY));
    expect(mockBackendRequest).toHaveBeenCalledWith(
      "/auth/signup",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(VALID_BODY),
      })
    );
  });

  it("sets auth cookies after successful signup", async () => {
    await POST(makeRequest(VALID_BODY));
    expect(mockSetCookies).toHaveBeenCalledWith(MOCK_RESPONSE.session);
  });

  it("does not expose session tokens in the response body", async () => {
    const res = await POST(makeRequest(VALID_BODY));
    const body = JSON.stringify(await res.json());
    expect(body).not.toContain("access_token");
    expect(body).not.toContain("refresh_token");
  });
});

// ── Error path ────────────────────────────────────────────────────────────────

describe("POST /api/auth/signup — error handling", () => {
  it("returns 409 when backend reports a duplicate account", async () => {
    const { ServerApiError } = await import("@/lib/api/server");
    mockBackendRequest.mockRejectedValue(new ServerApiError('CONFLICT', "Email already registered", 409));
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(409);
  });

  it("returns 500 on unexpected errors", async () => {
    mockBackendRequest.mockRejectedValue(new Error("Unexpected failure"));
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(500);
  });
});
