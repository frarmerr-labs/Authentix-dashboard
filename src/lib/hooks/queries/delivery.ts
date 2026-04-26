'use client';

/**
 * DELIVERY QUERY HOOKS
 *
 * Covers integrations, email templates, messages.
 * Mutations invalidate relevant query keys automatically.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { CreateDeliveryTemplateDto, CreateIntegrationDto, SendEmailDto, TestSendDto, UpdatePlatformDefaultSettingsDto, CreateSegmentDto, CreateBroadcastDto } from '@/lib/api/client';

export const deliveryKeys = {
  all: ['delivery'] as const,
  integrations: () => [...deliveryKeys.all, 'integrations'] as const,
  templates: () => [...deliveryKeys.all, 'templates'] as const,
  platformSettings: () => [...deliveryKeys.all, 'platform-settings'] as const,
  messages: (params?: Record<string, unknown>) => [...deliveryKeys.all, 'messages', params ?? {}] as const,
  messagesByJob: (jobId: string) => [...deliveryKeys.all, 'messages-by-job', jobId] as const,
  contacts: (params?: Record<string, unknown>) => [...deliveryKeys.all, 'contacts', params ?? {}] as const,
  segments: () => [...deliveryKeys.all, 'segments'] as const,
  broadcasts: () => [...deliveryKeys.all, 'broadcasts'] as const,
  emailEvents: (params?: Record<string, unknown>) => [...deliveryKeys.all, 'email-events', params ?? {}] as const,
};

// ── Integrations ──────────────────────────────────────────────────────────────

export function useDeliveryIntegrations() {
  const query = useQuery({
    queryKey: deliveryKeys.integrations(),
    queryFn: () => api.delivery.listIntegrations(),
    staleTime: 60 * 1000,
  });
  return {
    integrations: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
  };
}

export function useCreateIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateIntegrationDto) => api.delivery.createIntegration(dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: deliveryKeys.integrations() }),
  });
}

export function useUpdateIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<CreateIntegrationDto> }) =>
      api.delivery.updateIntegration(id, dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: deliveryKeys.integrations() }),
  });
}

export function useDeleteIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delivery.deleteIntegration(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: deliveryKeys.integrations() }),
  });
}

// ── Templates ─────────────────────────────────────────────────────────────────

export function useDeliveryTemplates() {
  const query = useQuery({
    queryKey: deliveryKeys.templates(),
    queryFn: () => api.delivery.listTemplates(),
    staleTime: 30 * 1000,
  });
  return {
    templates: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
  };
}

export function useCreateDeliveryTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateDeliveryTemplateDto) => api.delivery.createTemplate(dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: deliveryKeys.templates() }),
  });
}

export function useUpdateDeliveryTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<CreateDeliveryTemplateDto> }) =>
      api.delivery.updateTemplate(id, dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: deliveryKeys.templates() }),
  });
}

export function useDeleteDeliveryTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delivery.deleteTemplate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: deliveryKeys.templates() }),
  });
}

export function useDuplicateDeliveryTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delivery.duplicateTemplate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: deliveryKeys.templates() }),
  });
}

// ── Platform default settings ──────────────────────────────────────────────────

export function useDeliveryPlatformSettings() {
  return useQuery({
    queryKey: deliveryKeys.platformSettings(),
    queryFn: () => api.delivery.getPlatformDefaultSettings(),
    staleTime: 60 * 1000,
  });
}

export function useUpdateDeliveryPlatformSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdatePlatformDefaultSettingsDto) =>
      api.delivery.updatePlatformDefaultSettings(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.platformSettings() });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.integrations() });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.templates() });
    },
  });
}

// ── Send ──────────────────────────────────────────────────────────────────────

export function useSendJobEmails() {
  return useMutation({
    mutationFn: (dto: SendEmailDto) => api.delivery.sendJobEmails(dto),
  });
}

export function useTestSend() {
  return useMutation({
    mutationFn: (dto: TestSendDto) => api.delivery.testSend(dto),
  });
}

// ── Messages ──────────────────────────────────────────────────────────────────

export function useDeliveryMessages(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: deliveryKeys.messages(params as Record<string, unknown>),
    queryFn: () => api.delivery.listMessages(params),
    staleTime: 30 * 1000,
  });
}

export function useDeliveryMessagesByJob(jobId: string | null | undefined) {
  return useQuery({
    queryKey: deliveryKeys.messagesByJob(jobId ?? ''),
    queryFn: () => api.delivery.listMessagesByJob(jobId!),
    enabled: !!jobId,
    staleTime: 30 * 1000,
  });
}

// ── Contacts ──────────────────────────────────────────────────────────────────

export function useEmailContacts(params?: { limit?: number; offset?: number; search?: string; unsubscribed?: boolean }) {
  const query = useQuery({
    queryKey: deliveryKeys.contacts(params as Record<string, unknown>),
    queryFn: () => api.delivery.listContacts(params),
    staleTime: 30 * 1000,
  });
  return {
    contacts: query.data?.contacts ?? [],
    total: query.data?.total ?? 0,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
  };
}

export function useImportContacts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => api.delivery.importContacts(file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: deliveryKeys.contacts() }),
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delivery.deleteContact(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: deliveryKeys.contacts() }),
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: { unsubscribed?: boolean; first_name?: string; last_name?: string } }) =>
      api.delivery.updateContact(id, dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: deliveryKeys.contacts() }),
  });
}

// ── Segments ──────────────────────────────────────────────────────────────────

export function useEmailSegments() {
  const query = useQuery({
    queryKey: deliveryKeys.segments(),
    queryFn: () => api.delivery.listSegments(),
    staleTime: 30 * 1000,
  });
  return {
    segments: query.data?.segments ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
  };
}

export function useCreateSegment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateSegmentDto) => api.delivery.createSegment(dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: deliveryKeys.segments() }),
  });
}

export function useUpdateSegment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<CreateSegmentDto> }) =>
      api.delivery.updateSegment(id, dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: deliveryKeys.segments() }),
  });
}

export function useDeleteSegment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delivery.deleteSegment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: deliveryKeys.segments() }),
  });
}

// ── Broadcasts ────────────────────────────────────────────────────────────────

export function useEmailBroadcasts() {
  const query = useQuery({
    queryKey: deliveryKeys.broadcasts(),
    queryFn: () => api.delivery.listBroadcasts(),
    staleTime: 20 * 1000,
  });
  return {
    broadcasts: query.data?.broadcasts ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
  };
}

export function useCreateBroadcast() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateBroadcastDto) => api.delivery.createBroadcast(dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: deliveryKeys.broadcasts() }),
  });
}

export function useUpdateBroadcast() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<CreateBroadcastDto> }) =>
      api.delivery.updateBroadcast(id, dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: deliveryKeys.broadcasts() }),
  });
}

export function useSendBroadcast() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, scheduledAt }: { id: string; scheduledAt?: string }) =>
      api.delivery.sendBroadcast(id, scheduledAt),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: deliveryKeys.broadcasts() }),
  });
}

export function useDeleteBroadcast() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delivery.deleteBroadcast(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: deliveryKeys.broadcasts() }),
  });
}

// ── Email Events ──────────────────────────────────────────────────────────────

export function useEmailEvents(params?: { limit?: number; offset?: number; event_type?: string; provider?: string }) {
  return useQuery({
    queryKey: deliveryKeys.emailEvents(params as Record<string, unknown>),
    queryFn: () => api.delivery.listEmailEvents(params),
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000,
  });
}
