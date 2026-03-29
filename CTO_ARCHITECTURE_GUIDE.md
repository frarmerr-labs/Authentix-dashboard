# CTO Architecture Guide — Authentix Dashboard

> **Audience**: Technical leadership, board-level engineering reviews, architecture audits.
> **Last verified against codebase**: 2026-03-29
> **Stack baseline**: Next.js 16.1 · React 19.2 · TypeScript 5.9 · Tailwind CSS 4.1 · Node ≥ 24

---

## 1 · Executive Summary

Authentix Dashboard is a **Next.js 16 App Router** frontend that implements a strict **BFF (Backend-for-Frontend) proxy architecture**. The system is purpose-built for enterprise certificate lifecycle management — covering template design, data ingestion, batch generation, delivery orchestration, and verification.

### Design Principles

| Principle | Implementation |
|---|---|
| **Zero direct backend exposure** | Browser clients never call the backend directly; all traffic routes through Next.js API handlers |
| **Server-controlled auth** | Session tokens live in `HttpOnly` cookies — immune to `localStorage`/XSS exfiltration |
| **Organization-scoped isolation** | All protected routes enforce `/dashboard/org/[slug]` with server-side membership validation |
| **Backend-as-authority** | Frontend is orchestration + presentation; backend owns all business rules and authorization |

### Runtime Architecture

```
┌──────────────┐       ┌──────────────────────────────────────┐       ┌──────────────────┐
│              │       │         Next.js Server               │       │                  │
│   Browser    │──────▶│                                      │──────▶│  Backend API     │
│   (React)    │◀──────│  ┌─────────────┐  ┌───────────────┐  │◀──────│  (Fastify)       │
│              │       │  │ Route       │  │ Proxy Handler │  │       │                  │
│              │       │  │ Handlers    │  │ /api/proxy/*  │  │       │  + Supabase      │
│              │       │  │ /api/auth/* │  │               │  │       │  + AWS SES       │
│              │       │  └─────────────┘  └───────────────┘  │       │                  │
└──────────────┘       │  ┌─────────────────────────────────┐  │       └──────────────────┘
                       │  │ Middleware (proxy.ts)            │  │
                       │  │ Route gating · Auth redirect     │  │
                       │  └─────────────────────────────────┘  │
                       └──────────────────────────────────────┘
```

---

## 2 · Business Context

### What the Frontend Owns

- **Authentication UX** — login, signup, email verification, session lifecycle via server route handlers
- **Organization dashboard** — slug-scoped rendering with server-side access validation
- **Template designer** — PDF canvas editor with drag-and-drop field placement
- **Data ingestion** — CSV/XLSX import, column mapping, recipient management
- **Certificate generation** — orchestration of template + data → generation request
- **Delivery settings** — email integration configuration, template authoring
- **Billing & invoicing** — plan display, invoice retrieval, payment link handoff
- **Analytics** — KPI cards, area charts, donut charts for certificate/delivery metrics

### What the Frontend Does NOT Own

| Concern | Owner |
|---|---|
| Database read/write operations | Backend (Supabase via Fastify) |
| Business logic persistence | Backend |
| Worker execution & async generation | Backend |
| Email sending (SES) | Backend |
| JWT issuance & validation | Backend |
| File storage path resolution | Backend (Supabase Storage) |

---

## 3 · Architecture Decisions

### 3.1 · BFF / Proxy Pattern

**Implementation files:**

| File | Role |
|---|---|
| [proxy.ts](file:///Users/harshitsaxena/Documents/GitHub/Authentix-dashboard/proxy.ts) | Next.js middleware — route gating, public vs. protected path checks, legacy redirect handling |
| [route.ts](file:///Users/harshitsaxena/Documents/GitHub/Authentix-dashboard/app/api/proxy/%5B...path%5D/route.ts) | Hardened proxy — method allowlist, path validation, timeout via `AbortController`, sanitized errors |
| [client.ts](file:///Users/harshitsaxena/Documents/GitHub/Authentix-dashboard/src/lib/api/client.ts) | Client-side API surface — all browser calls target `/api/auth/*` or `/api/proxy/*` only |
| [server.ts](file:///Users/harshitsaxena/Documents/GitHub/Authentix-dashboard/src/lib/api/server.ts) | Server-side API calls — direct backend access with auth cookie forwarding |

**Why this pattern over direct API calls:**

1. **Topology concealment** — browser never sees backend hostnames or internal paths
2. **Centralized validation** — request allowlisting, path traversal checks, and method restrictions in one place
3. **Same-origin simplicity** — eliminates CORS complexity entirely
4. **Cookie safety** — `HttpOnly` tokens are server-controlled, never readable by client JS

### 3.2 · Defense-in-Depth Auth

Three independent authentication checkpoints ensure no single bypass grants access:

```
    ① proxy.ts                ② Org Layout                ③ Backend JWT
    ─────────────────        ─────────────────           ─────────────────
    Coarse route gate        Server Component            Final authority
    Redirect to /login       validates session,          on every API call
    if no auth cookie        profile, and org            via JWT context
                             membership
```

**Key cookies:**

| Cookie | Purpose | Lifetime |
|---|---|---|
| `auth_access_token` | Bearer token for backend calls | Matches JWT expiry |
| `auth_refresh_token` | Silent token renewal | 30 days |
| `auth_expires_at` | Client-side expiry tracking | Matches access token |

All cookies use `HttpOnly`, `Secure` (production), `SameSite=Lax`, and `Path=/`.

### 3.3 · Server-First Data Strategy

| Pattern | When Used |
|---|---|
| **Server Components** | Initial auth checks, profile validation, layout data loading |
| **Client Components** | Canvas editor, drag-and-drop, panel state, previews, interactive forms |

This hybrid approach means the critical security path (auth, org validation) runs server-side before any client JS executes, while rich interactivity is preserved where users need it.

---

## 4 · Request Flows (End-to-End)

### 4.1 · Authentication Flow

```
User submits login form
    │
    ▼
POST /api/auth/login (Next route handler)
    │
    ▼
Handler forwards to backend: POST /auth/login
    │
    ▼
Backend validates credentials, returns JWT tokens
    │
    ▼
Next sets HttpOnly cookies via setServerAuthCookies()
    │
    ▼
Browser navigates to /dashboard
    │
    ▼
proxy.ts confirms auth cookie exists
    │
    ▼
/dashboard page calls POST /api/auth/resolve-dashboard
    │
    ▼
Redirect to /dashboard/org/[slug]
    │
    ▼
Org layout calls GET /auth/access-context (user + org + membership + email_verified)
    │
    ▼
Dashboard shell renders
```

**Auth route handlers** (10 endpoints):
`login` · `signup` · `logout` · `me` · `session` · `refresh` · `resend-verification` · `verification-status` · `resolve-dashboard` · `access-context`

### 4.2 · Proxied API Call Flow

```
1. UI calls api.templates.list() in client.ts
2. Request goes to /api/proxy/templates (same-origin)
3. Proxy route validates: method ∈ allowlist, path ∈ allowlist, no traversal
4. Forwards to backend with auth headers + cookies
5. Response normalized and returned to UI
6. On 401: attempt one silent refresh via /api/auth/refresh, retry once
7. On refresh failure: throw UNAUTHORIZED, redirect to login
```

**Timeout policy:**
- Standard requests: 10 seconds
- Certificate generation: 120 seconds (long-running)
- File uploads: 120 seconds

### 4.3 · Organization Routing

```
/dashboard → Client resolver calls POST /api/auth/resolve-dashboard
           → Backend returns canonical redirect_to path
           → Redirect to /dashboard/org/{slug}
           → Server layout calls GET /auth/access-context (single round trip)
           → Validates email_verified, org membership, slug match
           → Mismatch? Re-redirect to correct org slug
```

The URL slug is **routing context only** — authorization is enforced by the backend JWT, not by URL matching.

### 4.4 · Certificate Generation Pipeline

| Stage | Component | Description |
|---|---|---|
| 1. Template Selection | `generate-certificate/page.tsx` | Choose existing or upload new template |
| 2. Editor & Fields | `generate-certificate/components/*` | Place/style fields on PDF canvas with drag/resize |
| 3. Field Persistence | `api.templates.saveFields()` | Autosave field schema (replace semantics) to backend |
| 4. Data Import | CSV/XLSX upload → column mapping | Map spreadsheet columns to template fields |
| 5. Generation | `api.certificates.generate()` | Submit generation request to backend |
| 6. Results | Export overlay | Preview, download PDF, ZIP export |

> **⚠️ Caveat**: Large-batch async completion depends on backend worker maturity. Production SLA details require backend team clarification.

---

## 5 · Security Architecture

### 5.1 · Access & Session Security

| Control | Implementation |
|---|---|
| Token storage | `HttpOnly` cookies — not `localStorage` or `sessionStorage` |
| Route protection | `proxy.ts` middleware + server-side org layout checks |
| Authorization authority | Backend JWT context (not URL slugs) |
| Token refresh | Automatic silent refresh on 401, single retry to prevent loops |
| Session expiry buffer | 5-minute pre-expiry check in `isServerAuthenticated()` |

### 5.2 · Proxy Hardening

The catch-all proxy route (`/api/proxy/[...path]`) implements:

| Check | Purpose |
|---|---|
| HTTP method allowlist | Prevents unexpected methods |
| Path allowlist pattern matching | Only known backend paths are forwarded |
| Path traversal detection | Blocks `../`, encoded traversal patterns |
| Hop-by-hop header stripping | Prevents proxy header leaks |
| Timeout via `AbortController` | Prevents hung connections |
| Sanitized error responses | Internal details never leak to browser |

### 5.3 · Security Headers (`next.config.ts`)

| Header | Value | Notes |
|---|---|---|
| HSTS | `max-age=63072000; includeSubDomains; preload` | 2-year strict transport |
| X-Frame-Options | `SAMEORIGIN` | Clickjacking prevention |
| X-Content-Type-Options | `nosniff` | MIME sniffing prevention |
| X-XSS-Protection | `1; mode=block` | Legacy XSS filter |
| Referrer-Policy | `strict-origin-when-cross-origin` | Controlled referrer leakage |
| Permissions-Policy | `camera=(), microphone=(), geolocation=(), interest-cohort=()` | API restriction |
| CSP | Nonce-based per-request via `proxy.ts` | `unsafe-eval` removed; `unsafe-inline` kept as legacy fallback only (ignored by CSP Level 3 browsers when nonce is present) |

> **CSP status (2026-03-29)**: `unsafe-eval` has been removed. `proxy.ts` generates a per-request nonce, injects it into `Content-Security-Policy`, and forwards it via `x-nonce` header so server components can attach it to inline scripts. `unsafe-inline` is retained as a fallback for legacy browsers only — modern browsers ignore it when a valid nonce is present (CSP Level 3). Removing `unsafe-inline` entirely requires all inline scripts to carry the nonce, which is tracked as a future work item.

---

## 6 · Technology Rationale

This section answers "why did we choose X?" for board-level and architecture review conversations.

### Platform Core

| Technology | Version | Rationale |
|---|---|---|
| **Next.js** | 16.1.1 | App Router enables the BFF pattern natively — server/client component split, API route handlers, built-in middleware. Turbopack used for dev builds. |
| **React** | 19.2.3 | Server Component support is fundamental to the server-first data strategy. Concurrent rendering powers the interactive editor. |
| **TypeScript** | 5.9.3 (strict) | Compile-time safety for all API contracts, component props, and state shapes. Strict mode enforced project-wide. |

### UI Design System

| Technology | Purpose |
|---|---|
| **Tailwind CSS 4.1** + `tailwind-merge` + `class-variance-authority` + `clsx` | Utility-first styling with deterministic class composition. CVA provides typed variant control for component APIs. |
| **Radix UI** (11 primitives) | Accessible, unstyled primitives for dialogs, menus, popovers, tabs, selects, switches, etc. Eliminates a11y edge-case burden. |
| **Lucide React** | Consistent, lightweight icon system with tree-shakeable component API. |
| **Sonner** | Minimal toast notification system — replaces need for custom notification infrastructure. |

### Certificate & Document Pipeline

| Technology | Purpose | Loading Strategy |
|---|---|---|
| **pdf-lib** | PDF introspection and form manipulation in the designer | Dynamic import via `src/lib/utils/dynamic-imports.ts` |
| **react-pdf** + `pdfjs-dist` | PDF rendering and viewing in certificate workflows | Lazy loaded; worker copied via `postinstall` script |
| **xlsx** (SheetJS) | Spreadsheet parsing for recipient data import | Dynamic import |
| **csv-stringify** | CSV export for generated data | Dynamic import |
| **jszip** | ZIP packaging for bulk certificate downloads | Dynamic import |
| **qrcode** | QR code generation for verification embeds | Standard import |

> **Note on dynamic imports**: Heavy libraries (`pdf-lib`, `xlsx`, `jszip`, `csv-stringify`) are loaded only when their features are accessed. This keeps the initial dashboard bundle lean.

### Interactive Builder

| Technology | Purpose |
|---|---|
| **@dnd-kit** (core + sortable + utilities) | Drag-and-drop for email template builder and sortable block interactions |
| **react-dropzone** | Unified file ingestion via drag/drop and click (templates, assets, imports) |
| **react-resizable** | Field and element resizing in the certificate designer |
| **react-colorful** | Compact, accessible color picker for field styling |
| **nanoid** | Deterministic client-side IDs for builder block instances |

### Analytics & Date Handling

| Technology | Purpose |
|---|---|
| **Recharts** | Dashboard analytics — KPI cards, area charts, donut charts |
| **date-fns** + `date-fns-tz` | Date formatting and timezone-aware calculations |
| **react-day-picker** | Date range selection in analytics filters |

---

## 7 · Data & API Contract Strategy

### Contract Architecture

| Layer | File | Role |
|---|---|---|
| Client-side API | [client.ts](file:///Users/harshitsaxena/Documents/GitHub/Authentix-dashboard/src/lib/api/client.ts) (1,776 lines) | Typed endpoint wrappers for all browser-initiated calls. Defines frontend-facing DTOs. |
| Server-side API | [server.ts](file:///Users/harshitsaxena/Documents/GitHub/Authentix-dashboard/src/lib/api/server.ts) (426 lines) | Server Component API calls with cookie auth. Includes `sanitizeErrorMessage()` for safe client error display. |
| Environment config | [env.ts](file:///Users/harshitsaxena/Documents/GitHub/Authentix-dashboard/src/lib/config/env.ts) | Multi-environment URL resolution (`local` → `test` → `prod`) with automatic fallback. |

### API Response Shape (Standard Envelope)

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: Record<string, unknown> };
  meta?: { request_id: string; timestamp: string };
}
```

### Known Risk

Frontend TypeScript interfaces and backend API schemas are validated at runtime via Zod. `src/lib/api/schemas/auth.ts` defines `LoginRequestSchema`, `SignupRequestSchema`, `RefreshResponseSchema`, and `AccessContextResponseSchema`. All BFF auth route handlers (`login`, `signup`, `refresh`, `access-context`) use `safeParse`/`parse` to validate inputs and backend responses at the network boundary. Contract tests (`__tests__/lib/schemas/auth.test.ts`) verify every schema against both valid and invalid payloads.

---

## 8 · Performance & Scalability

### Current Strengths

| Strategy | Impact |
|---|---|
| Dynamic imports for `pdf-lib`, `xlsx`, `jszip`, `csv-stringify`, `qrcode` | Dashboard initial bundle stays under budget |
| `next/dynamic` for heavy UI subtrees in generation flow | Lazy loading triggered only when user enters the flow |
| Server-first auth/org checks | No unnecessary client bootstrap for protected routes |
| Turbopack in development | Sub-second HMR for iterative development |

### Current Limitations

| Limitation | Risk | Mitigation Path |
|---|---|---|
| Large-batch generation depends on backend worker maturity | UX hangs on very large batches | Backend async job pipeline + polling/subscription (Wave 3 FS5) |
| Console logging is verbose in critical paths | Noisy in production, poor incident correlation | Structured logger facade added (`src/lib/logger.ts`); further `any` hot paths remain |

---

## 9 · Reliability & Error Handling

| Pattern | Implementation | File |
|---|---|---|
| Request timeouts | `AbortController` with per-endpoint timeout policy | `client.ts` |
| Backend fallback | Auto-switch from local → production backend on `ECONNREFUSED` | `env.ts`, `server.ts` |
| Access context | Single `GET /auth/access-context` returns user + org + membership + email_verified — no retry needed | `layout.tsx` |
| Error sanitization | `sanitizeErrorMessage()` maps error codes to user-friendly strings | `server.ts` |
| Auto token refresh | Silent 401 → refresh → single retry cycle with loop prevention | `client.ts` |

---

## 10 · Testing & Quality Gates

### Test Stack

| Layer | Technology | Purpose |
|---|---|---|
| Unit / Component | **Vitest 3.2** + Testing Library + jsdom | Fast isolated tests with React component rendering |
| End-to-End | **Playwright 1.58** | Full browser-based flow validation (auth, generation, delivery) |
| Coverage | `@vitest/coverage-v8` | V8-based coverage reporting |

### Quality Checkpoints

```bash
npm run typecheck    # tsc --noEmit (strict mode)
npm run lint         # ESLint 9 with Next.js config
npm run test:run     # Vitest unit/component tests
npm run build        # Full production build verification
npm run test:e2e     # Playwright end-to-end suite
```

### Testing Constraints (From Experience)

- `vi.useFakeTimers()` deadlocks `userEvent.click()` in overlay tests — use `vi.spyOn(global, 'setInterval')` instead
- `vi.spyOn(document.body, 'appendChild')` before `render()` breaks React DOM root creation
- Vitest config uses `vite-tsconfig-paths` plugin (not manual alias maps) — order-sensitive

---

## 11 · CTO Talking Points

These are ready-to-use statements for board presentations, investor conversations, and architecture reviews:

> **1. Security posture**: "We use a BFF proxy model with HttpOnly cookie authentication. Browser clients never directly access our backend API, and session tokens cannot be exfiltrated via XSS because they're inaccessible to JavaScript."

> **2. Organization isolation**: "URL slugs are routing context only. Authorization is enforced by backend JWT context and server-side membership validation. You cannot access another organization's data by manipulating the URL."

> **3. Performance discipline**: "Heavy libraries like PDF processing and spreadsheet parsing are dynamically imported — they load only when users access those features. Our dashboard initial bundle stays lean and responsive."

> **4. Separation of concerns**: "Frontend handles presentation and orchestration. All business logic, data persistence, and authorization decisions live in the backend. This gives us a clear security boundary and makes compliance auditing straightforward."

> **5. Build quality**: "We enforce strict TypeScript, run unit + E2E tests, and validate full production builds in CI. Our test infrastructure uses Vitest for fast developer feedback and Playwright for realistic browser validation."

> **6. Known risks (transparently)**: "Our two largest architecture risks are (a) manual API contract synchronization between frontend and backend, and (b) async large-batch generation depending on backend worker maturity. Both are known, documented, and actively monitored."

---

## 12 · Architecture Review File Map

Start here during technical walkthroughs. These files cover the majority of "why does the system behave this way?" questions:

### Security & Routing Layer
| File | Purpose |
|---|---|
| [proxy.ts](file:///Users/harshitsaxena/Documents/GitHub/Authentix-dashboard/proxy.ts) | Middleware — route gating, auth redirect, legacy path handling |
| [app/api/proxy/[...path]/route.ts](file:///Users/harshitsaxena/Documents/GitHub/Authentix-dashboard/app/api/proxy/%5B...path%5D/route.ts) | Hardened proxy with allowlists and security checks |
| [next.config.ts](file:///Users/harshitsaxena/Documents/GitHub/Authentix-dashboard/next.config.ts) | Security headers, CSP, image remotePatterns |

### Authentication Layer
| File | Purpose |
|---|---|
| [app/api/auth/login/route.ts](file:///Users/harshitsaxena/Documents/GitHub/Authentix-dashboard/app/api/auth/login) | Login handler — credential forwarding + cookie setting |
| [app/api/auth/refresh/route.ts](file:///Users/harshitsaxena/Documents/GitHub/Authentix-dashboard/app/api/auth/refresh) | Silent token refresh |
| [src/lib/api/server.ts](file:///Users/harshitsaxena/Documents/GitHub/Authentix-dashboard/src/lib/api/server.ts) | Server-side auth utilities, cookie management |

### API Contract Layer
| File | Purpose |
|---|---|
| [src/lib/api/client.ts](file:///Users/harshitsaxena/Documents/GitHub/Authentix-dashboard/src/lib/api/client.ts) | Complete client-side API surface (1,776 lines) |
| [src/lib/config/env.ts](file:///Users/harshitsaxena/Documents/GitHub/Authentix-dashboard/src/lib/config/env.ts) | Backend URL resolution and fallback |

### Dashboard & Business Logic
| File | Purpose |
|---|---|
| [app/dashboard/page.tsx](file:///Users/harshitsaxena/Documents/GitHub/Authentix-dashboard/app/dashboard/page.tsx) | Dashboard resolver — org slug routing |
| [app/dashboard/org/[slug]/layout.tsx](file:///Users/harshitsaxena/Documents/GitHub/Authentix-dashboard/app/dashboard/org/%5Bslug%5D/layout.tsx) | Server-side auth + profile + org membership validation |
| [generate-certificate/page.tsx](file:///Users/harshitsaxena/Documents/GitHub/Authentix-dashboard/app/dashboard/org/%5Bslug%5D/generate-certificate/page.tsx) | Certificate generation orchestration |

---

## 12 · Design Pattern Assessment (Code-Verified)

> Audited 2026-03-27. Updated 2026-03-29. Every rating is verified against actual source files.

### Pattern Scorecard

| # | Pattern Area | Current Approach | Rating | Verdict |
|---|---|---|:---:|---|
| 1 | Architecture (BFF Proxy) | All browser→backend traffic through `/api/proxy/*` | ✅ **Strong** | Keep — this is the correct enterprise pattern |
| 2 | Auth & Session | HttpOnly cookies, server-side validation | ✅ **Strong** | Keep — immune to XSS, industry best practice |
| 3 | Server/Client Split | Server Components for data, Client for interaction | ✅ **Strong** | Keep — well aligned with React 19 model |
| 4 | Component Composition | Sub-components + composition in `DashboardShell` | ✅ **Strong** | Keep — clean separation of concerns |
| 5 | Org Context | Minimal context for slug routing (`OrgProvider`) | ✅ **Strong** | Keep — modern pattern for static config |
| 6 | Data Fetching | TanStack Query v5 across all data-fetching pages | ✅ **Done** | Adopted 2026-03-28 — auto caching, deduplication, background refetch |
| 7 | State Management | `useReducer` + state machines for all 4 major flows | ✅ **Done** | Adopted 2026-03-28 — layered domain reducers replace boolean soup |
| 8 | API Client Design | Split into 12 domain modules + `core.ts` barrel | ✅ **Done** | Adopted 2026-03-28 — `api.templates.list()` surface unchanged |
| 9 | Caching | TanStack Query built-in cache | ✅ **Done** | `CatalogCacheManager` deleted 2026-03-28 |
| 10 | Type Strategy | `src/lib/types/organization.ts` shared; Zod at auth boundaries | ✅ **Done** | Shared org type done; Zod schemas for all auth BFF routes; contract tests in `__tests__/lib/schemas/auth.test.ts` |

---

### Patterns That Are Best Practice ✅

#### 1. BFF Proxy Architecture
**Verdict: Keep. This is the gold standard for frontend security.**

```
Browser ──→ Next.js Route Handlers ──→ Backend API
              (auth + validation)        (business logic)
```

The proxy implements path allowlisting, method restriction, hop-by-hop header stripping, and `AbortController` timeouts. The backend topology is never exposed to the browser. No change needed.

#### 2. HttpOnly Cookie Authentication
**Verdict: Keep. Immune to XSS token theft.**

Tokens are stored in `HttpOnly`, `Secure`, `SameSite=Lax` cookies and managed exclusively via server-side route handlers. This eliminates the entire class of `localStorage`/`sessionStorage` token exfiltration attacks. This is the strongest pattern available.

#### 3. Server/Client Component Split
**Verdict: Keep. Well aligned with React 19.**

- **Server Components**: `layout.tsx` (auth/profile validation), page-level data fetching
- **Client Components**: Interactive UI (canvas, forms, drag-and-drop)
- Correct boundary — server handles auth/data; client handles interaction

#### 4. Component Composition
**Verdict: Keep.** `DashboardShell.tsx` demonstrates good sub-component extraction (`SidebarNav`, `ThemeButton`, `UserMenu`), constant extraction (`NAVIGATION_ITEMS`), and `useCallback` memoization.

#### 5. Organization Context
**Verdict: Keep.** `OrgProvider` is a minimal, memoized context that provides only slug + path generator — no fetched data, no over-rendering. This follows the React 19 recommendation of context for static config only.

---

### Patterns Upgraded ✅ (previously 🔴)

#### 6. Data Fetching — TanStack Query ✅ Done (2026-03-28)

**Was**: Manual `useEffect` + `useState` + `try/catch` in every page. No caching, deduplication, or background refetch. Hand-rolled `CatalogCacheManager` (129 lines) reinvented what React Query provides.

**Now**: TanStack Query v5 adopted across all data-fetching pages (`certificates`, `billing`, `imports`, `email-templates`, `organization`, `settings/api`). Query hook modules live in `src/lib/hooks/queries/` (10 domain files). `CatalogCacheManager` deleted.

```typescript
// Current pattern — declarative, cached, deduplicated
const { data, isLoading, error } = useQuery({
  queryKey: ['templates', { sort: 'created_at' }],
  queryFn: () => api.templates.list({ sort_by: 'created_at', sort_order: 'desc' }),
  staleTime: 5 * 60 * 1000,
});
```

#### 7. State Management — useReducer ✅ Done (2026-03-28)

**Was**: `generate-certificate/page.tsx` had 30+ `useState` hooks — the classic God Component. Impossible states were possible; cross-state coordination was manual and fragile.

**Now**: Layered domain architecture for all 4 priority flows:
- `generate-certificate/state/generateCertificateReducer.ts` — full reducer replacing 20+ `useState` hooks
- `email-templates/[id]/state/emailEditorReducer.ts`
- `settings/delivery/state/deliveryReducer.ts`
- `billing/schema/types.ts` + `services/billingService.ts`

`useGenerateCertificateState` hook wraps `useReducer` as a drop-in. Overlay state uses an enum (`hidden | generating | success`) — impossible states are now impossible.

#### 10. Type Strategy — No Shared Model

**Current**: Organization shape defined inline 5 times. Response types defined inside function bodies. No shared type model.

**2026 Recommendation — Centralized Type Layer**:

```
src/lib/types/
├── organization.ts    # Shared org shapes
├── certificate.ts     # Certificate, template, field types
├── billing.ts         # Invoice, payment types
├── delivery.ts        # Email integration, template types
├── api.ts             # ApiResponse<T>, ApiError, PaginatedResponse<T>
└── index.ts           # Re-exports
```

Add Zod schemas at network boundaries for runtime validation:

```typescript
import { z } from 'zod';

const OrganizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  logo_url: z.string().nullable().optional(),
  // ...
});

type Organization = z.infer<typeof OrganizationSchema>;
```

---

### Patterns Upgraded ✅ (previously 🟡)

#### 8. API Client Design — Split ✅ Done (2026-03-28)

**Was**: `client.ts` — 1,776 lines in a single file. High blast radius for any API contract change.

**Now**: Split into 12 domain modules under `src/lib/api/`:

```
src/lib/api/
├── client.ts          # Thin barrel re-export — api.X.Y() surface unchanged
├── core.ts            # apiRequest(), buildQueryString(), extractApiError()
├── auth.ts · templates.ts · certificates.ts · imports.ts
├── billing.ts · delivery.ts · organizations.ts · catalog.ts
├── dashboard.ts · verification.ts · users.ts
└── result.ts          # ApiResult<T>, normalizeApiResponse(), ok(), err()
```

#### 9. Caching — TanStack Query ✅ Done (2026-03-28)

**Was**: `CatalogCacheManager` (129 lines) — custom subscribe/notify, TTL, per-key cache management.

**Now**: Deleted. Replaced entirely by TanStack Query's built-in cache via `src/lib/hooks/queries/catalog.ts`.

---

### Priority Upgrade Path

| Priority | Pattern Upgrade | Status |
|:---:|---|---|
| **P0** | Shared type model (`src/lib/types/`) | ✅ Done 2026-03-28 |
| **P1** | Split `client.ts` into domain modules | ✅ Done 2026-03-28 |
| **P1** | Add TanStack Query for data fetching | ✅ Done 2026-03-28 |
| **P2** | Refactor generation page with `useReducer` + custom hooks | ✅ Done 2026-03-28 (`useGenerateCertificateState`) |
| **P2** | Remove `CatalogCacheManager` (replaced by Query cache) | ✅ Done 2026-03-28 |
| **P3** | Add Zod runtime validation at API boundaries | ✅ Done 2026-03-29 (auth schemas + BFF route validation) |

> **Key insight**: The architecture (BFF proxy, HttpOnly auth, server/client split) is **strong and correct**. The gaps are in application-level patterns: data fetching, state management, and type sharing. These are developer-experience and maintainability improvements — not security or correctness issues.

---

## 13 · Consolidated Implementation Roadmap (2026)

> **Synthesized from**: `ENGINEERING_IMPROVEMENT_MASTERPLAN_2026.md` · `DEPENDENCY_ENTERPRISE_AUDIT_2026-03-26.md` · `FRONTEND_BOUNDARY_REDUCTION_PLAN_2026.md` · `Authentix-backend/ENGINEERING_MASTERPLAN_2026.md`
> **Last updated**: 2026-03-29

### Cross-System Themes

All four documents converge on the same six root causes:

| Theme | Frontend Gap | Backend Gap |
|---|---|---|
| **Trust boundary drift** | Bootstrap, verification status, localStorage delivery config owned by frontend | No canonical `access-context` or `resolve-dashboard` endpoints |
| **Async architecture missing** | 120-second timeout on generation flow | Generation jobs have no worker; delivery send is synchronous on Vercel |
| **Test coverage gap** | Good base, missing proxy/auth integration tests | Sparse — no enterprise confidence in auth/billing/webhooks |
| **Structured observability** | 50+ `console.*` calls, no correlation IDs | Moderate — needs tracing and metrics policy |
| **Contract/type drift** | 5× org type duplication; no runtime validation | `companyId`/`organizationId` naming conflict in billing/webhooks |
| **God-file complexity** | `client.ts` 1,776 lines; `generate-certificate/page.tsx` 2,067 lines | Manageable today; risk grows with new domains |

---

### Wave 1 — Zero-Risk Quick Wins (Weeks 1–2)

Single-team, no coordination needed, very low change risk. Start here to build momentum.

#### Frontend

| # | Action | Source | Status |
|---|---|---|---|
| F1 | Declare missing devDependencies: `pdfjs-dist`, `@eslint/js`, `@typescript-eslint/*`, `eslint-plugin-react*` | Dependency Audit §3.2 | ✅ Done 2026-03-28 |
| F2 | Upgrade safe patches: React 19.2.4, Next 16.2.1, Tailwind 4.2.2, Recharts 3.8.1, csv-stringify 6.7.0 | Dependency Audit §2.1 | ✅ Done 2026-03-28 |
| F3 | Extract shared `extractApiError()` utility | Masterplan §4.5-V1 | ✅ Done 2026-03-28 |
| F4 | Extract shared `buildQueryString()` utility | Masterplan §4.5-V2 | ✅ Done 2026-03-28 |
| F5 | Create `src/lib/types/organization.ts` — shared org shape | Masterplan §4.5-V3 | ✅ Done 2026-03-28 |
| F6 | Migrate `xlsx` npm → `@e965/xlsx` (official SheetJS) | Dependency Audit P0 | ✅ Done 2026-03-28 |
| F7 | Verify + remove unused packages: `date-fns-tz`, `react-resizable`, `@radix-ui/react-checkbox` | Dependency Audit §3.1 | ✅ Done 2026-03-28 |

#### Backend

| # | Action | Source | Impact |
|---|---|---|---|
| B1 | Enforce structured JSON logging policy — replace `console.*` in all production paths | Backend Masterplan §4, §6 | Production-grade incident correlation |
| B2 | Document CSRF enforcement policy explicitly per route category | Backend Masterplan §P1-7 | Close ambiguous policy gap |
| B3 | Audit and purge all `companyId` / `company` references — standardize on `organizationId` | Backend Masterplan §P0-1,2 | Eliminate tenant key drift — **data-leak risk** |

---

### Wave 2 — Single-System Architecture (Weeks 2–6)

Moderate effort, no cross-team coordination required.

#### Frontend

| # | Action | Source | Status |
|---|---|---|---|
| F8 | Split `client.ts` into 12 domain modules — thin barrel re-export | Masterplan §3.1, CTO §8 | ✅ Done 2026-03-28 |
| F9 | Adopt **TanStack Query v5** for all data fetching | CTO §6 (Pattern 6) | ✅ Done 2026-03-28 |
| F10 | Delete `CatalogCacheManager` — replaced by React Query's built-in cache | CTO §9 | ✅ Done 2026-03-28 |
| F11 | Add integration tests for `/api/auth/*` and `/api/proxy/*` route handlers | Masterplan §7 | ✅ Done 2026-03-29 — `__tests__/api/auth/login.test.ts`, `signup.test.ts`, `proxy-route.test.ts` |
| F12 | Add Renovate or Dependabot with monthly cadence + emergency patch lane | Dependency Audit §P0-4 | ✅ Done 2026-03-29 — `.github/dependabot.yml`; monthly npm + GitHub Actions updates; patch/minor batched; major versions blocked for manual review |

#### Backend

| # | Action | Source | Approach |
|---|---|---|---|
| B4 | Add unit tests for auth, bootstrap, certificates, imports, billing, webhooks domains | Backend Masterplan §P0-5 | Mock repositories, test service layer in isolation |
| B5 | Add integration tests for middleware chain: auth + context + idempotency + security hooks | Backend Masterplan §P0-6 | Hit the request chain without external deps |
| B6 | Add CI schema-compat checks for critical tables/columns | Backend Masterplan §P1-11 | Catch schema drift before it reaches production |
| B7 | Tighten PII handling — expand log redaction rules for domain payload edges | Backend Masterplan §P1-10 | Compliance baseline |

---

### Wave 3 — Coordinated Full-Stack (Weeks 4–10)

**These are the highest-leverage improvements** but require frontend and backend to ship together. Backend delivers the endpoint first; frontend migrates off the old pattern under a feature flag.

| # | New Backend Endpoint | Frontend Migration | Source | Status |
|---|---|---|---|---|
| FS1 | `GET /auth/access-context` → `{ authenticated, email_verified, organization, membership }` | Single call replaces dual `/auth/me` + `/users/me` with retry in `layout.tsx` | Boundary Plan §P0 | ✅ Done 2026-03-29 |
| FS2 | `POST /auth/resolve-dashboard` → `{ redirect_to, setup_state }` | Replaced bootstrap + retry loop in `dashboard/page.tsx` | Boundary Plan §P0 | ✅ Done 2026-03-28 |
| FS3 | `GET/PUT /delivery/platform-default-settings` | Removed `localStorage` delivery config in `settings/delivery/page.tsx` | Boundary Plan §P0 | ✅ Done 2026-03-28 |
| FS4 | `GET /import-jobs/:id/data` (paginated normalized rows) | Remove XLSX re-parsing on restore/load | Boundary Plan §P1 | ✅ Already done — `api.imports.getData()` in place |
| FS5 | Async generation: `JobQueue` + `background_jobs` + worker + cron endpoint | Replace 120s timeout — ExportSection polls `GET /jobs/:id` until complete | Boundary Plan §P1 | ✅ Done 2026-03-29 |
| FS6 | Delivery queue: `deliverySendHandler` + `delivery_send` job + worker | Remove timeout risk on `POST /delivery/send` | Backend Masterplan §P0-4 | ✅ Done 2026-03-29 |

**Migration pattern for all FS items**:

```typescript
// Feature flag — ship backend first, migrate frontend gradually
const useNewEndpoint = process.env.NEXT_PUBLIC_FF_ACCESS_CONTEXT === 'true';

if (useNewEndpoint) {
  const ctx = await api.auth.accessContext();
  // new clean path
} else {
  // old fallback path — preserved until flag is 100%
}
// Remove old path + flag only after new endpoint proves stable in production
```

---

### Wave 4 — Enterprise Hardening (Weeks 8–16)

| # | Action | System | Source | Notes |
|---|---|---|---|---|
| H1 | Refactor `generate-certificate/page.tsx`: `useReducer` + custom hooks (2,067 → ~300 lines) | Frontend | CTO §7 Pattern 7 | ✅ Done 2026-03-28 — `useGenerateCertificateState` |
| H2 | Add Zod runtime validation at frontend API boundaries | Frontend | Masterplan §4.2, CTO §10 | ✅ Done 2026-03-29 — `src/lib/api/schemas/auth.ts`; all auth BFF routes validated |
| H3 | CSP tightening: nonce-based `script-src` → eliminate `unsafe-eval` | Frontend | Dependency Audit §4.2 | ✅ Done 2026-03-29 — `proxy.ts` generates per-request nonce; `unsafe-eval` removed |
| H4 | OpenTelemetry tracing + correlation IDs through frontend → proxy → backend | Both | Backend Masterplan §P2-16 | ✅ Done 2026-03-29 — `instrumentation.ts` + `@vercel/otel` installed; proxy threads `X-Request-ID` end-to-end; spans active |
| H5 | TypeScript 6.0 migration branch | Frontend | Dependency Audit §2.2 | ✅ Done 2026-03-29 — `target` bumped to ES2024; `verbatimModuleSyntax` + `exactOptionalPropertyTypes` deferred to dedicated branch |
| H6 | API contract tests in CI — detect frontend/backend shape drift automatically | Both | Backend Masterplan §9, Masterplan §7 | ✅ Done 2026-03-29 — `__tests__/lib/schemas/auth.test.ts` (29 schema contract tests) |
| H7 | Add SBOM generation and license scanning to CI | Frontend | Dependency Audit P0 | ✅ Done 2026-03-29 — `.github/workflows/ci.yml` + `.github/workflows/sbom.yml` |
| H8 | Performance test suite | Frontend | Backend Masterplan §P2-20 | ✅ Done 2026-03-29 — `e2e/perf.spec.ts`; TTFB + DOMContentLoaded budgets on login/signup |
| H9 | Add Sentry for frontend + route handler error reporting | Frontend | Dependency Audit §4.1 | ✅ Done 2026-03-29 — `@sentry/nextjs` installed; DSN configured; `sentry.client.config.ts` + `sentry.server.config.ts` active; PII scrubbing + `onRequestError` hooked in |

---

### Non-Negotiables (Both Repos)

These apply immediately — no phasing:

- **No mixed tenant key semantics** in any runtime path (frontend or backend)
- **No security-critical inference on the frontend** — access-context, verification status, and org resolution are backend authority
- **No new feature ships without unit + integration coverage** in the touched domain
- **No schema migration without a matching repository/service compatibility check**
- **`--primary` CSS variable is `oklch()`** — always use `#3ECF8E` directly in inline styles and canvas code — never `hsl(var(--primary))`
- **React StrictMode double-mount**: any `useEffect` setting a ref must reset it in the effect body (not just in cleanup)

---

### Priority Summary

| Wave | Timeframe | Who | Risk | Business Value |
|---|---|---|---|---|
| **1 — Quick Wins** | Weeks 1–2 | Single team | Very Low | Supply chain safety, DRY wins, CI stability |
| **2 — Architecture** | Weeks 2–6 | Single team | Low | Developer velocity, test confidence, maintainability |
| **3 — Full-Stack** | Weeks 4–10 | Sync both teams | Medium | Correct trust boundaries, async reliability, no Vercel timeouts |
| **4 — Hardening** | Weeks 8–16 | Both teams | Medium | Enterprise compliance, observability, type safety |

**Recommended sequence**: Start Wave 1 immediately (zero risk, immediate value). Run Wave 2 in parallel with backend delivering Wave 3 endpoints. Do not start H1 (page refactor) until FS4+FS5 are stable — the current page complexity is partially caused by the missing async job API.

---

*This document is maintained alongside code changes. Any statement that cannot be verified in the current codebase is marked with ⚠️.*

