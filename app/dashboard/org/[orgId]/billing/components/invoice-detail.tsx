/**
 * INVOICE DETAIL COMPONENT
 *
 * Displays detailed invoice view with line items and payment options.
 */

'use client';

import { useInvoiceDetail } from '@/lib/billing-ui/hooks/use-invoice-detail';
import { formatCurrency, formatGSTRate } from '@/lib/billing-ui/utils/currency-formatter';
import {
  getPaymentStatusInfo,
  formatBillingPeriod,
  formatDateTime,
  getInvoiceNumber,
  isInvoicePayable,
} from '@/lib/billing-ui/utils/invoice-helpers';

interface InvoiceDetailProps {
  invoiceId: string;
  companyName: string;
  companyEmail: string;
}

export function InvoiceDetail({
  invoiceId,
  companyName,
  companyEmail,
}: InvoiceDetailProps) {
  const { invoice, loading, error } = useInvoiceDetail(invoiceId);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-semibold">Error Loading Invoice</h3>
        <p className="text-red-600 text-sm mt-2">{error}</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-yellow-800 font-semibold">Invoice Not Found</h3>
        <p className="text-yellow-700 text-sm mt-2">
          The requested invoice could not be found.
        </p>
      </div>
    );
  }

  const statusInfo = getPaymentStatusInfo(invoice.status);
  const canPay = isInvoicePayable(invoice.status, invoice.razorpay_payment_link);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-8 py-6 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {getInvoiceNumber(invoice.id)}
            </h1>
            <p className="text-gray-600 mt-1">
              {formatBillingPeriod(invoice.period_start, invoice.period_end)}
            </p>
          </div>
          <div className="text-right">
            <StatusBadge status={invoice.status} />
            {invoice.paid_at && (
              <p className="text-sm text-gray-600 mt-2">
                Paid on {formatDateTime(invoice.paid_at)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Invoice Body */}
      <div className="p-8">
        {/* Bill To */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Bill To
          </h3>
          <div className="text-gray-900">
            <div className="font-semibold">{companyName}</div>
            <div className="text-sm text-gray-600">{companyEmail}</div>
          </div>
        </div>

        {/* Line Items */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Invoice Details
          </h3>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoice.line_items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.description}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900">
                      {formatCurrency(item.unit_price, invoice.currency)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                      {formatCurrency(item.amount, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-full max-w-sm space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(invoice.subtotal, invoice.currency)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                GST ({formatGSTRate(invoice.gst_rate_snapshot)})
              </span>
              <span className="font-medium text-gray-900">
                {formatCurrency(invoice.tax_amount, invoice.currency)}
              </span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-3">
              <span className="text-gray-900">Total</span>
              <span className="text-blue-600">
                {formatCurrency(invoice.total_amount, invoice.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Actions */}
        {canPay && invoice.razorpay_payment_link && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-semibold text-blue-900">
                  Payment Required
                </h4>
                <p className="text-sm text-blue-700 mt-1">
                  Click below to pay this invoice via Razorpay
                </p>
              </div>
              <a
                href={invoice.razorpay_payment_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Pay {formatCurrency(invoice.total_amount, invoice.currency)}
              </a>
            </div>
          </div>
        )}

        {/* Razorpay Branding */}
        <div className="mt-6 text-center text-xs text-gray-500">
          Powered by{' '}
          <a
            href="https://razorpay.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Razorpay
          </a>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusInfo = getPaymentStatusInfo(status as any);

  const colorClasses = {
    gray: 'bg-gray-100 text-gray-800',
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
    blue: 'bg-blue-100 text-blue-800',
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
        colorClasses[statusInfo.color]
      }`}
    >
      {statusInfo.label}
    </span>
  );
}
