/**
 * RAZORPAY INVOICE HELPERS
 *
 * Helper functions for creating Razorpay invoices with proper metadata.
 *
 * CRITICAL: Always include company_id and invoice_id in notes field
 * so webhooks can route events correctly.
 */

/**
 * Create invoice notes for Razorpay
 *
 * These notes are included in webhook payloads and used to:
 * 1. Route webhook events to correct company
 * 2. Link payments to invoices in our database
 *
 * @param companyId - Company UUID
 * @param invoiceId - Invoice UUID
 * @returns Notes object for Razorpay invoice
 */
export function createInvoiceNotes(
  companyId: string,
  invoiceId: string
): Record<string, string> {
  return {
    company_id: companyId,
    invoice_id: invoiceId,
  };
}

/**
 * Example: Create Razorpay invoice with proper metadata
 *
 * This shows the correct way to create invoices that work with webhooks.
 */
export async function createRazorpayInvoiceExample(
  razorpay: any,
  params: {
    companyId: string;
    invoiceId: string;
    amount: number; // In rupees (will be converted to paise)
    currency: string;
    description: string;
    customerEmail: string;
    customerContact: string;
  }
) {
  const {
    companyId,
    invoiceId,
    amount,
    currency,
    description,
    customerEmail,
    customerContact,
  } = params;

  // Create invoice with metadata
  const razorpayInvoice = await razorpay.invoices.create({
    // Amount in paise (Razorpay uses smallest currency unit)
    amount: amount * 100,
    currency,
    description,

    // Customer details
    customer: {
      email: customerEmail,
      contact: customerContact,
    },

    // CRITICAL: Include these notes for webhook routing
    notes: createInvoiceNotes(companyId, invoiceId),

    // Optional: Set expiry (default: 15 days)
    expire_by: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days

    // Optional: Send SMS/email notifications
    sms_notify: 1,
    email_notify: 1,
  });

  return razorpayInvoice;
}

/**
 * Extract company_id from Razorpay invoice
 *
 * Use this when receiving Razorpay invoice object (e.g., from API fetch).
 */
export function getCompanyIdFromRazorpayInvoice(
  razorpayInvoice: any
): string | null {
  return razorpayInvoice.notes?.company_id || null;
}

/**
 * Extract invoice_id from Razorpay invoice
 */
export function getInvoiceIdFromRazorpayInvoice(
  razorpayInvoice: any
): string | null {
  return razorpayInvoice.notes?.invoice_id || null;
}

/**
 * Validate invoice has required metadata
 *
 * Call this before sending invoice to ensure webhooks will work.
 */
export function validateInvoiceMetadata(razorpayInvoice: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!razorpayInvoice.notes) {
    errors.push('Missing notes field');
  } else {
    if (!razorpayInvoice.notes.company_id) {
      errors.push('Missing company_id in notes');
    }
    if (!razorpayInvoice.notes.invoice_id) {
      errors.push('Missing invoice_id in notes');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
