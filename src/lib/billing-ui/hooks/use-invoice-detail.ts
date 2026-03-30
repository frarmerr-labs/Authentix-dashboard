'use client';

/**
 * useInvoiceDetail — delegates to the canonical useInvoice hook.
 * @deprecated Use useInvoice from @/lib/hooks/queries/billing directly.
 */

import { useInvoice } from '@/lib/hooks/queries/billing';

export function useInvoiceDetail(invoiceId: string) {
  const { invoice, lineItems, loading, error } = useInvoice(invoiceId);

  return {
    invoice: invoice ? { ...invoice, line_items: lineItems } : null,
    loading,
    error,
    refresh: () => {},
  };
}
