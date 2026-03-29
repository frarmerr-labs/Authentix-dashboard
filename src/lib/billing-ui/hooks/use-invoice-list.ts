'use client';

/**
 * useInvoiceList — TanStack Query backed
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { Invoice } from '../types';
import { billingKeys } from '@/lib/hooks/queries/billing';

export function useInvoiceList(_organizationId: string) {
  const query = useQuery({
    queryKey: billingKeys.invoices({ sort_by: 'period_end', sort_order: 'desc' }),
    queryFn: () => api.billing.listInvoices({ sort_by: 'period_end', sort_order: 'desc' }),
    staleTime: 60 * 1000,
  });

  return {
    invoices: ((query.data as { items?: unknown[] } | undefined)?.items ?? []) as Invoice[],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refresh: () => query.refetch(),
  };
}
