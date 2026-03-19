# Project Memory — Authentix Dashboard (Frontend)

**Last Updated:** 2026-03-19
**Audited by:** Claude Code (claude-sonnet-4-6)

---

## Architecture

- **Type:** Next.js 16.1.1 monorepo (App Router) — frontend only
- **Deployment:** Vercel
- **Pattern:** BFF (Backend-For-Frontend) — all data via REST proxy or Route Handlers
- **No direct Supabase client** in frontend — all data flows through backend API

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.1.1 (App Router) |
| UI | React 19.2.3 |
| Language | TypeScript 5.9.3 (strict mode) |
| Styling | Tailwind CSS v4 + Radix UI |
| PDF | pdf-lib 1.17.1, react-pdf 10.3.0, pdfjs-dist |
| Data Import | xlsx 0.18.5, csv-stringify 6.6.0 |
| Drag & Drop | @dnd-kit/core 6.3.1 |
| QR Code | qrcode 1.5.4 |
| Archive | jszip 3.10.1 |
| Date | date-fns 4.1.0 + date-fns-tz |
| Icons | lucide-react 0.562.0 |
| IDs | uuid 13.0.0 |
| Dev Server | Turbopack |

---

## Frontend Overview

### Directory Layout
```
app/                           # Next.js App Router
  (auth)/login/               # Login page + Server Action
  (auth)/signup/              # Signup page + Server Action
  (auth)/verify-email/        # Email verification page
  verify/[token]/             # Public certificate verification
  dashboard/                  # Org resolver (redirects)
  dashboard/org/[orgId]/      # Protected org shell (Server layout)
    generate-certificate/     # Certificate builder (Client)
    templates/                # Template management (Client)
    certificates/             # Certificate list (Client)
    imports/                  # Import jobs (Client)
    users/                    # User management (Client)
    settings/                 # Org settings (Client)
    billing/                  # Billing + invoices (Client)
    verification-logs/        # Verify history (Client)
  api/auth/                   # Route Handlers (auth endpoints)
  api/proxy/[...path]/        # SSRF-hardened reverse proxy
  api/templates/with-previews # BFF: templates + previews aggregated
src/
  lib/api/client.ts           # Client-side API object (all endpoints)
  lib/api/server.ts           # Server-side authenticated fetch
  lib/org/context.tsx         # OrgContext + useOrg hook
  lib/types/                  # Shared TypeScript types
  lib/utils/guards.ts         # Production-only action guards
  lib/utils/retry.ts          # Exponential backoff retry
  features/                   # Feature-sliced modules
```

### Key Files
- `proxy.ts` — Middleware; cookie auth check, public route skip, redirect
- `src/lib/api/client.ts` — All frontend API calls (api.auth.*, api.templates.*, etc.)
- `src/lib/api/server.ts` — Server-side fetch with cookie auth
- `app/api/proxy/[...path]/route.ts` — Core proxy with allowlist + security

---

## Backend Overview

- **Backend URL:** `https://authentix-backend.vercel.app/api/v1`
- **Set via env:** `BACKEND_API_URL`
- **Framework:** Fastify 5.6.2 on Vercel serverless
- **Auth:** JWT via Bearer header (proxy injects from HttpOnly cookie)

---

## API Endpoints (Frontend → Backend)

### Auth
- `POST /api/auth/login` → backend `/auth/login`
- `POST /api/auth/signup` → backend `/auth/signup`
- `POST /api/auth/logout` → backend `/auth/logout`
- `GET /api/auth/session` → backend `/auth/session`
- `GET /api/auth/me` → backend `/auth/me` (with fallbacks)
- `POST /api/auth/refresh` → backend `/auth/refresh`
- `POST /api/proxy/auth/bootstrap` → backend `/auth/bootstrap`

### Templates
- `GET /api/proxy/templates` → backend `/templates`
- `POST /api/proxy/templates` → backend `/templates` (multipart)
- `PUT /api/proxy/templates/:id` → backend `/templates/:id`
- `DELETE /api/proxy/templates/:id` → backend `/templates/:id`
- `GET /api/templates/with-previews` → BFF (aggregated)

### Certificates
- `POST /api/proxy/certificates/generate` → backend `/certificates/generate`

### Import Jobs
- `GET/POST /api/proxy/import-jobs` → backend `/import-jobs`
- `GET /api/proxy/import-jobs/:id/data` → backend paginated data
- `GET /api/proxy/import-jobs/:id/download` → backend download URL

### Billing
- `GET /api/proxy/billing/overview` → backend `/billing/overview`
- `GET /api/proxy/billing/invoices` → backend `/billing/invoices`
- `GET /api/proxy/billing/invoices/:id` → backend `/billing/invoices/:id`

### Other
- `GET /api/proxy/dashboard/stats` → backend `/dashboard/stats`
- `GET/PUT /api/proxy/organizations/me` → backend `/organizations/me`
- `POST /api/proxy/verification/verify` → backend `/verification/verify` (public)
- `GET /api/proxy/catalog/categories` → backend `/catalog/categories`

---

## Frontend → Backend Mapping

| User Action | Frontend | Backend |
|---|---|---|
| Login | Server Action → POST /api/auth/login | POST /auth/login |
| Signup | Server Action → POST /api/auth/signup | POST /auth/signup |
| Create org | Server Action → POST /api/proxy/auth/bootstrap | POST /auth/bootstrap |
| Upload template | POST /api/proxy/templates (FormData) | POST /templates |
| List templates | GET /api/templates/with-previews (BFF) | GET /templates + preview-url |
| Generate certs | POST /api/proxy/certificates/generate | POST /certificates/generate |
| Import Excel | POST /api/proxy/import-jobs (FormData) | POST /import-jobs |
| View billing | GET /api/proxy/billing/overview | GET /billing/overview |
| Pay invoice | External link (razorpay_payment_link) | — (Razorpay redirect) |
| Verify certificate | POST /api/proxy/verification/verify | POST /verification/verify |

---

## Supabase Schema (Inferred)

**Project ID:** `brkyyeropjslfzwnhxcw`

| Table | Purpose |
|---|---|
| `profiles` | User metadata |
| `organizations` | Tenant data, billing status, API keys |
| `organization_members` | User ↔ Org membership with role |
| `organization_roles` | owner / admin / member definitions |
| `certificate_templates` | Template metadata |
| `certificate_template_versions` | Template version history |
| `certificate_template_fields` | Field positioning/styling per version |
| `certificates` | Generated certificates |
| `files` | Storage file index |
| `invoices` | Billing invoices |
| `razorpay_events` | Webhook idempotency store |
| `app_audit_logs` | Audit trail |
| `certificate_verification_events` | Verify history |
| `certificate_generation_jobs` | Async job queue |

**Note:** Frontend has NO Supabase client. No direct DB access from browser.

---

## Auth System

### Cookie Strategy
- **HttpOnly, Secure, SameSite=Lax**
- `auth_access_token` — JWT, 7-day expiry
- `auth_refresh_token` — 30-day expiry
- `auth_expires_at` — Unix timestamp

### Session Validation
- 5-minute buffer before expiry triggers refresh
- `GET /api/auth/session` validates before protected API calls
- Middleware (`proxy.ts`) checks cookie presence on every request

### Auth Middleware (Backend)
- 3 variants: `authMiddleware` (JWT+org), `jwtOnlyAuthMiddleware` (JWT only), `optionalAuthMiddleware`
- Bearer header takes priority over Cookie
- JWT cached in LRU cache (1-hour TTL)

---

## External Integrations

### Razorpay
- Backend-only Razorpay SDK
- Frontend: Displays payment links from `invoices.razorpay_payment_link`
- User redirected to Razorpay-hosted page (no embedded SDK)
- Webhook: `POST /api/v1/webhooks/razorpay` — HMAC-SHA256 verified, idempotent

### WhatsApp
- **NOT IMPLEMENTED** — Guard placeholder only (`'whatsapp:send'`)
- No SDK, no API, no integration code

### Email
- Supabase built-in auth email (verification only)
- No transactional email service (SendGrid, Mailgun, etc.)

---

## Environment Variables

| Variable | Exposure | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser | CDN/image URLs only |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser | Image CDN auth (no DB access) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Service role (used in backend, not frontend route handlers for DB) |
| `BACKEND_API_URL` | Server only | Backend base URL |

---

## Key Business Logic

1. **Certificate Generation Flow:**
   - Upload PDF/image template → drag fields onto canvas → import Excel/CSV → map columns → generate → download

2. **Multi-page PDF support:**
   - Fields store `pageNumber` (0-indexed); canvas renders per-page

3. **Import Job System:**
   - Files uploaded → parsed by backend → stored in DB → user maps columns → used in generation

4. **Template Versioning:**
   - Backend manages `certificate_template_versions`; frontend edits active version

5. **Batch Limit:**
   - ≤50 recipients: synchronous generation (200 OK)
   - >50 recipients: async job (202 Accepted, **worker NOT YET IMPLEMENTED**)

6. **Org Bootstrap:**
   - On first login: creates profile → organization → roles → membership
   - Idempotent; safe to retry

---

## Known Limitations

1. **Async cert generation >50 is broken** — job created but no worker processes it
2. **WhatsApp not implemented** — guards exist but no code
3. **No transactional email** — only Supabase auth emails
4. **RLS bypassed on backend** — tenant isolation is application-level only
5. **JWT cache means revoked tokens valid for up to 1 hour**

---

## Recent Changes (APPEND ONLY)

- **2026-03-19** | Initial full system audit | First audit of codebase; all above is baseline state
- **2026-03-19** | Dynamic backend URL system | `.env.local` now defaults to `http://localhost:3001/api/v1`; `getBackendUrl()` in `server.ts` falls back to localhost in non-production; `refresh/route.ts` duplicate `getBackendUrl()` aligned to same logic; `.env.example` documents local vs production setup. Vercel env sets `BACKEND_API_URL=https://authentix-backend.vercel.app/api/v1` for production. No `NEXT_PUBLIC_` used — backend URL stays server-only.
