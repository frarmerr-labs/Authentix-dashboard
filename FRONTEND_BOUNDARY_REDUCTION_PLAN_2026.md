# Frontend Boundary Reduction Plan (2026)

Purpose: define what logic should be removed/simplified in frontend and owned by backend, based on deep review of `Authentix-backend` and current dashboard implementation.

---

## 1) Executive Summary

Your frontend architecture is good, but a few flows still carry backend-grade orchestration logic.  
For enterprise scale, frontend should focus on:

- UX rendering and interaction
- optimistic/local UI state
- calling stable backend contracts

And backend should own:

- identity truth
- workflow orchestration
- storage/file semantics
- billing/delivery business state

---

## 2) What Frontend Can Remove (Prioritized)

| Priority | Current Frontend Responsibility | Why It Should Move to Backend | Target Backend Contract | Frontend Simplification |
|---|---|---|---|---|
| P0 | Dashboard auth/bootstrap resolution in `app/dashboard/page.tsx` (me call + bootstrap + retry + redirect logic) | Auth/bootstrap and canonical org resolution are backend authority | `POST /auth/resolve-dashboard` -> `{ redirect_to, setup_state }` | Single call + `router.replace(redirect_to)` |
| P0 | Email verification fallback assumptions in layout flow | Verification status cannot be inferred by UI | `GET /auth/access-context` -> `{ authenticated, email_verified, organization, membership }` | Remove fallback chains and inferred truth |
| P0 | Org delivery defaults in localStorage (`settings/delivery/page.tsx`) | Org config must be cross-device and auditable | `GET/PUT /delivery/platform-default-settings` | Remove localStorage config logic |
| P1 | Storage URL construction fallback logic (`organization-logo` and template preview normalization) | Bucket/path details are infra concerns; URLs should be canonical backend output | Return canonical `*_url` fields from backend | Remove URL reconstruction code paths |
| P1 | Multi-template generation orchestration in `ExportSection` | Job orchestration belongs in backend for consistency/retries | `POST /certificates/generation-jobs` + status endpoint | Replace per-template loop with single job flow |
| P1 | Browser-side import file re-parse of downloaded files | Parsing/normalization should be centralized and deterministic | `GET /import-jobs/:id/normalized-data` | Remove XLSX parsing code in restore/load path |
| P2 | Billing “payable” interpretation in UI helpers | Payability should be backend canonical financial logic | Include `payable`, `payable_reason`, `payment_cta_url` in invoice API | UI becomes display-only |
| P2 | Email template draft/publish heuristic using local metadata | Lifecycle state belongs in backend domain model | Template `state` fields (`draft/published/archived`) | Remove heuristic-based classification |

---

## 3) Concrete Frontend Modules to Refactor/Reduce

| File | Current Heavy Logic | Keep vs Remove |
|---|---|---|
| `app/dashboard/page.tsx` | Auth + org bootstrap + retry orchestration | Keep routing shell, remove orchestration |
| `app/dashboard/org/[slug]/layout.tsx` | Mixed auth verification and profile readiness logic | Keep rendering gates, consume canonical access-context |
| `app/dashboard/org/[slug]/settings/delivery/page.tsx` | localStorage defaults and config behavior | Remove localStorage ownership |
| `app/dashboard/org/[slug]/generate-certificate/components/ExportSection.tsx` | Multi-step generation orchestration | Keep UX/progress rendering, remove orchestration fan-out |
| `app/dashboard/org/[slug]/generate-certificate/page.tsx` | Import restore/parsing and flow wiring complexity | Keep UX flow, remove backend-like data parsing/resolution |
| `app/api/templates/with-previews/route.ts` | Extra normalization/fallback logic | Thin proxy/aggregation only after backend canonical URLs |

---

## 4) What Frontend Should Continue Owning

These are correct frontend responsibilities and should stay:

- Canvas/editor interactivity and drag/drop state
- Client-side field styling and preview experience
- Progressive UX states for long operations
- Form-level validation before submission
- Accessibility and responsive dashboard UX

---

## 5) Migration Strategy (Low Risk)

## Phase 1: Frontend cleanups (done 2026-03-28)

Frontend simplifications shipped — **no backend endpoints needed for these**:

| Item | Status | Notes |
|---|---|---|
| `dashboard/page.tsx` bootstrap+retry removal | ✅ Done | Shows error if org missing; no longer attempts bootstrap |
| `layout.tsx` email-verified fallback (`session.valid → true`) | ✅ Done | Now strict: unknown → redirect to `/verify-email` |
| `delivery/page.tsx` localStorage removal | ✅ Done | Settings live in React state only; persist to backend once `GET/PUT /delivery/platform-default-settings` ships |
| `with-previews/route.ts` N+1 category lookup | ✅ Done | Backend must JOIN category/subcategory names into `v_templates_list` |
| `organization-logo.ts` URL construction | ✅ Done | Only uses `logo_url`; backend must return canonical `logo_url` on all org endpoints |
| `generate-certificate/page.tsx` XLSX re-parse | ✅ Done | Uses `GET /import-jobs/:id/data` (already exists) — no client-side XLSX parsing |

## Phase 2: Backend contracts shipped (done 2026-03-29)

All remaining backend contracts are now implemented:

| Contract | Status | Notes |
|---|---|---|
| `POST /auth/resolve-dashboard` | ✅ Done | Backend: `AuthService.resolveDashboard()` + route. Frontend: BFF `/api/auth/resolve-dashboard/route.ts`, `authApi.resolveDashboard()`, `dashboard/page.tsx` updated. |
| `GET /auth/access-context` | ✅ Done | Backend: `AuthService.getAccessContext()` + route (jwtOnly). Frontend: BFF `/api/auth/access-context/route.ts` created. |
| `GET/PUT /delivery/platform-default-settings` | ✅ Done | Backend: `deliveryService.getPlatformDefaultSettings/updatePlatformDefaultSettings()` + routes. Frontend: `deliveryApi`, `useDeliveryPlatformSettings`, `useUpdateDeliveryPlatformSettings` hooks. |
| `POST /delivery/templates/:id/duplicate` | ✅ Done (bonus) | Backend: new route. Frontend: `deliveryApi.duplicateTemplate()` now calls backend directly. |
| `POST /certificates/generation-jobs` (batch) | ✅ Done | Backend: `CertificateService.batchGenerateCertificates()` + route. Frontend: `certificatesApi.batchGenerate()`. |
| `GET /certificates/generation-jobs` | ✅ Done | Backend: `CertificateService.listGenerationJobs()` + route. |
| `GET /certificates/generation-jobs/:id` | ✅ Done | Backend: `CertificateService.getGenerationJobById()` + route. |
| Billing `payable`/`payable_reason`/`payment_cta_url` | ✅ Done | Backend: `withPayableFields()` helper applied in `BillingService.getInvoice/listInvoices()`. |
| Delivery template `state` field | ✅ Done | Backend: `withTemplateState()` helper (`is_active → published/archived`) applied in all `DeliveryService` methods. |

## Phase 2 (continued): Additional backend contracts (done 2026-03-29)

| Contract | Status | Notes |
|---|---|---|
| `GET /jobs/:id` (background job poll) | ✅ Done | New `src/api/v1/jobs.ts` route — returns `background_jobs` status + result. Registered in `index.ts`. `/jobs/` added to proxy allowlist. |
| `batch_certificate_generation` job type | ✅ Done | `batchCertificateGenerationHandler` added; migration `006_add_batch_certificate_job_type.sql` created; worker registers handler. |

## Phase 3: Frontend logic replaced (done 2026-03-29)

| Item | Status | Notes |
|---|---|---|
| `layout.tsx` dual `/auth/me` + `/users/me` with retry | ✅ Done | Replaced with single `GET /auth/access-context` call. Exponential backoff retry removed. |
| `ExportSection` per-template generation loop | ✅ Done | Replaced with single `api.certificates.batchGenerate()` call to `POST /certificates/generation-jobs`. |
| `ExportSection` 120s timeout risk | ✅ Done | `batchGenerate` returns `{ job_id }` immediately (202); ExportSection polls `pollJobStatus()` every 2s until completed. No Vercel timeout. |
| FS4 — XLSX re-parsing on restore | ✅ Already done | `api.imports.getData()` was already in place; no client-side re-parse on load. |
| FS5 — Async generation job model | ✅ Done | `JobQueue` + `background_jobs` table + `batchCertificateGenerationHandler` + worker cron endpoint all shipped. |
| FS6 — Delivery queue worker | ✅ Done | `deliverySendHandler` + `delivery_send` job type + worker + cron endpoint — delivery `POST /send` uses async mode. |

---

## 6) Expected Outcomes

| Outcome | Effect |
|---|---|
| Smaller frontend surface area | Faster onboarding and lower regression risk |
| Clear trust boundaries | Better security posture |
| Better consistency across devices | Especially delivery and account state |
| Improved resilience at scale | Backend can retry/recover workflows uniformly |
| Easier test strategy | Frontend tests focus on UX; backend tests focus on business correctness |

---

## 7) Final Recommendation

Prioritize boundary cleanup before large feature expansion.

Order:
1. Auth/access-context canonicalization
2. Delivery settings backend ownership
3. Generation job orchestration
4. Import normalization endpoint adoption
5. Remove URL reconstruction and lifecycle heuristics

This gives the best enterprise outcome with your current cost stack (Vercel + Supabase + SES) and avoids unnecessary platform spend.

