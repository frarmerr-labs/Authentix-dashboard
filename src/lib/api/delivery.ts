/**
 * DELIVERY DOMAIN API
 *
 * Email delivery integrations, templates, sending, and message history.
 */

import { apiRequest } from "./core";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DeliveryIntegration {
  id: string;
  organization_id: string;
  channel: "email" | "whatsapp";
  provider: string;
  display_name: string;
  is_default: boolean;
  is_active: boolean;
  from_email: string | null;
  from_name: string | null;
  reply_to: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DeliveryTemplate {
  id: string;
  organization_id: string;
  channel: "email" | "whatsapp";
  name: string;
  is_default: boolean;
  is_active: boolean;
  email_subject: string | null;
  body: string;
  variables: string[];
  created_at: string;
  updated_at: string;
}

export interface DeliveryMessage {
  id: string;
  organization_id: string;
  generation_job_id: string | null;
  recipient_id: string | null;
  channel: string;
  to_email: string | null;
  provider: string;
  status: "queued" | "sent" | "delivered" | "read" | "failed";
  provider_message_id: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
}

export type DeliveryProviderType =
  | "ses"               // Authentix platform SES (legacy / no config needed)
  | "aws_ses"           // Customer-provided AWS SES credentials
  | "resend"            // Resend API key
  | "smtp"              // Custom SMTP
  | "google_workspace"  // Google Workspace App Password (smtp.gmail.com)
  | "microsoft_365";    // Microsoft 365 App Password (smtp.office365.com)

export interface CreateIntegrationDto {
  channel: "email";
  provider: DeliveryProviderType;
  display_name: string;
  is_default?: boolean;
  is_active?: boolean;
  from_email?: string;
  from_name?: string;
  reply_to?: string;
  // Resend
  email_api_key?: string;
  // SMTP / Google Workspace / Microsoft 365
  smtp_host?: string;
  smtp_port?: number;
  smtp_secure?: boolean;
  smtp_user?: string;
  smtp_password?: string;
  // AWS SES (customer-provided)
  aws_access_key_id?: string;
  aws_region?: string;
  aws_secret_access_key?: string;
}

export interface CreateDeliveryTemplateDto {
  channel: "email";
  name: string;
  is_default?: boolean;
  is_active?: boolean;
  email_subject?: string;
  body: string;
  variables?: string[];
}

export interface SendEmailDto {
  generation_job_id: string;
  integration_id?: string;
  template_id?: string;
  subject_override?: string;
  from_name_override?: string;
  use_platform_default?: boolean;
}

export interface TestSendDto {
  test_email: string;
  template_id?: string;
  integration_id?: string;
  subject_override?: string;
  from_name_override?: string;
  use_platform_default?: boolean;
}

export interface SendResult {
  total: number;
  sent: number;
  failed: number;
  messages: Array<{
    message_id: string;
    recipient_id: string;
    to_email: string;
    status: "sent" | "failed";
    error?: string;
  }>;
}

export interface PlatformDefaultSettings {
  default_integration_id: string | null;
  default_template_id: string | null;
  default_integration: DeliveryIntegration | null;
  default_template: DeliveryTemplate | null;
}

export interface UpdatePlatformDefaultSettingsDto {
  default_integration_id?: string | null;
  default_template_id?: string | null;
}

// ── API ───────────────────────────────────────────────────────────────────────

export const deliveryApi = {
  // ── Integrations ────────────────────────────────────────────────────────────

  listIntegrations: async (): Promise<DeliveryIntegration[]> => {
    const response = await apiRequest<{ integrations: DeliveryIntegration[] }>(
      "/delivery/integrations",
    );
    return response.data!.integrations;
  },

  createIntegration: async (dto: CreateIntegrationDto): Promise<DeliveryIntegration> => {
    const response = await apiRequest<{ integration: DeliveryIntegration }>(
      "/delivery/integrations",
      { method: "POST", body: JSON.stringify(dto) },
    );
    return response.data!.integration;
  },

  updateIntegration: async (
    id: string,
    dto: Partial<CreateIntegrationDto>,
  ): Promise<DeliveryIntegration> => {
    const response = await apiRequest<{ integration: DeliveryIntegration }>(
      `/delivery/integrations/${id}`,
      { method: "PUT", body: JSON.stringify(dto) },
    );
    return response.data!.integration;
  },

  deleteIntegration: async (id: string): Promise<void> => {
    await apiRequest(`/delivery/integrations/${id}`, { method: "DELETE" });
  },

  // ── Templates ───────────────────────────────────────────────────────────────

  listTemplates: async (): Promise<DeliveryTemplate[]> => {
    const response = await apiRequest<{ templates: DeliveryTemplate[] }>("/delivery/templates");
    return response.data!.templates;
  },

  createTemplate: async (dto: CreateDeliveryTemplateDto): Promise<DeliveryTemplate> => {
    const response = await apiRequest<{ template: DeliveryTemplate }>("/delivery/templates", {
      method: "POST",
      body: JSON.stringify(dto),
    });
    return response.data!.template;
  },

  updateTemplate: async (
    id: string,
    dto: Partial<CreateDeliveryTemplateDto>,
  ): Promise<DeliveryTemplate> => {
    const response = await apiRequest<{ template: DeliveryTemplate }>(
      `/delivery/templates/${id}`,
      { method: "PUT", body: JSON.stringify(dto) },
    );
    return response.data!.template;
  },

  deleteTemplate: async (id: string): Promise<void> => {
    await apiRequest(`/delivery/templates/${id}`, { method: "DELETE" });
  },

  duplicateTemplate: async (id: string): Promise<DeliveryTemplate> => {
    const response = await apiRequest<{ template: DeliveryTemplate }>(
      `/delivery/templates/${id}/duplicate`,
      { method: "POST" },
    );
    return response.data!.template;
  },

  // ── Platform default settings ────────────────────────────────────────────

  getPlatformDefaultSettings: async (): Promise<PlatformDefaultSettings> => {
    const response = await apiRequest<PlatformDefaultSettings>(
      "/delivery/platform-default-settings",
    );
    return response.data!;
  },

  updatePlatformDefaultSettings: async (
    dto: UpdatePlatformDefaultSettingsDto,
  ): Promise<PlatformDefaultSettings> => {
    const response = await apiRequest<PlatformDefaultSettings>(
      "/delivery/platform-default-settings",
      { method: "PUT", body: JSON.stringify(dto) },
    );
    return response.data!;
  },

  // ── Send ────────────────────────────────────────────────────────────────────

  sendJobEmails: async (dto: SendEmailDto): Promise<SendResult> => {
    const response = await apiRequest<SendResult>("/delivery/send", {
      method: "POST",
      body: JSON.stringify(dto),
    });
    return response.data!;
  },

  testSend: async (dto: TestSendDto): Promise<{ sent: boolean; to_email: string }> => {
    const response = await apiRequest<{ sent: boolean; to_email: string }>("/delivery/test-send", {
      method: "POST",
      body: JSON.stringify(dto),
    });
    return response.data!;
  },

  // ── Messages ────────────────────────────────────────────────────────────────

  listMessages: async (
    params?: { limit?: number; offset?: number },
  ): Promise<{ data: DeliveryMessage[]; count: number }> => {
    const qs = params ? `?limit=${params.limit ?? 20}&offset=${params.offset ?? 0}` : "";
    const response = await apiRequest<{ data: DeliveryMessage[]; count: number }>(
      `/delivery/messages${qs}`,
    );
    return response.data!;
  },

  listMessagesByJob: async (jobId: string): Promise<{ messages: DeliveryMessage[] }> => {
    const response = await apiRequest<{ messages: DeliveryMessage[] }>(
      `/delivery/messages/job/${jobId}`,
    );
    return response.data!;
  },
};
