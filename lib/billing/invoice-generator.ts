/**
 * INVOICE GENERATOR
 *
 * Main invoice generation logic.
 * Deterministic, idempotent, safe to retry.
 *
 * STEPS:
 * 1. Check for existing invoice (idempotency)
 * 2. Load billing profile
 * 3. Aggregate certificate usage
 * 4. Calculate amounts
 * 5. Create local invoice
 * 6. Create line items
 * 7. Attach certificates
 * 8. Create Razorpay invoice
 * 9. Update local invoice with Razorpay details
 */

import { createClient } from '@supabase/supabase-js';
import {
  BillingPeriod,
  Company,
  BillingProfile,
  InvoiceGenerationResult,
} from './types';
import {
  findExistingInvoice,
  billingPeriodToISO,
  formatBillingPeriodShort,
} from './billing-period';
import {
  getUnbilledCertificateUsage,
  attachCertificatesToInvoice,
} from './usage-aggregator';
import {
  calculateInvoice,
  shouldCreateInvoice,
  validateInvoiceCalculation,
} from './invoice-calculator';
import { createRazorpayInvoice } from './razorpay-client';

/**
 * Generate invoice for single company
 *
 * IDEMPOTENT: Safe to run multiple times.
 *
 * @param company - Company record
 * @param period - Billing period
 * @param supabase - Supabase client (service role)
 * @returns Invoice generation result
 */
export async function generateInvoiceForCompany(
  company: Company,
  period: BillingPeriod,
  supabase: any
): Promise<InvoiceGenerationResult> {
  console.log(`[Billing] Generating invoice for company: ${company.name}`);

  try {
    // STEP 1: Check for existing invoice (idempotency)
    const existingInvoice = await findExistingInvoice(
      company.id,
      period,
      supabase
    );

    if (existingInvoice) {
      console.log(
        `[Billing] Invoice already exists for ${company.name}: ${existingInvoice.id}`
      );

      return {
        success: true,
        skipped: true,
        skip_reason: 'invoice_already_exists',
        invoice_id: existingInvoice.id,
        razorpay_invoice_id: existingInvoice.razorpay_invoice_id,
        total_amount: existingInvoice.total_amount,
      };
    }

    // STEP 2: Load billing profile
    const { data: billingProfile, error: profileError } = await supabase
      .from('billing_profiles')
      .select('*')
      .eq('company_id', company.id)
      .single();

    if (profileError || !billingProfile) {
      throw new Error(
        `Billing profile not found for company: ${company.name}`
      );
    }

    // STEP 3: Aggregate certificate usage
    const usage = await getUnbilledCertificateUsage(
      company.id,
      period,
      supabase
    );

    console.log(`[Billing] Certificate usage for ${company.name}:`, {
      certificate_count: usage.certificate_count,
      unbilled_ids: usage.unbilled_certificate_ids.length,
    });

    // STEP 4: Decide whether to create invoice
    if (!shouldCreateInvoice(billingProfile, usage)) {
      console.log(
        `[Billing] Skipping invoice for ${company.name}: no billable activity`
      );

      return {
        success: true,
        skipped: true,
        skip_reason: 'no_billable_activity',
      };
    }

    // STEP 5: Calculate invoice amounts
    const calculation = calculateInvoice(billingProfile, usage, period);

    // Validate calculation
    const validation = validateInvoiceCalculation(calculation);
    if (!validation.valid) {
      throw new Error(
        `Invoice calculation validation failed: ${validation.errors.join(', ')}`
      );
    }

    console.log(`[Billing] Invoice calculation for ${company.name}:`, {
      subtotal: calculation.subtotal,
      tax_amount: calculation.tax_amount,
      total_amount: calculation.total_amount,
      line_items: calculation.line_items.length,
    });

    // STEP 6: Create local invoice record
    const { start, end } = billingPeriodToISO(period);

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        company_id: company.id,
        period_start: start,
        period_end: end,
        subtotal: calculation.subtotal,
        tax_amount: calculation.tax_amount,
        total_amount: calculation.total_amount,
        currency: billingProfile.currency,
        gst_rate_snapshot: billingProfile.gst_rate,
        status: 'pending',
        issued_via: 'razorpay',
      })
      .select()
      .single();

    if (invoiceError || !invoice) {
      throw new Error(`Failed to create invoice: ${invoiceError?.message}`);
    }

    console.log(`[Billing] Created invoice: ${invoice.id}`);

    // STEP 7: Create line items
    for (const lineItem of calculation.line_items) {
      const { error: lineItemError } = await supabase
        .from('invoice_line_items')
        .insert({
          invoice_id: invoice.id,
          company_id: company.id,
          description: lineItem.description,
          quantity: lineItem.quantity,
          unit_price: lineItem.unit_price,
          amount: lineItem.amount,
          item_type: lineItem.item_type,
        });

      if (lineItemError) {
        throw new Error(
          `Failed to create line item: ${lineItemError.message}`
        );
      }
    }

    console.log(
      `[Billing] Created ${calculation.line_items.length} line items`
    );

    // STEP 8: Attach certificates to invoice
    if (usage.unbilled_certificate_ids.length > 0) {
      await attachCertificatesToInvoice(
        usage.unbilled_certificate_ids,
        invoice.id,
        supabase
      );
    }

    // STEP 9: Create Razorpay invoice
    let razorpayInvoice;
    try {
      razorpayInvoice = await createRazorpayInvoice({
        companyId: company.id,
        invoiceId: invoice.id,
        calculation,
        period,
        currency: billingProfile.currency,
        customerEmail: company.email,
        customerName: company.name,
        razorpayCustomerId: billingProfile.razorpay_customer_id,
      });
    } catch (razorpayError: any) {
      console.error(
        '[Billing] Razorpay invoice creation failed:',
        razorpayError
      );

      // Keep local invoice, mark as failed
      await supabase
        .from('invoices')
        .update({
          status: 'failed',
          // If you add an errors column later, store error here
        })
        .eq('id', invoice.id);

      throw new Error(
        `Razorpay invoice creation failed: ${razorpayError.message}`
      );
    }

    // STEP 10: Update local invoice with Razorpay details
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        razorpay_invoice_id: razorpayInvoice.id,
        razorpay_payment_link: razorpayInvoice.short_url,
        razorpay_status: razorpayInvoice.status,
      })
      .eq('id', invoice.id);

    if (updateError) {
      console.error(
        '[Billing] Failed to update invoice with Razorpay details:',
        updateError
      );
      // Don't throw - invoice is still valid
    }

    console.log(
      `[Billing] ✅ Invoice generated successfully for ${company.name}:`,
      {
        invoice_id: invoice.id,
        razorpay_invoice_id: razorpayInvoice.id,
        total_amount: calculation.total_amount,
        certificate_count: usage.certificate_count,
        payment_link: razorpayInvoice.short_url,
      }
    );

    return {
      success: true,
      invoice_id: invoice.id,
      razorpay_invoice_id: razorpayInvoice.id,
      razorpay_payment_link: razorpayInvoice.short_url,
      total_amount: calculation.total_amount,
      certificate_count: usage.certificate_count,
    };
  } catch (error: any) {
    console.error(
      `[Billing] ❌ Failed to generate invoice for ${company.name}:`,
      error
    );

    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Get billable companies for period
 *
 * Returns companies that:
 * - status = 'active'
 * - environment = 'prod'
 * - Have billing_profiles
 *
 * @param supabase - Supabase client (service role)
 * @returns Array of companies
 */
export async function getBillableCompanies(supabase: any): Promise<Company[]> {
  // Get active prod companies
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('id, name, email, status, environment')
    .eq('status', 'active')
    .eq('environment', 'prod');

  if (companiesError) {
    throw new Error(`Failed to fetch companies: ${companiesError.message}`);
  }

  if (!companies || companies.length === 0) {
    console.log('[Billing] No active production companies found');
    return [];
  }

  // Filter companies that have billing profiles
  const companiesWithBilling: Company[] = [];

  for (const company of companies) {
    const { data: billingProfile } = await supabase
      .from('billing_profiles')
      .select('id')
      .eq('company_id', company.id)
      .single();

    if (billingProfile) {
      companiesWithBilling.push(company);
    } else {
      console.warn(
        `[Billing] Skipping company ${company.name}: no billing profile`
      );
    }
  }

  console.log(
    `[Billing] Found ${companiesWithBilling.length} billable companies`
  );

  return companiesWithBilling;
}

/**
 * Initialize service-role Supabase client
 *
 * CRITICAL: Use service role key for billing operations.
 *
 * @returns Supabase client
 */
export function getServiceRoleSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase credentials not configured');
  }

  return createClient(supabaseUrl, serviceRoleKey);
}
