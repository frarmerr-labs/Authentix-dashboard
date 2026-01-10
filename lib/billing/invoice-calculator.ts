/**
 * INVOICE CALCULATOR
 *
 * Calculates invoice amounts and line items.
 * GST-compliant, deterministic calculations.
 */

import {
  BillingProfile,
  BillingPeriod,
  UsageStats,
  InvoiceCalculation,
  LineItemData,
} from './types';
import { formatBillingPeriodShort } from './billing-period';

/**
 * Calculate invoice amounts
 *
 * Applies:
 * 1. Platform fee (fixed per month)
 * 2. Certificate usage (quantity × unit price)
 * 3. GST (on subtotal)
 *
 * @param billingProfile - Company billing configuration
 * @param usage - Certificate usage stats
 * @param period - Billing period
 * @returns Invoice calculation
 */
export function calculateInvoice(
  billingProfile: BillingProfile,
  usage: UsageStats,
  period: BillingPeriod
): InvoiceCalculation {
  const line_items: LineItemData[] = [];

  // Line Item 1: Platform fee (if > 0)
  if (billingProfile.platform_fee_amount > 0) {
    line_items.push({
      description: `Platform usage fee – ${formatBillingPeriodShort(period)}`,
      quantity: 1,
      unit_price: billingProfile.platform_fee_amount,
      amount: billingProfile.platform_fee_amount,
      item_type: 'platform_fee',
    });
  }

  // Line Item 2: Certificate usage (if > 0)
  if (usage.certificate_count > 0) {
    const certificateAmount =
      usage.certificate_count * billingProfile.certificate_unit_price;

    line_items.push({
      description: `Certificates issued – ${formatBillingPeriodShort(period)}`,
      quantity: usage.certificate_count,
      unit_price: billingProfile.certificate_unit_price,
      amount: certificateAmount,
      item_type: 'certificate_usage',
    });
  }

  // Calculate subtotal
  const subtotal = line_items.reduce((sum, item) => sum + item.amount, 0);

  // Calculate GST
  const gst_rate = billingProfile.gst_rate;
  const tax_amount = subtotal * (gst_rate / 100);

  // Calculate total
  const total_amount = subtotal + tax_amount;

  return {
    subtotal: roundToTwoDecimals(subtotal),
    tax_amount: roundToTwoDecimals(tax_amount),
    total_amount: roundToTwoDecimals(total_amount),
    line_items,
  };
}

/**
 * Determine if invoice should be created
 *
 * Create invoice IF:
 * - Platform fee > 0 OR
 * - Certificate count > 0
 *
 * Skip if both are zero (no billable activity).
 *
 * @param billingProfile - Company billing configuration
 * @param usage - Certificate usage stats
 * @returns True if should create invoice
 */
export function shouldCreateInvoice(
  billingProfile: BillingProfile,
  usage: UsageStats
): boolean {
  const hasPlatformFee = billingProfile.platform_fee_amount > 0;
  const hasCertificateUsage = usage.certificate_count > 0;

  return hasPlatformFee || hasCertificateUsage;
}

/**
 * Round to 2 decimal places
 *
 * Prevents floating-point precision issues.
 *
 * @param value - Number to round
 * @returns Rounded value
 */
function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Format currency amount
 *
 * @param amount - Amount
 * @param currency - Currency code (e.g., "INR")
 * @returns Formatted string (e.g., "₹1,234.56")
 */
export function formatCurrency(amount: number, currency: string): string {
  const currencySymbols: Record<string, string> = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
  };

  const symbol = currencySymbols[currency] || currency;
  const formatted = amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${symbol}${formatted}`;
}

/**
 * Convert amount to Razorpay format (paise)
 *
 * Razorpay uses smallest currency unit (paise for INR).
 *
 * @param amount - Amount in rupees
 * @returns Amount in paise
 *
 * @example
 * toRazorpayAmount(100.50) // Returns: 10050
 */
export function toRazorpayAmount(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Validate invoice calculation
 *
 * Ensures calculation is mathematically correct.
 *
 * @param calculation - Invoice calculation
 * @returns Validation result
 */
export function validateInvoiceCalculation(calculation: InvoiceCalculation): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check subtotal matches line items
  const expectedSubtotal = calculation.line_items.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  if (Math.abs(calculation.subtotal - expectedSubtotal) > 0.01) {
    errors.push(
      `Subtotal mismatch: ${calculation.subtotal} vs ${expectedSubtotal}`
    );
  }

  // Check amounts are non-negative
  if (calculation.subtotal < 0) {
    errors.push('Subtotal cannot be negative');
  }

  if (calculation.tax_amount < 0) {
    errors.push('Tax amount cannot be negative');
  }

  if (calculation.total_amount < 0) {
    errors.push('Total amount cannot be negative');
  }

  // Check total = subtotal + tax
  const expectedTotal = calculation.subtotal + calculation.tax_amount;
  if (Math.abs(calculation.total_amount - expectedTotal) > 0.01) {
    errors.push(
      `Total amount mismatch: ${calculation.total_amount} vs ${expectedTotal}`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
