/**
 * USE INVOICE DETAIL HOOK
 *
 * Fetches single invoice with line items.
 * Provides real-time updates for invoice status changes.
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { InvoiceWithLineItems, Invoice, InvoiceLineItem } from '../types';

export function useInvoiceDetail(invoiceId: string) {
  const [invoice, setInvoice] = useState<InvoiceWithLineItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Fetch invoice with line items
  const fetchInvoice = async () => {
    try {
      // Fetch invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (invoiceError) throw invoiceError;

      // Fetch line items
      const { data: lineItems, error: lineItemsError } = await supabase
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('created_at', { ascending: true });

      if (lineItemsError) throw lineItemsError;

      setInvoice({
        ...(invoiceData as Invoice),
        line_items: (lineItems as InvoiceLineItem[]) || [],
      });

      setLoading(false);
    } catch (err: any) {
      console.error('Failed to fetch invoice:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (invoiceId) {
      fetchInvoice();
    }
  }, [invoiceId]);

  // Real-time subscription to invoice updates
  useEffect(() => {
    if (!invoiceId) return;

    const channel = supabase
      .channel(`invoice_detail_${invoiceId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'invoices',
          filter: `id=eq.${invoiceId}`,
        },
        (payload) => {
          console.log('[Billing] Invoice updated:', payload);

          // Update invoice data
          setInvoice((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              ...(payload.new as Invoice),
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [invoiceId]);

  return {
    invoice,
    loading,
    error,
    refresh: fetchInvoice,
  };
}
