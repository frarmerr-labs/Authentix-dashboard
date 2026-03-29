'use client';

/**
 * ORGANIZATIONS QUERY HOOKS
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export const organizationKeys = {
  all: ['organizations'] as const,
  me: () => [...organizationKeys.all, 'me'] as const,
  apiSettings: () => [...organizationKeys.all, 'api-settings'] as const,
};

export function useOrganization() {
  const query = useQuery({
    queryKey: organizationKeys.me(),
    queryFn: () => api.organizations.get(),
    staleTime: 60 * 1000,
  });
  return {
    organization: query.data ?? null,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
  };
}

export function useOrganizationAPISettings() {
  const query = useQuery({
    queryKey: organizationKeys.apiSettings(),
    queryFn: () => api.organizations.getAPISettings(),
    staleTime: 60 * 1000,
  });
  return {
    settings: query.data ?? null,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
  };
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, logoFile }: {
      data: Parameters<typeof api.organizations.update>[0];
      logoFile?: File;
    }) => api.organizations.update(data, logoFile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.me() });
    },
  });
}

export function useRotateAPIKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.organizations.rotateAPIKey(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.apiSettings() });
    },
  });
}

export function useBootstrapIdentity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.organizations.bootstrapIdentity(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.apiSettings() });
    },
  });
}

export function useUpdateAPIEnabled() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) => api.organizations.updateAPIEnabled(enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.apiSettings() });
    },
  });
}
