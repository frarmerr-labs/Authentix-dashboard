/**
 * DELIVERY SETTINGS — DOMAIN TYPES
 */

import type { DeliveryIntegration } from "@/lib/api/client";

export type DeliveryProvider = "ses" | "smtp";

export interface IntegrationFormData {
  provider: DeliveryProvider;
  from_email: string;
  from_name: string;
  reply_to: string;
  display_name: string;
  is_default: boolean;
  smtp_host?: string;
  smtp_port?: number;
  smtp_secure?: boolean;
  smtp_user?: string;
  smtp_password?: string;
}

// ── Page state ────────────────────────────────────────────────────────────────

export interface DeliverySettingsState {
  // Integrations list
  integrations: DeliveryIntegration[];
  loading: boolean;
  error: string;

  // Form visibility
  showAddForm: boolean;
  editingId: string | null;
  saving: boolean;

  // In-flight operation tracking
  togglingId: string | null;
  deletingId: string | null;

  // Platform default (localStorage-backed; will move to backend in Wave 3)
  defaultSenderName: string;
  editingDefaultName: boolean;
  defaultNameDraft: string;
  platformDefaultEnabled: boolean;
}

export function createInitialDeliveryState(): DeliverySettingsState {
  return {
    integrations: [],
    loading: true,
    error: "",
    showAddForm: false,
    editingId: null,
    saving: false,
    togglingId: null,
    deletingId: null,
    defaultSenderName: "Authentix",
    editingDefaultName: false,
    defaultNameDraft: "Authentix",
    platformDefaultEnabled: true,
  };
}
