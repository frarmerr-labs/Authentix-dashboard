# AGENTS.md — AI Agent Rules for Authentix Platform

**Last Updated:** 2026-03-20
**Applies to:** Claude Code, Cursor, and any AI agent working in this repository

---

## Mandatory Pre-Flight (BEFORE ANY CODE CHANGE)

1. **Always read `projectmemory.md` first** — located at repo root and in backend repo
2. **Never assume architecture** — read actual code before suggesting changes
3. **Never overwrite memory files blindly** — compare with current code, update only what changed
4. **Write UNCLEAR if unsure** — do not hallucinate missing logic

---

## Repository Context

| Repo | Purpose | URL |
|---|---|---|
| `Authentix-dashboard` | Next.js frontend (App Router) | This repo |
| `Authentix-backend` | Fastify REST API | `/Users/harshitsaxena/Documents/GitHub/Authentix-backend` |
| Supabase | Database + Auth + Storage | Project: `brkyyeropjslfzwnhxcw` |

---

## Architecture Rules

### Frontend (Authentix-dashboard)

- **Never add Supabase client library to frontend** — no direct DB access from browser
- **All data fetches go through `/api/proxy/*`** or Next.js Route Handlers
- **Never store tokens in localStorage or sessionStorage** — HttpOnly cookies only
- **All new pages must be created under `app/dashboard/org/[slug]/`** for protected routes
- **Server Components are preferred** for initial data loading (RSC pattern)
- **Client Components (`"use client"`)** only when interactivity is required
- **Server Actions (`"use server"`)** for form submissions (login, signup, etc.)
- **Proxy allowlist must be updated** when new backend routes are exposed via proxy

### Backend (Authentix-backend)

- **Keep business logic in `domains/`** — routes in `api/v1/` are thin wrappers only
- **All Supabase queries MUST filter by `organization_id`** — no cross-tenant data leaks
- **Never skip auth middleware** unless route is explicitly public (verify, health, webhooks)
- **Razorpay webhook must remain HMAC-SHA256 verified** — never skip signature check
- **Idempotency on destructive/financial operations** — use idempotency middleware
- **Use Zod schemas for all request/response validation** — no raw `any` types
- **New domain = new directory** under `src/domains/` with service + handler pattern

---

## Security Rules

### Secrets & Credentials
- **Never expose `SUPABASE_SECRET_KEY` (service role) to frontend code** — env var renamed from `SUPABASE_SERVICE_ROLE_KEY` per Supabase 2025 dashboard
- **Never expose `BACKEND_API_URL` to browser** (server-only env var)
- **Never commit `.env.local` or `.env`** to version control
- **Never log tokens, API keys, or passwords** — use PII redaction

### Authentication
- **HttpOnly cookies only** for JWT storage
- **Bearer token in Authorization header** for backend-to-external calls
- **5-minute refresh buffer** before expiry (already implemented — maintain this)
- **Never bypass `authMiddleware`** on protected backend routes

### Input Validation
- **Validate at system boundaries** — user input, file uploads, webhook payloads
- **Backend is the source of truth** — frontend validation is UX only
- **Path traversal prevention is in proxy** — do not loosen allowlist without review

---

## Code Quality Rules

- **TypeScript strict mode is ON** — do not use `any` without justification
- **No raw SQL** — use Supabase JS SDK query builder
- **No N+1 queries** — batch with `Promise.all` or join at DB level
- **Error messages must be sanitized** before sending to frontend
- **Production-only actions** must use `assertProductionOnly()` guard

---

## Memory Update Rules

After ANY code change, update the relevant memory file:

### When to update `projectmemory.md` (frontend)
- New route added or removed
- New API endpoint connected
- Auth flow changed
- New dependency added
- Environment variable added/changed
- Business logic changed

### When to update `projectmemory.md` (backend)
- New endpoint added or removed
- New domain added
- Supabase schema changed
- Razorpay integration changed
- Caching strategy changed
- Security configuration changed

### Memory Update Format (append to "Recent Changes")
```
- **YYYY-MM-DD** | Brief description of change | Impact on system
```

---

## Patterns to Follow

### Adding a New Feature (Frontend)
1. Read `projectmemory.md`
2. Create page under `app/dashboard/org/[slug]/[feature]/`
3. Add proxy allowlist entry if new backend route needed
4. Add to `src/lib/api/client.ts` api object
5. Update `projectmemory.md` → API Endpoints + Recent Changes

### Adding a New API Endpoint (Backend)
1. Read `projectmemory.md`
2. Create handler in `src/domains/[feature]/`
3. Register route in `src/api/v1/[feature].ts`
4. Add Zod schema for request/response
5. Attach appropriate auth middleware
6. Update `projectmemory.md` → API Endpoints + Recent Changes

### Adding a New Supabase Table
1. Create SQL migration in `database/migrations/`
2. Update `projectmemory.md` → Supabase Schema
3. Apply tenant isolation (`organization_id` filter on every query)
4. Document in both repo memory files

---

## API Contract Rules

### Response Envelope
- **Always use `ApiResponse<T>` envelope:** `{ success: boolean, data: T, error?: { code, message }, meta?: { request_id, timestamp } }`
- **Never return raw Supabase/DB structures** — always transform to frontend-compatible shape
- **Strip internal IDs from responses** — `*_file_id`, `*_bucket`, `*_path` DB fields stay server-side unless explicitly needed by client
- **Slug is for routing only** — never use slug for authorization; always use `organizationId` from JWT context

### Type Safety
- **Validate all request/response shapes with Zod** — no raw `any` or implicit `unknown` casts
- **Client method signatures must match backend contract** — method (GET/POST/PUT), path, and body shape
- **Status enums must be complete** — if backend adds a new status value, update frontend type immediately

### Logging
- **Never log full response bodies** on success paths — only log `status`, `errorCode`, and `errorMessage` on failures
- **No sensitive data in console** — tokens, user PII, API keys must never appear in browser console

---

## Anti-Patterns (DO NOT DO)

- Do NOT add Supabase client to frontend (`@supabase/supabase-js` in dashboard)
- Do NOT store JWT in cookie without HttpOnly flag
- Do NOT call backend routes directly from frontend (bypass proxy)
- Do NOT add new business logic to route handlers (`api/v1/*.ts` on backend)
- Do NOT skip Zod validation on incoming requests
- Do NOT make async cert generation work for >50 without implementing the worker
- Do NOT return raw Supabase errors to frontend (sanitize first)
- Do NOT use `unsafe-eval` in CSP unless explicitly needed by a library
- Do NOT use `getPublicUrl()` for Supabase Storage — all buckets are private; always use `createSignedUrl()`
- Do NOT query `certificate_templates.status` — column does not exist in live DB
- Do NOT use `row_number` for `file_import_rows` — column is `row_index`
- Do NOT filter `file_import_rows` by `organization_id` or `is_deleted` — those columns don't exist
- Do NOT insert into `file_import_jobs` with old columns (`file_name`, `storage_path`, `total_rows`, `source_type`, `reusable`, `data_persisted`, `failure_count`) — use `source_file_id`, `source_format`, `row_count`
- Do NOT use `certificate.status = 'issued'` — correct value is `'active'`
- Do NOT reference `certificate.issue_date`/`expiry_date` — correct columns are `issued_at`/`expires_at`

---

## Known Incomplete Features (Check Before Extending)

| Feature | Status | Location |
|---|---|---|
| Async certificate generation (>50) | INCOMPLETE — worker missing | `src/domains/certificates/service.ts` |
| WhatsApp integration | NOT STARTED — guard placeholder only | `src/lib/utils/guards.ts` (frontend) |
| Transactional email | NOT STARTED — Supabase auth only | — |
| RLS policies | BYPASSED — app-level isolation only | All Supabase queries |

---

## Contact & Resources

- **Audit Document:** `~/Desktop/project_audit.md`
- **Frontend Memory:** `/Users/harshitsaxena/Documents/GitHub/Authentix-dashboard/projectmemory.md`
- **Backend Memory:** `/Users/harshitsaxena/Documents/GitHub/Authentix-backend/projectmemory.md`
- **Supabase Project:** `brkyyeropjslfzwnhxcw`
- **Backend Live URL:** `https://authentix-backend.vercel.app/api/v1`
