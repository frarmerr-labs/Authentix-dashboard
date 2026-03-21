# Changelog

All notable changes to this project are documented here.

## Release Index

| Release | Date | Focus |
|---|---|---|
| Unreleased | 2026-03-22 | ExportSection generation overlay rework — state model, StrictMode fix, brand color, dragger sync, progress cap, success icons |
| Unreleased | 2026-03-21 | Generate-certificate UX fixes, ManualDataEntry fixes |
| Unreleased | 2026-03-20 | Auth/login cleanup, certificate schema alignment |
| Unreleased | 2026-03-19 | Slug routing migration, API contract alignment |
| Historical | 2026-01-14 | Signup and verification flow improvements |
| Historical | 2026-01-13 | Bootstrap and dashboard guard groundwork |

---

## [Unreleased] - 2026-03-22

### Changes

| Type | Area | Summary | Key Files |
|---|---|---|---|
| Fixed | ExportSection | Replaced `isGenerating + isShowingSuccess + generationComplete` trio with single `overlayState: 'hidden' \| 'generating' \| 'success'` enum — eliminates multi-flag race conditions and `useEffect` dependency fragility | `ExportSection.tsx` |
| Fixed | ExportSection | React StrictMode `isMountedRef` bug: effect body now sets `isMountedRef.current = true` on mount. Without this, double-mount cleanup left ref permanently `false`, silently aborting the success path | `ExportSection.tsx` |
| Fixed | ExportSection | Success now triggered via direct `setOverlayState('success')` + `setTimeout` inside `handleGenerate` — not a `useEffect` watching state deps | `ExportSection.tsx` |
| Fixed | ExportSection | Brand color: `--primary` is `oklch()` not HSL. `hsl(var(--primary))` renders as nothing. All generation/success UI now uses `#3ECF8E` directly | `ExportSection.tsx` |
| Fixed | ExportSection | Dragger/fill sync: dragger dot is now a child of the fill `<div>` at `right: -7px`. Single `width` transition moves both — physically impossible to drift | `ExportSection.tsx` |
| Improved | ExportSection | Progress simulation cap raised from ~83% to ~98%: `Math.min(elapsed/estimatedMs, 0.98) * share * 0.98` — crawls up to 98% while API is in-flight, jumps to 100% on completion | `ExportSection.tsx` |
| Fixed | ExportSection | All CSS keyframes hoisted to a single always-rendered `<style>` tag — previously some keyframes were inside conditional branches and missing from DOM when animations started | `ExportSection.tsx` |
| Improved | ExportSection | CSS-only generation animation: orbiting dots at 3 radii + document skeleton lines + pulsing center — no external assets | `ExportSection.tsx` |
| Improved | ExportSection | Success icons: `ShieldCheck` (96px) with `genShieldPop` entry + `genShieldGlow` loop; floating `BadgeCheck` overlay with `genBadgePop` entry + `genBadgeFloat` loop | `ExportSection.tsx` |

### Notes

| Item | Detail |
|---|---|
| Root cause | StrictMode double-mount + `isMountedRef` with no body reset was the persistent stuck-at-100% root cause across multiple fix attempts. |
| CSS variable gotcha | `--primary` in this project is `oklch()`. Never use `hsl(var(--primary))` in inline styles or canvas — use `#3ECF8E` directly. |
| State model lesson | Multi-flag async state (`isA + isB + isC + useEffect`) is fragile for sequential UI phases. Single enum is the correct pattern. |

---

## [Unreleased] - 2026-03-21

### Changes

| Type | Area | Summary | Key Files |
|---|---|---|---|
| Fixed | ExportSection | Added `isMountedRef` guard — prevents async state updates from `handleGenerate` firing on unmounted component when user navigates to Import Data during/after generation | `app/dashboard/org/[slug]/generate-certificate/components/ExportSection.tsx` |
| Fixed | DataSelector | Duplicate column mapping warning no longer triggers for semantic fields (Name, Start Date, End Date) in multi-template mode — they are intentionally shared across templates | `app/dashboard/org/[slug]/generate-certificate/components/DataSelector.tsx` |
| Fixed | ExportSection preview | Landscape certificate previews now use a wider dialog (`max-w-5xl`) and `w-full` image so they fill the available space instead of appearing small | `app/dashboard/org/[slug]/generate-certificate/components/ExportSection.tsx` |
| Improved | Generation UX | Certificate card stack enlarged to 500×320px; more visible grid lines (0.12 opacity + radial vignette); progress bar has wavy SVG fill + lightning bolt dragger circle with spark particles and `draggerGlow`/`boltFlicker` animations | `app/dashboard/org/[slug]/generate-certificate/components/ExportSection.tsx` |
| Fixed | Generation UX | Stuck-at-100% bug fixed — all CSS keyframes hoisted to single always-rendered `<style>` tag (previously `zoomIn` was declared inside the conditional `isShowingSuccess` branch, missing from DOM when animation started); `try/finally` guarantees `setIsGenerating(false)` always fires | `app/dashboard/org/[slug]/generate-certificate/components/ExportSection.tsx` |
| Improved | Generation UX | Progress animation reaches 100%, transitions to centered success animation with ripple rings; faded grid lines behind overlay | `app/dashboard/org/[slug]/generate-certificate/components/ExportSection.tsx` |
| Improved | CertificateTable | Category and subcategory columns shown in generated certificates table (column hidden if template has no category) | `app/dashboard/org/[slug]/generate-certificate/components/CertificateTable.tsx`, `ExportSection.tsx` |
| Fixed | ManualDataEntry | Validation error no longer shows when email is typed but row not yet committed — `allRowsValid` now reads live `editingRow` data via `getEffectiveRow` | `app/dashboard/org/[slug]/generate-certificate/components/ManualDataEntry.tsx` |
| Fixed | ManualDataEntry | "Confirm Data" auto-commits any open editing row before submitting — no need to click the ✓ save icon first | `app/dashboard/org/[slug]/generate-certificate/components/ManualDataEntry.tsx` |
| Fixed | ManualDataEntry | Date picker now updates editable row without exiting edit mode; popover close is controlled | `app/dashboard/org/[slug]/generate-certificate/components/ManualDataEntry.tsx` |
| Fixed | ManualDataEntry | Split live sync (`onDataChange`) from explicit confirm (`onDataSubmit`) to prevent unintended preview navigation | `app/dashboard/org/[slug]/generate-certificate/components/ManualDataEntry.tsx`, `app/dashboard/org/[slug]/generate-certificate/components/DataSelector.tsx` |
| Fixed | ManualDataEntry table UX | Added minimum column widths for better readability with many template fields | `app/dashboard/org/[slug]/generate-certificate/components/ManualDataEntry.tsx` |
| Fixed | Field rendering | Selection outline color updated for dark canvas clarity; font size now scales during template resize | `app/dashboard/org/[slug]/generate-certificate/components/DraggableField.tsx`, `app/dashboard/org/[slug]/generate-certificate/page.tsx` |
| Improved | Generate-certificate flow | Template selection now navigates to design immediately with loading overlay and stale-request guard | `app/dashboard/org/[slug]/generate-certificate/page.tsx` |
| Improved | Template management | Added delete action from template selection cards with loading/confirm UX | `app/dashboard/org/[slug]/generate-certificate/components/TemplateSelector.tsx`, `app/dashboard/org/[slug]/generate-certificate/page.tsx` |
| Fixed | Data mapping | Missing-column warning now excludes asset field types (`image`, `custom_text`, `qr_code`) | `app/dashboard/org/[slug]/generate-certificate/components/DataSelector.tsx` |
| Improved | Preview UX | Certificate previews moved from `window.open` to dialog carousel | `app/dashboard/org/[slug]/generate-certificate/components/ExportSection.tsx` |
| Improved | Generation UX | Blueprint-style progress visualization and elapsed-time progress simulation | `app/dashboard/org/[slug]/generate-certificate/components/ExportSection.tsx` |
| Improved | Download UX | Direct native anchor download replaced blob buffering path | `app/dashboard/org/[slug]/generate-certificate/components/CertificateTable.tsx` |
| Fixed | Theme default | Default dark theme applied at root layout | `app/layout.tsx` |

### Notes

| Item | Detail |
|---|---|
| Root cause cluster | Several regressions came from coupling "live edit state updates" and "final submit navigation" in one callback path. |
| Documentation sync | Related rules and anti-pattern notes were updated in agent/documentation files. |

---

## [Unreleased] - 2026-03-20

### Changes

| Type | Area | Summary | Key Files |
|---|---|---|---|
| Removed | Auth login | Removed Cloudflare Turnstile dependency and login token wiring | `app/(auth)/login/page.tsx`, `app/(auth)/login/actions.ts`, `package.json`, `package-lock.json` |
| Fixed | API types | `Certificate` interface aligned to current backend schema (`issued_at`, `expires_at`, `active/revoked/expired`, `verification_path`, etc.) | `src/lib/api/client.ts` |
| Fixed | Certificates UI | Updated certificates page references to new schema fields and status values | `app/dashboard/org/[slug]/certificates/page.tsx` |
| Fixed | Generate-certificate | Null `fileUrl` guard added to avoid dimension extraction crash | `app/dashboard/org/[slug]/generate-certificate/page.tsx` |

---

## [Unreleased] - 2026-03-19

### Changes

| Type | Area | Summary | Key Files |
|---|---|---|---|
| Added | Routing | Migrated org route semantics from UUID to slug (`/dashboard/org/[slug]`) | `app/dashboard/org/[slug]/layout.tsx`, `app/dashboard/page.tsx`, `src/lib/org/context.tsx` |
| Fixed | API contract | Standardized verification endpoint usage to `POST /verification/verify` | `src/lib/api/client.ts` |
| Fixed | API types | Added `queued` import status support and slug-aware bootstrap types | `src/lib/api/client.ts`, `app/dashboard/org/[slug]/imports/page.tsx` |
| Fixed | Auth fallback | `/api/auth/me` fallback aligned to backend nested profile/organization structure | `app/api/auth/me/route.ts` |
| Improved | Logging policy | Reduced noisy success-path logging; retained failure-path diagnostics | `src/lib/api/client.ts` |

### Notes

| Item | Detail |
|---|---|
| Security model | Slug is route context only; backend JWT organization context remains auth source of truth. |

---

## [Historical] - 2026-01-14

### Highlights

| Area | Change |
|---|---|
| Signup success flow | Added cookie-independent email verification polling with timeout and manual refresh controls. |
| Login flow | Consolidated bootstrap to post-login path and improved error handling messaging. |
| Auth callback | Improved cross-device verification redirect behavior. |
| Dashboard loading | Added resilient loading/retry behaviors and skeleton-driven UX in resolver/layout. |
| Branding/UI | Updated brand assets, favicon setup, and auth page visual consistency. |
| Catalog performance | Introduced category/subcategory caching and prefetching for faster template upload UX. |

---

## [Historical] - 2026-01-13

| Type | Summary |
|---|---|
| Added | Post-login bootstrap flow for organization provisioning before dashboard redirect. |
| Added | Dashboard guard bootstrap path when organization context is missing. |
| Added | `api.auth.bootstrap` helper for reuse across auth/dashboard paths. |
| Improved | Timeout messaging in dashboard resolver. |
