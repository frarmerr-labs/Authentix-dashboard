/**
 * BILLING DOMAIN API
 *
 * Billing overview, invoice listing, and Razorpay payment flow.
 */

import { apiRequest, buildQueryString, PaginatedResponse } from "./core";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BillingPriceBook {
  id: string;
  name: string;
  platform_fee_monthly: number;   // rupees
  per_certificate_fee: number;    // rupees
  gst_rate_percent: number;       // e.g. 18
  currency: string;
}

export interface BillingUsage {
  certificate_count: number;
  platform_fee: number;
  usage_cost: number;
  subtotal: number;
  gst_amount: number;
  estimated_total: number;
  currency: string;
  gst_rate: number;
}

export type InvoiceStatus = "draft" | "pending" | "paid" | "overdue" | "cancelled" | "refunded" | "failed";

export interface Invoice {
  id: string;
  organization_id: string;
  invoice_number: string;
  status: InvoiceStatus;
  currency: string;
  issue_date: string;
  due_date: string;
  subtotal_paise: number;
  tax_paise: number;
  total_paise: number;
  amount_paid_paise: number;
  amount_due_paise: number;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  period_id: string | null;
  bill_to: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  // Computed by service
  payable: boolean;
  payable_reason: string | null;
  payment_cta_url: string | null;
}

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  certificate_id: string | null;
  created_at: string;
}

export interface BillingOverview {
  price_book: BillingPriceBook;
  current_usage: BillingUsage;
  recent_invoices: Invoice[];
  total_outstanding_paise: number;
}

export interface RazorpayOrderResult {
  razorpay_order_id: string;
  razorpay_key_id: string;
  amount_paise: number;
  currency: string;
  invoice_number: string;
}

export interface PaymentMethod {
  id: string;
  organization_id: string;
  razorpay_customer_id: string;
  razorpay_token_id: string;
  method_type: "card" | "upi" | "emandate";
  card_network: string | null;
  card_last4: string | null;
  card_expiry_month: number | null;
  card_expiry_year: number | null;
  card_name: string | null;
  upi_vpa: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethodsResult {
  methods: PaymentMethod[];
  autopay_enabled: boolean;
}

export interface SetupPaymentMethodResult {
  razorpay_order_id: string;
  razorpay_key_id: string;
  razorpay_customer_id: string;
  amount_paise: number;
  currency: string;
  method_type: "card" | "upi";
}

// ── API ───────────────────────────────────────────────────────────────────────

export const billingApi = {
  getOverview: async (): Promise<BillingOverview> => {
    const response = await apiRequest<BillingOverview>("/billing/overview");
    return response.data!;
  },

  listInvoices: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    sort_by?: string;
    sort_order?: "asc" | "desc";
  }): Promise<PaginatedResponse<Invoice>> => {
    const response = await apiRequest<PaginatedResponse<Invoice>>(
      `/billing/invoices${buildQueryString({
        page: params?.page,
        limit: params?.limit,
        status: params?.status,
        sort_by: params?.sort_by,
        sort_order: params?.sort_order,
      })}`,
    );
    return response.data!;
  },

  getInvoice: async (id: string): Promise<{ invoice: Invoice; line_items: InvoiceLineItem[] }> => {
    const response = await apiRequest<{ invoice: Invoice; line_items: InvoiceLineItem[] }>(`/billing/invoices/${id}`);
    return response.data!;
  },

  /** Create a Razorpay order for a payable invoice. Returns data needed by Checkout JS. */
  createPaymentOrder: async (invoiceId: string): Promise<RazorpayOrderResult> => {
    const response = await apiRequest<RazorpayOrderResult>(`/billing/invoices/${invoiceId}/create-order`, {
      method: "POST",
    });
    return response.data!;
  },

  /** Verify Razorpay payment signature and mark invoice paid. */
  verifyPayment: async (params: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    invoice_id: string;
  }): Promise<{ success: boolean; invoice: Invoice }> => {
    const response = await apiRequest<{ success: boolean; invoice: Invoice }>("/billing/payments/verify", {
      method: "POST",
      body: JSON.stringify(params),
    });
    return response.data!;
  },

  /** Generate an invoice for the current (or specified) billing period. */
  generateInvoice: async (params?: { period_start?: string; period_end?: string }): Promise<{ invoice: Invoice }> => {
    const response = await apiRequest<{ invoice: Invoice }>("/billing/invoices/generate", {
      method: "POST",
      body: JSON.stringify(params ?? {}),
    });
    return response.data!;
  },

  /** Get the Razorpay customer ID for this org (creates one if needed). */
  getCustomer: async (): Promise<{ razorpay_customer_id: string }> => {
    const response = await apiRequest<{ razorpay_customer_id: string }>("/billing/customer");
    return response.data!;
  },

  /** Create a Razorpay mandate-setup order for adding a card or UPI. */
  setupPaymentMethod: async (methodType: "card" | "upi"): Promise<SetupPaymentMethodResult> => {
    const response = await apiRequest<SetupPaymentMethodResult>("/billing/payment-methods/setup", {
      method: "POST",
      body: JSON.stringify({ method_type: methodType }),
    });
    return response.data!;
  },

  /** Save a payment method after Checkout JS mandate setup completes. */
  savePaymentMethod: async (params: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
    method_type: "card" | "upi";
  }): Promise<{ method: PaymentMethod }> => {
    const response = await apiRequest<{ method: PaymentMethod }>("/billing/payment-methods", {
      method: "POST",
      body: JSON.stringify(params),
    });
    return response.data!;
  },

  /** List all saved payment methods. */
  listPaymentMethods: async (): Promise<PaymentMethodsResult> => {
    const response = await apiRequest<PaymentMethodsResult>("/billing/payment-methods");
    return response.data!;
  },

  /** Delete a saved payment method. */
  deletePaymentMethod: async (id: string): Promise<void> => {
    await apiRequest(`/billing/payment-methods/${id}`, { method: "DELETE" });
  },

  /** Toggle auto-pay. */
  setAutopay: async (enabled: boolean): Promise<{ autopay_enabled: boolean }> => {
    const response = await apiRequest<{ autopay_enabled: boolean }>("/billing/autopay", {
      method: "PATCH",
      body: JSON.stringify({ enabled }),
    });
    return response.data!;
  },
};
