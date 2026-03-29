/**
 * AUTH SCHEMAS
 *
 * Zod schemas for auth BFF request bodies and critical backend response shapes.
 * Applied at the network boundary — any shape mismatch is caught at runtime
 * before it propagates into the app.
 */

import { z } from "zod";

// ── Request bodies ─────────────────────────────────────────────────────────────

export const LoginRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const SignupRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  full_name: z.string().min(1, "Full name is required"),
  company_name: z.string().min(1, "Company name is required"),
});

// ── Backend response shapes ────────────────────────────────────────────────────

export const SessionSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_at: z.number(),
});

export const AuthUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  full_name: z.string().nullable(),
});

export const LoginResponseSchema = z.object({
  user: AuthUserSchema,
  session: SessionSchema,
});

export const SignupResponseSchema = z.object({
  user: AuthUserSchema,
  session: SessionSchema,
});

export const RefreshResponseSchema = z.object({
  session: SessionSchema,
});

export const AccessContextResponseSchema = z.object({
  authenticated: z.boolean(),
  email_verified: z.boolean(),
  user: z
    .object({
      id: z.string(),
      email: z.string(),
      full_name: z.string().nullable(),
    })
    .nullable(),
  organization: z
    .object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
      billing_status: z.string().nullable(),
      logo: z
        .object({
          file_id: z.string(),
          bucket: z.string(),
          path: z.string(),
        })
        .nullable(),
      logo_url: z.string().nullable(),
    })
    .nullable(),
  membership: z
    .object({
      id: z.string(),
      organization_id: z.string(),
      role_key: z.string(),
    })
    .nullable(),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type SignupRequest = z.infer<typeof SignupRequestSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type SignupResponse = z.infer<typeof SignupResponseSchema>;
export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;
export type AccessContextResponse = z.infer<typeof AccessContextResponseSchema>;
