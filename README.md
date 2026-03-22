# Authentix Dashboard

Frontend dashboard for Authentix: a certificate issuance, management, and verification platform for organizations.

## Project Overview

This repository contains the Next.js dashboard used by authenticated organization users to:
- create and manage certificate templates
- import recipient data
- generate certificates
- track billing, usage, and verification events
- manage organization settings and API credentials

Why this architecture exists:
- keeps browser clients away from direct backend and database access
- centralizes security controls in Next.js route handlers and proxying
- enforces org-scoped routing with `/dashboard/org/[slug]`

## Tech Stack

- Framework: Next.js 16 (App Router)
- UI: React 19 + Tailwind CSS 4 + Radix UI primitives
- Language: TypeScript (strict mode)
- Data/Files: `xlsx`, `csv-stringify`, `jszip`
- Certificate tooling: `pdf-lib`, `react-pdf`, `pdfjs-dist`, `qrcode`
- Charts/analytics: `recharts`

Key config references:
- `package.json`
- `next.config.ts`
- `tsconfig.json`
- `eslint.config.mjs`
- `tailwind.config.ts`

## Architecture Summary

The dashboard follows a BFF-style pattern:
- browser requests app pages and internal APIs from Next.js
- frontend code calls `/api/proxy/*` and `/api/auth/*`
- Next.js server forwards validated requests to the backend API
- JWTs are stored in HttpOnly cookies and forwarded server-side

High-level path:
- Browser -> Next App Router -> Next route handlers/proxy -> backend API

Core security expectations:
- no direct Supabase client for DB access in frontend
- no token storage in `localStorage` or `sessionStorage`
- proxy path allowlist and path traversal protections remain enforced

## Folder Structure

```text
app/
  (auth)/                         Auth pages and server actions
  api/
    auth/                         Auth route handlers (login, refresh, session, me, etc.)
    proxy/[...path]/              Hardened backend proxy with allowlist
    templates/with-previews/      BFF aggregation endpoint for template previews
  dashboard/
    page.tsx                      Dashboard resolver -> redirects to org slug route
    org/[slug]/                   Protected org-scoped app shell and feature pages
  verify/[token]/                 Public verification page

src/
  components/                     UI and feature components
  features/templates/             Feature-sliced template APIs/hooks/types
  lib/
    api/                          Client/server API wrappers
    config/env.ts                 Backend URL environment resolution
    org/                          Org context and helpers
    hooks/                        Shared data hooks
    utils/                        Utility modules (guards, retry, etc.)

proxy.ts                          Route protection and redirect middleware-style proxy
projectmemory.md                  Living frontend memory and historical changes
AGENTS.md                         Agent operating rules and safety constraints
```

See also:
- `SYSTEM_OVERVIEW.md`
- `FILE_INDEX.md`

## Setup (Step-by-Step)

### 1) Prerequisites

- Node.js `24.x` (repo contains `.nvmrc` with `24.0.0`)
- npm 10+
- Running Authentix backend API

### 2) Install dependencies

```bash
npm install
```

### 3) Configure environment

Copy env template:

```bash
cp .env.example .env.local
```

The runtime environment resolver currently reads:
- `BACKEND_ENV` (`local` | `test` | `prod`)
- `BACKEND_URL_LOCAL`
- `BACKEND_URL_TEST`
- `BACKEND_URL_PROD`

`src/lib/config/env.ts` also contains defaults if variables are omitted.

⚠️ Needs clarification: some historical docs mention `BACKEND_API_URL`. Current runtime code uses the env set above via `src/lib/config/env.ts`.

## Running the Project

### Development

```bash
npm run dev
```

### Production build + run

```bash
npm run typecheck
npm run lint
npm run build
npm start
```

## Common Commands

- `npm run dev` - start local dev server (Turbopack)
- `npm run typecheck` - run TypeScript checks
- `npm run lint` - run ESLint
- `npm run build` - create production build
- `npm start` - run production server
- `npm test` - run unit/component tests in watch mode (Vitest)
- `npm run test:run` - run all unit/component tests once (CI)
- `npm run test:coverage` - run tests with v8 coverage report
- `npm run test:e2e` - run Playwright E2E tests (requires `npx playwright install` first)

## Key Internal Workflows

### 1) Authentication and Route Protection

- login/signup pages submit via server actions
- auth cookies (`auth_access_token`, `auth_refresh_token`, `auth_expires_at`) are set server-side
- `proxy.ts` protects non-public routes and redirects unauthenticated users
- `/dashboard` resolves and redirects users to `/dashboard/org/[slug]`

### 2) Organization-Scoped Dashboard Rendering

- org layout (`app/dashboard/org/[slug]/layout.tsx`) performs server-side auth/profile checks
- slug mismatch redirects users to their real organization slug
- shell context is injected via `DashboardShell` and org context providers

### 3) Certificate Generation

- choose template
- place/map fields in certificate designer
- import or enter recipient data
- call generation endpoint via `/api/proxy/certificates/generate`
- preview and export generated certificates

⚠️ Needs clarification: async generation for very large batches is documented as incomplete in project memory and should be treated as a known limitation.

## Testing

Unit and component tests live in `__tests__/` and run via Vitest (jsdom environment):

```bash
npm run test:run        # all tests once
npm run test:coverage   # with coverage
```

E2E tests live in `e2e/` and run via Playwright against `http://localhost:3000`:

```bash
npx playwright install  # one-time browser install
npm run test:e2e
```

Key config files: `vitest.config.ts`, `vitest.setup.ts`, `playwright.config.ts`.

**Testing gotchas:**
- `vite-tsconfig-paths` plugin (not manual aliases) is required for `@/*` path resolution in Vitest
- Stub `setInterval` in ExportSection tests — the progress timer fires out-of-`act` and stalls `waitFor`
- Use `fireEvent` (not `userEvent`) for overlay and async clipboard click tests
- Call `render()` before `vi.spyOn(document.body, 'appendChild')` — spying first breaks React DOM mounting
- `ClipboardItem` is not defined in jsdom — stub it via `vi.stubGlobal('ClipboardItem', ...)` in `beforeEach`

## Contribution Guidelines

- Prefer Server Components for initial data loading
- Use Client Components only when interaction is required
- Route new protected features under `app/dashboard/org/[slug]/`
- Keep API access behind Next route handlers (`/api/proxy/*`, `/api/auth/*`)
- Run `npm run typecheck && npm run lint && npm run build` before PR
- Run `npm run test:run` to verify no regressions
- Update docs when architecture, routes, contracts, or workflows change

## Documentation Rules

This repo has three canonical maintenance docs:
- `README.md` (developer onboarding and usage)
- `AGENTS.md` (AI/automation operating constraints and safety rules)
- `projectmemory.md` (persistent system memory and change history)

### When to update docs

Update documentation in the same PR whenever any of the following changes:
- routes/pages/layout structure
- API endpoints, contracts, or auth flows
- env variables, setup process, or scripts
- key business workflows (template, import, generation, billing, verification)
- security constraints or anti-pattern rules

### What to update

- Update `README.md` for onboarding-impact changes (setup, architecture summary, workflows, commands)
- Update `AGENTS.md` for rule changes, safety boundaries, or file ownership guidance
- Update `projectmemory.md` for persistent decisions, limitations, and append-only recent changes

### How to structure updates

- Keep sections skimmable (short headings + concise bullets)
- Prefer code-backed statements over assumptions
- Mark uncertain items explicitly as `⚠️ Needs clarification`
- Maintain terminology consistency (`[slug]`, organization naming, proxy/BFF boundaries)
- Cross-link docs when a topic spans multiple files

### Responsibility guidelines

- Author of the code change updates the docs in the same change set
- Reviewers verify docs for accuracy and consistency before merge
- AI agents must read `projectmemory.md` and `AGENTS.md` before making substantive edits

## Additional Documentation

- `SYSTEM_OVERVIEW.md` - end-to-end runtime and data flow
- `FILE_INDEX.md` - where-to-look guide for major modules/files
- `CHANGELOG.md` - chronological change log
- `email-templates/README.md` - email template reference
