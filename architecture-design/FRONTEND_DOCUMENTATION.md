# Frontend Architecture & Documentation

## Overview

The Authentix frontend is a Next.js 16 application built with React 19, TypeScript 5.9, and Tailwind CSS 4. It serves as a pure UI layer that communicates exclusively with the backend API through a secure BFF (Backend For Frontend) proxy pattern. All business logic, database operations, and external service integrations are handled by the dedicated backend.

**Last Updated**: January 2026

## Tech Stack

### Core Framework
| Package | Version | Notes |
|---------|---------|-------|
| **Next.js** | 16.1.1 | App Router, Turbopack |
| **React** | 19.2.3 | Server Components, Server Actions |
| **TypeScript** | 5.9.3 | Strict mode, satisfies operator |
| **Node.js** | >=24.0.0 | LTS 2026 |

### UI & Styling
- **Tailwind CSS**: 4.1.18 (CSS-first configuration)
- **shadcn/ui**: Component library (Radix UI primitives)
- **lucide-react**: 0.562.0 (Icons)
- **class-variance-authority**: 0.7.1 (Component variants)
- **tailwind-merge**: 3.4.0 (Class merging)

### Authentication & Security
- **HttpOnly Cookies**: Secure token storage (no localStorage)
- **BFF Proxy Pattern**: All API calls proxied through Next.js Route Handlers
- **Server Actions**: React 19 form handling pattern
- **Security Headers**: CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy
- **Next.js Proxy**: Route-level middleware for auth checks

### File Processing (Dynamic Imports)
- **pdf-lib**: 1.17.1 (PDF manipulation)
- **react-pdf**: 10.3.0 (PDF rendering)
- **xlsx**: 0.18.5 (Excel file parsing)
- **jszip**: 3.10.1 (ZIP file creation)
- **csv-stringify**: 6.6.0 (CSV generation)
- **qrcode**: 1.5.4 (QR code generation)

*All heavy libraries are dynamically imported to reduce initial bundle size.*

## URL Routing Structure

### Organization-Based URLs (Multi-Tenant)

The dashboard uses organization-scoped URLs similar to platforms like Supabase:

\`\`\`
/dashboard                              → Resolver (redirects to /org/[orgId])
/dashboard/org/[orgId]                  → Dashboard home
/dashboard/org/[orgId]/templates        → Template management
/dashboard/org/[orgId]/generate-certificate → Certificate generation
/dashboard/org/[orgId]/imports          → Data imports
/dashboard/org/[orgId]/certificates     → Certificate listing
/dashboard/org/[orgId]/billing          → Billing overview
/dashboard/org/[orgId]/billing/invoices/[id] → Invoice detail
/dashboard/org/[orgId]/company          → Company settings
/dashboard/org/[orgId]/settings         → General settings
/dashboard/org/[orgId]/settings/api     → API key management
/dashboard/org/[orgId]/users            → User management
/dashboard/org/[orgId]/verification-logs → Verification history
\`\`\`

### Route Flow

\`\`\`
1. User visits /dashboard
2. proxy.ts checks for auth cookie
3. If no auth → redirect to /login
4. If auth → let /dashboard page load
5. /dashboard page fetches user profile
6. Gets company_id from profile
7. Redirects to /dashboard/org/[company_id]
8. Org layout validates user belongs to this org
9. Dashboard content loads
\`\`\`

## Project Structure

\`\`\`
MineCertificate/
├── app/                              # Next.js App Router pages
│   ├── (auth)/                       # Auth route group (public)
│   │   ├── login/
│   │   │   ├── page.tsx              # Login page (Server Actions)
│   │   │   └── actions.ts            # Login Server Action
│   │   └── signup/
│   │       ├── page.tsx              # Signup page (Server Actions)
│   │       ├── actions.ts            # Signup Server Action
│   │       └── success/page.tsx
│   ├── api/                          # Next.js Route Handlers (BFF)
│   │   ├── auth/
│   │   │   ├── login/route.ts        # POST /api/auth/login
│   │   │   ├── logout/route.ts       # POST /api/auth/logout
│   │   │   ├── signup/route.ts       # POST /api/auth/signup
│   │   │   ├── session/route.ts      # GET /api/auth/session
│   │   │   └── refresh/route.ts      # POST /api/auth/refresh
│   │   └── proxy/
│   │       └── [...path]/route.ts    # Catch-all API proxy
│   ├── dashboard/                    # Protected dashboard routes
│   │   ├── layout.tsx                # Passthrough layout
│   │   ├── page.tsx                  # Org resolver
│   │   └── org/[orgId]/              # Organization-scoped routes
│   │       ├── layout.tsx            # Dashboard layout with sidebar
│   │       ├── page.tsx              # Dashboard home (stats)
│   │       ├── templates/page.tsx
│   │       ├── generate-certificate/page.tsx
│   │       ├── imports/page.tsx
│   │       ├── certificates/page.tsx
│   │       ├── billing/page.tsx
│   │       ├── company/page.tsx
│   │       ├── settings/page.tsx
│   │       ├── users/page.tsx
│   │       └── verification-logs/page.tsx
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Landing page
│   └── globals.css                   # Global styles (Tailwind v4)
├── src/
│   ├── components/ui/                # shadcn/ui components
│   ├── features/templates/           # Templates feature module
│   │   ├── api.ts
│   │   ├── types.ts
│   │   ├── utils.ts
│   │   └── hooks/use-templates.ts
│   └── lib/
│       ├── api/client.ts             # Client API (uses proxy)
│       ├── api/server.ts             # Server API utilities
│       ├── auth/storage.ts           # Auth helpers (deprecated)
│       ├── org/context.tsx           # OrgProvider, useOrg hook
│       └── utils/dynamic-imports.ts  # Heavy library imports
├── proxy.ts                          # Next.js 16 Proxy (auth middleware)
├── next.config.ts                    # Next.js configuration
├── tsconfig.json                     # TypeScript configuration
└── .nvmrc                            # Node version (24.0.0)
\`\`\`

## Architecture Patterns

### 1. Organization Context

\`\`\`typescript
// In layout.tsx
import { OrgProvider } from "@/lib/org";

export default function OrgLayout({ children, params }: OrgLayoutProps) {
  const { orgId } = use(params); // React 19 use() hook
  return <OrgProvider orgId={orgId}>{children}</OrgProvider>;
}

// In child components
import { useOrg, useOrgPath } from "@/lib/org";

function TemplatesList() {
  const { orgId } = useOrg();
  const orgPath = useOrgPath();
  return <Link href={orgPath("/templates/new")}>Create</Link>;
}
\`\`\`

### 2. React 19 Server Actions

\`\`\`typescript
// actions.ts
"use server";
export async function loginAction(_prevState: LoginState, formData: FormData) {
  const result = await backendAuthRequest("/auth/login", {...});
  await setServerAuthCookies(result.session);
  redirect("/dashboard");
}

// page.tsx
const [state, formAction] = useActionState(loginAction, initialState);
<form action={formAction}>...</form>
\`\`\`

### 3. React 19 use() Hook for Async Params

\`\`\`typescript
interface OrgLayoutProps {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>; // Params are now a Promise
}

export default function OrgLayout({ params }: OrgLayoutProps) {
  const { orgId } = use(params); // React 19 use() hook
}
\`\`\`

### 4. BFF Proxy Pattern

\`\`\`
Client → /api/proxy/* → Next.js Route Handler → Backend API
\`\`\`

### 5. TypeScript 5.9 Patterns

\`\`\`typescript
// Const assertions
export const TEMPLATE_STATUSES = ["draft", "active", "archived"] as const;
export type TemplateStatus = (typeof TEMPLATE_STATUSES)[number];

// Satisfies operator
export const DEFAULT_STATUS = "draft" satisfies TemplateStatus;

// Discriminated unions
export type CertificateField =
  | TextCertificateField
  | DateCertificateField
  | QRCodeCertificateField;
\`\`\`

## Security

### Headers (next.config.ts)
- Content-Security-Policy
- Strict-Transport-Security
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy

### Cookie-Based Auth
- HttpOnly cookies (not accessible via JavaScript)
- Secure flag in production
- SameSite: lax
- Server-side token management

## API Client

\`\`\`typescript
const API_BASE_URL = "/api/proxy";

api.auth.login(email, password)     // → /api/auth/login
api.auth.logout()                   // → /api/auth/logout
api.templates.list()                // → /api/proxy/templates
api.companies.get()                 // → /api/proxy/companies/me
api.certificates.generate(params)  // → /api/proxy/certificates/generate
\`\`\`

## Build Commands

\`\`\`bash
nvm use           # Node 24 (.nvmrc)
npm install       # Install deps
npm run dev       # Dev server (Turbopack)
npm run build     # Production build
npm run typecheck # Type checking
npm run lint      # Linting
\`\`\`

## Key Patterns Summary

| Pattern | Description |
|---------|-------------|
| **Organization Context** | URL-based multi-tenant (\`/dashboard/org/[orgId]\`) |
| **BFF Proxy** | All API calls through Route Handlers |
| **HttpOnly Cookies** | Secure token storage |
| **Server Actions** | React 19 form handling |
| **use() Hook** | React 19 Promise unwrapping |
| **Dynamic Imports** | Heavy libraries loaded on demand |
| **Feature Modules** | Domain-specific code organization |

## Important Notes

- **No Direct Backend Access**: Client never calls backend directly
- **No localStorage Tokens**: All auth tokens in HttpOnly cookies
- **No Business Logic**: All business logic in backend
- **Multi-Tenant**: Organization context throughout dashboard
- **Type Safety**: Strict TypeScript with discriminated unions
