# MineCertificate Frontend Architecture

## Overview

MineCertificate is a certificate generation and management platform built with modern web technologies following 2026 best practices.

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.1.1 | React framework with App Router |
| **React** | 19.2.3 | UI library with Server Components |
| **TypeScript** | 5.9.3 | Type safety |
| **Tailwind CSS** | 4.1.18 | Utility-first CSS |
| **Node.js** | ≥24.0.0 | Runtime (LTS) |

## Project Structure

```
MineCertificate/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth route group
│   │   ├── login/
│   │   │   ├── page.tsx          # Login page (Client Component)
│   │   │   └── actions.ts        # Server Action for login
│   │   └── signup/
│   │       ├── page.tsx          # Signup page (Client Component)
│   │       ├── actions.ts        # Server Action for signup
│   │       └── success/page.tsx  # Email verification page
│   ├── api/                      # API Route Handlers (BFF)
│   │   ├── auth/                 # Auth endpoints
│   │   │   ├── login/route.ts    # POST - Login, set cookies
│   │   │   ├── logout/route.ts   # POST - Clear cookies
│   │   │   ├── refresh/route.ts  # POST - Refresh tokens
│   │   │   ├── session/route.ts  # GET - Check session
│   │   │   └── signup/route.ts   # POST - Register user
│   │   ├── proxy/[...path]/      # Hardened API proxy
│   │   │   └── route.ts          # Proxies all backend calls
│   │   └── templates/
│   │       └── with-previews/    # BFF aggregation route
│   │           └── route.ts      # Fixes N+1 pattern
│   ├── dashboard/
│   │   ├── page.tsx              # Org resolver (redirects to /org/[orgId])
│   │   ├── layout.tsx            # Passthrough layout
│   │   └── org/[orgId]/          # Organization-scoped routes
│   │       ├── layout.tsx        # Server Component - auth validation
│   │       ├── page.tsx          # Server Component - dashboard stats
│   │       ├── loading.tsx       # Streaming skeleton
│   │       ├── templates/
│   │       │   ├── page.tsx      # Templates list (Client Component)
│   │       │   └── loading.tsx   # Streaming skeleton
│   │       ├── generate-certificate/
│   │       ├── billing/
│   │       ├── certificates/
│   │       ├── imports/
│   │       ├── settings/
│   │       ├── users/
│   │       └── verification-logs/
│   ├── globals.css               # Tailwind CSS imports
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Landing page
├── src/
│   ├── components/               # Shared components
│   │   ├── dashboard/
│   │   │   └── DashboardShell.tsx # Client Component - interactive shell
│   │   ├── onboarding/
│   │   ├── templates/
│   │   └── ui/                   # shadcn/ui components
│   ├── features/                 # Feature modules
│   │   └── templates/
│   │       ├── api.ts
│   │       ├── hooks/
│   │       ├── types.ts
│   │       └── utils.ts
│   └── lib/
│       ├── api/
│       │   ├── client.ts         # Client-side API (calls /api/proxy)
│       │   └── server.ts         # Server-side API (calls backend directly)
│       ├── auth/
│       │   └── storage.ts        # Legacy cleanup + session hints
│       ├── org/
│       │   ├── context.tsx       # OrgProvider + useOrg hook
│       │   └── index.ts
│       ├── billing-ui/
│       ├── hooks/
│       ├── types/
│       └── utils/
├── proxy.ts                      # Next.js 16 proxy (auth + routing)
├── next.config.ts                # Next.js configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
├── eslint.config.mjs             # ESLint 9 flat config
└── .env.example                  # Environment variables template
```

## URL Routing Structure

```
/                                    # Landing page
/login                               # Login
/signup                              # Registration
/signup/success                      # Email verification waiting
/dashboard                           # Org resolver → redirects to /dashboard/org/[orgId]
/dashboard/org/[orgId]               # Dashboard home
/dashboard/org/[orgId]/templates     # Template management
/dashboard/org/[orgId]/generate-certificate
/dashboard/org/[orgId]/billing
/dashboard/org/[orgId]/certificates
/dashboard/org/[orgId]/imports
/dashboard/org/[orgId]/settings
/dashboard/org/[orgId]/users
/dashboard/org/[orgId]/verification-logs
```

## Authentication Architecture

### Security Model

All authentication uses **HttpOnly cookies** - tokens are never accessible via JavaScript.

```
┌─────────────────────────────────────────────────────────────────┐
│                      CLIENT (Browser)                           │
│  ┌─────────────────┐                                           │
│  │ Client Components│  No access to tokens                     │
│  │ (use client)     │  Cookies sent automatically              │
│  └────────┬────────┘                                           │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────────────────────────────────────┐           │
│  │  API Client (src/lib/api/client.ts)             │           │
│  │  - Calls /api/proxy/* only                      │           │
│  │  - credentials: 'include'                       │           │
│  └────────┬────────────────────────────────────────┘           │
└───────────│─────────────────────────────────────────────────────┘
            │ HttpOnly cookies (automatic)
            ▼
┌───────────────────────────────────────────────────────────────┐
│                    SERVER (Next.js)                           │
│  ┌─────────────────┐  ┌─────────────────────────────────────┐ │
│  │ /api/auth/*     │  │ /api/proxy/[...path]                │ │
│  │ Login/Logout    │  │ - Path allowlist validation         │ │
│  │ Set/Clear       │  │ - Method restrictions               │ │
│  │ Cookies         │  │ - Hop-by-hop header stripping       │ │
│  └────────┬────────┘  │ - 30s timeout                       │ │
│           │           │ - Sanitized errors                  │ │
│           │           └─────────────────────────────────────┘ │
│           │                        │                          │
│           ▼                        ▼                          │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              BACKEND_API_URL (server-only)              │  │
│  │          Tokens never exposed to browser                │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

### Cookie Configuration

```typescript
const COOKIE_OPTIONS = {
  httpOnly: true,                    // Not accessible via JS
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 7,         // 7 days
};
```

### Auth Flow

1. **Login**: User submits credentials → Server Action calls backend → Sets HttpOnly cookies → Redirects to `/dashboard`
2. **Session Check**: Server Component calls `isServerAuthenticated()` → Reads cookies → Validates with backend
3. **API Calls**: Client calls `/api/proxy/*` → Cookies auto-attached → Proxy forwards to backend with token
4. **Logout**: Server Action clears cookies → Redirects to `/login`

## API Architecture

### Client-Side (src/lib/api/client.ts)

- All requests go through `/api/proxy/*`
- Cookies included automatically via `credentials: 'include'`
- No direct backend URL exposure

```typescript
// Example: Fetch templates
const templates = await api.templates.list();
// Actually calls: /api/proxy/templates
```

### Server-Side (src/lib/api/server.ts)

- Direct calls to `BACKEND_API_URL`
- Reads tokens from cookies
- Used by Route Handlers and Server Components

```typescript
// Server Component example
const data = await serverApiRequest<DashboardData>("/dashboard/stats");
```

### Hardened Proxy Security

The `/api/proxy/[...path]` route implements:

| Security Measure | Implementation |
|------------------|----------------|
| Path Allowlist | Only `/auth/`, `/templates`, `/companies/`, etc. |
| Method Restriction | GET, POST, PUT, PATCH, DELETE, OPTIONS |
| Path Traversal Prevention | Blocks `..`, `%2e%2e`, `//`, `\` |
| Header Stripping | Removes hop-by-hop headers |
| Timeout | 30s with AbortController |
| Error Sanitization | No backend URL leakage |

## Server Components vs Client Components

### Server Components (default)

Used for:
- Data fetching
- Authentication validation
- Static content rendering

```typescript
// app/dashboard/org/[orgId]/page.tsx
export default async function DashboardPage({ params }) {
  const { orgId } = await params;
  const data = await serverApiRequest("/dashboard/stats");
  return <DashboardContent data={data} />;
}
```

### Client Components ("use client")

Used for:
- Interactive UI (forms, modals, dropdowns)
- Browser APIs (localStorage for theme)
- Event handlers

```typescript
// src/components/dashboard/DashboardShell.tsx
"use client";
export function DashboardShell({ children, orgId, initialUser }) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  // ...
}
```

## Organization Context

### Provider Setup

```typescript
// app/dashboard/org/[orgId]/layout.tsx (Server Component)
export default async function OrgLayout({ children, params }) {
  const { orgId } = await params;
  const { session, profile } = await getServerAuthData();
  
  // Validate org access server-side
  if (profile?.company_id !== orgId) {
    redirect(`/dashboard/org/${profile.company_id}`);
  }
  
  return (
    <DashboardShell orgId={orgId} initialUser={session.user}>
      {children}
    </DashboardShell>
  );
}
```

### Using Context

```typescript
import { useOrg } from "@/lib/org";

function MyComponent() {
  const { orgId, orgPath } = useOrg();
  
  return <Link href={orgPath("/templates")}>Templates</Link>;
}
```

## Streaming & Loading States

### Route-Level Loading

```typescript
// app/dashboard/org/[orgId]/loading.tsx
export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="h-8 w-48 bg-muted animate-pulse rounded" />
      {/* Skeleton UI */}
    </div>
  );
}
```

### Data Flow

1. User navigates to `/dashboard/org/[orgId]`
2. `loading.tsx` shows immediately (streaming)
3. Server fetches data
4. Page renders with data

## Environment Variables

### Required

```bash
# Server-only - Backend API URL
BACKEND_API_URL=https://api.yourapp.com/api/v1
```

### Cookie Names (Reference)

```
auth_access_token   # JWT access token
auth_refresh_token  # JWT refresh token
auth_expires_at     # Expiration timestamp
```

## Commands

```bash
# Development
npm run dev

# Build
npm run build

# Type checking
npm run typecheck

# Linting
npm run lint

# Start production
npm start
```

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| HttpOnly Cookies | Prevents XSS token theft |
| Server Components | Faster initial load, better SEO |
| BFF Proxy | Hides backend URL, prevents CORS |
| Org-scoped URLs | Multi-tenant support, clear context |
| Feature-based structure | Scalable code organization |
| React 19 Server Actions | Type-safe form handling |

## Dependencies

### Core

- `next`: 16.1.1
- `react` / `react-dom`: 19.2.3
- `typescript`: 5.9.3

### UI

- `tailwindcss`: 4.1.18
- `lucide-react`: Icons
- `@radix-ui/*`: Accessible primitives
- `class-variance-authority`: Component variants
- `clsx` / `tailwind-merge`: Class utilities

### Heavy Libraries (Dynamic Imports)

These are lazy-loaded to reduce bundle size:

- `pdf-lib`: PDF manipulation
- `xlsx`: Excel parsing
- `jszip`: ZIP creation
- `qrcode`: QR code generation

```typescript
// src/lib/utils/dynamic-imports.ts
export async function getPdfLib() {
  return import("pdf-lib");
}
```
