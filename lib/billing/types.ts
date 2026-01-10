/**
 * BILLING TYPES
 *
 * Type definitions for invoice generation system.
 */

export interface BillingPeriod {
  start: Date;
  end: Date;
  month: number; // 1-12
  year: number;
  label: string; // "January 2025"
}

export interface BillingProfile {
  id: string;
  company_id: string;
  platform_fee_amount: number;
  certificate_unit_price: number;
  gst_rate: number;
  currency: string;
  razorpay_customer_id: string | null;
}

export interface Company {
  id: string;
  name: string;
  email: string;
  status: string;
  environment: string;
}

export interface UsageStats {
  certificate_count: number;
  unbilled_certificate_ids: string[];
}

export interface InvoiceCalculation {
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  line_items: LineItemData[];
}

export interface LineItemData {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  item_type: 'platform_fee' | 'certificate_usage';
}

export interface InvoiceRecord {
  id: string;
  company_id: string;
  period_start: string;
  period_end: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  gst_rate_snapshot: number;
  status: string;
  razorpay_invoice_id: string | null;
  razorpay_payment_link: string | null;
  issued_via: string;
}

export interface InvoiceGenerationResult {
  success: boolean;
  invoice_id?: string;
  razorpay_invoice_id?: string;
  razorpay_payment_link?: string;
  total_amount?: number;
  certificate_count?: number;
  skipped?: boolean;
  skip_reason?: string;
  error?: string;
}

export interface MonthlyInvoiceJobResult {
  period: BillingPeriod;
  total_companies_processed: number;
  invoices_created: number;
  invoices_skipped: number;
  errors: Array<{
    company_id: string;
    company_name: string;
    error: string;
  }>;
  results: Array<{
    company_id: string;
    company_name: string;
    result: InvoiceGenerationResult;
  }>;
}
