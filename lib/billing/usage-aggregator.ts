/**
 * USAGE AGGREGATOR
 *
 * Aggregates certificate usage for billing period.
 * Only counts certificates that haven't been billed yet (invoice_id IS NULL).
 */

import { BillingPeriod, UsageStats } from './types';
import { billingPeriodToISO } from './billing-period';

/**
 * Count unbilled certificates for company in billing period
 *
 * Counts certificates where:
 * - company_id matches
 * - issued_at is within billing period
 * - invoice_id IS NULL (not yet billed)
 * - deleted_at IS NULL (not soft-deleted)
 *
 * @param companyId - Company UUID
 * @param period - Billing period
 * @param supabase - Supabase client (service role)
 * @returns Usage statistics
 */
export async function getUnbilledCertificateUsage(
  companyId: string,
  period: BillingPeriod,
  supabase: any
): Promise<UsageStats> {
  const { start, end } = billingPeriodToISO(period);

  // Query unbilled certificates
  const { data: certificates, error } = await supabase
    .from('certificates')
    .select('id, issued_at')
    .eq('company_id', companyId)
    .gte('issued_at', start)
    .lte('issued_at', end)
    .is('invoice_id', null) // Only unbilled certificates
    .is('deleted_at', null); // Exclude soft-deleted

  if (error) {
    throw new Error(`Failed to fetch certificate usage: ${error.message}`);
  }

  const certificate_count = certificates?.length || 0;
  const unbilled_certificate_ids = certificates?.map((c: any) => c.id) || [];

  return {
    certificate_count,
    unbilled_certificate_ids,
  };
}

/**
 * Attach certificates to invoice
 *
 * Updates certificates.invoice_id to link them to invoice.
 * This prevents double-billing.
 *
 * CRITICAL: This is idempotent. Running multiple times is safe.
 *
 * @param certificateIds - Array of certificate UUIDs
 * @param invoiceId - Invoice UUID
 * @param supabase - Supabase client (service role)
 */
export async function attachCertificatesToInvoice(
  certificateIds: string[],
  invoiceId: string,
  supabase: any
): Promise<void> {
  if (certificateIds.length === 0) {
    return; // No certificates to attach
  }

  const { error } = await supabase
    .from('certificates')
    .update({ invoice_id: invoiceId })
    .in('id', certificateIds)
    .is('invoice_id', null); // Safety: only update if not already attached

  if (error) {
    throw new Error(`Failed to attach certificates to invoice: ${error.message}`);
  }

  console.log(
    `[Billing] Attached ${certificateIds.length} certificates to invoice ${invoiceId}`
  );
}

/**
 * Verify certificate attachment
 *
 * Confirms all certificates are attached to invoice.
 * Used for post-generation verification.
 *
 * @param certificateIds - Array of certificate UUIDs
 * @param invoiceId - Invoice UUID
 * @param supabase - Supabase client
 * @returns True if all attached
 */
export async function verifyCertificateAttachment(
  certificateIds: string[],
  invoiceId: string,
  supabase: any
): Promise<boolean> {
  if (certificateIds.length === 0) {
    return true;
  }

  const { data, error } = await supabase
    .from('certificates')
    .select('id')
    .in('id', certificateIds)
    .eq('invoice_id', invoiceId);

  if (error) {
    console.error('[Billing] Failed to verify certificate attachment:', error);
    return false;
  }

  const attachedCount = data?.length || 0;
  const expectedCount = certificateIds.length;

  if (attachedCount !== expectedCount) {
    console.warn(
      `[Billing] Certificate attachment mismatch: ${attachedCount}/${expectedCount} attached`
    );
    return false;
  }

  return true;
}
