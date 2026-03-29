'use client';

/**
 * useBillingOverview — TanStack Query backed
 *
 * Delegates to the canonical query hook.
 * The organizationId param is kept for interface compatibility but is unused
 * (the query uses the server session's org context).
 */

import { useBillingOverview as useQueryBillingOverview } from '@/lib/hooks/queries/billing';

export function useBillingOverview(_organizationId: string) {
  return useQueryBillingOverview();
}
