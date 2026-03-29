'use client';

/**
 * DELIVERY QUERY HOOKS
 *
 * Covers integrations, email templates, messages.
 * Mutations invalidate relevant query keys automatically.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { CreateDeliveryTemplateDto, CreateIntegrationDto, SendEmailDto, TestSendDto, UpdatePlatformDefaultSettingsDto } from '@/lib/api/client';

export const deliveryKeys = {
  all: ['delivery'] as const,
  integrations: () => [...deliveryKeys.all, 'integrations'] as const,
  templates: () => [...deliveryKeys.all, 'templates'] as const,
  platformSettings: () => [...deliveryKeys.all, 'platform-settings'] as const,
  messages: (params?: Record<string, unknown>) => [...deliveryKeys.all, 'messages', params ?? {}] as const,
  messagesByJob: (jobId: string) => [...deliveryKeys.all, 'messages-by-job', jobId] as const,
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
