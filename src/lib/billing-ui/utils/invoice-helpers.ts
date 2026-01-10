/**
 * INVOICE HELPERS
 *
 * Utility functions for invoice display and status handling.
 */

import { InvoiceStatus, PaymentStatusInfo, BillingPeriodInfo } from '../types';

/**
 * Get payment status display info
 *
 * @param status - Invoice status
 * @returns Status display information
 */
export function getPaymentStatusInfo(status: InvoiceStatus): PaymentStatusInfo {
  const statusMap: Record<InvoiceStatus, PaymentStatusInfo> = {
    pending: {
      status: 'pending',
      label: 'Payment Pending',
      color: 'yellow',
      canPay: true,
    },
    paid: {
      status: 'paid',
      label: 'Paid',
      color: 'green',
      canPay: false,
    },
    overdue: {
      status: 'overdue',
      label: 'Overdue',
      color: 'red',
      canPay: true,
    },
    cancelled: {
      status: 'cancelled',
      label: 'Cancelled',
      color: 'gray',
      canPay: false,
    },
    refunded: {
      status: 'refunded',
      label: 'Refunded',
      color: 'blue',
      canPay: false,
    },
    failed: {
      status: 'failed',
      label: 'Failed',
      color: 'red',
      canPay: false,
    },
  };

  return statusMap[status] || statusMap.pending;
}

/**
 * Format billing period label
 *
 * @param periodStart - ISO date string
 * @param periodEnd - ISO date string
 * @returns Formatted label (e.g., "January 2025")
 */
export function formatBillingPeriod(periodStart: string, periodEnd: string): string {
  const start = new Date(periodStart);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const month = monthNames[start.getMonth()];
  const year = start.getFullYear();

  return `${month} ${year}`;
}

/**
 * Get current billing period
 *
 * @returns Current month billing period info
 */
export function getCurrentBillingPeriod(): BillingPeriodInfo {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  return {
    start,
    end,
    label: formatBillingPeriod(start.toISOString(), end.toISOString()),
  };
}

/**
 * Format date for display
 *
 * @param dateString - ISO date string
 * @returns Formatted date (e.g., "Jan 15, 2025")
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  return date.toLocaleDateString('en-US', options);
}

/**
 * Format date and time for display
 *
 * @param dateString - ISO date string
 * @returns Formatted date and time (e.g., "Jan 15, 2025 10:30 AM")
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  };

  return date.toLocaleDateString('en-US', options);
}

/**
 * Check if invoice is payable
 *
 * @param status - Invoice status
 * @param razorpayPaymentLink - Razorpay payment link
 * @returns True if invoice can be paid
 */
export function isInvoicePayable(
  status: InvoiceStatus,
  razorpayPaymentLink: string | null
): boolean {
  const statusInfo = getPaymentStatusInfo(status);
  return statusInfo.canPay && !!razorpayPaymentLink;
}

/**
 * Get invoice number display
 *
 * @param invoiceId - Invoice UUID
 * @returns Short invoice number (last 8 chars of UUID)
 */
export function getInvoiceNumber(invoiceId: string): string {
  return `INV-${invoiceId.slice(-8).toUpperCase()}`;
}

/**
 * Calculate days until due
 *
 * @param createdAt - Invoice creation date
 * @param daysUntilDue - Number of days until due (default: 30)
 * @returns Days remaining (negative if overdue)
 */
export function getDaysUntilDue(createdAt: string, daysUntilDue: number = 30): number {
  const created = new Date(createdAt);
  const due = new Date(created.getTime() + daysUntilDue * 24 * 60 * 60 * 1000);
  const now = new Date();

  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Get due date display
 *
 * @param createdAt - Invoice creation date
 * @param daysUntilDue - Number of days until due
 * @returns Formatted due date
 */
export function getDueDateDisplay(createdAt: string, daysUntilDue: number = 30): string {
  const created = new Date(createdAt);
  const due = new Date(created.getTime() + daysUntilDue * 24 * 60 * 60 * 1000);

  return formatDate(due.toISOString());
}
