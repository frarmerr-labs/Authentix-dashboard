'use client';

/**
 * BILLING QUERY HOOKS
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export const billingKeys = {
  all: ['billing'] as const,
  overview: () => [...billingKeys.all, 'overview'] as const,
  invoices: (params?: Record<string, unknown>) => [...billingKeys.all, 'invoices', params ?? {}] as const,
  invoice: (id: string) => [...billingKeys.all, 'invoice', id] as const,
  paymentMethods: () => [...billingKeys.all, 'payment-methods'] as const,
};

export function useBillingOverview() {
  const query = useQuery({
    queryKey: billingKeys.overview(),
    queryFn: () => api.billing.getOverview(),
    staleTime: 60 * 1000,
  });

  return {
    overview: query.data ?? null,
    priceBook: query.data?.price_book ?? null,
    usage: query.data?.current_usage ?? null,
    recentInvoices: query.data?.recent_invoices ?? [],
    totalOutstandingPaise: query.data?.total_outstanding_paise ?? 0,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refresh: () => query.refetch(),
  };
}

export function useInvoiceList(params?: {
  page?: number;
  limit?: number;
  status?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}) {
  const query = useQuery({
    queryKey: billingKeys.invoices(params as Record<string, unknown>),
    queryFn: () => api.billing.listInvoices(params),
    staleTime: 60 * 1000,
  });

  return {
    invoices: query.data?.items ?? [],
    pagination: query.data?.pagination,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
  };
}

export function useInvoice(id: string | null | undefined) {
  const query = useQuery({
    queryKey: billingKeys.invoice(id ?? ''),
    queryFn: () => api.billing.getInvoice(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  return {
    invoice: query.data?.invoice ?? null,
    lineItems: query.data?.line_items ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
  };
}

export function useCreatePaymentOrder() {
  return useMutation({
    mutationFn: (invoiceId: string) => api.billing.createPaymentOrder(invoiceId),
  });
}

export function useVerifyPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.billing.verifyPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.all });
    },
  });
}

export function usePaymentMethods() {
  const query = useQuery({
    queryKey: billingKeys.paymentMethods(),
    queryFn: () => api.billing.listPaymentMethods(),
    staleTime: 60 * 1000,
  });

  return {
    methods: query.data?.methods ?? [],
    autopayEnabled: query.data?.autopay_enabled ?? false,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refresh: () => query.refetch(),
  };
}

export function useDeletePaymentMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.billing.deletePaymentMethod(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.paymentMethods() });
    },
  });
}

export function useSetAutopay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) => api.billing.setAutopay(enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.paymentMethods() });
    },
  });
}

export function useGenerateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params?: { period_start?: string; period_end?: string }) =>
      api.billing.generateInvoice(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.all });
    },
  });
}
