/**
 * RAZORPAY CLIENT
 *
 * Wrapper for Razorpay Invoices API.
 * Creates hosted invoices with payment links.
 */

import Razorpay from 'razorpay';
import { BillingPeriod, InvoiceCalculation, LineItemData } from './types';
import { toRazorpayAmount } from './invoice-calculator';
import { formatBillingPeriodShort } from './billing-period';
import { getRuntimeEnvironment } from '@/lib/utils/environment';

/**
 * Get Razorpay client for current environment
 *
 * @returns Razorpay instance
 */
export function getRazorpayClient(): Razorpay {
  const env = getRuntimeEnvironment();

  const keyId =
    env === 'prod'
      ? process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID_PROD
      : process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID_TEST;

  const keySecret =
    env === 'prod'
      ? process.env.RAZORPAY_KEY_SECRET_PROD
      : process.env.RAZORPAY_KEY_SECRET_TEST;

  if (!keyId || !keySecret) {
    throw new Error(
      `Razorpay credentials not configured for environment: ${env}`
    );
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

/**
 * Create Razorpay invoice
 *
 * Creates hosted invoice with payment link.
 *
 * @param params - Invoice parameters
 * @returns Razorpay invoice object
 */
export async function createRazorpayInvoice(params: {
  companyId: string;
  invoiceId: string;
  calculation: InvoiceCalculation;
  period: BillingPeriod;
  currency: string;
  customerEmail: string;
  customerName: string;
  razorpayCustomerId: string | null;
}): Promise<any> {
  const razorpay = getRazorpayClient();

  const {
    companyId,
    invoiceId,
    calculation,
    period,
    currency,
    customerEmail,
    customerName,
    razorpayCustomerId,
  } = params;

  // Convert line items to Razorpay format
  const line_items = calculation.line_items.map((item: LineItemData) => ({
    name: item.description,
    description: item.description,
    amount: toRazorpayAmount(item.amount),
    currency,
    quantity: item.quantity,
  }));

  // Build invoice payload
  const invoicePayload: any = {
    type: 'invoice',
    description: `Invoice for ${formatBillingPeriodShort(period)}`,
    line_items,
    currency,
    email_notify: 1,
    sms_notify: 1,
    draft: '0', // Issue immediately

    // CRITICAL: Include metadata for webhook routing
    notes: {
      company_id: companyId,
      invoice_id: invoiceId,
      billing_period: `${period.year}-${String(period.month).padStart(2, '0')}`,
    },

    // Set expiry (30 days from now)
    expire_by: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
  };

  // Add customer details
  if (razorpayCustomerId) {
    // Use existing customer
    invoicePayload.customer_id = razorpayCustomerId;
  } else {
    // Create inline customer
    invoicePayload.customer = {
      name: customerName,
      email: customerEmail,
    };
  }

  try {
    console.log('[Billing] Creating Razorpay invoice...', {
      company_id: companyId,
      invoice_id: invoiceId,
      amount: calculation.total_amount,
      currency,
    });

    const razorpayInvoice = await razorpay.invoices.create(invoicePayload);

    console.log('[Billing] Razorpay invoice created:', {
      razorpay_invoice_id: razorpayInvoice.id,
      short_url: razorpayInvoice.short_url,
    });

    return razorpayInvoice;
  } catch (error: any) {
    console.error('[Billing] Failed to create Razorpay invoice:', error);
    throw new Error(
      `Razorpay invoice creation failed: ${error.message || 'Unknown error'}`
    );
  }
}

/**
 * Fetch existing Razorpay invoice
 *
 * Used to check if invoice already exists in Razorpay.
 *
 * @param razorpayInvoiceId - Razorpay invoice ID
 * @returns Razorpay invoice or null
 */
export async function fetchRazorpayInvoice(
  razorpayInvoiceId: string
): Promise<any | null> {
  const razorpay = getRazorpayClient();

  try {
    const invoice = await razorpay.invoices.fetch(razorpayInvoiceId);
    return invoice;
  } catch (error: any) {
    if (error.statusCode === 404) {
      return null; // Invoice doesn't exist
    }
    throw error;
  }
}

/**
 * Cancel Razorpay invoice
 *
 * Used if invoice creation fails after Razorpay invoice is created.
 *
 * @param razorpayInvoiceId - Razorpay invoice ID
 */
export async function cancelRazorpayInvoice(
  razorpayInvoiceId: string
): Promise<void> {
  const razorpay = getRazorpayClient();

  try {
    await razorpay.invoices.cancel(razorpayInvoiceId);
    console.log(`[Billing] Cancelled Razorpay invoice: ${razorpayInvoiceId}`);
  } catch (error: any) {
    console.error(
      `[Billing] Failed to cancel Razorpay invoice: ${razorpayInvoiceId}`,
      error
    );
    // Don't throw - cancellation failure is not critical
  }
}
