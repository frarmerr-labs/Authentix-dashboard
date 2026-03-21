# Changelog

## [Unreleased] — 2026-03-21 (continued)

### Fixed — Field Selection Box Too Large / Font Too Small

Two root causes for fields appearing oversized with undersized text after a session with template resize:

1. **Selection outline color** (`DraggableField.tsx`) — hardcoded `#d4d4d4` (light grey) was visually prominent on the dark canvas (`#141414`), making the selection border appear larger than it actually was. Changed to `var(--primary)` (brand green) for `isSelected` (1.5px dashed) and `isMultiSelected` (2px solid).

2. **`handleTemplateResize` missing `fontSize` scaling** (`page.tsx`) — when the canvas template was resized, `x`, `y`, `width`, and `height` were all proportionally scaled but `fontSize` was not. After resize, field boxes changed size while text stayed at its original size. Fixed by scaling `fontSize` using the geometric mean of the x/y scale factors: `Math.round(f.fontSize * Math.sqrt(sx * sy))`.

**Files changed:**
- `app/dashboard/org/[slug]/generate-certificate/components/DraggableField.tsx`
- `app/dashboard/org/[slug]/generate-certificate/page.tsx`

---

### Fixed — 8 Generate-Certificate UX Bugs

1. **Dark theme default** — Added `className="dark"` to `<html>` in `app/layout.tsx`; applies to login, signup, and all dashboard pages via Tailwind CSS variables.

2. **Skip template step when navigating via `?template=` param** — `currentStep` and `isTemplateLoading` now initialized from `templateIdFromUrl` so user lands on the design step immediately with a loading overlay instead of seeing the template chooser briefly.

3. **ManualDataEntry auto-save UX** — Removed floppy disk Save icon; replaced with `CheckCircle2` green checkmark confirm button. Added `onKeyDown` Enter auto-commit on text inputs. Date picker auto-commits on date select. Validation error background changed from brown/orange to `bg-destructive/10` (red).

4. **ExpiryDateSelector custom date picker spacing** — Added `pt-3 mt-1 border-t space-y-3` wrapper around the custom date section; `sideOffset` increased to 8. Replaced custom date input with shadcn `Calendar` inside `Popover`.

5. **Preview modal two close buttons** — `DialogContent` in shadcn always renders a built-in close button as last child; hidden via `[&>button:last-child]:hidden` on the `DialogContent` className.

6. **Generation animation + progress stuck at 0%** — Replaced blueprint SVG animation with a cleaner stacked-card animation. Switched from count-based (`Math.floor(totalRows * 0.92)` = 0 for single recipient) to time-elapsed progress simulation (`elapsed / estimatedMs`) so progress always animates smoothly. "Generate More" reset now also clears `progress`, `simulatedCount`, and `progressLabel`.

**Files changed:**
- `app/layout.tsx`
- `app/dashboard/org/[slug]/generate-certificate/page.tsx`
- `app/dashboard/org/[slug]/generate-certificate/components/ManualDataEntry.tsx`
- `app/dashboard/org/[slug]/generate-certificate/components/ExpiryDateSelector.tsx`
- `app/dashboard/org/[slug]/generate-certificate/components/ExportSection.tsx`

---

## [Unreleased] — 2026-03-21

### Improved — Generate-Certificate UX Overhaul

Six UX improvements to the certificate generation flow:

#### 1. Direct Navigation to Design Step
- `handleTemplateSelect` now calls `setCurrentStep('design')` + `setIsTemplateLoading(true)` **before** any async API calls — user lands on design instantly instead of waiting on the template chooser
- Full-screen loading overlay (`Wand2` pulse animation) shown while template metadata fetches in the background
- Stale-request guard via `selectRequestRef` discards in-flight results when the user switches templates quickly

**Files changed:** `app/dashboard/org/[slug]/generate-certificate/page.tsx`

---

#### 2. Delete Template from Choose-Template Screen
- Added `onDeleteTemplate?: (id: string) => Promise<void>` prop to `TemplateSelector`
- Card hover overlay shows a destructive **Trash2 icon** button alongside "Use Template"
- `deletingId` state drives a spinner while delete is in flight; `window.confirm` prevents accidental deletes
- Parent `page.tsx` calls `api.templates.delete()` then removes the template from local state

**Files changed:**
- `app/dashboard/org/[slug]/generate-certificate/components/TemplateSelector.tsx`
- `app/dashboard/org/[slug]/generate-certificate/page.tsx`

---

#### 3. Column Warning — Exclude Image & QR Asset Fields
- "Some field columns weren't found in your file" was incorrectly including `image` and `custom_text` fields (UUID-named SVG assets, QR assets) in the missing-column check
- Filter now excludes `type !== 'qr_code' && type !== 'image' && type !== 'custom_text'` from mappable fields

**Files changed:** `app/dashboard/org/[slug]/generate-certificate/components/DataSelector.tsx` (line ~91)

---

#### 4. Preview in Modal with Carousel (Not New Tab)
- Preview no longer opens in `window.open()` — replaced with a Shadcn `Dialog` modal
- Carousel (`ChevronLeft` / `ChevronRight` + dot indicators) for multiple certificate configs
- Close button at top-right of modal

**Files changed:** `app/dashboard/org/[slug]/generate-certificate/components/ExportSection.tsx`

---

#### 5. Blueprint SVG Generation Animation
- Replaced generic pulsing rings + spinner with a blueprint-style inline SVG animation:
  - Grid background (`<pattern>` crosshatch), certificate outline with `strokeDashoffset` driven by `progress`%
  - Corner accent brackets, title bar, text lines, circular seal with star
  - Glowing scan line that translates vertically with progress (0 → 100%)
- Progress percentage counter shown below the SVG

**Files changed:** `app/dashboard/org/[slug]/generate-certificate/components/ExportSection.tsx`

---

#### 6. Instant Certificate Download (No Buffer Delay)
- Replaced `fetch() → blob → createObjectURL → anchor.click()` with native anchor click
- `a.href = cert.download_url; a.click()` — browser handles transfer directly; no file buffered in memory first
- Removed `downloadingId` state and loading spinner from download button

**Files changed:** `app/dashboard/org/[slug]/generate-certificate/components/CertificateTable.tsx`

---

## [Unreleased] - 2026-03-20

### Removed — Cloudflare Turnstile CAPTCHA

CAPTCHA was disabled on Supabase dashboard but code still required `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — signin button was permanently `disabled` with no error shown.

- Removed `@marsidev/react-turnstile` package (`npm uninstall`)
- Removed Turnstile widget, `captchaToken` state, `turnstileRef`, and hidden input from `app/(auth)/login/page.tsx`
- Removed `captchaToken` from `login/actions.ts` request body
- Submit button now only `disabled={pending}`

**Files changed:**
- `app/(auth)/login/page.tsx`
- `app/(auth)/login/actions.ts`
- `package.json`, `package-lock.json`

---

### Fixed — Certificate Interface Aligned to Live DB Schema

`Certificate` interface in `src/lib/api/client.ts` was using old column names that don't exist in the live database.

**Removed:** `certificate_template_id`, `course_name`, `issue_date`, `expiry_date`, `storage_path`, `verification_code`, `verification_token`, `issued_by`

**Added/corrected:** `generation_job_id`, `template_version_id`, `category_id`, `subcategory_id`, `recipient_phone`, `recipient_data`, `issued_at`, `expires_at`, `status: 'active' | 'revoked' | 'expired'` (was `'issued'`), `revoked_at`, `revoked_reason`, `verification_path`, `qr_payload_url`, `download_url`

**Files changed:**
- `src/lib/api/client.ts`

---

### Fixed — Certificates Page Field References

All UI references updated to use correct field names from new Certificate schema.

- `cert.issue_date` → `cert.issued_at`
- `cert.expiry_date` → `cert.expires_at`
- `cert.verification_code` / `cert.verification_token` → `cert.verification_path`
- `cert.course_name` → `cert.template?.subcategory?.name`
- `status: 'issued'` badge → `status: 'active'`
- Verify Link and Public Page actions now use `cert.verification_path` directly

**Files changed:**
- `app/dashboard/org/[slug]/certificates/page.tsx`

---

### Fixed — Null fileUrl Crash in Generate-Certificate Dimension Extraction

When `fileUrl` was `null` or `undefined` (no preview URL and no source file URL), the code called `fetch(null)` which threw a TypeError logged as `Failed to extract dimensions {}`.

Added a null guard: if `fileUrl` is falsy, skip fetch and fall back to 800×600 defaults.

**Files changed:**
- `app/dashboard/org/[slug]/generate-certificate/page.tsx`

---

## [Unreleased] - 2026-03-19

### Added — Slug-Based Organization Routing

- Dashboard URLs now use human-readable slugs: `/dashboard/org/{slug}` instead of `/dashboard/org/{uuid}`
- `OrgContext` (`src/lib/org/context.tsx`) exposes `slug` via `useOrgSlug()` hook; `useOrgId()` kept as deprecated alias
- Layout (`app/dashboard/org/[slug]/layout.tsx`) detects UUID-shaped params and redirects to `/dashboard` for backward compat with old bookmarks
- Auth flows (login action, callback route, dashboard resolver) all use `org.slug ?? org.id` fallback pattern
- Security: slug is for routing only — authorization always uses `organizationId` from JWT context

### Fixed — API Contract Standardization

**1. `ImportJob.status` type mismatch** — added `'queued'` to union type in `src/lib/api/client.ts`; added `'queued'` badge variant in `imports/page.tsx`

**2. `api.verification.verify()` wrong HTTP method** — was `GET /verification/{token}`; now `POST /verification/verify` with body `{ token }` to match backend contract

**3. `api.auth.bootstrap()` response type** — added `slug?: string` to `organization` field for slug-based redirects after bootstrap

**4. `/api/auth/me` BFF fallback** — updated `/users/me` response type to match actual backend structure `{ profile, organization, membership }`; fallback path now returns `organization.slug`

**5. Removed excessive debug logging** — removed all verbose `console.log` from success paths in `apiRequest()`, template upload, and catalog methods; kept `console.error` on failures only (trimmed to `status`, `errorCode`, `errorMessage`)

**Files changed:**
- `src/lib/api/client.ts`: Status type, verify method, bootstrap type, logging cleanup
- `app/api/auth/me/route.ts`: Organization slug in fallback path
- `app/dashboard/org/[slug]/imports/page.tsx`: Queued badge variant
- `src/lib/org/context.tsx`: Slug-based context, `useOrgSlug()` hook
- `src/components/dashboard/DashboardShell.tsx`: Slug props
- `app/dashboard/org/[slug]/layout.tsx`: UUID backward-compat redirect
- `app/(auth)/login/actions.ts`: Slug-based redirect
- `app/(auth)/auth/callback/route.ts`: Slug-based redirect
- `app/dashboard/page.tsx`: Slug-based resolver

---

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
