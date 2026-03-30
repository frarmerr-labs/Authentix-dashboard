/**
 * BillingOverview — legacy component kept for reference.
 * The billing page now renders inline instead of using this component.
 * @deprecated Use the billing page directly.
 */

'use client';

import { useBillingOverview } from '@/lib/hooks/queries/billing';

interface BillingOverviewProps {
  organizationId: string;
}

export function BillingOverview({ organizationId: _organizationId }: BillingOverviewProps) {
  const { priceBook, usage, loading, error } = useBillingOverview();

  if (loading) return <div className="animate-pulse h-32 bg-muted rounded-lg" />;
  if (error) return <div className="text-destructive text-sm">{error}</div>;
  if (!usage || !priceBook) return null;

  return (
    <div className="text-sm text-muted-foreground">
      {usage.certificate_count} certificates · est. {usage.estimated_total} {usage.currency}
    </div>
  );
}
