# Authentix Dashboard

Next.js frontend for Authentix — certificate issuance, management, and verification.

---

## Code Flow — How to Ship Changes

```
feature branch  →  staging branch  →  main branch
     ↓                  ↓                 ↓
  local dev       Vercel preview     Vercel production
                  + Railway staging  + Railway production
```

### Step-by-step

1. **Create a feature branch from `staging`**
   ```bash
   git checkout staging && git pull origin staging
   git checkout -b feature/your-change
   ```

2. **Build and test locally**
   ```bash
   npm run typecheck
   npm run lint
   npm run test:run
   ```

3. **Open a PR: `feature/*` → `staging`**
   - CI must pass (lint + typecheck + tests) before merge
   - Vercel auto-deploys a preview for every PR
   - After merge, Vercel deploys `staging` branch as a preview environment

4. **Verify on staging**
   - Open the Vercel preview URL for the `staging` branch
   - Test end-to-end against Railway staging backend

5. **Open a PR: `staging` → `main`**
   - CI must pass again
   - After merge, Vercel deploys to production automatically

> **Never push directly to `main`.** Always go `feature → staging → main`.

---

## Architecture

- Framework: Next.js (App Router)
- UI: React + Tailwind CSS + Radix UI
- Language: TypeScript (strict mode)
- Pattern: BFF proxy — browser never calls the backend directly

```
Browser → Next.js → /api/proxy/* → Authentix backend API
                  → /api/auth/*  → Auth cookies (HttpOnly)
```

---

## Local Development

### Prerequisites

- Node.js 24+

### Setup

```bash
git clone https://github.com/frarmerr-labs/Authentix-dashboard.git
cd Authentix-dashboard
npm install
cp .env.example .env.local
npm run dev             # http://localhost:3000
```

### Connect to Railway staging backend (no local backend needed)

In `.env.local`:
```
NEXT_PUBLIC_API_URL=https://<staging-service>.up.railway.app/api/v1
```

### Connect to local backend

In `.env.local`:
```
# leave NEXT_PUBLIC_API_URL unset — defaults to http://localhost:3001/api/v1
NEXT_PUBLIC_SUPABASE_URL=https://brkyyeropjslfzwnhxcw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxx
```

---

## Environment Variables

### In Vercel dashboard (Settings → Environment Variables)

| Variable | Production | Preview (staging) |
|----------|-----------|-------------------|
| `NEXT_PUBLIC_API_URL` | `https://api.authentix.xencus.com/api/v1` | Railway staging URL `/api/v1` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://brkyyeropjslfzwnhxcw.supabase.co` | same |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_xxx` | same |

> `NEXT_PUBLIC_*` variables are embedded into the client bundle at build time — set them in Vercel, not in `.env.local` for production.

### In `.env.local` (local dev only — never commit)

```bash
NEXT_PUBLIC_API_URL=https://<staging>.up.railway.app/api/v1   # or omit for localhost
NEXT_PUBLIC_SUPABASE_URL=https://brkyyeropjslfzwnhxcw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxx
```

---

## Common Commands

```bash
npm run dev           # start dev server (Turbopack) — http://localhost:3000
npm run typecheck     # TypeScript strict check
npm run lint          # ESLint
npm run build         # production build
npm run test:run      # all unit/component tests once (CI)
npm run test:coverage # with v8 coverage report
npm run test:e2e      # Playwright E2E (run npx playwright install first)
```

---

## GitHub Setup

### Branch protection (Settings → Branches)

Apply to **both `main` and `staging`**:

| Setting | Value |
|---------|-------|
| Require status checks to pass | ✅ `Lint, Typecheck & Tests` |
| Require branch to be up to date | ✅ |
| Block force pushes | ✅ |
| Block deletions | ✅ |

No GitHub Secrets are needed — CI only runs local lint, typecheck, and tests. Vercel deploys via its own GitHub App integration.

---

## Testing

```bash
npm run test:run      # 247 unit/component tests via Vitest
npm run typecheck     # TypeScript
npm run lint          # ESLint (max 250 warnings)
```

### Testing gotchas

- Stub `setInterval` in ExportSection tests — the progress timer fires out-of-`act`
- Use `fireEvent` not `userEvent` for overlay and async tests
- `ClipboardItem` is not in jsdom — stub via `vi.stubGlobal('ClipboardItem', ...)` in `beforeEach`
- Mock `useOrg`, `useJobNotifications`, and `api.delivery.listTemplates` in ExportSection tests

---

## Folder Structure

```
app/
  (auth)/                     Login, signup pages
  api/
    auth/                     Auth route handlers (login, signup, refresh, session)
    proxy/[...path]/          Hardened proxy to backend with path allowlist
  dashboard/org/[slug]/       All protected org-scoped pages
  verify/[token]/             Public certificate verification page

src/
  components/                 Shared UI components
  lib/
    api/                      Client + server API wrappers
    config/env.ts             Backend URL resolution (NEXT_PUBLIC_API_URL)
    notifications/            Background job notification system
    org/                      Org context
```

---

## Dos and Don'ts

**Do**
- Branch from `staging`, not `main`
- Keep all backend calls behind `/api/proxy/*` and `/api/auth/*`
- Store auth tokens only in HttpOnly cookies (server-side)
- Run `typecheck + lint + test:run` before opening a PR

**Don't**
- Never push directly to `main`
- Never commit `.env.local`
- Never call the backend directly from browser code — always go through the proxy
- Never store tokens in `localStorage` or `sessionStorage`
