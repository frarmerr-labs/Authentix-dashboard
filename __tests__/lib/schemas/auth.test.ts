/**
 * AUTH SCHEMA CONTRACT TESTS
 *
 * Verifies that each Zod schema correctly accepts valid backend response shapes
 * and rejects malformed/missing fields.
 *
 * These tests act as API contracts: if the backend changes its response shape,
 * these tests will catch the mismatch before it reaches the app.
 */

import { describe, it, expect } from "vitest";
import {
  LoginRequestSchema,
  SignupRequestSchema,
  SessionSchema,
  AuthUserSchema,
  LoginResponseSchema,
  SignupResponseSchema,
  RefreshResponseSchema,
  AccessContextResponseSchema,
} from "@/lib/api/schemas/auth";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const validSession = {
  access_token: "eyJhbGciOiJIUzI1NiJ9.test",
  refresh_token: "rt_test_token",
  expires_at: 1711756800,
};

const validUser = {
  id: "usr_abc123",
  email: "test@example.com",
  full_name: "Test User",
};

const validOrg = {
  id: "org_abc123",
  name: "Acme Corp",
  slug: "acme-corp",
  billing_status: "active",
  logo: null,
  logo_url: "https://example.supabase.co/logo.png",
};

const validMembership = {
  id: "mem_abc123",
  organization_id: "org_abc123",
  role_key: "admin",
};

// ── LoginRequestSchema ────────────────────────────────────────────────────────

describe("LoginRequestSchema", () => {
  it("accepts valid credentials", () => {
    const result = LoginRequestSchema.safeParse({
      email: "user@example.com",
      password: "secret",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = LoginRequestSchema.safeParse({ email: "not-an-email", password: "secret" });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = LoginRequestSchema.safeParse({ email: "user@example.com", password: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing fields", () => {
    expect(LoginRequestSchema.safeParse({}).success).toBe(false);
  });
});

// ── SignupRequestSchema ───────────────────────────────────────────────────────

describe("SignupRequestSchema", () => {
  it("accepts valid signup data", () => {
    const result = SignupRequestSchema.safeParse({
      email: "new@example.com",
      password: "StrongPass1",
      full_name: "New User",
      company_name: "Acme Corp",
    });
    expect(result.success).toBe(true);
  });

  it("rejects password shorter than 8 characters", () => {
    const result = SignupRequestSchema.safeParse({
      email: "new@example.com",
      password: "short",
      full_name: "New User",
      company_name: "Acme Corp",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty full_name", () => {
    const result = SignupRequestSchema.safeParse({
      email: "new@example.com",
      password: "StrongPass1",
      full_name: "",
      company_name: "Acme Corp",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty company_name", () => {
    const result = SignupRequestSchema.safeParse({
      email: "new@example.com",
      password: "StrongPass1",
      full_name: "New User",
      company_name: "",
    });
    expect(result.success).toBe(false);
  });
});

// ── SessionSchema ─────────────────────────────────────────────────────────────

describe("SessionSchema", () => {
  it("accepts a valid session", () => {
    expect(SessionSchema.safeParse(validSession).success).toBe(true);
  });

  it("rejects non-numeric expires_at", () => {
    const result = SessionSchema.safeParse({ ...validSession, expires_at: "1711756800" });
    expect(result.success).toBe(false);
  });

  it("rejects missing access_token", () => {
    const { access_token: _omit, ...rest } = validSession;
    expect(SessionSchema.safeParse(rest).success).toBe(false);
  });
});

// ── AuthUserSchema ────────────────────────────────────────────────────────────

describe("AuthUserSchema", () => {
  it("accepts user with full_name", () => {
    expect(AuthUserSchema.safeParse(validUser).success).toBe(true);
  });

  it("accepts user with null full_name", () => {
    expect(AuthUserSchema.safeParse({ ...validUser, full_name: null }).success).toBe(true);
  });

  it("rejects invalid email in user", () => {
    expect(AuthUserSchema.safeParse({ ...validUser, email: "bad" }).success).toBe(false);
  });
});

// ── LoginResponseSchema ───────────────────────────────────────────────────────

describe("LoginResponseSchema", () => {
  it("accepts valid login response", () => {
    const result = LoginResponseSchema.safeParse({ user: validUser, session: validSession });
    expect(result.success).toBe(true);
  });

  it("rejects missing session", () => {
    expect(LoginResponseSchema.safeParse({ user: validUser }).success).toBe(false);
  });
});

// ── SignupResponseSchema ──────────────────────────────────────────────────────

describe("SignupResponseSchema", () => {
  it("accepts valid signup response", () => {
    const result = SignupResponseSchema.safeParse({ user: validUser, session: validSession });
    expect(result.success).toBe(true);
  });
});

// ── RefreshResponseSchema ─────────────────────────────────────────────────────

describe("RefreshResponseSchema", () => {
  it("accepts valid refresh response", () => {
    expect(RefreshResponseSchema.safeParse({ session: validSession }).success).toBe(true);
  });

  it("rejects missing session", () => {
    expect(RefreshResponseSchema.safeParse({}).success).toBe(false);
  });
});

// ── AccessContextResponseSchema ───────────────────────────────────────────────

describe("AccessContextResponseSchema", () => {
  it("accepts authenticated context with all fields", () => {
    const result = AccessContextResponseSchema.safeParse({
      authenticated: true,
      email_verified: true,
      user: validUser,
      organization: validOrg,
      membership: validMembership,
    });
    expect(result.success).toBe(true);
  });

  it("accepts unauthenticated context (all nullable fields null)", () => {
    const result = AccessContextResponseSchema.safeParse({
      authenticated: false,
      email_verified: false,
      user: null,
      organization: null,
      membership: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts org with logo object", () => {
    const result = AccessContextResponseSchema.safeParse({
      authenticated: true,
      email_verified: true,
      user: validUser,
      organization: {
        ...validOrg,
        logo: { file_id: "file_abc", bucket: "org-logos", path: "org_abc/logo.png" },
      },
      membership: validMembership,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing authenticated flag", () => {
    const result = AccessContextResponseSchema.safeParse({
      email_verified: true,
      user: null,
      organization: null,
      membership: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-boolean authenticated", () => {
    const result = AccessContextResponseSchema.safeParse({
      authenticated: "yes",
      email_verified: true,
      user: null,
      organization: null,
      membership: null,
    });
    expect(result.success).toBe(false);
  });
});
