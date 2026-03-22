/**
 * Unit tests for signupAction — validation logic and backend interaction.
 * All external dependencies (backend API, Next.js navigation) are mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks (hoisted by vitest, run before all imports) ──────────────────────────
vi.mock('server-only', () => ({}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error('NEXT_REDIRECT'), {
      digest: `NEXT_REDIRECT;${url}`,
    });
  }),
}));

vi.mock('@/lib/api/server', () => ({
  backendAuthRequest: vi.fn(),
  setServerAuthCookies: vi.fn(),
  sanitizeErrorMessage: vi.fn((e: unknown) =>
    e instanceof Error ? e.message : 'An unexpected error occurred',
  ),
  serverApiRequest: vi.fn(),
}));

// ── Imports (after mocks) ──────────────────────────────────────────────────────
import { signupAction, type SignupState } from '@/app/(auth)/signup/actions';
import * as serverLib from '@/lib/api/server';

// ── Helpers ────────────────────────────────────────────────────────────────────
function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData();
  Object.entries(data).forEach(([k, v]) => fd.append(k, v));
  return fd;
}

const VALID = {
  email: 'test@example.com',
  password: 'Password1',
  full_name: 'John Doe',
  company_name: 'Acme Corp',
};

const INITIAL: SignupState = { error: null, fieldErrors: {}, success: false };

// ── Validation tests ───────────────────────────────────────────────────────────
describe('signupAction — field validation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns fieldErrors.email when email is missing', async () => {
    const result = await signupAction(INITIAL, makeFormData({ ...VALID, email: '' }));
    expect(result.fieldErrors.email).toBeDefined();
    expect(result.success).toBe(false);
  });

  it('returns fieldErrors.email for an invalid email format', async () => {
    const result = await signupAction(INITIAL, makeFormData({ ...VALID, email: 'notanemail' }));
    expect(result.fieldErrors.email).toMatch(/valid email/i);
  });

  it('accepts emails with subdomains and plus addressing', async () => {
    (serverLib.backendAuthRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: '1', email: 'a+b@mail.example.co.uk', full_name: null },
    });
    await expect(
      signupAction(INITIAL, makeFormData({ ...VALID, email: 'a+b@mail.example.co.uk' })),
    ).rejects.toMatchObject({ digest: expect.stringContaining('NEXT_REDIRECT') });
  });

  it('rejects email without @ symbol', async () => {
    const result = await signupAction(INITIAL, makeFormData({ ...VALID, email: 'bademail.com' }));
    expect(result.fieldErrors.email).toBeDefined();
  });

  it('returns fieldErrors.password when password is missing', async () => {
    const result = await signupAction(INITIAL, makeFormData({ ...VALID, password: '' }));
    expect(result.fieldErrors.password).toBeDefined();
  });

  it('returns fieldErrors.password when password is shorter than 8 characters', async () => {
    const result = await signupAction(INITIAL, makeFormData({ ...VALID, password: 'Abc1' }));
    expect(result.fieldErrors.password).toMatch(/8 character/i);
  });

  it('returns fieldErrors.password when password lacks an uppercase letter', async () => {
    const result = await signupAction(INITIAL, makeFormData({ ...VALID, password: 'password1' }));
    expect(result.fieldErrors.password).toMatch(/uppercase/i);
  });

  it('returns fieldErrors.password when password lacks a lowercase letter', async () => {
    const result = await signupAction(INITIAL, makeFormData({ ...VALID, password: 'PASSWORD1' }));
    expect(result.fieldErrors.password).toMatch(/lowercase/i);
  });

  it('returns fieldErrors.password when password lacks a number', async () => {
    const result = await signupAction(INITIAL, makeFormData({ ...VALID, password: 'PasswordOnly' }));
    expect(result.fieldErrors.password).toMatch(/number/i);
  });

  it('accepts an 8-character password with all requirements met', async () => {
    (serverLib.backendAuthRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: '1', email: VALID.email, full_name: null },
    });
    await expect(
      signupAction(INITIAL, makeFormData({ ...VALID, password: 'Abcdef1!' })),
    ).rejects.toMatchObject({ digest: expect.stringContaining('NEXT_REDIRECT') });
  });

  it('returns fieldErrors.full_name when full_name is a single character', async () => {
    const result = await signupAction(INITIAL, makeFormData({ ...VALID, full_name: 'A' }));
    expect(result.fieldErrors.full_name).toBeDefined();
  });

  it('returns fieldErrors.full_name when full_name is blank whitespace', async () => {
    const result = await signupAction(INITIAL, makeFormData({ ...VALID, full_name: '  ' }));
    expect(result.fieldErrors.full_name).toBeDefined();
  });

  it('returns fieldErrors.company_name when company_name is too short', async () => {
    const result = await signupAction(INITIAL, makeFormData({ ...VALID, company_name: 'X' }));
    expect(result.fieldErrors.company_name).toBeDefined();
  });

  it('returns ALL field errors when all fields are empty', async () => {
    const result = await signupAction(
      INITIAL,
      makeFormData({ email: '', password: '', full_name: '', company_name: '' }),
    );
    expect(result.fieldErrors.email).toBeDefined();
    expect(result.fieldErrors.password).toBeDefined();
    expect(result.fieldErrors.full_name).toBeDefined();
    expect(result.fieldErrors.company_name).toBeDefined();
    expect(result.error).toMatch(/errors/i);
    expect(result.success).toBe(false);
  });

  it('does NOT call backendAuthRequest when validation fails', async () => {
    await signupAction(INITIAL, makeFormData({ ...VALID, email: 'bad' }));
    expect(serverLib.backendAuthRequest).not.toHaveBeenCalled();
  });
});

// ── Backend interaction tests ──────────────────────────────────────────────────
describe('signupAction — backend interaction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls backendAuthRequest with trimmed name and company fields', async () => {
    (serverLib.backendAuthRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: '1', email: VALID.email, full_name: 'John Doe' },
    });
    try {
      await signupAction(
        INITIAL,
        makeFormData({ ...VALID, full_name: '  John Doe  ', company_name: '  Acme Corp  ' }),
      );
    } catch (_) { /* redirect */ }

    expect(serverLib.backendAuthRequest).toHaveBeenCalledWith(
      '/auth/signup',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"full_name":"John Doe"'),
      }),
    );
    expect(serverLib.backendAuthRequest).toHaveBeenCalledWith(
      '/auth/signup',
      expect.objectContaining({ body: expect.stringContaining('"company_name":"Acme Corp"') }),
    );
  });

  it('redirects to /signup/success with encoded email after success (no session)', async () => {
    (serverLib.backendAuthRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: '1', email: VALID.email, full_name: 'John Doe' },
    });
    await expect(signupAction(INITIAL, makeFormData(VALID))).rejects.toMatchObject({
      digest: expect.stringContaining('NEXT_REDIRECT'),
    });
    expect(serverLib.setServerAuthCookies).not.toHaveBeenCalled();
  });

  it('sets cookies when backend returns a session object', async () => {
    const mockSession = { access_token: 'at', refresh_token: 'rt', expires_at: 9999999999 };
    (serverLib.backendAuthRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: '1', email: VALID.email, full_name: 'John Doe' },
      session: mockSession,
    });
    try {
      await signupAction(INITIAL, makeFormData(VALID));
    } catch (_) { /* redirect */ }
    expect(serverLib.setServerAuthCookies).toHaveBeenCalledWith(mockSession);
  });

  it('does NOT set cookies when backend returns no session (email-verification flow)', async () => {
    (serverLib.backendAuthRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: '1', email: VALID.email, full_name: 'John Doe' },
      // no session property
    });
    try {
      await signupAction(INITIAL, makeFormData(VALID));
    } catch (_) { /* redirect */ }
    expect(serverLib.setServerAuthCookies).not.toHaveBeenCalled();
  });

  it('returns sanitized error when backend throws', async () => {
    (serverLib.backendAuthRequest as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Email already registered'),
    );
    const result = await signupAction(INITIAL, makeFormData(VALID));
    expect(result.error).toBe('Email already registered');
    expect(result.success).toBe(false);
    expect(result.fieldErrors).toEqual({});
  });

  it('re-throws NEXT_REDIRECT — does NOT swallow redirect as an error', async () => {
    // Simulate redirect() being thrown inside the catch path
    const redirectError = Object.assign(new Error('NEXT_REDIRECT'), {
      digest: 'NEXT_REDIRECT;/somewhere',
    });
    (serverLib.backendAuthRequest as ReturnType<typeof vi.fn>).mockRejectedValue(redirectError);
    await expect(signupAction(INITIAL, makeFormData(VALID))).rejects.toMatchObject({
      digest: 'NEXT_REDIRECT;/somewhere',
    });
  });

  it('includes the email as a query param in the success redirect URL', async () => {
    (serverLib.backendAuthRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: '1', email: 'user@test.com', full_name: null },
    });
    const { redirect } = await import('next/navigation');
    try {
      await signupAction(INITIAL, makeFormData({ ...VALID, email: 'user@test.com' }));
    } catch (_) { /* redirect */ }
    expect(redirect).toHaveBeenCalledWith(
      expect.stringContaining('user%40test.com'),
    );
  });
});
