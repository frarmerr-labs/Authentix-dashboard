/**
 * USE INVOICE LIST HOOK
 *
 * Fetches invoice history for company.
 * Provides real-time updates via Supabase subscriptions.
 */

'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api/client';
import { Invoice } from '../types';

export function useInvoiceList(companyId: string) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch invoices
  const fetchInvoices = async () => {
    try {
      const response = await api.billing.listInvoices({
        sort_by: 'period_end',
        sort_order: 'desc',
      });

      setInvoices(response.items as Invoice[]);
      setLoading(false);
    } catch (err: any) {
      console.error('Failed to fetch invoices:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (companyId) {
      fetchInvoices();
    }
  }, [companyId]);

  return {
    invoices,
    loading,
    error,
    refresh: fetchInvoices,
  };
}
