/**
 * BILLING — DOMAIN TYPES
 *
 * Canonical type definitions for the billing domain.
 * These extend/replace the inline types scattered across billing components.
 */

// ── Billing overview ──────────────────────────────────────────────────────────

export interface BillingUsage {
  certificate_count: number;
  platform_fee: number;
  usage_cost: number;
  subtotal: number;
  gst_rate: number;
  gst_amount: number;
  estimated_total: number;
  currency: string;
}

export interface BillingProfile {
  certificate_unit_price: number;
  currency: string;
  gst_number?: string | null;
  billing_email?: string | null;
}

export interface BillingPeriod {
  start: Date;
  end: Date;
  label: string;
}

// ── Invoice ───────────────────────────────────────────────────────────────────

export type InvoiceStatus = "draft" | "pending" | "paid" | "overdue" | "cancelled";

export interface Invoice {
  id: string;
  invoice_number: string;
  status: InvoiceStatus;
  amount: number;
  currency: string;
  issued_at: string;
  due_at: string | null;
  paid_at: string | null;
  payment_link?: string | null;
  organization_id: string;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface InvoiceWithLineItems extends Invoice {
  line_items: InvoiceLineItem[];
}

// ── Page state ────────────────────────────────────────────────────────────────

export interface BillingPageState {
  organizationId: string | null;
  organizationName: string | null;
  loading: boolean;
  error: string | null;
}

export function createInitialBillingState(): BillingPageState {
  return {
    organizationId: null,
    organizationName: null,
    loading: true,
    error: null,
  };
}
