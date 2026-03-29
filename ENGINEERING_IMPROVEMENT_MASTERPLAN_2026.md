# Engineering Improvement Masterplan (2026)

Purpose: practical, enterprise-grade improvement plan for this codebase using your current stack and cost model:

- Hosting/runtime: **Vercel**
- Data/storage/auth backend dependency: **Supabase (indirect via backend)**
- Email delivery: **AWS SES**
- Constraint: avoid adding unnecessary paid platforms.

---

## 1) Current State Assessment

## What is already strong

- Architecture pattern is correct for enterprise: **BFF/proxy via Next route handlers**.
- Auth token handling is secure by default: **HttpOnly cookie model**.
- Org-scoped routing pattern is clear (`/dashboard/org/[slug]`).
- UI primitives follow shadcn-style/Radix approach.
- Good test foundation exists (Vitest + Playwright).

## What is currently limiting scale/maintainability

- Very large files in core flows (hard to reason/test/evolve):
  - `app/dashboard/org/[slug]/generate-certificate/page.tsx` (~2066 lines)
  - `src/lib/api/client.ts` (~1745 lines)
  - `app/api/proxy/[...path]/route.ts` (~457 lines)
- High runtime `console.*` usage in critical paths (ops noise, weak observability discipline).
- Lint/tooling dependency declarations are incomplete (config references packages not in `devDependencies`).
- Some dependencies likely unused.
- State management in complex views is mostly local and ad hoc, which increases bug risk over time.

---

## 2) 2026 Best-Practice Direction (Next.js + TS + React)

These are the standards I recommend adopting as “engineering policy.”

| Area | 2026 Best Practice | Target for this Repo |
|---|---|---|
| Rendering model | Server-first by default; client only for interaction | Continue, but split large client pages into feature modules |
| Data boundaries | Typed service layer + DTO validation at boundaries | Add request/response runtime validation (zod or typed guards) in API layer |
| State complexity | Use explicit state machines/enums for multi-phase UI | Apply to generation flow and long async UX |
| API client design | Domain-segmented clients instead of one giant file | Split `api/client.ts` into per-domain modules |
| Error handling | Structured errors + correlation IDs | Standardize proxy and route handlers with request IDs |
| Logging | JSON structured logs, environment-aware | Replace raw console spam with logger facade |
| Testing strategy | Unit + integration + E2E with risk-based coverage | Add integration tests for proxy/auth and generation orchestration |
| Type safety | Strict TS + low `any` tolerance | Reduce `any` in critical flows first |
| Security posture | Tight CSP + defense in depth | Keep proxy hardening; phase out unsafe CSP directives |

---

## 3) Architecture & Folder Structure Improvements

## 3.1 Target structure evolution (incremental, not rewrite)

Current structure is close, but large feature files should move to stricter module boundaries.

Recommended approach:

| Current Hotspot | Problem | Improvement |
|---|---|---|
| `app/dashboard/org/[slug]/generate-certificate/page.tsx` | Too much orchestration + UI + side effects in one file | Split into `hooks/`, `state/`, `services/`, and presentation subcomponents |
| `src/lib/api/client.ts` | Mega client with broad blast radius | Split by domain: `api/auth.ts`, `api/templates.ts`, `api/certificates.ts`, `api/billing.ts`, etc. |
| `app/api/proxy/[...path]/route.ts` | Security-critical logic dense in one file | Extract validators (`path`, `headers`, `allowlist`, `timeouts`) into pure modules with dedicated tests |
| `app/dashboard/org/[slug]/layout.tsx` | Many responsibilities in one layout | Move profile bootstrap/retry logic to server-side service module |

## 3.2 Design pattern to standardize

- **Layered feature pattern** per domain:
  - `view` (components)
  - `state` (reducers/state machine/hooks)
  - `service` (API calls, mapping)
  - `schema` (runtime validation + types)
  - `tests`

This pattern is especially important for:
- Generate certificate
- Email templates
- Delivery settings
- Billing/invoice flows

---

## 4) Logic & Code-Style Improvement Plan

## 4.1 State management in complex pages

Current risk:
- Multi-step flows with many `useState` flags are fragile.

Plan:
- Adopt reducer/state-machine style for major workflows.
- Keep current enum approach trend (good example exists in overlay state refactor).
- Introduce one “flow state object” for each stage pipeline instead of many booleans.

## 4.2 API contract discipline

Plan:
- Add runtime parsing/validation at network boundaries (especially proxy responses and critical route handlers).
- Keep static TS interfaces, but enforce runtime safety for untrusted payloads.
- Build a central `ApiResult` normalization utility to remove repeated parsing logic.

## 4.3 Error and retry policy

Plan:
- Standardize retry/backoff utility usage by endpoint category:
  - idempotent reads: retry allowed
  - writes: retry with idempotency key or not at all
- Create an error taxonomy map (`NETWORK`, `AUTH`, `VALIDATION`, `UPSTREAM`, `TIMEOUT`) and enforce it in route handlers.

## 4.4 Logging quality

Plan:
- Replace direct console logging with a logger wrapper:
  - structured JSON logs
  - environment-based verbosity
  - request/user/org correlation IDs
- Keep debug logs in dev; reduce production noise.

---

## 5) Security Hardening Roadmap (No New Paid Tools Required)

| Security Area | Current | Improvement |
|---|---|---|
| Auth storage | HttpOnly cookies | Keep as-is |
| Route protection | Proxy + layout checks | Keep; add more tests for edge cases |
| Proxy hardening | Good allowlist/path checks | Keep; extract + unit test validator functions |
| CSP | Includes `'unsafe-inline'/'unsafe-eval'` | Phase to nonce/hash-based CSP where feasible |
| Secrets handling | Good (no direct service-role in browser) | Keep strict policy and add CI checks for accidental exposure |
| Input validation | Mixed | Add runtime schema validation at route boundaries |

---

## 6) Cost-Optimized Platform Plan (Vercel + Supabase + SES only)

You can reach enterprise reliability without buying extra SaaS immediately.

## 6.1 Vercel optimization

- Ensure heavy operations are moved away from latency-sensitive route handlers.
- Keep edge/runtime choices explicit per route.
- Add caching headers and revalidation strategy for read-heavy pages where safe.

## 6.2 Supabase usage strategy (through backend)

- Keep frontend strictly indirect (current architecture already aligned).
- Optimize generated file access patterns and signed URL caching to reduce repeated URL generation pressure.
- Track storage egress patterns for certificate preview/download.

## 6.3 AWS SES strategy

- Implement provider abstraction in delivery layer (already partly modeled) so SES config remains isolated.
- Add retry + dead-letter pattern in backend delivery pipeline (if not already complete).
- Track bounce/complaint handling integration and expose status in dashboard.

## 6.4 Observability without new paid services

Baseline (free/open):
- Structured logs + correlation IDs
- Vercel logs + backend logs with consistent request IDs
- Health and synthetic checks via scheduled jobs (GitHub Actions + lightweight endpoints)

Optional later:
- Add paid observability only after proving clear operational ROI.

---

## 7) Testing Maturity Plan

| Test Layer | Current | Next Improvement |
|---|---|---|
| Unit/component | Good base | Raise coverage for proxy validators and API parsing utilities |
| Integration | Limited | Add route-handler integration tests (`/api/auth/*`, `/api/proxy/*`) |
| E2E | Present for core flows | Add failure-path tests (token expiry, retry flows, large-file upload, delivery errors) |
| Non-functional | Minimal | Add perf smoke and security regression checks in CI |

---

## 8) Dependency and Tooling Governance

| Priority | Action | Why |
|---|---|---|
| P0 | Declare missing lint/runtime deps explicitly | Reproducible CI/local environments |
| P1 | Remove truly unused deps after verification | Reduce attack surface and maintenance |
| P1 | Upgrade patch/minor safely | Security + stability |
| P2 | Plan major upgrades in controlled branch (TS6, Vitest4, ESLint10) | Avoid production disruption |
| P1 | Add automated dependency PR policy (Renovate/Dependabot) | Prevent drift |

---

## 9) Execution Plan (Phased)

## Phase 1 (1-2 weeks) — Stabilize foundation

- ✅ Fix dependency declarations and remove verified unused packages. (2026-03-28)
- ✅ Introduce logger facade (`src/lib/logger.ts`) — all `console.*` replaced in `client.ts` and proxy route. (2026-03-28)
- ✅ `logger.child()` added — correlation ID support for requestId/organizationId/userId. (2026-03-28)
- ✅ `extractApiError()` + `buildQueryString()` DRY utilities added to `client.ts`. (2026-03-28)
- ✅ `src/lib/types/organization.ts` shared type — eliminates inline duplication. (2026-03-28)
- ✅ `src/lib/errors.ts` — error taxonomy (`NETWORK/AUTH/VALIDATION/UPSTREAM/TIMEOUT`), `ErrorCodes`, `AppError`, `categorizeHttpError()`. (2026-03-28)
- ✅ `src/lib/api/result.ts` — central `ApiResult<T>` type + `normalizeApiResponse()`, `ok()`, `err()`, `fromThrown()`, `mapResult()` utilities. (2026-03-28)
- ✅ `src/lib/api/proxy-validators.ts` — `isPathSafe`, `isPathAllowed`, `createSafeHeaders` extracted as pure functions. (2026-03-28)
- ✅ `__tests__/lib/proxy-validators.test.ts` — 62 unit tests covering traversal, allowlist, header filtering, allowed methods. (2026-03-28)
- ✅ `app/api/proxy/[...path]/route.ts` — requestId generated per request, forwarded as `X-Request-ID` to backend, threaded through all log calls via `logger.child()`. (2026-03-28)
- ✅ Define coding standards doc (`CODING_STANDARDS.md` — state, API, errors, logging, security, testing). (2026-03-29)

## Phase 2 (2-4 weeks) — Refactor high-risk hotspots

- ✅ Layered domain structure created for all 4 priority domains (2026-03-28):
  - **Generate certificate**: `schema/types.ts` (state interface + factory), `state/generateCertificateReducer.ts` (full reducer, all 20+ useState actions), `services/generateCertificateService.ts` (API wrapper)
  - **Email templates**: `[id]/schema/types.ts`, `[id]/state/emailEditorReducer.ts`, `[id]/services/emailTemplateService.ts`
  - **Delivery settings**: `schema/types.ts`, `state/deliveryReducer.ts`, `services/deliveryService.ts`
  - **Billing**: `schema/types.ts`, `services/billingService.ts`
- ✅ 4.1 State machines defined for all 4 domains — `useReducer` drop-in ready. (2026-03-28)
- ✅ 4.3 Error taxonomy (`src/lib/errors.ts`) and `ApiResult` normalization (`src/lib/api/result.ts`) complete. (2026-03-28)
- ✅ `generate-certificate/page.tsx` migrated to `useGenerateCertificateState` (wraps `useReducer`, replaces 20+ `useState` hooks). (2026-03-28)
- ✅ `src/lib/api/client.ts` split into 12 domain modules (`core`, `auth`, `templates`, `certificates`, `imports`, `billing`, `delivery`, `organizations`, `catalog`, `dashboard`, `verification`, `users`). Public API (`api.templates.list()` etc.) unchanged. (2026-03-28)
- ✅ TanStack Query (React Query v5) installed and `QueryProvider` added to `app/layout.tsx`. (2026-03-28)
- ✅ Query hook modules created under `src/lib/hooks/queries/` for all 10 domains (catalog, templates, certificates, billing, imports, delivery, organizations, users, dashboard). (2026-03-28)
- ✅ All manual `useEffect` data-fetching replaced with TanStack Query hooks in: `certificates/page.tsx`, `billing/page.tsx`, `imports/page.tsx`, `email-templates/page.tsx`, `organization/page.tsx`, `settings/api/page.tsx`. (2026-03-28)
- ✅ Old hooks (`use-catalog-categories`, `use-catalog-subcategories`, `use-certificate-categories`, `use-billing-overview`, `use-invoice-list`, `use-invoice-detail`) rewritten as TanStack-backed wrappers — backward compatible. (2026-03-28)
- ✅ `src/lib/hooks/use-catalog-cache.ts` (manual `CatalogCacheManager`, ~130 lines) deleted — replaced by TanStack Query built-in caching. (2026-03-28)
- ✅ Refactor org layout bootstrap/retry logic — replaced dual `/auth/me` + `/users/me` with single `GET /auth/access-context`. (2026-03-29)
- ✅ Integration tests for auth + proxy route handlers — `__tests__/api/auth/login.test.ts` (12 cases), `__tests__/api/auth/signup.test.ts` (12 cases), `__tests__/api/proxy/proxy-route.test.ts` (15 cases: traversal, allowlist, forwarding). (2026-03-29)

## Phase 3 (4-8 weeks) — Enterprise hardening

- ✅ H2: Zod runtime validation at API boundaries — `src/lib/api/schemas/auth.ts` created; `login`, `signup`, `refresh`, `access-context` BFF routes updated to use `safeParse`/`parse`. (2026-03-29)
- ✅ H3: CSP tightening — `proxy.ts` generates per-request nonce, injects into `Content-Security-Policy`, forwards via `x-nonce` header; `unsafe-eval` removed from `script-src`; `app/layout.tsx` inline script receives nonce; static CSP removed from `next.config.ts`. (2026-03-29)
- ✅ H5: TypeScript prep — `target` bumped to `ES2024` (Node 24). Next step: enable `verbatimModuleSyntax` (requires `import type` audit) and `exactOptionalPropertyTypes` in a dedicated branch once TS 6.0 lands. (2026-03-29)
- ✅ H6: API contract tests — `__tests__/lib/schemas/auth.test.ts` added (29 test cases covering all auth Zod schemas: LoginRequest, SignupRequest, Session, AuthUser, LoginResponse, SignupResponse, RefreshResponse, AccessContextResponse). (2026-03-29)
- ✅ H7: SBOM + license scanning in CI — `.github/workflows/ci.yml` (lint + typecheck + unit tests on every PR) and `.github/workflows/sbom.yml` (CycloneDX SBOM + license-checker on main push + weekly cron). (2026-03-29)
- ✅ H8: Performance smoke tests — `e2e/perf.spec.ts` added; measures TTFB + DOMContentLoaded on login, signup, root via Navigation Timing Level 2 API; budget gates fail CI on regression. (2026-03-29)
- ✅ H9: Sentry stubs — `sentry.client.config.ts` and `sentry.server.config.ts` created; activates once `npm install @sentry/nextjs` + `NEXT_PUBLIC_SENTRY_DSN` env var are set; PII scrubbing and X-Request-ID correlation included. (2026-03-29)
- ✅ F12: Dependabot configured — `.github/dependabot.yml`; monthly npm + GitHub Actions updates; patch/minor batched into one PR; major versions blocked for manual review. (2026-03-29)
- ✅ H4: `@vercel/otel` installed — OpenTelemetry spans now active. (2026-03-29)
- Expand E2E failure-path coverage.
- ✅ H4: OpenTelemetry tracing — `instrumentation.ts` created; `@vercel/otel` installed; proxy threads `X-Request-ID` end-to-end; spans active. (2026-03-29)

---

## 10) Direct Answer: “Best plan for us now”

Given your stack, budget model, and product direction:

1. **Keep** the current BFF architecture (it is the right enterprise choice).
2. **Refactor for maintainability** first (large files -> feature modules), not a full rewrite.
3. **Harden operations** (structured logging + correlation + route integration tests) before adding new products.
4. **Optimize cost/performance** within Vercel/Supabase/SES by better caching, flow design, and observability discipline.
5. **Upgrade dependencies in waves** (safe first, majors in a dedicated migration stream).

This gives you the highest reliability and scale readiness with minimal new spend.

