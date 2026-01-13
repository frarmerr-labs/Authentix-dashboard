/**
 * BILLING DASHBOARD PAGE
 *
 * Main billing page showing current month usage and invoice history.
 */

"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';
import { BillingOverview } from './components/billing-overview';
import { InvoiceList } from './components/invoice-list';

export default function BillingPage() {
  const [company, setCompany] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadCompany();
  }, []);

  const loadCompany = async () => {
    try {
      const organizationData = await api.organizations.get() as { id: string; name: string };
      setCompany({ id: organizationData.id, name: organizationData.name });
    } catch (error) {
      console.error('Error loading company:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!company) {
    return null;
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
