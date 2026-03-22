# FILE_INDEX.md

Quick navigation guide for the Authentix Dashboard codebase.

## Start Here

- App entry and root layout: `app/layout.tsx`
- Route protection: `proxy.ts`
- Dashboard resolver: `app/dashboard/page.tsx`
- Org shell and access checks: `app/dashboard/org/[slug]/layout.tsx`

## Folder-by-Folder Index

### `app/`

Main Next.js App Router tree.

- `app/page.tsx`  
  Root route redirect behavior.

- `app/(auth)/`  
  Login/signup/verification pages and related server actions.

- `app/dashboard/`  
  Dashboard resolver and top-level dashboard wrapper.

- `app/dashboard/org/[slug]/`  
  Protected organization-scoped feature pages.

- `app/api/auth/`  
  Auth route handlers (`login`, `signup`, `session`, `refresh`, `me`, etc.).

- `app/api/proxy/[...path]/route.ts`  
  Hardened forwarding layer to backend with allowlist and path validation.

- `app/api/templates/with-previews/route.ts`  
  Aggregated template listing/preview endpoint.

- `app/verify/[token]/page.tsx`  
  Public certificate verification surface.

### `src/components/`

Reusable and feature-focused React components.

- `src/components/dashboard/DashboardShell.tsx`  
  Core shell for org dashboard navigation and layout.

- `src/components/dashboard/analytics/AnalyticsDashboardClient.tsx`  
  Client analytics rendering and chart interactions.

- `src/components/templates/TemplateUploadDialog.tsx`  
  Template upload UI.

- `src/components/ui/*`  
  UI primitives and shared controls.

### `src/features/`

Feature-sliced modules.

- `src/features/templates/api.ts`
- `src/features/templates/hooks/use-templates.ts`
- `src/features/templates/types.ts`

Use this area for feature-specific APIs/hooks/types that should not bloat shared libs.

### `src/lib/`

Core shared libraries.

- `src/lib/api/client.ts`  
  Browser-side API client wrappers.

- `src/lib/api/server.ts`  
  Server-side API request helpers and auth cookie utilities.

- `src/lib/config/env.ts`  
  Backend URL environment resolution.

- `src/lib/org/context.tsx`  
  Organization context and route-aware helpers.

- `src/lib/hooks/*`  
  Shared hooks for categories and related data.

- `src/lib/utils/*`  
  Retry, guardrails, dynamic imports, and helper utilities.

## Core Business Logic Locations

### Certificate generation flow

- `app/dashboard/org/[slug]/generate-certificate/page.tsx`
- `app/dashboard/org/[slug]/generate-certificate/components/*`

Look here for:
- template selection and loading
- canvas field operations
- data import/mapping
- generation and export behavior

### Template management

- `app/dashboard/org/[slug]/templates/page.tsx`
- `app/dashboard/org/[slug]/templates/[templateId]/edit/page.tsx`
- `src/features/templates/*`

### Imports

- `app/dashboard/org/[slug]/imports/page.tsx`
- `src/lib/api/client.ts` (`api.imports.*`)

### Certificates list and verification logs

- `app/dashboard/org/[slug]/certificates/page.tsx`
- `app/dashboard/org/[slug]/verification-logs/page.tsx`

### Billing

- `app/dashboard/org/[slug]/billing/page.tsx`
- `app/dashboard/org/[slug]/billing/components/*`
- `src/lib/billing-ui/*`

### Org settings and users

- `app/dashboard/org/[slug]/settings/page.tsx`
- `app/dashboard/org/[slug]/settings/api/page.tsx`
- `app/dashboard/org/[slug]/users/page.tsx`

### `__tests__/`

Unit and component tests (Vitest + @testing-library/react).

- `__tests__/auth/signup-action.test.ts` — server action: validation, backend calls, NEXT_REDIRECT
- `__tests__/auth/login-action.test.ts` — server action: login flow, bootstrap, cookie handling
- `__tests__/components/ManualDataEntry.test.tsx` — add/edit/delete rows, email validation, Confirm Data
- `__tests__/components/CertificateTable.test.tsx` — empty/loading, pagination, download, clipboard, ZIP
- `__tests__/components/ExportSection.test.tsx` — canGenerate button state, overlay state machine
- `__tests__/lib/automap.test.ts` — pure function: label matching, type fallbacks, first-match-wins

### `e2e/`

End-to-end tests (Playwright, intercepts at `http://localhost:3000`).

- `e2e/auth.spec.ts` — login and signup flows with mocked API responses
- `e2e/generate-certificate.spec.ts` — template selection → data entry → generation flow

## Configuration and Tooling Files

- `package.json` - scripts, dependencies, Node engine
- `.nvmrc` - local Node version
- `next.config.ts` - security headers/CSP and Next runtime settings
- `tsconfig.json` - TypeScript compiler and path aliases
- `eslint.config.mjs` - lint rules
- `tailwind.config.ts` and `postcss.config.mjs` - styling pipeline
- `.env.example` - environment template
- `vitest.config.ts` - Vitest config (jsdom, `vite-tsconfig-paths`, coverage)
- `vitest.setup.ts` - Vitest global setup (`@testing-library/jest-dom`)
- `playwright.config.ts` - Playwright E2E config (Chromium, `localhost:3000`)

## Documentation Map

- `README.md` - onboarding and developer workflows (includes Testing section)
- `AGENTS.md` - AI-agent operational constraints
- `projectmemory.md` - persistent architecture memory and recent changes
- `SYSTEM_OVERVIEW.md` - end-to-end system and data flows
- `CHANGELOG.md` - chronological changes

## Where Do I Look For X?

- "Why am I being redirected?" -> `proxy.ts`, `app/dashboard/page.tsx`
- "How is org access enforced?" -> `app/dashboard/org/[slug]/layout.tsx`
- "How does API forwarding work?" -> `app/api/proxy/[...path]/route.ts`
- "Where are API endpoint wrappers?" -> `src/lib/api/client.ts`
- "Where are server-side backend calls?" -> `src/lib/api/server.ts`
- "How does certificate generation work?" -> `app/dashboard/org/[slug]/generate-certificate/*`
- "How are backend URLs selected?" -> `src/lib/config/env.ts`

## Notes

- Treat `app/api/proxy/[...path]/route.ts` and auth cookie handling as high-risk files.
- If behavior is unclear, verify code paths and mark docs with `⚠️ Needs clarification`.
