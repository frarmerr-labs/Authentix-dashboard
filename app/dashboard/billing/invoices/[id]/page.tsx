/**
 * INVOICE DETAIL PAGE
 *
 * Detailed view of single invoice with line items and payment options.
 */

import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { InvoiceDetail } from '../../components/invoice-detail';

export const metadata: Metadata = {
  title: 'Invoice Detail | Billing',
  description: 'View invoice details',
};

interface InvoiceDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function InvoiceDetailPage({
  params,
}: InvoiceDetailPageProps) {
  const { id } = await params;
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
    .select('id, name, email')
    .eq('id', profile.company_id)
    .single();

  if (!company) {
    redirect('/onboarding');
  }

  // Verify invoice belongs to this company
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('id, company_id')
    .eq('id', id)
    .eq('company_id', company.id)
    .single();

  if (error || !invoice) {
    notFound();
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <div className="mb-6">
        <Link
          href="/dashboard/billing"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Billing
        </Link>
      </div>

      {/* Invoice Detail */}
      <InvoiceDetail
        invoiceId={id}
        companyName={company.name}
        companyEmail={company.email}
      />

      {/* Print Button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          Print Invoice
        </button>
      </div>
    </div>
  );
}
