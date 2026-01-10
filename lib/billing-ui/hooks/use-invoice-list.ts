/**
 * USE INVOICE LIST HOOK
 *
 * Fetches invoice history for company.
 * Provides real-time updates via Supabase subscriptions.
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Invoice } from '../types';

export function useInvoiceList(companyId: string) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Fetch invoices
  const fetchInvoices = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('invoices')
        .select('*')
        .eq('company_id', companyId)
        .order('period_end', { ascending: false });

      if (fetchError) throw fetchError;

      setInvoices(data || []);
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

  // Real-time subscription to invoices
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel(`invoice_list_${companyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices',
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          console.log('[Billing] Invoice change detected:', payload);

          if (payload.eventType === 'INSERT') {
            setInvoices((prev) => [payload.new as Invoice, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setInvoices((prev) =>
              prev.map((inv) =>
                inv.id === payload.new.id ? (payload.new as Invoice) : inv
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setInvoices((prev) =>
              prev.filter((inv) => inv.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  return {
    invoices,
    loading,
    error,
    refresh: fetchInvoices,
  };
}
