/**
 * CURRENCY FORMATTER
 *
 * Currency-aware formatting utilities for billing UI.
 */

/**
 * Format amount as currency
 *
 * @param amount - Amount to format
 * @param currency - Currency code (e.g., "INR", "USD")
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency(1234.56, "INR") // "₹1,234.56"
 * formatCurrency(1234.56, "USD") // "$1,234.56"
 */
export function formatCurrency(amount: number, currency: string): string {
  const currencySymbols: Record<string, string> = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
  };

  const symbol = currencySymbols[currency] || currency;

  // Use Indian number formatting for INR
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';

  const formatted = amount.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${symbol}${formatted}`;
}

/**
 * Format amount as currency (compact)
 *
 * @param amount - Amount to format
 * @param currency - Currency code
 * @returns Compact formatted string (e.g., "₹1.2K")
 */
export function formatCurrencyCompact(amount: number, currency: string): string {
  const currencySymbols: Record<string, string> = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
  };

  const symbol = currencySymbols[currency] || currency;

  if (amount >= 10000000) {
    return `${symbol}${(amount / 10000000).toFixed(1)}Cr`; // Crores (for INR)
  } else if (amount >= 100000) {
    return `${symbol}${(amount / 100000).toFixed(1)}L`; // Lakhs (for INR)
  } else if (amount >= 1000) {
    return `${symbol}${(amount / 1000).toFixed(1)}K`;
  } else {
    return `${symbol}${amount.toFixed(2)}`;
  }
}

/**
 * Format GST rate as percentage
 *
 * @param rate - GST rate (e.g., 18.00)
 * @returns Formatted percentage string (e.g., "18%")
 */
export function formatGSTRate(rate: number): string {
  return `${rate.toFixed(0)}%`;
}
