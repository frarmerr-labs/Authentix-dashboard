/**
 * RAZORPAY WEBHOOK SIGNATURE VERIFICATION
 *
 * Implements secure HMAC SHA256 signature verification as per Razorpay docs:
 * https://razorpay.com/docs/webhooks/#verifying-webhook-signature
 *
 * CRITICAL: This runs server-side only. Never expose secrets to browser.
 */

import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Verify Razorpay webhook signature
 *
 * @param payload - Raw webhook payload (stringified JSON)
 * @param signature - x-razorpay-signature header value
 * @param secret - Razorpay webhook secret (from env)
 * @returns true if signature is valid
 *
 * Algorithm:
 * 1. Compute HMAC SHA256 of payload using webhook secret
 * 2. Compare computed signature with provided signature using timing-safe comparison
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    // Compute expected signature
    const expectedSignature = createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Convert both signatures to buffers for timing-safe comparison
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const providedBuffer = Buffer.from(signature, 'hex');

    // Ensure both buffers are same length (protection against length-based attacks)
    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }

    // Timing-safe comparison (prevents timing attacks)
    return timingSafeEqual(expectedBuffer, providedBuffer);
  } catch (error) {
    console.error('[Razorpay Webhook] Signature verification error:', error);
    return false;
  }
}

/**
 * Get webhook secret for current environment
 *
 * Uses different secrets for test vs prod environments.
 *
 * Environment variables:
 * - RAZORPAY_WEBHOOK_SECRET_TEST
 * - RAZORPAY_WEBHOOK_SECRET_PROD
 *
 * @param environment - 'test' or 'prod'
 * @returns Webhook secret or null if not configured
 */
export function getWebhookSecret(environment: 'test' | 'prod'): string | null {
  if (environment === 'prod') {
    return process.env.RAZORPAY_WEBHOOK_SECRET_PROD || null;
  }

  // Default to test for dev/test/beta
  return process.env.RAZORPAY_WEBHOOK_SECRET_TEST || null;
}

/**
 * Validate webhook payload structure
 *
 * Ensures payload has expected Razorpay webhook format.
 */
export function validateWebhookPayload(payload: any): {
  valid: boolean;
  error?: string;
} {
  // Check for required top-level fields
  if (!payload.event) {
    return { valid: false, error: 'Missing event field' };
  }

  if (!payload.payload) {
    return { valid: false, error: 'Missing payload field' };
  }

  // Validate event format (e.g., "payment.captured", "invoice.paid")
  if (typeof payload.event !== 'string' || !payload.event.includes('.')) {
    return { valid: false, error: 'Invalid event format' };
  }

  // Check for entity
  if (!payload.payload.payment && !payload.payload.invoice && !payload.payload.refund) {
    // At least one entity type should exist
    // Note: We don't fail here, just log for visibility
    console.warn('[Razorpay Webhook] Unexpected entity type in payload');
  }

  return { valid: true };
}

/**
 * Extract entity details from webhook payload
 *
 * Razorpay webhooks have structure:
 * {
 *   "event": "payment.captured",
 *   "payload": {
 *     "payment": { "entity": { ... } }
 *   }
 * }
 */
export function extractEntityDetails(payload: any): {
  entityType: string | null;
  entityId: string | null;
  entity: any | null;
} {
  // Try to find entity in payload
  const entityTypes = ['payment', 'invoice', 'refund', 'order', 'subscription'];

  for (const type of entityTypes) {
    if (payload.payload?.[type]?.entity) {
      return {
        entityType: type,
        entityId: payload.payload[type].entity.id || null,
        entity: payload.payload[type].entity,
      };
    }
  }

  return {
    entityType: null,
    entityId: null,
    entity: null,
  };
}

/**
 * Resolve company_id from webhook metadata
 *
 * Checks multiple possible locations:
 * 1. payload.payload.invoice.entity.notes.company_id
 * 2. payload.payload.payment.entity.notes.company_id
 * 3. payload.payload.order.entity.notes.company_id
 *
 * @param payload - Webhook payload
 * @returns company_id (UUID) or null
 */
export function resolveCompanyId(payload: any): string | null {
  try {
    // Try invoice notes
    const invoiceCompanyId = payload.payload?.invoice?.entity?.notes?.company_id;
    if (invoiceCompanyId) return invoiceCompanyId;

    // Try payment notes
    const paymentCompanyId = payload.payload?.payment?.entity?.notes?.company_id;
    if (paymentCompanyId) return paymentCompanyId;

    // Try order notes
    const orderCompanyId = payload.payload?.order?.entity?.notes?.company_id;
    if (orderCompanyId) return orderCompanyId;

    return null;
  } catch (error) {
    console.error('[Razorpay Webhook] Error resolving company_id:', error);
    return null;
  }
}

/**
 * Resolve invoice_id from webhook metadata
 *
 * @param payload - Webhook payload
 * @returns invoice_id (UUID) or null
 */
export function resolveInvoiceId(payload: any): string | null {
  try {
    // Try invoice notes
    const invoiceId = payload.payload?.invoice?.entity?.notes?.invoice_id;
    if (invoiceId) return invoiceId;

    // Try payment notes
    const paymentInvoiceId = payload.payload?.payment?.entity?.notes?.invoice_id;
    if (paymentInvoiceId) return paymentInvoiceId;

    return null;
  } catch (error) {
    console.error('[Razorpay Webhook] Error resolving invoice_id:', error);
    return null;
  }
}

/**
 * Check if event type is billing-critical
 *
 * These events require processing (not just storage).
 */
export function isBillingCriticalEvent(eventType: string): boolean {
  const criticalEvents = [
    'invoice.created',
    'invoice.issued',
    'invoice.paid',
    'invoice.expired',
    'invoice.cancelled',
    'invoice.partially_paid',
    'payment.captured',
    'payment.failed',
    'refund.processed',
  ];

  return criticalEvents.includes(eventType);
}

/**
 * Extract amount and currency from entity
 */
export function extractAmountDetails(entity: any): {
  amount: number | null;
  currency: string | null;
  fee: number | null;
  tax: number | null;
} {
  return {
    amount: entity?.amount ? entity.amount / 100 : null, // Razorpay uses paise
    currency: entity?.currency || null,
    fee: entity?.fee ? entity.fee / 100 : null,
    tax: entity?.tax ? entity.tax / 100 : null,
  };
}
