# Changelog

## 2026-01-14

### Signup & Email Verification Flow Improvements
- **Signup Success Page (`/signup/success`):**
  - Implemented cookie-independent polling for email verification (works cross-device)
  - Polls every 2 seconds for up to 5 minutes using `GET /api/auth/verification-status?email={email}`
  - Removed bootstrap call from signup success page (bootstrap now only in login flow)
  - When email verified, shows "Email verified ✅" and redirects to `/login?verified=1&email={email}` after 2 seconds
  - Added "Sign in to dashboard" button for immediate redirect
  - Added window focus listener to re-check verification when user returns to tab
  - Added manual "Check Verification Status" button for immediate refresh
  - Improved error handling for 401 (email verified but no session)
  - Email parameter now passed via URL query string from signup action

- **Signup Action (`app/(auth)/signup/actions.ts`):**
  - Updated to redirect to `/signup/success?email={encoded_email}` with email in query params
  - Made session optional in response handling (backend may not return session if verification required)
  - Improved error handling with try-catch around cookie setting
  - Added fallback redirect even on errors (assuming user was created in DB)

- **Auth Callback Route (`app/(auth)/auth/callback/route.ts`):**
  - Updated to redirect to `/login?verified=1` when no session exists (cross-device scenario)
  - Removed bootstrap call from callback route
  - Improved error handling for code exchange failures

- **Login Flow (`app/(auth)/login/actions.ts` & `page.tsx`):**
  - Bootstrap now exclusively called after successful login (when session cookie exists)
  - Added bootstrap error handling with clear error messages
  - Added "Retry Setup" button for bootstrap failures
  - Added success banner when `verified=1` query param present: "Email verified. Please sign in to continue."
  - Improved error message sanitization
  - Fixed `NEXT_REDIRECT` error logging (no longer logs as application error)
  - Added `export const dynamic = 'force-dynamic'` to prevent SSR/hydration issues

- **Verification Status API (`app/api/auth/verification-status/route.ts`):**
  - New endpoint to check email verification status by email (cookie-independent)
  - Supports cross-device verification detection
  - Falls back to `/auth/me?email=...` if primary endpoint fails

- **Email Verification Page (`app/(auth)/verify-email/page.tsx`):**
  - Updated to use new brand logo and narrower width
  - Improved UI consistency with other auth pages

### Branding & UI Updates
- **Brand Colors:**
  - Changed primary brand color to `#3ECF8E` (green) throughout application
  - Updated `globals.css` with new primary color scale
  - Applied brand colors to alerts, buttons, and interactive elements

- **Logo & Favicons:**
  - Integrated new dashboard logo (`Authentix-24-24.svg`) in auth pages and header areas
  - Added favicon assets from `logo/brandAssets/brand-logo-favicon/` to `public/`
  - Wired favicons in `app/layout.tsx` with proper metadata configuration
  - Moved `themeColor` from metadata to viewport export (Next.js 13+ requirement)

- **Auth Pages Layout:**
  - Redesigned signup success page to be centered and not require scrolling
  - Increased logo size on login screen (48x48) and removed rectangular border
  - Reduced width of login box to `max-w-380px` for better proportions
  - Made other auth screens (signup, verify-email) narrower but not excessively so
  - Improved "Check your email" box design with better font sizes and icon alignment
  - Fixed visibility of "Waiting for email verification..." box
  - Centered "Email verified" alert text and icon on login page with brand colors

### Dashboard Loading Improvements
- **Dashboard Resolver (`app/dashboard/page.tsx`):**
  - Replaced spinner with skeleton design mimicking dashboard layout
  - Added retry logic after bootstrap to re-fetch `/api/auth/me` up to 3 times with exponential backoff
  - Improved error handling for expired sessions (silent redirect to login)
  - Increased timeout to 12 seconds
  - Changed initial profile fetching to use `/api/auth/me` instead of proxy to avoid 401s

- **Dashboard Layout (`app/dashboard/org/[orgId]/layout.tsx`):**
  - Implemented resilient initialization with retry logic using `retryWithBackoff`
  - Added skeleton loading screen (`DashboardLoadingScreen`) for "Initializing your workspace" and "Finalizing account setup"
  - Removed frontend bootstrap calls (bootstrap only in login flow)
  - Updated to handle `PROFILE_NOT_READY`, `AUTH_ERROR`, and `ORG_NOT_FOUND` errors gracefully
  - Updated `UserProfileResponse` to use new logo fields (`logo_file_id`, `logo_bucket`, `logo_path`, `logo_url`)
  - Fixed `NEXT_REDIRECT` error re-throwing
  - Updated membership mapping to correctly interpret full `membership` object from backend

- **Dashboard Loading Screen (`src/components/dashboard/DashboardLoadingScreen.tsx`):**
  - Made component client-side with auto-refresh mechanism
  - Added customizable messages for different loading states
  - Auto-refreshes page after 5 seconds to trigger layout re-evaluation

### API & Data Handling
- **API Client (`src/lib/api/client.ts`):**
  - Added `api.auth.me()` method supporting optional `email` parameter for cross-device checks
  - Added `api.auth.checkVerificationStatus()` method
  - Added `api.auth.bootstrap()` method
  - Updated organization logo handling to use `logo_file_id`, `logo_bucket`, `logo_path`, `logo_url`
  - Made dashboard stats fields optional and nullable for graceful degradation
  - Added timeout handling (10 seconds) to prevent infinite loading
  - Added comprehensive request/response logging

- **API Route Handlers:**
  - Updated `/api/auth/me` to support `email` query parameter for cross-device verification
  - Fixed organization data extraction from nested `profile.organization` object
  - Improved fallback logic for email verification status

### Bug Fixes
- Fixed "Rendered fewer hooks than expected" error in SignupSuccessPage
- Fixed `Loader2 is not defined` error in signup success page
- Fixed `NEXT_REDIRECT` error logging in login action and dashboard layout
- Fixed redirect paths from `/auth/verify-email` to `/verify-email`
- Fixed dashboard loading stuck on "Finalizing account setup" by updating membership mapping
- Fixed `abortController` undefined reference in subcategories hook
- Fixed category loading stuck issue with improved state management

### Template Upload Improvements
- **Validation & Error Handling:**
  - Made "Title" field mandatory with inline validation and error display
  - Added whitespace trimming for title before submission
  - Blocked form submission if title, category, subcategory, or file is missing
  - Implemented user-friendly error message mapping (storage errors, validation errors, etc.)
  - Added visual feedback (red border) for invalid title field
  - Title validation triggers on blur and during submit

- **API & Storage:**
  - Confirmed frontend only sends metadata (title, category_id, subcategory_id, file blob)
  - Added documentation clarifying frontend never generates storage paths
  - Backend handles all storage path generation (files.path, bucket names, org paths)

- **UI/UX:**
  - Reduced template upload modal width from `max-w-2xl` to `max-w-lg` for better proportions
  - Reduced file upload box height (padding from `p-8` to `p-6`)
  - Made icons and text smaller for more compact design
  - Improved spacing and visual hierarchy

### Catalog Categories Pre-fetching
- **Performance:**
  - Created shared cache manager (`use-catalog-cache.ts`) for categories and subcategories
  - Pre-fetch categories when templates page loads (not when dialog opens)
  - Categories appear instantly in upload dialog with no loading delay
  - Cache has 5-minute TTL to keep data fresh
  - Updated `useCatalogCategories` hook to use shared cache

- **Bug Fixes:**
  - Fixed undefined `abortController` reference in subcategories hook
  - Added comprehensive logging for debugging category loading issues
  - Improved error handling and timeout management

### API Client Improvements
- **Logging:**
  - Added detailed request/response logging for catalog endpoints
  - Log raw response text, parsed JSON, and error details
  - Improved debugging visibility for API calls

## 2026-01-13
- Added post-login bootstrap flow to provision organization before redirect.
- Added dashboard guard to bootstrap organization when missing and redirect to the correct org.
- Added `api.auth.bootstrap` helper for reuse.
- Improved timeout messaging in dashboard resolver (client-side).
