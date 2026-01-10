/**
 * BILLING PERIOD UTILITIES
 *
 * Deterministic billing period calculation.
 * Always bills for PREVIOUS calendar month.
 */

import { BillingPeriod } from './types';

/**
 * Get billing period for previous calendar month
 *
 * @param referenceDate - Reference date (defaults to now)
 * @returns Billing period for previous month
 *
 * @example
 * // If today is 2025-02-15
 * getPreviousMonthBillingPeriod()
 * // Returns: January 2025 (2025-01-01 00:00:00 to 2025-01-31 23:59:59)
 */
export function getPreviousMonthBillingPeriod(
  referenceDate: Date = new Date()
): BillingPeriod {
  // Get first day of current month
  const firstDayOfCurrentMonth = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    1
  );

  // Subtract 1 millisecond to get last moment of previous month
  const lastMomentOfPreviousMonth = new Date(
    firstDayOfCurrentMonth.getTime() - 1
  );

  // Get first day of previous month
  const firstDayOfPreviousMonth = new Date(
    lastMomentOfPreviousMonth.getFullYear(),
    lastMomentOfPreviousMonth.getMonth(),
    1,
    0, 0, 0, 0 // 00:00:00.000
  );

  // Get last day of previous month
  const lastDayOfPreviousMonth = new Date(
    lastMomentOfPreviousMonth.getFullYear(),
    lastMomentOfPreviousMonth.getMonth() + 1,
    0, // Day 0 = last day of previous month
    23, 59, 59, 999 // 23:59:59.999
  );

  const month = firstDayOfPreviousMonth.getMonth() + 1; // 1-12
  const year = firstDayOfPreviousMonth.getFullYear();

  return {
    start: firstDayOfPreviousMonth,
    end: lastDayOfPreviousMonth,
    month,
    year,
    label: formatBillingPeriodLabel(firstDayOfPreviousMonth),
  };
}

/**
 * Get billing period for specific month/year
 *
 * @param month - Month (1-12)
 * @param year - Year (e.g., 2025)
 * @returns Billing period
 *
 * @example
 * getBillingPeriodForMonth(1, 2025)
 * // Returns: January 2025 (2025-01-01 to 2025-01-31)
 */
export function getBillingPeriodForMonth(
  month: number,
  year: number
): BillingPeriod {
  if (month < 1 || month > 12) {
    throw new Error('Month must be between 1 and 12');
  }

  // First day of month (00:00:00.000)
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);

  // Last day of month (23:59:59.999)
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  return {
    start,
    end,
    month,
    year,
    label: formatBillingPeriodLabel(start),
  };
}

/**
 * Format billing period label
 *
 * @param date - Date in the billing period
 * @returns Formatted label (e.g., "January 2025")
 */
function formatBillingPeriodLabel(date: Date): string {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();

  return `${month} ${year}`;
}

/**
 * Convert BillingPeriod to ISO date strings for database queries
 *
 * @param period - Billing period
 * @returns ISO date strings
 */
export function billingPeriodToISO(period: BillingPeriod): {
  start: string;
  end: string;
} {
  return {
    start: period.start.toISOString(),
    end: period.end.toISOString(),
  };
}

/**
 * Check if invoice already exists for company + period
 *
 * Idempotency check helper.
 *
 * @param companyId - Company UUID
 * @param period - Billing period
 * @param supabase - Supabase client
 * @returns Existing invoice or null
 */
export async function findExistingInvoice(
  companyId: string,
  period: BillingPeriod,
  supabase: any
): Promise<any | null> {
  const { start, end } = billingPeriodToISO(period);

  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('company_id', companyId)
    .eq('period_start', start)
    .eq('period_end', end)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = "No rows found" (expected if no invoice exists)
    throw error;
  }

  return data;
}

/**
 * Format billing period for descriptions
 *
 * @param period - Billing period
 * @returns Short format (e.g., "Jan 2025")
 */
export function formatBillingPeriodShort(period: BillingPeriod): string {
  const monthNamesShort = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  return `${monthNamesShort[period.month - 1]} ${period.year}`;
}
