/**
 * BILLING DASHBOARD PAGE
 *
 * Main billing page showing current month usage and invoice history.
 * Updates in real-time via Supabase subscriptions.
 */

import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { BillingOverview } from './components/billing-overview';
import { InvoiceList } from './components/invoice-list';

export const metadata: Metadata = {
  title: 'Billing | Dashboard',
  description: 'View your billing information and invoices',
};

export default async function BillingPage() {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // Get user's company
  const { data: profile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', session.user.id)
    .single();

  if (!profile?.company_id) {
    redirect('/onboarding');
  }

  // Get company details
  const { data: company } = await supabase
    .from('companies')
    .select('id, name')
    .eq('id', profile.company_id)
    .single();

  if (!company) {
    redirect('/onboarding');
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Billing</h1>
        <p className="mt-2 text-sm text-gray-600">
          Track your usage and manage invoices for {company.name}
        </p>
      </div>

      {/* Billing Overview */}
      <div className="mb-8">
        <BillingOverview companyId={company.id} />
      </div>

      {/* Invoice History */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Invoice History
        </h2>
        <InvoiceList companyId={company.id} />
      </div>
    </div>
  );
}
