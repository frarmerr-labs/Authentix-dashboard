# Project Memory - Authentix Dashboard (Frontend)

**Last Updated:** 2026-03-21  
**Purpose:** Persistent memory for architecture, decisions, constraints, and recent changes.

---

## Stable System Decisions

- Frontend is a Next.js App Router dashboard deployed on Vercel.
- Architecture is BFF/proxy-oriented: browser requests flow through Next handlers before backend.
- Frontend must not perform direct database access from browser.
- Auth tokens are stored only in HttpOnly cookies.
- Protected routes are organization-scoped under `/dashboard/org/[slug]`.
- Slug is routing context only; authorization remains backend JWT-context based.

---

## Architecture Snapshot

### Core layers

- UI/pages: `app/*`
- API route handlers: `app/api/*`
- Route protection proxy: `proxy.ts`
- Client API abstraction: `src/lib/api/client.ts`
- Server API abstraction: `src/lib/api/server.ts`
- Runtime backend env resolver: `src/lib/config/env.ts`

### Routing

- Public auth routes: `/login`, `/signup`, `/verify-email`
- Resolver route: `/dashboard` (redirects into slug route)
- Protected org shell: `/dashboard/org/[slug]/*`
- Public certificate verification: `/verify/[token]`

---

## Key Workflows

### 1) Auth and session lifecycle

- Auth forms call server actions or auth route handlers.
- Backend returns tokens; frontend sets HttpOnly auth cookies.
- `proxy.ts` redirects unauthenticated users away from protected paths.
- Server-side layout checks (`app/dashboard/org/[slug]/layout.tsx`) validate session/profile/org access.

### 2) Data access pattern

- Browser code calls `/api/proxy/*` or `/api/auth/*`.
- `app/api/proxy/[...path]/route.ts` applies allowlist and path safety checks.
- Server-side components call backend via `src/lib/api/server.ts`.

### 3) Certificate generation lifecycle

- Select template -> load editor data -> place fields
- Import/map data or enter manually
- Submit generation request (`/certificates/generate`)
- Preview/download generated assets

---

## External Integrations

- Backend API: `https://authentix-backend.vercel.app/api/v1`
- Supabase (indirect from frontend): asset/image host and backend data layer
- Razorpay: surfaced via backend billing/invoice payloads and hosted payment links

Not implemented in frontend runtime:
- transactional email orchestration
- WhatsApp integration flow

---

## Environment and Runtime Assumptions

- Node version: `24.x` (`.nvmrc` contains `24.0.0`)
- package scripts:
  - `dev`: `next dev --turbopack`
  - `build`: `next build`
  - `start`: `next start`
  - `lint`: ESLint
  - `typecheck`: `tsc --noEmit`
- `src/lib/config/env.ts` currently drives backend URL selection with:
  - `BACKEND_ENV`
  - `BACKEND_URL_LOCAL`
  - `BACKEND_URL_TEST`
  - `BACKEND_URL_PROD`

⚠️ Needs clarification: legacy docs and comments still reference `BACKEND_API_URL`, but active runtime resolver reads the env variables listed above.

---

## Known Limitations and Risks

- Async certificate generation for large batches is documented as incomplete (worker gap).
- Logging verbosity remains high in some production-critical flows (proxy, resolver, org layout).
- Contract drift risk exists if frontend types are not kept synchronized with backend enums and schemas.
- Security posture currently includes CSP directives with `unsafe-inline` and `unsafe-eval` for compatibility.

---

## Gotchas

- Use `slug` route semantics consistently; avoid reintroducing legacy `[orgId]` references.
- Do not bypass proxy allowlist rules when introducing new endpoints.
- Keep certificate schema fields aligned (`issued_at`, `expires_at`, `active/revoked/expired`).
- Keep manual data-entry callbacks split (`onDataChange` vs `onDataSubmit`) to avoid auto-navigation regressions.
- `--primary` CSS variable is `oklch()` — never use `hsl(var(--primary))`. Use `#3ECF8E` directly for inline styles or canvas/SVG.
- React StrictMode double-mounts effects. Any `useEffect` that sets a ref must reset it in the effect body, not just clean up in the return. Pattern: `useEffect(() => { ref.current = true; return () => { ref.current = false; }; }, [])`.
- Multi-flag async state (`isA + isB + isC + useEffect`) is fragile. Prefer a single state enum for mutually exclusive UI phases.
- Dragger/fill sync: if two DOM siblings share a CSS transition, they will drift. Make the dragger a child of the fill element so a single `width` transition moves both.

---

## Recent Changes (Append-Only)

- **2026-03-19** | Initial full system audit | Baseline architecture, routes, APIs, limitations, and constraints documented.
- **2026-03-19** | Dynamic backend URL system | Added resolver-backed backend URL strategy and local fallback behavior.
- **2026-03-19** | Slug-based org routing | Migrated protected routes from UUID parameter to slug-based organization routing.
- **2026-03-19** | API contract standardization | Updated frontend API typings and endpoint usage to match backend contracts.
- **2026-03-20** | Removed Turnstile CAPTCHA | Simplified login flow and removed turnstile dependency and wiring.
- **2026-03-20** | Certificate schema alignment | Updated certificate interfaces and UI usage for live backend fields.
- **2026-03-21** | Generate-certificate UX and bug fixes | Improved template selection flow, preview/download UX, data-entry behavior, and field resizing/selection behavior.
- **2026-03-21** | Documentation modernization refresh | Reorganized core docs (`README.md`, `AGENTS.md`, `projectmemory.md`) and added `SYSTEM_OVERVIEW.md` and `FILE_INDEX.md` for onboarding and navigation.
- **2026-03-22** | ExportSection generation overlay overhaul | Replaced fragile `isGenerating+isShowingSuccess+generationComplete` trio with single `overlayState` enum (`hidden|generating|success`). Fixed StrictMode `isMountedRef` bug (effect body now resets ref to `true` on remount). Replaced `useEffect`-based success trigger with direct `setTimeout` in `handleGenerate`. Fixed brand color invisibility (`--primary` is oklch, not HSL — must use `#3ECF8E` directly). Fixed dragger/fill sync by making dragger a child element of fill div. Raised progress cap from ~83% to ~98%. Added CSS-only generation animation (orbiting dots, document lines) and success animation (`ShieldCheck` + floating `BadgeCheck`) with keyframes hoisted to always-rendered `<style>` tag.
