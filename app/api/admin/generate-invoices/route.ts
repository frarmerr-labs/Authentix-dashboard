/**
 * ADMIN: GENERATE INVOICES ENDPOINT
 *
 * Manual trigger for monthly invoice generation.
 *
 * POST /api/admin/generate-invoices
 *
 * SECURITY:
 * - Server-side only
 * - Requires admin authentication (TODO: add auth guard)
 * - Production-safe (idempotent)
 *
 * USAGE:
 * - Run manually to generate invoices for previous month
 * - Safe to retry multiple times
 * - Future: Trigger via cron
 */

import { NextRequest, NextResponse } from 'next/server';
import { runMonthlyInvoiceJob, runInvoiceGenerationForCompany } from '@/lib/billing/monthly-invoice-job';
import { logEnvironmentAction } from '@/lib/utils/guards';

/**
 * POST /api/admin/generate-invoices
 *
 * Generate monthly invoices for all billable companies.
 *
 * Query params:
 * - month: Optional month (1-12)
 * - year: Optional year
 * - company_id: Optional - generate for specific company only
 * - dry_run: Optional - simulate without creating invoices
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // TODO: Add admin authentication
    // assertAdminAuthenticated(request);

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const companyId = searchParams.get('company_id');
    const dryRun = searchParams.get('dry_run') === 'true';

    // Log action
    logEnvironmentAction('billing:generate_invoices', {
      month: month || 'previous',
      year: year || 'previous',
      company_id: companyId || 'all',
      dry_run: dryRun,
    });

    // Single company mode
    if (companyId) {
      console.log(`[API] Generating invoice for company: ${companyId}`);

      const result = await runInvoiceGenerationForCompany(companyId, {
        month: month ? parseInt(month) : undefined,
        year: year ? parseInt(year) : undefined,
      });

      const duration = Date.now() - startTime;

      return NextResponse.json({
        success: result.success,
        company_id: companyId,
        result,
        duration_ms: duration,
      });
    }

    // Batch mode (all companies)
    console.log('[API] Running monthly invoice generation job...');

    const jobResult = await runMonthlyInvoiceJob({
      month: month ? parseInt(month) : undefined,
      year: year ? parseInt(year) : undefined,
      dryRun,
    });

    const duration = Date.now() - startTime;

    // Return summary
    return NextResponse.json({
      success: true,
      summary: {
        period: jobResult.period.label,
        companies_processed: jobResult.total_companies_processed,
        invoices_created: jobResult.invoices_created,
        invoices_skipped: jobResult.invoices_skipped,
        errors: jobResult.errors.length,
        duration_ms: duration,
      },
      errors: jobResult.errors,
      results: jobResult.results,
    });
  } catch (error: any) {
    console.error('[API] Invoice generation failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Invoice generation failed',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/generate-invoices
 *
 * Get status/help information.
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: '/api/admin/generate-invoices',
    method: 'POST',
    description: 'Generate monthly invoices for billable companies',
    query_params: {
      month: 'Optional: Month (1-12). Defaults to previous month.',
      year: 'Optional: Year (e.g., 2025). Defaults to previous month year.',
      company_id: 'Optional: Generate for specific company only.',
      dry_run: 'Optional: Set to "true" to simulate without creating invoices.',
    },
    examples: [
      {
        description: 'Generate invoices for previous month (all companies)',
        url: '/api/admin/generate-invoices',
      },
      {
        description: 'Generate invoices for January 2025',
        url: '/api/admin/generate-invoices?month=1&year=2025',
      },
      {
        description: 'Generate invoice for specific company',
        url: '/api/admin/generate-invoices?company_id=uuid-here',
      },
      {
        description: 'Dry run (simulate only)',
        url: '/api/admin/generate-invoices?dry_run=true',
      },
    ],
    notes: [
      'Idempotent: Safe to run multiple times',
      'Existing invoices are detected and skipped',
      'Requires admin authentication (TODO)',
      'Server-side only',
    ],
  });
}
