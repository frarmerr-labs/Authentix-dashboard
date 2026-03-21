# AGENTS.md - Authentix Dashboard Agent Guide

**Last Updated:** 2026-03-21  
**Scope:** `Authentix-dashboard` frontend repository

This document is optimized for AI agents and automation tooling. Read this before code edits.

## Mandatory Pre-Flight

1. Read `projectmemory.md` first.
2. Verify behavior in code before proposing changes.
3. Do not overwrite memory/history sections blindly.
4. If uncertain, write `⚠️ Needs clarification` instead of inferring.

## Repository Context

- Frontend repo: `Authentix-dashboard` (Next.js App Router)
- Backend repo: `Authentix-backend` (Fastify API)
- Database/auth/storage: Supabase project `brkyyeropjslfzwnhxcw`

Backend dependency is required for most frontend runtime paths.

## High-Level Architecture

- Pattern: BFF/proxy frontend
- Browser talks to Next route handlers (`/api/auth/*`, `/api/proxy/*`)
- Next server forwards to backend API
- Auth uses HttpOnly cookies
- Protected routes are organization-scoped via `/dashboard/org/[slug]`

Primary flow:
- Browser -> Next App Router + Route Handlers -> backend API

## Entry Points and Critical Files

### Runtime and security

- `proxy.ts`  
  Route gating, public/protected checks, legacy redirect logic.

- `app/api/proxy/[...path]/route.ts`  
  Hardened proxy: allowlist, path safety checks, method restrictions, timeout handling, sanitized errors.

- `app/api/auth/*/route.ts`  
  Auth wrappers and cookie/session lifecycle endpoints.

### API access layers

- `src/lib/api/client.ts`  
  Client-side API surface (templates, certificates, imports, billing, organizations, users, dashboard).

- `src/lib/api/server.ts`  
  Server-side API calls, auth cookie access, and error sanitization.

- `src/lib/config/env.ts`  
  Backend environment URL resolution and fallback behavior.

### Dashboard and org routing

- `app/dashboard/page.tsx`  
  Resolver that redirects users into org slug routes.

- `app/dashboard/org/[slug]/layout.tsx`  
  Server-side auth/profile validation and org-access checks.

- `src/lib/org/context.tsx`  
  Org context utilities used by dashboard pages/components.

### Core business area

- `app/dashboard/org/[slug]/generate-certificate/*`  
  Template selection, field design, data mapping, generation, preview/export.

## Business Logic Hotspots

- Authentication bootstrap and session checks
- Organization slug resolution and access validation
- Template upload/editor/field persistence
- Import job flows and data mapping
- Certificate generation request construction and export handling
- Billing/invoice retrieval and payment-link handoff

## Patterns and Conventions

- Prefer Server Components for initial data fetching.
- Use Client Components only for interactive UI.
- Use server actions for auth form submissions.
- Keep protected page routes under `app/dashboard/org/[slug]/`.
- Keep all backend calls behind Next handlers/proxy.
- Keep TypeScript strict; avoid `any` unless justified.

## Naming Conventions

- Route segments: kebab-case
- Components: PascalCase
- Hooks/utils: camelCase (`useX`)
- Org route parameter: `slug` (not legacy `orgId` UUID)
- Authorization source of truth: backend JWT context, not URL slug

## Never Modify Blindly

- `proxy.ts` and proxy allowlist logic
- `app/api/proxy/[...path]/route.ts` security controls
- Auth cookie handling in `src/lib/api/server.ts`
- API contracts in `src/lib/api/client.ts`
- Org validation in `app/dashboard/org/[slug]/layout.tsx`
- Any docs/history file append-only sections (`projectmemory.md` recent changes)

## Safe Areas for Automated Changes

- Presentational UI components (`src/components/ui/*`) when behavior is unchanged
- Feature-specific UX refinements in leaf page components
- Non-breaking documentation updates (`README.md`, `FILE_INDEX.md`, `SYSTEM_OVERVIEW.md`)
- Typed refactors that preserve endpoint/method/path contracts
- Testless cleanup only when runtime behavior is unchanged and verified

## Hard Constraints

- Never add direct Supabase DB client usage in frontend.
- Never expose service-role secrets to browser code.
- Never store auth tokens in `localStorage` or `sessionStorage`.
- Never bypass `/api/proxy/*` and call backend from browser using private URLs.
- Never loosen proxy path validation or allowlist without explicit review.
- Never return internal backend/raw storage identifiers to UI unless required.

## Anti-Patterns To Avoid

- Mixing live sync and explicit submit callbacks in data-entry flows.
- Using stale schema fields (`issue_date`, `expiry_date`, `status='issued'`).
- Downloading files through unnecessary blob-buffer roundtrips when direct links are available.
- Re-introducing optimistic-flow regressions in generate-certificate UX.

## Documentation Synchronization Rules

When code changes, update docs in the same change set:
- `README.md` for onboarding/setup/workflow impact
- `AGENTS.md` for guardrails, boundaries, and operating rules
- `projectmemory.md` for durable decisions and append-only recent changes

If any statement cannot be confirmed in code, mark it as:
- `⚠️ Needs clarification`

## Related Docs

- `README.md`
- `projectmemory.md`
- `SYSTEM_OVERVIEW.md`
- `FILE_INDEX.md`
