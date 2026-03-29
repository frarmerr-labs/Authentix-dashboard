'use client';

/**
 * USERS QUERY HOOKS
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export const userKeys = {
  all: ['users'] as const,
  me: () => [...userKeys.all, 'me'] as const,
};

export function useUserProfile() {
  const query = useQuery({
    queryKey: userKeys.me(),
    queryFn: () => api.users.getProfile(),
    staleTime: 60 * 1000,
  });
  return {
    profile: query.data ?? null,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
  };
}

export function useUpdateUserProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, avatarFile }: { data: { full_name?: string }; avatarFile?: File }) =>
      api.users.updateProfile(data, avatarFile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.me() });
    },
  });
}
