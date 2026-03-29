'use client';

/**
 * IMPORTS QUERY HOOKS
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export const importKeys = {
  all: ['imports'] as const,
  list: (params?: Record<string, unknown>) => [...importKeys.all, 'list', params ?? {}] as const,
  detail: (id: string) => [...importKeys.all, 'detail', id] as const,
  data: (id: string, params?: Record<string, unknown>) => [...importKeys.all, 'data', id, params ?? {}] as const,
};

export function useImports(params?: {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}) {
  const query = useQuery({
    queryKey: importKeys.list(params as Record<string, unknown>),
    queryFn: () => api.imports.list(params),
    staleTime: 30 * 1000,
  });

  return {
    imports: query.data?.items ?? [],
    pagination: query.data?.pagination,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
  };
}

export function useImportJob(id: string | null | undefined) {
  return useQuery({
    queryKey: importKeys.detail(id ?? ''),
    queryFn: () => api.imports.get(id!),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

export function useImportData(id: string | null | undefined, params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: importKeys.data(id ?? '', params as Record<string, unknown>),
    queryFn: () => api.imports.getData(id!, params),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}

export function useCreateImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, metadata }: {
      file: File;
      metadata: {
        file_name: string;
        certificate_category?: string;
        certificate_subcategory?: string;
        certificate_template_id?: string;
        reusable?: boolean;
      };
    }) => api.imports.create(file, metadata),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: importKeys.all });
    },
  });
}
