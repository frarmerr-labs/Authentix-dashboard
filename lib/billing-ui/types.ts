/**
 * BILLING UI TYPES
 *
 * Type definitions for billing UI components.
 * Matches database schema from invoices and billing_profiles tables.
 */

export interface BillingProfile {
  id: string;
  company_id: string;
  platform_fee_amount: number;
  certificate_unit_price: number;
  gst_rate: number;
  currency: string;
  razorpay_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  company_id: string;
  period_start: string;
  period_end: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  gst_rate_snapshot: number;
  status: InvoiceStatus;
  razorpay_invoice_id: string | null;
  razorpay_payment_link: string | null;
  razorpay_status: string | null;
  issued_via: string;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export type InvoiceStatus = 'pending' | 'paid' | 'overdue' | 'cancelled' | 'refunded' | 'failed';

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  company_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  item_type: 'platform_fee' | 'certificate_usage';
  created_at: string;
}

export interface InvoiceWithLineItems extends Invoice {
  line_items: InvoiceLineItem[];
}

export interface CurrentMonthUsage {
  certificate_count: number;
  platform_fee: number;
  usage_cost: number;
  subtotal: number;
  gst_amount: number;
  estimated_total: number;
  currency: string;
  gst_rate: number;
}

export interface BillingPeriodInfo {
  start: Date;
  end: Date;
  label: string; // e.g., "January 2025"
}

export interface PaymentStatusInfo {
  status: InvoiceStatus;
  label: string;
  color: 'gray' | 'green' | 'yellow' | 'red' | 'blue';
  canPay: boolean;
}
