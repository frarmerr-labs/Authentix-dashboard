'use client';

/**
 * DASHBOARD QUERY HOOKS
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
};

export function useDashboardStats() {
  const query = useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: () => api.dashboard.getStats(),
    staleTime: 60 * 1000,
  });
  return {
    stats: query.data?.stats ?? null,
    recentImports: query.data?.recentImports ?? [],
    recentVerifications: query.data?.recentVerifications ?? [],
    certificatesDaily: query.data?.certificatesDaily ?? [],
    certificateCategoryMix: query.data?.certificateCategoryMix ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
  };
}
