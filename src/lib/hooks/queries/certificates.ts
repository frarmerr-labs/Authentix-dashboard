'use client';

/**
 * CERTIFICATES QUERY HOOKS
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export const certificateKeys = {
  all: ['certificates'] as const,
  list: (params?: Record<string, unknown>) => [...certificateKeys.all, 'list', params ?? {}] as const,
  detail: (id: string) => [...certificateKeys.all, 'detail', id] as const,
  downloadUrl: (id: string) => [...certificateKeys.all, 'download-url', id] as const,
};

export function useCertificates(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'issued' | 'revoked' | 'expired';
  category_id?: string;
  subcategory_id?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}) {
  const query = useQuery({
    queryKey: certificateKeys.list(params as Record<string, unknown>),
    queryFn: () => api.certificates.list(params),
    staleTime: 30 * 1000,
  });

  return {
    certificates: query.data?.items ?? [],
    pagination: query.data?.pagination,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
  };
}

export function useCertificate(id: string | null | undefined) {
  return useQuery({
    queryKey: certificateKeys.detail(id ?? ''),
    queryFn: () => api.certificates.get(id!),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}

export function useCertificateDownloadUrl(id: string | null | undefined) {
  return useQuery({
    queryKey: certificateKeys.downloadUrl(id ?? ''),
    queryFn: () => api.certificates.getDownloadUrl(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
