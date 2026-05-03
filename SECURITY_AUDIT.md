# Authentix — CTO Security & Architecture Audit
**Date:** May 2026 | **Auditor:** Internal CTO Review  
**Stack:** Next.js (digicertificates.in) · Fastify (api.digicertificates.in) · Supabase Pro · Railway Pro  
**Context:** Production SaaS platform — student certificate generation and delivery. Personally Identifiable Information (PII) in scope.

---

## Supabase URL Configuration — Fix Now (5 min)

Your current config is wrong and needs to change before anything else.

| Setting | Current (Wrong) | Should Be |
|---|---|---|
| Site URL | `https://api.digicertificates.in` | `https://digicertificates.in` |

The Site URL is used in every Supabase email template (verification links, password resets). It pointing to your API server means those links break.

**Redirect URLs — clean the list:**

| URL | Action |
|---|---|
| `https://authentix-backend-authentix.vercel.app/` | **Remove** — stale preview domain, dead SSRF vector |
| `https://authentix-backend-authentix.vercel.app/**` | **Remove** |
| `https://authentix-*-backend-authentix.vercel.app` | **Remove** — wildcard on an abandoned domain |
| `https://authentix-*-backend-authentix.vercel.app/**` | **Remove** |
| `api.digicertificates.in` | **Remove** — missing `https://`, Supabase treats this as invalid |

**Add these instead:**
```
https://digicertificates.in
https://digicertificates.in/**
https://api.digicertificates.in
https://api.digicertificates.in/**
```

---

## Auth Hooks — Verdict: Skip for Now

Supabase Auth Hooks (`custom_access_token`, `before_user_created`, `on_auth_user_created`) are designed for systems that use **Supabase Auth as the primary auth layer**. Your system uses custom JWT auth via HttpOnly cookies managed entirely by your Fastify backend.

Auth Hooks won't make your system more secure — your backend already does JWT issuance, org-scoping, CSRF protection, and caching. Introducing Auth Hooks would add complexity without a payoff.

**When to revisit:** if you ever add OAuth (Google login, GitHub SSO) or Supabase magic-link flows.

---

## Severity Legend

| Level | Meaning |
|---|---|
| 🔴 CRITICAL | Production security risk or data breach exposure |
| 🟠 HIGH | Significant security or reliability gap |
| 🟡 MEDIUM | Risk that compounds under load or over time |
| 🟢 LOW | Best practice gaps, tech debt |

---

## 🔴 CRITICAL

### C-1 — Rate limiting is not distributed

**File:** `src/lib/security/rate-limit-presets.ts`  
**Problem:** `@fastify/rate-limit` uses an in-memory LRU cache (`cache: 10000`). Railway Pro runs multiple replicas. Each replica maintains its own independent counter. With 3 replicas, the effective limit is `100 req/min × 3 = 300 req/min per IP` — three times the intended cap.

This means your auth brute-force limit (`max: 5, timeWindow: '15 minutes'`) is actually 15 attempts per replica under round-robin load balancing. An attacker sending 45 requests per 15 minutes splits them across 3 replicas and bypasses it entirely.

**Fix:** Switch rate limiting to Redis-backed store.
```bash
# Add to backend
npm install @fastify/rate-limit ioredis
```
```typescript
// In globalRateLimitConfig
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);
export const globalRateLimitConfig = {
  redis,
  max: 100,
  timeWindow: '1 minute',
  // ... rest of config
};
```
Railway has a Redis add-on (or use Upstash Redis — serverless, free tier generous). One Redis URL env var solves this for all rate limit tiers.

---

### C-2 — JWT auth cache is not distributed

**File:** `src/lib/cache/jwt-cache.ts`  
**Problem:** Same as C-1 but for JWT verification. The comment in the code correctly says: *"For 100K+ users, consider distributed cache (Redis)."* You're not at 100K users yet — but with multiple Railway replicas, a token valid on replica A is cold-cached on replica B. Every user hitting a different replica pays the full 150ms DB round-trip on every request, and the "97% latency reduction" claim does not hold.

Additionally, if you add replicas under load (Railway autoscale), new instances start cold with zero cache — the exact moment you need performance most.

**Fix:** Same Redis instance from C-1. Replace the in-process LRU with `ioredis` in `jwt-cache.ts`. Token hashes are already SHA-256, so they're safe to store in Redis as keys. TTL maps 1:1 to the existing `JWT_CACHE_TTL` config.

---

### C-3 — No rate limit on SSE endpoint `/jobs/:id/events`

**File:** `src/api/v1/jobs.ts`  
**Problem:** The new SSE endpoint creates a fresh Supabase client (`createSupabaseClient()`) and opens a Realtime WebSocket per connection. Supabase Pro allows **200 concurrent Realtime connections** on the Pro plan. A single authenticated user can open one SSE connection per job. With no limit, a script calling `/jobs/:id/events` 200 times exhausts the Realtime quota for all users.

**Fix:** Add a per-user connection limit. The simplest approach: use Redis to count open SSE connections per `userId` with an atomic increment/decrement:
```typescript
// Before reply.hijack()
const sseKey = `sse:user:${request.context!.userId}`;
const current = await redis.incr(sseKey);
await redis.expire(sseKey, 3600); // 1hr safety TTL
if (current > 5) { // max 5 concurrent SSE per user
  await redis.decr(sseKey);
  return sendError(reply, 'TOO_MANY_CONNECTIONS', 'Too many open connections', 429);
}
// ... on cleanup:
redis.decr(sseKey);
```
Also add `config({ max: 5, timeWindow: '1 minute' })` route-level rate limiting on the SSE endpoint to slow connection attempts.

---

### C-4 — Supabase service role key in Railway env — verify isolation

**Check:** Confirm `SUPABASE_SECRET_KEY` (service role key) is set **only** in Railway backend environment variables, never in the dashboard (Next.js) env. The service role key bypasses all RLS.

**Risk if exposed:** any user can read/write every row in every table — student PII, payment records, organization data, everything.

**Verification steps:**
1. Railway dashboard → Authentix Backend service → Variables → confirm `SUPABASE_SECRET_KEY` exists
2. Railway dashboard → Authentix Dashboard service (if separate) → Variables → confirm `SUPABASE_SECRET_KEY` is **absent**
3. Confirm `NEXT_PUBLIC_*` vars never contain the service role key (these are embedded in the browser bundle)
4. `git grep SUPABASE_SECRET_KEY` → should only appear in backend env files, never committed

---

## 🟠 HIGH

### H-1 — No Supabase connection pooling (PgBouncer)

**Problem:** Each Fastify request that calls `getSupabaseClient()` uses a persistent Supabase client. Each Supabase client maintains a persistent PostgreSQL connection. Supabase Pro allows **500 database connections**. Railway with autoscaling (say 5 replicas × 50 concurrent requests per replica) can saturate this.

The SSE endpoint makes it worse — each SSE connection creates a new Supabase client (`createSupabaseClient()`), holding an additional DB connection for the duration of the job.

**Fix:** Use the Supabase connection pooler (Transaction mode) for all database queries:
- Supabase dashboard → Project Settings → Database → Connection Pooling
- Copy the **Transaction pooler** connection string (port 6543)
- Set `DATABASE_URL` env var in Railway to the pooler URL (not the direct 5432 connection)
- For Realtime (SSE), use the direct connection — the pooler doesn't support Realtime WebSockets

Update `client.ts` to use two clients: `db` (pooler, for queries) and `realtime` (direct, for subscriptions).

---

### H-2 — Background job has no retry with exponential backoff

**File:** `src/lib/jobs/worker.ts`, `src/domains/certificates/job-handler.ts`  
**Problem:** When a job fails (network error, Supabase hiccup, out-of-memory), it stays `failed` permanently. No automatic retry. For student data in bulk (say 5000 certificates) a transient error means manual re-trigger.

**Fix:** Add a `retry_count` and `max_retries` column to `background_jobs`, and re-queue failed jobs with exponential backoff:
```sql
ALTER TABLE background_jobs ADD COLUMN IF NOT EXISTS retry_count int NOT NULL DEFAULT 0;
ALTER TABLE background_jobs ADD COLUMN IF NOT EXISTS max_retries int NOT NULL DEFAULT 3;
ALTER TABLE background_jobs ADD COLUMN IF NOT EXISTS next_retry_at timestamptz;
```
In the worker, after catching an error: if `retry_count < max_retries`, set status back to `queued`, increment `retry_count`, set `next_retry_at = now() + interval '2^retry_count minutes'`. Only `failed` permanently when retries exhausted.

---

### H-3 — Certificate generation memory risk on large batches

**Files:** `src/domains/certificates/pdf-generator.ts`, `src/domains/certificates/job-handler.ts`  
**Problem:** `sharp.cache(false)` and `sharp.concurrency(0)` are set — good. But large batches (1000+ certificates) with chunked processing still hold all generated buffers for a chunk in memory before ZIP assembly. A single Railway instance (Pro: 8GB RAM) can handle this, but concurrent batch jobs from multiple organizations run in the same process with no memory cap per job.

**Risks:**
- Two concurrent 5000-certificate batches = Railway OOM kill → both jobs lost
- No timeout on individual certificate generation → one malformed template hangs the worker forever

**Fixes:**
1. Add `AbortSignal` timeout to PDF/image generation (30s per certificate)
2. Stream ZIP assembly (pipe each certificate directly into the ZIP archive without accumulating buffers)
3. Set Railway memory limit to 80% of available RAM and configure OOM alerting

---

### H-4 — Internal job worker endpoint protection

**File:** `src/api/v1/internal.ts`  
**Problem:** `POST /api/v1/internal/job-worker` is called by the Railway Cron service. It's protected by a secret — but verify:
1. Is the secret a minimum 32-byte random value? (`openssl rand -hex 32`)
2. Is it compared with `timingSafeEqual` to prevent timing attacks?
3. Is it in a different env var than application secrets so it can be rotated independently?
4. Is the internal endpoint blocked from public internet access? (Railway private networking only)

**Fix for item 4:** Use Railway private networking — the cron service calls `http://backend.railway.internal/api/v1/internal/job-worker` instead of the public URL. This means the endpoint never touches the public internet even if the secret leaks.

---

### H-5 — No security event audit log

**Problem:** There is no `security_events` or `audit_log` table. You cannot answer: "who logged in from an unusual IP yesterday?", "which org exported 10,000 certificates at 3am?", "who changed the billing plan?".

For a platform holding student PII, audit logging is a regulatory requirement (PDPA India, GDPR if EU students are issued certificates).

**Fix:** Add a security audit log table:
```sql
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid REFERENCES public.organizations(id),
  user_id uuid,
  action text NOT NULL, -- 'login', 'logout', 'certificate_generated', 'data_exported', etc.
  resource_type text,   -- 'certificate', 'template', 'import', etc.
  resource_id text,
  ip_address inet,
  user_agent text,
  metadata jsonb
);
CREATE INDEX ON public.audit_log (organization_id, created_at DESC);
CREATE INDEX ON public.audit_log (action, created_at DESC);
```
Log: auth events, certificate generation (count + org), bulk exports, billing changes, API key rotations, failed auth attempts.

---

## 🟡 MEDIUM

### M-1 — Student data has no retention policy

**Problem:** Student names, email addresses, enrollment IDs, and certificate content are stored indefinitely. PDPA (India's data protection law, effective 2025) requires a stated retention period and deletion mechanism.

**Fix:**
1. Add a data retention policy to your privacy policy: "Student data is retained for X years after certificate generation"
2. Implement a scheduled cleanup job that archives/deletes records older than the stated period
3. Add `data_classification` column to tables holding PII (`certificates`, `email_segment_contacts`, `file_import_rows`) so future queries can target PII specifically

---

### M-2 — Certificate download URLs — check expiry

**Question:** Where are generated certificate ZIPs stored, and are download URLs time-limited?

If stored in Supabase Storage with public bucket access → anyone with the URL can download forever. If it's a signed URL, what's the expiry?

**Fix:** Use Supabase Storage signed URLs with a 24-72 hour expiry. Store only the storage path in the database, generate the signed URL at the time of the API response. This prevents stale URLs from circulating indefinitely in notification emails.

---

### M-3 — No SELECT FOR UPDATE SKIP LOCKED in job queue

**File:** `src/lib/jobs/worker.ts`  
**Problem:** The `claimNextJob` function does two operations: SELECT (find oldest queued job), then UPDATE (claim it). Two concurrent cron workers race on the same row. The UPDATE guard `eq('status', 'queued')` prevents double-processing correctly — but both workers still scan the same row and one wastes a round-trip.

Under load (many queued jobs), this pattern serializes the queue. True parallel processing requires `SELECT FOR UPDATE SKIP LOCKED`:
```sql
UPDATE background_jobs
SET status = 'running', started_at = now()
WHERE id = (
  SELECT id FROM background_jobs
  WHERE status = 'queued'
  ORDER BY queued_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
RETURNING *;
```
This is not possible through the Supabase JS client — it requires `supabase.rpc('claim_next_job')` with a Postgres function. Current approach is safe for low concurrency; fix this when you hit 50+ jobs/minute.

---

### M-4 — CORS origins — verify production list

**File:** `src/lib/security/cors-policy.ts`  
**Check:** Confirm `allowedOrigins` (or `origin` array) in CORS config is restricted to `https://digicertificates.in` and `https://api.digicertificates.in` in production. A wildcard (`*`) or overly broad regex in production allows any site to make credentialed requests to your API.

---

### M-5 — No distributed tracing across services

**Problem:** `X-Request-ID` is forwarded from proxy → backend — good. But there is no trace context (W3C `traceparent` header / OpenTelemetry). When a background job fails, you can't correlate: the user's HTTP request → the job enqueue → the cron worker → the Supabase query that failed.

**Fix:** Add `@opentelemetry/sdk-node` to the backend. Railway supports OTLP export. Connect to Grafana Cloud (free tier: 50GB traces/month) for distributed trace visualization. This turns debugging from "grep logs for 30 minutes" to "click a trace, see exactly what failed."

---

### M-6 — No health-check granularity

**Problem:** `/health` endpoint exists (implied by rate limit allowList). Does it verify downstream dependencies? A Railway health check that always returns 200 even when the database is unreachable means Railway considers the instance healthy while all requests fail.

**Fix:**
```typescript
app.get('/health', async (req, reply) => {
  const checks = {
    status: 'ok',
    database: 'unknown',
    realtime: 'unknown',
  };
  try {
    await supabase.from('organizations').select('id').limit(1);
    checks.database = 'ok';
  } catch { checks.database = 'degraded'; checks.status = 'degraded'; }

  return reply.code(checks.status === 'ok' ? 200 : 503).send(checks);
});
```

---

### M-7 — SSE creates unbounded Supabase clients

**File:** `src/api/v1/jobs.ts`  
**Problem:** Each SSE connection calls `createSupabaseClient()` which opens a new Supabase JS instance with its own WebSocket (Realtime) and HTTP fetch pool. Supabase Pro has a **200 concurrent Realtime channel limit**. With 200 users polling job status simultaneously, you hit this limit and new Realtime subscriptions silently fail (SSE falls back to polling — this is fine, but the Supabase WebSocket connections remain until cleanup).

**Fix:** Use a shared Supabase Realtime client (singleton for subscriptions), multiplexed across all SSE connections. One Realtime connection → multiple channels. This requires a small pub/sub layer in memory (a `Map<jobId, Set<callback>>`), but keeps Realtime connections to 1-2 regardless of concurrent SSE users.

---

## 🟢 LOW / BEST PRACTICES

### L-1 — Missing Permissions-Policy header on frontend

**File:** `proxy.ts` (middleware, CSP is set here)  
The backend sets `X-Frame-Options: DENY` via Helmet. The frontend middleware should add:
```typescript
'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()'
```
Prevents browser APIs from being silently enabled by future dependencies.

---

### L-2 — API has no versioning deprecation strategy

`/api/v1/` exists but there is no mechanism to sunset it or add `/api/v2/`. When you make breaking changes to certificate generation output format or delivery configuration, you'll need to version. Add a `Deprecation` header to v1 responses now so clients know it's the first version (not the only version).

---

### L-3 — No Supabase Point-In-Time Recovery (PITR) test

Supabase Pro includes PITR (daily snapshots + WAL archiving). Have you tested a restore? Schedule a quarterly restore drill to a development Supabase project. If you've never tested it, you don't have backups — you have backup files.

---

### L-4 — Railway deploy order is manual

The summary mentions deploying `api → cron → cron-cleanup` sequentially. If a developer pushes all repos simultaneously, the cron service might start before the API with new endpoint contracts. Fix with Railway's deploy groups or add a startup delay check in `cron-tick.ts` that verifies the API is healthy before claiming jobs.

---

### L-5 — No automated dependency scanning

Add Dependabot or Renovate to both repos. Fastify, sharp, pdf-lib, and Supabase JS release security patches regularly. In production SaaS with student PII, unpatched CVEs are a compliance issue.

```yaml
# .github/dependabot.yml (both repos)
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
```

---

### L-6 — `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is in `.env` (committed?)

Check that `.env` is in `.gitignore` on both repos. The publishable key is safe to expose (it's designed to be public), but if `.env` is committed, other secrets (COOKIE_SECRET, JWT_SECRET, RAZORPAY_WEBHOOK_SECRET) are in git history permanently.

```bash
git log --all --full-history -- .env  # check if .env was ever committed
```
If it was: rotate all secrets immediately, then remove the file from git history with `git filter-repo`.

---

### L-7 — No alerting on job failure rate

If certificate generation starts failing (bad template, memory exhaustion, Supabase outage), the only signal is a user complaint. Add a Grafana Cloud alert or a simple daily cron that checks:
```sql
SELECT count(*) FROM background_jobs
WHERE status = 'failed' AND created_at > now() - interval '1 hour';
```
If count > N, send a Slack/email alert.

---

## Compliance Checklist (India PDPA 2025)

| Requirement | Status |
|---|---|
| Privacy Policy with retention periods | ⚠️ Unknown — verify |
| Data Processing Agreement with Supabase | ⚠️ Supabase has a DPA — sign it in the dashboard |
| Data Processing Agreement with Railway | ⚠️ Railway has a DPA — sign it for Pro plan |
| Data Processing Agreement with Resend | ⚠️ Sign Resend's DPA if sending student emails |
| Right to erasure (delete student data on request) | ❌ No mechanism in place |
| Data breach notification procedure | ❌ Not documented |
| Consent for student email collection | ⚠️ Check your onboarding flow |

---

## Priority Action Plan

### This week (before next deployment)
1. Fix Supabase URL config (Site URL + redirect URLs) — 5 min
2. Verify `SUPABASE_SECRET_KEY` isolation (C-4) — 10 min
3. Add rate limit to SSE endpoint (C-3) — 1 hour
4. Sign DPAs with Supabase, Railway, Resend — 30 min

### This sprint
5. Add Redis (C-1 + C-2) — shared store for rate limits and JWT cache — 1 day
6. Add retry with backoff to job worker (H-2) — half day
7. Add security audit log table (H-5) — half day
8. Add health check with dependency checks (M-6) — 2 hours

### Next quarter
9. Connection pooling via PgBouncer (H-1) — 1 day
10. Shared Realtime client for SSE (M-7) — 1 day
11. OpenTelemetry distributed tracing (M-5) — 2 days
12. PDPA compliance: retention policy + erasure mechanism (M-1) — 1 sprint
13. Dependabot on both repos (L-5) — 15 min
14. PITR restore drill (L-3) — 2 hours

---

## What's Actually Good (Don't Touch)

- JWT verification with SHA-256-hashed in-memory caching — correct pattern, just needs to scale to Redis
- Atomic job claiming with optimistic locking — safe for current throughput
- CSRF protection on cookie-auth routes
- Fastify Helmet with HSTS, noSniff, frameguard — production-correct
- Log redaction configuration — PII not leaking into logs
- SSRF-hardened proxy with path allowlist
- RLS enabled on all 23 tables (migration 023)
- Performance indexes on all FK columns (migration 024)
- Chunked certificate processing (ContinueSignal pattern) — prevents OOM on large batches
- sharp cache disabled + concurrency tuned — correct for Railway Pro CPU profile
- `SKIP_LOCKED` missing but current optimistic locking is correct for current scale
- SSE architecture choice (backend proxies Realtime) — correct given custom cookie auth
