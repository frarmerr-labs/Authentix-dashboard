/**
 * MONTHLY INVOICE JOB
 *
 * Orchestrates invoice generation for all billable companies.
 * Safe to run multiple times (idempotent).
 *
 * USAGE:
 * - Run manually via API endpoint
 * - Future: Run via cron
 */

import { MonthlyInvoiceJobResult } from './types';
import { getPreviousMonthBillingPeriod, getBillingPeriodForMonth } from './billing-period';
import {
  generateInvoiceForCompany,
  getBillableCompanies,
  getServiceRoleSupabaseClient,
} from './invoice-generator';

/**
 * Run monthly invoice generation job
 *
 * Generates invoices for all billable companies for PREVIOUS month.
 *
 * IDEMPOTENT: Safe to run multiple times.
 * Existing invoices are detected and skipped.
 *
 * @param options - Job options
 * @returns Job result summary
 */
export async function runMonthlyInvoiceJob(options?: {
  month?: number;
  year?: number;
  dryRun?: boolean;
}): Promise<MonthlyInvoiceJobResult> {
  const startTime = Date.now();

  console.log('========================================');
  console.log('MONTHLY INVOICE GENERATION JOB');
  console.log('========================================');

  // Determine billing period
  const period = options?.month && options?.year
    ? getBillingPeriodForMonth(options.month, options.year)
    : getPreviousMonthBillingPeriod();

  console.log(`Billing Period: ${period.label}`);
  console.log(`Period Start: ${period.start.toISOString()}`);
  console.log(`Period End: ${period.end.toISOString()}`);
  console.log(`Dry Run: ${options?.dryRun ? 'YES' : 'NO'}`);
  console.log('========================================\n');

  // Initialize Supabase client
  const supabase = getServiceRoleSupabaseClient();

  // Get billable companies
  let companies;
  try {
    companies = await getBillableCompanies(supabase);
  } catch (error: any) {
    console.error('[Job] Failed to fetch billable companies:', error);
    throw error;
  }

  if (companies.length === 0) {
    console.log('[Job] No billable companies found. Exiting.');
    return {
      period,
      total_companies_processed: 0,
      invoices_created: 0,
      invoices_skipped: 0,
      errors: [],
      results: [],
    };
  }

  console.log(`[Job] Processing ${companies.length} companies...\n`);

  // Process each company
  const results: MonthlyInvoiceJobResult['results'] = [];
  const errors: MonthlyInvoiceJobResult['errors'] = [];

  let invoicesCreated = 0;
  let invoicesSkipped = 0;

  for (const company of companies) {
    console.log(`\n[Job] Processing: ${company.name} (${company.id})`);

    if (options?.dryRun) {
      console.log('[Job] DRY RUN - Skipping actual invoice creation');
      results.push({
        company_id: company.id,
        company_name: company.name,
        result: {
          success: true,
          skipped: true,
          skip_reason: 'dry_run',
        },
      });
      continue;
    }

    try {
      const result = await generateInvoiceForCompany(company, period, supabase);

      results.push({
        company_id: company.id,
        company_name: company.name,
        result,
      });

      if (result.success) {
        if (result.skipped) {
          invoicesSkipped++;
          console.log(`[Job] ⏭️  Skipped: ${result.skip_reason}`);
        } else {
          invoicesCreated++;
          console.log(`[Job] ✅ Invoice created: ${result.invoice_id}`);
        }
      } else {
        errors.push({
          company_id: company.id,
          company_name: company.name,
          error: result.error || 'Unknown error',
        });
        console.log(`[Job] ❌ Failed: ${result.error}`);
      }
    } catch (error: any) {
      errors.push({
        company_id: company.id,
        company_name: company.name,
        error: error.message || 'Unknown error',
      });
      console.log(`[Job] ❌ Exception: ${error.message}`);
    }
  }

  const duration = Date.now() - startTime;

  console.log('\n========================================');
  console.log('JOB SUMMARY');
  console.log('========================================');
  console.log(`Period: ${period.label}`);
  console.log(`Companies Processed: ${companies.length}`);
  console.log(`Invoices Created: ${invoicesCreated}`);
  console.log(`Invoices Skipped: ${invoicesSkipped}`);
  console.log(`Errors: ${errors.length}`);
  console.log(`Duration: ${(duration / 1000).toFixed(2)}s`);
  console.log('========================================\n');

  if (errors.length > 0) {
    console.log('ERRORS:');
    errors.forEach((err) => {
      console.log(`  - ${err.company_name}: ${err.error}`);
    });
    console.log('');
  }

  return {
    period,
    total_companies_processed: companies.length,
    invoices_created: invoicesCreated,
    invoices_skipped: invoicesSkipped,
    errors,
    results,
  };
}

/**
 * Run invoice generation for specific company
 *
 * Useful for manual retries or testing.
 *
 * @param companyId - Company UUID
 * @param options - Options
 * @returns Invoice generation result
 */
export async function runInvoiceGenerationForCompany(
  companyId: string,
  options?: {
    month?: number;
    year?: number;
  }
) {
  console.log(`[Job] Generating invoice for company: ${companyId}`);

  const supabase = getServiceRoleSupabaseClient();

  // Get company
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, name, email, status, environment')
    .eq('id', companyId)
    .single();

  if (companyError || !company) {
    throw new Error(`Company not found: ${companyId}`);
  }

  // Determine billing period
  const period = options?.month && options?.year
    ? getBillingPeriodForMonth(options.month, options.year)
    : getPreviousMonthBillingPeriod();

  console.log(`Period: ${period.label}`);

  // Generate invoice
  const result = await generateInvoiceForCompany(company, period, supabase);

  console.log('Result:', result);

  return result;
}
