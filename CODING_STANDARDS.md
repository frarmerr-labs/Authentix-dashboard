# Coding Standards — Authentix Dashboard

> Established 2026-03-29. These rules reflect actual patterns already in the codebase — not aspirational. All new code must follow them.

---

## 1. State Management

### Rule: Use `useReducer` for multi-phase or multi-flag UI

Any component with 3+ related state flags must use `useReducer` or a custom hook wrapping one.

**Do:**
```typescript
const [state, dispatch] = useReducer(generateCertificateReducer, initialState);
// dispatch({ type: 'SELECT_TEMPLATE', template })
```

**Don't:**
```typescript
const [isLoading, setIsLoading] = useState(false);
const [isError, setIsError] = useState(false);
const [isSuccess, setIsSuccess] = useState(false);
```

### Rule: Encode multi-step flows as discriminated unions

Use a union type for step/phase states so impossible combinations are unrepresentable:

```typescript
type OverlayState = 'hidden' | 'generating' | 'success';
// Not: isGenerating: boolean + isSuccess: boolean + isVisible: boolean
```

### Rule: Domain reducers live in `state/` subdirectory

```
app/dashboard/org/[slug]/generate-certificate/
├── state/
│   └── generateCertificateReducer.ts   ← reducer + types + factory
├── services/
│   └── generateCertificateService.ts   ← API calls + mapping
└── schema/
    └── types.ts                         ← Zod schemas + inferred types
```

---

## 2. Data Fetching

### Rule: All server data fetching via TanStack Query

No `useEffect` + `useState` for data fetching in client components. Every read goes through a query hook.

**Do:**
```typescript
const { data, isLoading, error } = useTemplates({ sort_by: 'created_at' });
```

**Don't:**
```typescript
useEffect(() => {
  api.templates.list().then(setData).catch(setError).finally(...);
}, []);
```

### Rule: Query hooks live in `src/lib/hooks/queries/<domain>.ts`

One file per domain. Export named hooks (`useTemplates`, `useCertificates`, etc.) and a `queryKeys` object for cache invalidation.

```typescript
export const templateKeys = {
  all: ['templates'] as const,
  list: (params?: ListParams) => [...templateKeys.all, 'list', params] as const,
  detail: (id: string) => [...templateKeys.all, 'detail', id] as const,
};
```

### Rule: Mutations use `useMutation` + `queryClient.invalidateQueries`

```typescript
const mutation = useMutation({
  mutationFn: (data) => api.templates.create(data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: templateKeys.all }),
});
```

### Rule: `staleTime` defaults

| Data type | `staleTime` |
|---|---|
| Catalog (categories, subcategories) | `10 * 60 * 1000` (10 min) |
| Templates, certificates | `5 * 60 * 1000` (5 min) |
| User/org profile | `5 * 60 * 1000` |
| Billing/invoices | `2 * 60 * 1000` (2 min) |
| Real-time job status | `0` (always fresh) |

---

## 3. API Client

### Rule: All calls go through the domain API modules

```typescript
import { api } from '@/lib/api/client';

api.templates.list(params)
api.certificates.generate(body)
api.billing.getInvoice(id)
```

Never call `apiRequest()` directly from a component.

### Rule: API modules live in `src/lib/api/<domain>.ts`

Each module exports a plain object with async methods. The barrel `client.ts` re-exports them all as `api.domain.*`. No class instances.

### Rule: Server-side calls use `serverApiRequest` from `@/lib/api/server`

Components rendered as React Server Components (layouts, pages without `'use client'`) use `serverApiRequest` which forwards the auth cookie automatically.

```typescript
// In a Server Component:
const result = await serverApiRequest<MyType>('/some/endpoint');
```

---

## 4. Logging

### Rule: Never use `console.*` directly in production paths

Use the logger facade from `@/lib/logger`:

```typescript
import { logger } from '@/lib/logger';

logger.info('Certificate generation started', { templateId, rowCount });
logger.error('Generation failed', { error, jobId });
```

### Rule: Use `logger.child()` for request-scoped context

In route handlers, create a child logger with the request ID so all log lines are correlated:

```typescript
const log = logger.child({ requestId, organizationId });
log.info('Processing request');
```

### Rule: Environment-aware verbosity

- `development`: debug + info + warn + error
- `production`: info + warn + error only

Debug logs must never appear in production builds.

---

## 5. Error Handling

### Rule: Use the error taxonomy from `src/lib/errors.ts`

```typescript
import { AppError, ErrorCodes, categorizeHttpError } from '@/lib/errors';

throw new AppError(ErrorCodes.VALIDATION, 'Template ID is required');
```

Error codes: `NETWORK` · `AUTH` · `VALIDATION` · `UPSTREAM` · `TIMEOUT`

### Rule: Route handlers sanitize errors before returning to the client

Never return raw error messages or stack traces to the browser. Use `sanitizeErrorMessage()` from `@/lib/api/server`:

```typescript
catch (error) {
  return NextResponse.json({ success: false, error: sanitizeErrorMessage(error) }, { status: 500 });
}
```

### Rule: Retry policy by endpoint category

| Category | Retry allowed? | Notes |
|---|---|---|
| Idempotent reads (`GET`) | Yes | Up to 3 attempts with backoff |
| Mutations (`POST/PUT/PATCH`) | Only with idempotency key | Never retry blindly |
| Auth (`/auth/*`) | No | Single attempt; on failure → login redirect |

---

## 6. TypeScript

### Rule: No `any` in new code

Use `unknown` and narrow it, or define a proper type. `any` is a last resort for third-party interop only, and must have a comment explaining why.

```typescript
// ✅
function process(input: unknown): string {
  if (typeof input !== 'string') throw new Error('Expected string');
  return input.trim();
}

// ❌
function process(input: any): string { ... }
```

### Rule: Shared types live in `src/lib/types/`

Organization shape, API response envelopes, and shared domain types must not be redefined inline. Import from the shared type modules.

```typescript
import type { Organization } from '@/lib/types/organization';
import type { ApiResult } from '@/lib/api/result';
```

### Rule: Zod schemas at network boundaries

Any data entering the system from an external source (user input, API responses for critical paths) should be validated with a Zod schema:

```typescript
const parsed = MySchema.safeParse(data);
if (!parsed.success) throw new AppError(ErrorCodes.VALIDATION, 'Invalid data');
const safe = parsed.data;
```

---

## 7. Components

### Rule: Server Components by default, Client Components by exception

A component is a Server Component unless it needs:
- `useState`, `useReducer`, `useEffect`
- Browser APIs (`window`, `document`)
- Event handlers
- Third-party client-only libraries

Add `'use client'` only when one of the above is needed.

### Rule: Props interfaces are co-located, not exported unless shared

Define component prop types in the same file. Only export them if another file needs them.

### Rule: Heavy libraries use dynamic imports

PDF, spreadsheet, and ZIP utilities must be loaded with `next/dynamic` or `import()`. Keep the initial bundle lean.

```typescript
const PdfViewer = dynamic(() => import('@/components/PdfViewer'), { ssr: false });
```

---

## 8. Security

### Rule: No direct backend calls from browser components

All API calls from client components route through `/api/proxy/*`. The backend URL is never exposed to the browser.

### Rule: CSS variables must use `oklch()` not `hsl(var(--primary))`

For inline styles and canvas code, always use the literal hex value (e.g., `#3ECF8E`) directly — never `hsl(var(--primary))` which breaks outside the CSS cascade.

### Rule: `useEffect` with refs must reset in the effect body

React StrictMode double-mounts components. Any `useEffect` that sets a ref value must reset it in the same effect body:

```typescript
useEffect(() => {
  isMountedRef.current = true;
  return () => { isMountedRef.current = false; };
}, []);
```

---

## 9. Testing

### Rule: Unit tests for pure logic; integration tests for route handlers

- **Vitest**: unit tests for reducers, validators, utilities, API parsing
- **Playwright**: E2E tests for critical user flows (auth, generation, delivery)
- **Integration**: route handler tests using `next-test-api-route-handler` or similar — especially for `/api/auth/*` and `/api/proxy/*`

### Rule: No `vi.useFakeTimers()` in overlay/interaction tests

It deadlocks `userEvent.click()`. Use `vi.spyOn(global, 'setInterval')` instead.

### Rule: Every new feature ships with tests in the touched domain

No new endpoint, reducer action, or business-logic utility goes to main without at least one test covering the happy path.
