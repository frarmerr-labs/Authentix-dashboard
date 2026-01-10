/**
 * BILLING OVERVIEW COMPONENT
 *
 * Displays current month usage and estimated bill.
 * Updates in real-time as certificates are issued.
 */

'use client';

import { useBillingOverview } from '@/lib/billing-ui/hooks/use-billing-overview';
import { formatCurrency, formatGSTRate } from '@/lib/billing-ui/utils/currency-formatter';
import { getCurrentBillingPeriod } from '@/lib/billing-ui/utils/invoice-helpers';

interface BillingOverviewProps {
  companyId: string;
}

export function BillingOverview({ companyId }: BillingOverviewProps) {
  const { usage, billingProfile, loading, error } = useBillingOverview(companyId);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-semibold">Error Loading Billing</h3>
        <p className="text-red-600 text-sm mt-2">{error}</p>
      </div>
    );
  }

  if (!usage || !billingProfile) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-yellow-800 font-semibold">No Billing Profile</h3>
        <p className="text-yellow-700 text-sm mt-2">
          Please contact support to set up billing.
        </p>
      </div>
    );
  }

  const period = getCurrentBillingPeriod();

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Current Billing Period</h2>
          <p className="text-gray-600 mt-1">{period.label}</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          Live
        </div>
      </div>

      {/* Usage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Certificates Issued */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-600 mb-1">
            Certificates Issued
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {usage.certificate_count}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            @ {formatCurrency(billingProfile.certificate_unit_price, usage.currency)} per certificate
          </div>
        </div>

        {/* Estimated Total */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm font-medium text-blue-700 mb-1">
            Estimated Total
          </div>
          <div className="text-3xl font-bold text-blue-900">
            {formatCurrency(usage.estimated_total, usage.currency)}
          </div>
          <div className="text-xs text-blue-600 mt-1">
            Including GST ({formatGSTRate(usage.gst_rate)})
          </div>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="border-t border-gray-200 pt-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Platform Fee</span>
          <span className="font-medium text-gray-900">
            {formatCurrency(usage.platform_fee, usage.currency)}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">
            Certificate Usage ({usage.certificate_count} × {formatCurrency(billingProfile.certificate_unit_price, usage.currency)})
          </span>
          <span className="font-medium text-gray-900">
            {formatCurrency(usage.usage_cost, usage.currency)}
          </span>
        </div>

        <div className="flex justify-between text-sm border-t border-gray-200 pt-3">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-medium text-gray-900">
            {formatCurrency(usage.subtotal, usage.currency)}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">
            GST ({formatGSTRate(usage.gst_rate)})
          </span>
          <span className="font-medium text-gray-900">
            {formatCurrency(usage.gst_amount, usage.currency)}
          </span>
        </div>

        <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-3">
          <span className="text-gray-900">Estimated Total</span>
          <span className="text-blue-600">
            {formatCurrency(usage.estimated_total, usage.currency)}
          </span>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-xs text-yellow-800">
          <strong>Note:</strong> This is an estimated amount based on current usage.
          Final invoice will be generated at the end of the month.
        </p>
      </div>
    </div>
  );
}
