# Frontend Architecture & Documentation

## Overview

The Authentix frontend is a Next.js 16 application built with React 19, TypeScript 5.9, and Tailwind CSS 4. It serves as a pure UI layer that communicates exclusively with the backend API through a secure BFF (Backend For Frontend) proxy pattern. All business logic, database operations, and external service integrations are handled by the dedicated backend.

**Last Updated**: January 2026

## Tech Stack

### Core Framework
-    
- **Node.js**: >=24.0.0 (LTS)

### UI & Styling
- **Tailwind CSS**: 4.1.18 (CSS-first configuration)
- **shadcn/ui**: Component library (Radix UI primitives)
- **lucide-react**: 0.562.0 (Icons)
- **class-variance-authority**: 0.7.1 (Component variants)
- **tailwind-merge**: 3.4.0 (Class merging)
- **tailwindcss-animate**: 1.0.7 (Animations)

### Authentication & Security
- **HttpOnly Cookies**: Secure token storage (no localStorage)
- **BFF Proxy Pattern**: All API calls proxied through Next.js Route Handlers
- **Server Actions**: React 19 form handling pattern
- **Security Headers**: CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy

### Data & State Management
- **No state management library**: Uses React hooks (useState, useActionState, useFormStatus)
- **Server Components**: Default for data fetching
- **Client Components**: Only for interactive UI (leaf components)
- **API Proxy**: Centralized proxy in `/api/proxy/[...path]`

### File Processing (Dynamic Imports)
- **pdf-lib**: 1.17.1 (PDF manipulation) - *dynamically imported*
- **react-pdf**: 10.3.0 (PDF rendering) - *dynamically imported*
- **xlsx**: 0.18.5 (Excel file parsing) - *dynamically imported*
- **jszip**: 3.10.1 (ZIP file creation) - *dynamically imported*
- **csv-stringify**: 6.6.0 (CSV generation) - *dynamically imported*
- **qrcode**: 1.5.4 (QR code generation) - *dynamically imported*

### Utilities
- **date-fns**: 4.1.0 (Date formatting)
- **date-fns-tz**: 3.2.0 (Timezone handling)
- **uuid**: 13.0.0 (ID generation)
- **react-colorful**: 5.6.1 (Color picker)
- **react-dropzone**: 14.3.8 (File uploads)
- **react-resizable**: 3.1.3 (Resizable components)
- **@dnd-kit/core**: 6.3.1 (Drag and drop)

## Project Structure

```
MineCertificate/
├── app/                              # Next.js App Router pages
│   ├── (auth)/                       # Auth route group
│   │   ├── login/
│   │   │   ├── page.tsx              # Login page (Server Actions)
│   │   │   └── actions.ts            # Login Server Action
│   │   └── signup/
│   │       ├── page.tsx              # Signup page (Server Actions)
│   │       ├── actions.ts            # Signup Server Action
│   │       └── success/
│   │           └── page.tsx          # Email verification waiting
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
│   │   ├── layout.tsx                # Dashboard layout with sidebar
│   │   ├── page.tsx                  # Dashboard home (stats)
│   │   ├── loading.tsx               # Suspense loading UI
│   │   ├── error.tsx                 # Error boundary UI
│   │   ├── templates/
│   │   │   ├── page.tsx              # Template management
│   │   │   └── loading.tsx           # Loading UI
│   │   ├── generate-certificate/
│   │   │   ├── page.tsx              # Certificate generation tool
│   │   │   ├── loading.tsx           # Loading UI
│   │   │   └── components/           # Generation tool components
│   │   ├── imports/
│   │   │   └── page.tsx              # Data import management
│   │   ├── certificates/
│   │   │   └── page.tsx              # Certificate listing
│   │   ├── billing/
│   │   │   ├── page.tsx              # Billing overview
│   │   │   ├── invoices/[id]/
│   │   │   │   └── page.tsx          # Invoice detail
│   │   │   └── components/           # Billing components
│   │   ├── company/
│   │   │   └── page.tsx              # Company profile
│   │   ├── settings/
│   │   │   ├── page.tsx              # General settings
│   │   │   └── api/
│   │   │       └── page.tsx          # API key management
│   │   ├── users/
│   │   │   └── page.tsx              # User management
│   │   └── verification-logs/
│   │       └── page.tsx              # Verification history
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Landing/home page
│   └── globals.css                   # Global styles (Tailwind v4)
├── src/                              # Source code (consolidated)
│   ├── components/                   # Reusable components
│   │   ├── ui/                       # shadcn/ui components
│   │   ├── templates/
│   │   │   └── TemplateUploadDialog.tsx
│   │   └── onboarding/
│   │       └── OnboardingModal.tsx
│   ├── features/                     # Feature-based modules
│   │   └── templates/                # Templates domain
│   │       ├── api.ts                # Templates API client
│   │       ├── types.ts              # TypeScript types
│   │       ├── utils.ts              # Utility functions
│   │       ├── index.ts              # Barrel export
│   │       └── hooks/
│   │           └── use-templates.ts  # Templates hook
│   └── lib/                          # Utilities and helpers
│       ├── api/
│       │   ├── client.ts             # Client API (uses proxy)
│       │   └── server.ts             # Server API utilities
│       ├── auth/
│       │   └── storage.ts            # Auth helpers (deprecated)
│       ├── hooks/
│       │   └── use-certificate-categories.ts
│       ├── billing-ui/
│       │   ├── hooks/                # Billing hooks
│       │   ├── types.ts
│       │   └── utils/                # Billing utilities
│       ├── types/
│       │   └── certificate.ts        # TypeScript types
│       └── utils/
│           ├── index.ts              # General utilities
│           └── dynamic-imports.ts    # Heavy library imports
├── next.config.ts                    # Next.js configuration
├── tailwind.config.ts                # Tailwind configuration
├── tsconfig.json                     # TypeScript configuration
├── postcss.config.mjs                # PostCSS configuration
└── architecture-design/              # Documentation
```

## Architecture Patterns

### 1. BFF (Backend For Frontend) Proxy Pattern

All API requests from the client go through Next.js Route Handlers to avoid CORS issues and hide backend URLs:

```
Client → /api/proxy/* → Next.js Route Handler → Backend API
```

**Benefits**:
- No CORS issues (backend calls happen server-side)
- Backend URL hidden from client
- HttpOnly cookies attached automatically
- Centralized error handling and logging

### 2. Cookie-Based Authentication

**Before (insecure)**:
```typescript
// ❌ OLD: Tokens in localStorage (vulnerable to XSS)
localStorage.setItem('access_token', token);
```

**After (secure)**:
```typescript
// ✅ NEW: HttpOnly cookies (not accessible via JavaScript)
// Set by server in Route Handlers
cookies().set('auth_access_token', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
});
```

### 3. React 19 Server Actions

**Before (old pattern)**:
```typescript
// ❌ OLD: Client-side form handling
const handleLogin = async (e: React.FormEvent) => {
  setLoading(true);
  try {
    await api.auth.login(email, password);
  } catch (err) { ... }
};
```

**After (React 19 pattern)**:
```typescript
// ✅ NEW: Server Action
"use server";
export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  // Server-side validation & auth
  redirect("/dashboard");
}

// Client component
const [state, formAction] = useActionState(loginAction, initialState);
<form action={formAction}>...</form>
```

### 4. Dynamic Imports for Heavy Libraries

Heavy libraries are dynamically imported to reduce initial bundle size:

```typescript
// src/lib/utils/dynamic-imports.ts
export async function getPdfLib() {
  return import('pdf-lib');
}

export async function getXlsx() {
  return import('xlsx');
}

// Usage in components
const { PDFDocument } = await getPdfLib();
```

### 5. Feature-Based Folder Structure

Domain-specific code organized by feature:

```
src/features/templates/
├── api.ts          # API client functions
├── types.ts        # TypeScript types with const assertions
├── utils.ts        # Utility functions
├── hooks/
│   └── use-templates.ts
└── index.ts        # Barrel export
```

### 6. TypeScript 5.9 Patterns

**Const Assertions**:
```typescript
export const TEMPLATE_STATUSES = ["draft", "active", "archived"] as const;
export type TemplateStatus = (typeof TEMPLATE_STATUSES)[number];
```

**Satisfies Operator**:
```typescript
export const DEFAULT_TEMPLATE_STATUS = "draft" satisfies TemplateStatus;
```

**Type Guards**:
```typescript
export function isTemplateStatus(value: unknown): value is TemplateStatus {
  return typeof value === "string" && TEMPLATE_STATUSES.includes(value as TemplateStatus);
}
```

**Discriminated Unions**:
```typescript
export type CertificateField =
  | TextCertificateField
  | DateCertificateField
  | QRCodeCertificateField;
```

## Security Implementation

### Security Headers (next.config.ts)

```typescript
headers: [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "frame-src 'self' blob:",
      "connect-src 'self' https:",
    ].join("; "),
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
]
```

### Authentication Flow

1. User submits credentials via Server Action
2. Server Action calls backend auth endpoint
3. Backend validates and returns tokens
4. Route Handler sets HttpOnly cookies
5. User redirected to dashboard
6. Subsequent requests include cookies automatically
7. API proxy reads cookies and attaches to backend requests

## API Route Handlers

### Auth Routes (`/api/auth/*`)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/login` | POST | User login, sets HttpOnly cookies |
| `/api/auth/logout` | POST | Clears auth cookies |
| `/api/auth/signup` | POST | User registration |
| `/api/auth/session` | GET | Verify current session |
| `/api/auth/refresh` | POST | Refresh access token |

### Proxy Route (`/api/proxy/[...path]`)

Catches all other API requests and proxies to backend:

```
/api/proxy/companies/me → Backend: /api/v1/companies/me
/api/proxy/templates    → Backend: /api/v1/templates
```

## Client API Structure

### API Client (`src/lib/api/client.ts`)

Uses proxy endpoint for all requests:

```typescript
const API_BASE_URL = "/api/proxy";

async function apiRequest<T>(endpoint: string, options?: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: "include", // Include cookies
  });
  // ...
}
```

### API Domains

```typescript
api.auth.login(email, password)        // → /api/auth/login
api.auth.signup(...)                   // → /api/auth/signup
api.auth.logout()                      // → /api/auth/logout

api.templates.list(params?)            // → /api/proxy/templates
api.templates.get(id)                  // → /api/proxy/templates/:id
api.templates.create(file, metadata)   // → /api/proxy/templates
api.templates.update(id, updates)      // → /api/proxy/templates/:id
api.templates.delete(id)               // → /api/proxy/templates/:id

api.companies.get()                    // → /api/proxy/companies/me
api.companies.update(data)             // → /api/proxy/companies/me

api.certificates.generate(params)      // → /api/proxy/certificates/generate

api.imports.list(params?)              // → /api/proxy/import-jobs
api.imports.create(file, metadata)     // → /api/proxy/import-jobs

api.billing.getOverview()              // → /api/proxy/billing/overview
api.billing.listInvoices()             // → /api/proxy/billing/invoices

api.dashboard.getStats()               // → /api/proxy/dashboard/stats
```

## Suspense & Error Boundaries

### Loading States (`loading.tsx`)

```typescript
// app/dashboard/loading.tsx
export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-8 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

### Error Boundaries (`error.tsx`)

```typescript
// app/dashboard/error.tsx
"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <h2 className="text-lg font-semibold">Something went wrong!</h2>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
```

## Hydration Mismatch Prevention

For components using Radix UI (which generates random IDs):

```typescript
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);

// In JSX:
{mounted ? (
  <DropdownMenu>...</DropdownMenu>
) : (
  <Skeleton />
)}
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL (for server-side) | `https://api.example.com/api/v1` |
| `BACKEND_API_URL` | Backend URL (server-only) | `https://api.example.com/api/v1` |

**Note**: Client-side code uses `/api/proxy` (no environment variable needed).

## Build & Development

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Type Checking
```bash
npm run typecheck
```

### Linting
```bash
npm run lint
```

## Key Design Patterns

| Pattern | Description |
|---------|-------------|
| **BFF Proxy** | All API calls through Next.js Route Handlers |
| **HttpOnly Cookies** | Secure token storage (not accessible via JS) |
| **Server Actions** | React 19 form handling pattern |
| **Server Components** | Default for data fetching |
| **Client Components** | Only for interactive UI (`"use client"`) |
| **Dynamic Imports** | Heavy libraries loaded on demand |
| **Feature Modules** | Domain-specific code organization |
| **Type Safety** | Full TypeScript with strict mode |
| **Suspense Boundaries** | Loading states with `loading.tsx` |
| **Error Boundaries** | Error handling with `error.tsx` |

## Migration Notes (from v15 to v16)

### Breaking Changes Applied

1. **Next.js 16**: Removed deprecated `eslint` config from `next.config.ts`
2. **React 19**: Updated to `useActionState` (renamed from `useFormState`)
3. **Tailwind CSS 4**: CSS-first configuration in `globals.css`
4. **Authentication**: Migrated from localStorage to HttpOnly cookies
5. **API Client**: Changed from direct backend calls to proxy pattern

### Deprecated (Do Not Use)

```typescript
// ❌ DEPRECATED: localStorage token functions
import { setAuthTokens, getAccessToken } from '@/lib/auth/storage';

// ✅ USE INSTEAD: Cookie-based auth via Route Handlers
// Tokens are managed server-side automatically
```

## Important Notes

- **No Direct Backend Access**: Client never calls backend directly
- **No localStorage Tokens**: All auth tokens in HttpOnly cookies
- **No Business Logic**: All business logic in backend
- **Stateless Components**: State managed via React hooks
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Accessibility**: Radix UI components are accessible by default
- **Bundle Optimization**: Heavy libraries dynamically imported
