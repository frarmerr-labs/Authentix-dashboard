/**
 * Unit tests for loginAction — input validation, backend auth, bootstrap, and redirect.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────────
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
  sanitizeErrorMessage: vi.fn((e: unknown) => {
    if (e instanceof Error) return e.message;
    if (typeof e === 'string') return e;
    return 'An unexpected error occurred';
  }),
  serverApiRequest: vi.fn(),
}));

// ── Imports ────────────────────────────────────────────────────────────────────
import { loginAction, type LoginState } from '@/app/(auth)/login/actions';
import * as serverLib from '@/lib/api/server';

// ── Helpers ────────────────────────────────────────────────────────────────────
function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData();
  Object.entries(data).forEach(([k, v]) => fd.append(k, v));
  return fd;
}

const VALID = { email: 'user@example.com', password: 'secret123' };
const INITIAL: LoginState = { error: null, success: false };

const MOCK_SESSION = { access_token: 'at', refresh_token: 'rt', expires_at: 9999999999 };
const MOCK_USER = { id: 'u1', email: VALID.email, full_name: 'Test User' };
const MOCK_ORG = { id: 'org-1', slug: 'my-org' };

function mockLoginSuccess() {
  (serverLib.backendAuthRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
    user: MOCK_USER,
    session: MOCK_SESSION,
  });
  (serverLib.setServerAuthCookies as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  (serverLib.serverApiRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
    success: true,
    data: { organization: MOCK_ORG },
  });
}

// ── Validation tests ───────────────────────────────────────────────────────────
describe('loginAction — input validation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns error when email is missing', async () => {
    const result = await loginAction(INITIAL, makeFormData({ email: '', password: 'abc' }));
    expect(result.error).toMatch(/required/i);
    expect(result.success).toBe(false);
  });

  it('returns error when password is missing', async () => {
    const result = await loginAction(INITIAL, makeFormData({ email: 'a@b.com', password: '' }));
    expect(result.error).toMatch(/required/i);
    expect(result.success).toBe(false);
  });

  it('returns error when both fields are missing', async () => {
    const result = await loginAction(INITIAL, makeFormData({ email: '', password: '' }));
    expect(result.error).toMatch(/required/i);
    expect(result.success).toBe(false);
  });

  it('does NOT call backendAuthRequest when validation fails', async () => {
    await loginAction(INITIAL, makeFormData({ email: '', password: '' }));
    expect(serverLib.backendAuthRequest).not.toHaveBeenCalled();
  });
});

// ── Successful login flow ──────────────────────────────────────────────────────
describe('loginAction — successful login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoginSuccess();
  });

  it('calls backendAuthRequest with the submitted email and password', async () => {
    try { await loginAction(INITIAL, makeFormData(VALID)); } catch (_) { /* redirect */ }
    expect(serverLib.backendAuthRequest).toHaveBeenCalledWith(
      '/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: VALID.email, password: VALID.password }),
      }),
    );
  });

  it('sets auth cookies after a successful backend response', async () => {
    try { await loginAction(INITIAL, makeFormData(VALID)); } catch (_) { /* redirect */ }
    expect(serverLib.setServerAuthCookies).toHaveBeenCalledWith(MOCK_SESSION);
  });

  it('calls the bootstrap endpoint after setting cookies', async () => {
    try { await loginAction(INITIAL, makeFormData(VALID)); } catch (_) { /* redirect */ }
    expect(serverLib.serverApiRequest).toHaveBeenCalledWith(
      '/auth/bootstrap',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('redirects to /dashboard/org/{slug} using the org slug', async () => {
    const { redirect } = await import('next/navigation');
    try { await loginAction(INITIAL, makeFormData(VALID)); } catch (_) { /* redirect */ }
    expect(redirect).toHaveBeenCalledWith('/dashboard/org/my-org');
  });

  it('redirects using org.id as fallback when slug is absent', async () => {
    (serverLib.serverApiRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { organization: { id: 'org-uuid-123' } }, // no slug
    });
    const { redirect } = await import('next/navigation');
    try { await loginAction(INITIAL, makeFormData(VALID)); } catch (_) { /* redirect */ }
    expect(redirect).toHaveBeenCalledWith('/dashboard/org/org-uuid-123');
  });

  it('falls back to /dashboard when org info is completely missing', async () => {
    (serverLib.serverApiRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { organization: null },
    });
    const { redirect } = await import('next/navigation');
    try { await loginAction(INITIAL, makeFormData(VALID)); } catch (_) { /* redirect */ }
    expect(redirect).toHaveBeenCalledWith('/dashboard');
  });

  it('re-throws NEXT_REDIRECT — never swallows it as an error', async () => {
    await expect(loginAction(INITIAL, makeFormData(VALID))).rejects.toMatchObject({
      digest: expect.stringContaining('NEXT_REDIRECT'),
    });
  });
});

// ── Error handling ─────────────────────────────────────────────────────────────
describe('loginAction — error handling', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns sanitized error when backend auth call throws', async () => {
    (serverLib.backendAuthRequest as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Invalid credentials'),
    );
    const result = await loginAction(INITIAL, makeFormData(VALID));
    expect(result.error).toBe('Invalid credentials');
    expect(result.success).toBe(false);
  });

  it('redirects to /verify-email when error message contains "email" and "verif"', async () => {
    (serverLib.backendAuthRequest as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Email not verified — please check your inbox'),
    );
    const { redirect } = await import('next/navigation');
    try { await loginAction(INITIAL, makeFormData(VALID)); } catch (_) { /* redirect */ }
    expect(redirect).toHaveBeenCalledWith('/verify-email');
  });

  it('returns bootstrap error message when bootstrap call fails (not a redirect)', async () => {
    (serverLib.backendAuthRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: MOCK_USER,
      session: MOCK_SESSION,
    });
    (serverLib.setServerAuthCookies as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (serverLib.serverApiRequest as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Organization setup failed'),
    );
    const result = await loginAction(INITIAL, makeFormData(VALID));
    expect(result.error).toContain('Organization setup failed');
    expect(result.success).toBe(false);
  });

  it('does not return error for bootstrap NEXT_REDIRECT — re-throws it', async () => {
    (serverLib.backendAuthRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: MOCK_USER,
      session: MOCK_SESSION,
    });
    (serverLib.setServerAuthCookies as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const redirectError = Object.assign(new Error('NEXT_REDIRECT'), {
      digest: 'NEXT_REDIRECT;/dashboard/org/my-org',
    });
    (serverLib.serverApiRequest as ReturnType<typeof vi.fn>).mockRejectedValue(redirectError);
    await expect(loginAction(INITIAL, makeFormData(VALID))).rejects.toMatchObject({
      digest: 'NEXT_REDIRECT;/dashboard/org/my-org',
    });
  });
});
