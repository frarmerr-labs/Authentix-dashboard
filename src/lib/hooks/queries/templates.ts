'use client';

/**
 * TEMPLATES QUERY HOOKS
 *
 * Covers: template list, single template, recent usage, preview URLs.
 * Mutations: create, update, delete, save fields, generate preview.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export const templateKeys = {
  all: ['templates'] as const,
  list: (params?: Record<string, unknown>) => [...templateKeys.all, 'list', params ?? {}] as const,
  detail: (id: string) => [...templateKeys.all, 'detail', id] as const,
  recentUsage: () => [...templateKeys.all, 'recent-usage'] as const,
  previewUrl: (id: string) => [...templateKeys.all, 'preview-url', id] as const,
  categories: () => [...templateKeys.all, 'categories'] as const,
};

export function useTemplates(params?: {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}) {
  const query = useQuery({
    queryKey: templateKeys.list(params),
    queryFn: () => api.templates.list(params),
    staleTime: 30 * 1000,
  });

  return {
    templates: (query.data as { items?: unknown[] } | undefined)?.items ?? [],
    pagination: (query.data as { pagination?: unknown } | undefined)?.pagination,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
  };
}

export function useTemplate(id: string | null | undefined) {
  return useQuery({
    queryKey: templateKeys.detail(id ?? ''),
    queryFn: () => api.templates.get(id!),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}

export function useTemplateRecentUsage(limit?: number) {
  return useQuery({
    queryKey: templateKeys.recentUsage(),
    queryFn: () => api.templates.getRecentUsage(limit),
    staleTime: 60 * 1000,
  });
}

export function useTemplatePreviewUrl(id: string | null | undefined) {
  return useQuery({
    queryKey: templateKeys.previewUrl(id ?? ''),
    queryFn: () => api.templates.getPreviewUrl(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useTemplateCategories() {
  return useQuery({
    queryKey: templateKeys.categories(),
    queryFn: () => api.templates.getCategories(),
    staleTime: 5 * 60 * 1000,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.templates.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: {
      id: string;
      updates: { name?: string; description?: string; width?: number; height?: number };
    }) => api.templates.update(id, updates),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: templateKeys.all });
    },
  });
}

export function useGenerateTemplatePreview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, versionId }: { templateId: string; versionId: string }) =>
      api.templates.generatePreview(templateId, versionId),
    onSuccess: (_data, { templateId }) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.previewUrl(templateId) });
    },
  });
}
