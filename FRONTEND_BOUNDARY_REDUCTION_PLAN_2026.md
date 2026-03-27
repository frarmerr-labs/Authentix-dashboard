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

## Phase 1: Add backend contracts

- Introduce new backend endpoints for:
  - dashboard resolution
  - access context
  - platform delivery defaults
  - generation job orchestration
  - normalized import data retrieval

## Phase 2: Dual-path frontend support

- Feature-flag frontend to prefer new contracts.
- Keep existing frontend fallback path temporarily.

## Phase 3: Remove old frontend logic

- Delete bootstrap/retry inferencing and localStorage domain config logic.
- Remove storage URL reconstruction utilities if backend contracts are complete.
- Simplify generation flow to job submit + poll/subscription.

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

