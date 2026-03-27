# CTO Architecture Guide - Authentix Dashboard

This document is designed for technical leadership conversations: architecture, design rationale, library decisions, security posture, runtime flow, and operational trade-offs.

---

## 1) Executive Summary

`Authentix-dashboard` is a `Next.js 16 App Router` frontend that follows a **BFF (Backend-for-Frontend) proxy architecture**.

Core intent:
- Keep browser clients away from direct backend and database internals.
- Centralize auth/session and request guardrails in the Next server layer.
- Enforce organization-scoped UX under `/dashboard/org/[slug]`.
- Keep backend as the source of truth for authorization and business rules.

High-level runtime path:

`Browser -> Next App Router + Route Handlers -> Backend API -> Response back through Next`

---

## 2) Business Context and System Boundary

Frontend responsibilities:
- Auth UX (login/signup/session lifecycle via server routes/actions)
- Organization-scoped dashboard rendering
- Template designer and field placement UI
- Data import, mapping, and generation orchestration
- Billing, delivery settings, users/settings, and verification surfaces

Out of scope in this frontend repo:
- Direct DB access/writes
- Backend business persistence logic
- Worker execution and heavy async generation backplane

This separation keeps compliance/security-sensitive logic consolidated in the backend while the frontend remains orchestration + presentation.

---

## 3) Architecture and Design Pattern Choices

## BFF / Proxy Pattern

Implemented through:
- `app/api/proxy/[...path]/route.ts`
- `app/api/auth/*/route.ts`
- `src/lib/api/client.ts` (client calls only internal Next APIs)
- `src/lib/api/server.ts` (server-side direct backend calls)

Why this pattern:
- Prevents browser exposure of private backend topology.
- Enables centralized request validation, allowlisting, timeout policy, and error sanitization.
- Reduces CORS complexity by using same-origin API calls from browser to Next.
- Makes auth-cookie handling server-controlled and safer than token-in-storage designs.

## Defense in Depth for Auth and Routing

Multiple checks are intentional:
- `proxy.ts`: route-level gate for public vs protected paths.
- `app/dashboard/org/[slug]/layout.tsx`: server-side session/profile/org validation.
- Backend JWT context: final authorization authority.

Why layered:
- Fast coarse redirect at edge/proxy-like level.
- Strong contextual validation at server render boundary.
- Backend remains final security truth, so URL slug cannot grant access.

## Server-first Data Strategy with Client Interactivity

Pattern:
- Server Components/layouts for first-load auth/profile checks.
- Client Components only where rich interactivity is required (designer, DnD, panel state, previews).

Why:
- Better initial performance and reduced client bootstrap for critical auth/org checks.
- Retains high-interaction UX where necessary without making entire app client-only.

---

## 4) Request and Code Flow (End-to-End)

## A) Authentication Flow

1. User submits login/signup form.
2. Next auth route handler (example: `app/api/auth/login/route.ts`) forwards to backend.
3. On success, Next sets `HttpOnly` cookies via `setServerAuthCookies`.
4. Browser navigates to protected routes.
5. `proxy.ts` redirects unauthenticated requests to `/login`.
6. `/dashboard` resolver routes user to `/dashboard/org/[slug]`.
7. Org layout re-validates session/profile/membership before shell render.

Key cookies:
- `auth_access_token`
- `auth_refresh_token`
- `auth_expires_at`

## B) Browser API Call Flow

1. UI calls `api.*` methods in `src/lib/api/client.ts`.
2. Calls target `/api/auth/*` or `/api/proxy/*`.
3. Proxy route validates method/path and forwards auth headers/cookies safely.
4. Backend response is normalized and returned to UI.
5. 401 handling attempts one refresh (`/api/auth/refresh`) and retries once.

## C) Organization Routing Flow

1. User hits `/dashboard`.
2. Client resolver calls `/api/auth/me` and determines org slug.
3. Redirect to `/dashboard/org/[slug]`.
4. Server layout validates that URL slug matches authenticated org slug; mismatches are redirected to actual org slug.

## D) Certificate Generation Flow

Primary implementation:
- `app/dashboard/org/[slug]/generate-certificate/page.tsx`
- `app/dashboard/org/[slug]/generate-certificate/components/*`

Flow:
1. Choose template (or upload/create one).
2. Load editor data and dimensions.
3. Place/edit fields on canvas.
4. Autosave field schema (`saveFields`) to backend.
5. Import CSV/XLSX or manual recipient data.
6. Map columns to fields.
7. Call generate endpoint.
8. Show result overlays, previews, and export/download options.

Known caveat:
- Large-batch async completion depends on backend worker maturity (`⚠️ Needs clarification` for production SLA details).

---

## 5) Security Architecture

## Access and Session Security

- Auth stored in `HttpOnly` cookies (not `localStorage`/`sessionStorage` for tokens).
- Route gating at `proxy.ts`.
- Server-side auth/profile checks in org layout.
- Backend remains authorization source of truth.

## Proxy Hardening

`app/api/proxy/[...path]/route.ts` includes:
- Allowed HTTP method set.
- Path allowlist (`/auth/`, `/templates`, `/organizations/`, etc.).
- Path traversal and suspicious-pattern checks.
- Hop-by-hop header stripping.
- Timeout + abort handling.
- Sanitized error responses to clients.

## Browser/Runtime Security Headers

`next.config.ts` configures:
- HSTS
- X-Frame-Options
- X-Content-Type-Options
- Referrer-Policy
- Permissions-Policy
- CSP (currently includes `'unsafe-inline'` and `'unsafe-eval'` for compatibility with existing PDF/canvas/runtime requirements)

Risk note:
- CSP is functional but not maximally strict today.

---

## 6) Why These Libraries (Technical Rationale)

This section is optimized for "why did we choose X?" discussions.

## Platform Core

- `next` / `react` / `react-dom` / `typescript`
  - App Router, server/client component split, strict typing, mature deployment model.
  - Used across entire app runtime.

## UI System and Design Consistency

- `tailwindcss` + `tailwind-merge` + `class-variance-authority` + `clsx`
  - Utility-first styling with deterministic class composition and variant control.
  - Keeps UI primitives consistent and reduces ad hoc CSS drift.

- `@radix-ui/*`
  - Accessible primitives for dialogs, menus, popovers, tabs, etc.
  - Reduces accessibility and behavior edge-case burden for custom controls.

- `lucide-react`
  - Consistent iconography with lightweight component API.

- `sonner`
  - Toast system for action feedback (errors/success/info) without custom notification stack.

## Certificate and File Tooling

- `pdf-lib`
  - PDF introspection/manipulation in designer and generation prep.
  - Dynamically loaded via `src/lib/utils/dynamic-imports.ts` to avoid heavy initial bundle cost.

- `react-pdf` + `pdfjs-dist`
  - PDF rendering/viewing support in certificate workflows.

- `xlsx`
  - Spreadsheet parsing for import workflows (recipient data).
  - Dynamically imported to keep first load faster.

- `csv-stringify` + `jszip`
  - CSV export and ZIP packaging for download/export features.
  - Also dynamically imported where possible to reduce baseline JS payload.

- `qrcode`
  - QR generation for certificate verification embeds and previews.

## Interactive Builder UX

- `@dnd-kit/*`
  - Robust drag-and-drop in email template builder and sortable block interactions.

- `react-dropzone`
  - Unified drag/drop file ingestion (templates/assets/import files).

- `react-resizable`
  - Field and UI resizing behavior in design tooling.

- `react-colorful`
  - Compact color picker in field styling UI.

- `nanoid`
  - Stable client-side IDs for builder block instances.

## Analytics and Time UX

- `recharts`
  - Analytics dashboard visualizations with responsive chart components.

- `date-fns` + `date-fns-tz` + `react-day-picker`
  - Date formatting, timezone handling, and date selection controls.

---

## 7) Data and Domain Model Strategy

Design approach:
- `src/lib/api/client.ts` defines frontend-facing typed contracts and endpoint wrappers.
- `src/lib/api/server.ts` defines server-side API behavior and cookie utility layer.
- Data contracts intentionally include backend enum/status alignment where possible.

Important practical note:
- Any drift between frontend types and backend schemas is a known risk; strict TypeScript reduces, but does not eliminate, contract mismatch risk.

---

## 8) Performance and Scalability Considerations

Current strengths:
- Dynamic imports for heavy libraries (`pdf-lib`, `xlsx`, `jszip`, `csv-stringify`, `qrcode`).
- Lazy loading of heavy UI subtrees in generation flow via `next/dynamic`.
- Server-first checks reduce unnecessary client churn for protected routes.

Current limits / trade-offs:
- Certificate generation UX for very large batches depends on backend async worker path.
- Logging verbosity is high in some critical paths (good for debugging, noisy for production operations).

---

## 9) Reliability and Error Handling

Patterns in place:
- Timeouts via `AbortController` for client/proxy requests.
- Auto fallback from local backend URL to production backend URL in configured local mode.
- Retry with exponential backoff for profile readiness (`PROFILE_NOT_READY`) in org layout.
- Sanitized user-facing messages through `sanitizeErrorMessage`.

This gives practical resilience for transient backend startup and session edge cases.

---

## 10) Testing and Quality Gates

Primary test stack:
- Unit/component: `Vitest` + Testing Library (`jsdom`)
- E2E: `Playwright`

Expected quality gates:
- `npm run typecheck`
- `npm run lint`
- `npm run test:run`
- `npm run build`

The current setup is built for fast developer feedback plus realistic end-to-end validation of auth + generation flows.

---

## 11) CTO Talking Points (Ready-to-Use)

- We intentionally use a BFF proxy model to centralize security and avoid exposing backend contracts directly to browsers.
- Authentication is cookie-based with `HttpOnly` tokens, reducing token-exfiltration risk from XSS compared to storage-based token patterns.
- Organization URL slugs are routing context only; authorization is enforced by backend JWT context and server-side checks.
- Heavy libraries are dynamically imported to preserve dashboard responsiveness and reduce initial bundle cost.
- Our most complex business flow (certificate generation) is modularized into clear stages: template, design, data, export.
- The largest architectural risk area is contract drift and async large-batch backend dependencies; both are known and explicitly monitored.

---

## 12) File Map for Architecture Reviews

Start here during technical walkthroughs:
- `proxy.ts`
- `app/api/proxy/[...path]/route.ts`
- `app/api/auth/login/route.ts`
- `app/api/auth/refresh/route.ts`
- `src/lib/api/client.ts`
- `src/lib/api/server.ts`
- `src/lib/config/env.ts`
- `app/dashboard/page.tsx`
- `app/dashboard/org/[slug]/layout.tsx`
- `app/dashboard/org/[slug]/generate-certificate/page.tsx`
- `next.config.ts`

These files cover the majority of "why does the system behave this way?" questions.

