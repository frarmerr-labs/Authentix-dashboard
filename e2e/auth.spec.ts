/**
 * E2E tests for authentication flows — login and signup.
 * API calls are intercepted via page.route() so no live backend is required.
 *
 * Run with: npm run test:e2e
 * Requires: npm run dev (or CI webServer config in playwright.config.ts)
 */
import { test, expect, type Page } from '@playwright/test';

// ── Route interceptors ─────────────────────────────────────────────────────────

/** Mock a successful login response + bootstrap */
async function mockLoginSuccess(page: Page, slug = 'my-org') {
  await page.route('**/api/proxy/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          user: { id: 'u1', email: 'test@example.com', full_name: 'Test User' },
          session: { access_token: 'mock-at', refresh_token: 'mock-rt', expires_at: 9999999999 },
        },
      }),
    });
  });
  await page.route('**/api/proxy/auth/bootstrap', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { organization: { id: 'org-1', slug } },
      }),
    });
  });
}

/** Mock a failed login response */
async function mockLoginFailure(page: Page, message = 'Invalid email or password') {
  await page.route('**/api/proxy/auth/login', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, error: message }),
    });
  });
}

/** Mock a successful signup response (email verification required — no session) */
async function mockSignupSuccess(page: Page) {
  await page.route('**/api/proxy/auth/signup', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          user: { id: 'u2', email: 'new@example.com', full_name: 'New User' },
          message: 'Please verify your email',
        },
      }),
    });
  });
}

/** Mock a failed signup (duplicate email) */
async function mockSignupFailure(page: Page, message = 'Email already registered') {
  await page.route('**/api/proxy/auth/signup', async (route) => {
    await route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, error: message }),
    });
  });
}

// ── LOGIN TESTS ────────────────────────────────────────────────────────────────
test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('renders the login form with email and password fields', async ({ page }) => {
    await expect(page.getByLabel(/Email/i)).toBeVisible();
    await expect(page.getByLabel(/Password/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign in/i })).toBeVisible();
  });

  test('shows the Authentix logo', async ({ page }) => {
    const logo = page.getByAltText(/Authentix/i);
    await expect(logo).toBeVisible();
  });

  test('shows "Sign up" link for new users', async ({ page }) => {
    await expect(page.getByRole('link', { name: /Sign up/i })).toBeVisible();
  });

  test('shows "Forgot?" link', async ({ page }) => {
    await expect(page.getByRole('link', { name: /Forgot/i })).toBeVisible();
  });

  test('password toggle button shows/hides password', async ({ page }) => {
    const passwordInput = page.getByLabel(/Password/i).first();
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: /Show password/i }).click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: /Hide password/i }).click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('shows email-verified success banner when ?verified=1 query param is set', async ({ page }) => {
    await page.goto('/login?verified=1');
    await expect(page.getByText(/Email verified/i)).toBeVisible();
  });

  test('pre-fills email from ?email= query param', async ({ page }) => {
    await page.goto('/login?email=prefilled%40example.com');
    await expect(page.getByLabel(/Email/i)).toHaveValue('prefilled@example.com');
  });

  test('shows error alert on failed login', async ({ page }) => {
    await mockLoginFailure(page);
    await page.getByLabel(/Email/i).fill('wrong@example.com');
    await page.getByLabel(/Password/i).first().fill('wrongpassword');
    await page.getByRole('button', { name: /Sign in/i }).click();
    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('button shows "Signing in..." spinner while submitting', async ({ page }) => {
    // Delay the response so we can capture the loading state
    await page.route('**/api/proxy/auth/login', async (route) => {
      await new Promise((r) => setTimeout(r, 500));
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'bad credentials' }),
      });
    });
    await page.getByLabel(/Email/i).fill('test@example.com');
    await page.getByLabel(/Password/i).first().fill('pass1234');
    await page.getByRole('button', { name: /Sign in/i }).click();
    await expect(page.getByText(/Signing in/i)).toBeVisible();
  });

  test('redirects to /dashboard/org/{slug} on successful login', async ({ page }) => {
    await mockLoginSuccess(page, 'acme-inc');
    await page.getByLabel(/Email/i).fill('test@example.com');
    await page.getByLabel(/Password/i).first().fill('Password1');
    await page.getByRole('button', { name: /Sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/org\/acme-inc/, { timeout: 10_000 });
  });
});

// ── SIGNUP TESTS ───────────────────────────────────────────────────────────────
test.describe('Signup page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signup');
  });

  test('renders the signup form with all required fields', async ({ page }) => {
    await expect(page.getByLabel(/Full Name/i)).toBeVisible();
    await expect(page.getByLabel(/Company Name/i)).toBeVisible();
    await expect(page.getByLabel(/Email/i)).toBeVisible();
    await expect(page.getByLabel(/Password/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Create account/i })).toBeVisible();
  });

  test('shows "Sign in" link for existing users', async ({ page }) => {
    await expect(page.getByRole('link', { name: /Sign in/i })).toBeVisible();
  });

  test('shows password validation error when password is too short', async ({ page }) => {
    await page.getByLabel(/Full Name/i).fill('John Doe');
    await page.getByLabel(/Company Name/i).fill('Acme Corp');
    await page.getByLabel(/Email/i).fill('john@example.com');
    await page.getByLabel(/Password/i).first().fill('short');
    await page.getByRole('button', { name: /Create account/i }).click();
    await expect(page.getByText(/8 character/i)).toBeVisible();
  });

  test('shows password validation error when password lacks uppercase', async ({ page }) => {
    await page.getByLabel(/Full Name/i).fill('John Doe');
    await page.getByLabel(/Company Name/i).fill('Acme Corp');
    await page.getByLabel(/Email/i).fill('john@example.com');
    await page.getByLabel(/Password/i).first().fill('password123');
    await page.getByRole('button', { name: /Create account/i }).click();
    await expect(page.getByText(/uppercase/i)).toBeVisible();
  });

  test('shows email validation error for invalid email format', async ({ page }) => {
    await page.getByLabel(/Full Name/i).fill('John Doe');
    await page.getByLabel(/Company Name/i).fill('Acme Corp');
    await page.getByLabel(/Email/i).fill('notanemail');
    await page.getByLabel(/Password/i).first().fill('Password1');
    await page.getByRole('button', { name: /Create account/i }).click();
    await expect(page.getByText(/valid email/i)).toBeVisible();
  });

  test('shows error when full name is too short', async ({ page }) => {
    await page.getByLabel(/Full Name/i).fill('A');
    await page.getByLabel(/Company Name/i).fill('Acme Corp');
    await page.getByLabel(/Email/i).fill('test@example.com');
    await page.getByLabel(/Password/i).first().fill('Password1');
    await page.getByRole('button', { name: /Create account/i }).click();
    await expect(page.getByText(/full name/i)).toBeVisible();
  });

  test('redirects to /signup/success after successful signup', async ({ page }) => {
    await mockSignupSuccess(page);
    await page.getByLabel(/Full Name/i).fill('Jane Smith');
    await page.getByLabel(/Company Name/i).fill('Tech Corp');
    await page.getByLabel(/Email/i).fill('new@example.com');
    await page.getByLabel(/Password/i).first().fill('Password1');
    await page.getByRole('button', { name: /Create account/i }).click();
    await expect(page).toHaveURL(/\/signup\/success/, { timeout: 10_000 });
  });

  test('shows backend error message when signup fails (duplicate email)', async ({ page }) => {
    await mockSignupFailure(page, 'Email already registered');
    await page.getByLabel(/Full Name/i).fill('Jane Smith');
    await page.getByLabel(/Company Name/i).fill('Tech Corp');
    await page.getByLabel(/Email/i).fill('existing@example.com');
    await page.getByLabel(/Password/i).first().fill('Password1');
    await page.getByRole('button', { name: /Create account/i }).click();
    await expect(page.getByText(/Email already registered/i)).toBeVisible();
  });
});
