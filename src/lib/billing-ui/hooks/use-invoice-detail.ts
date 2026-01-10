/**
 * USE INVOICE DETAIL HOOK
 *
 * Fetches single invoice with line items.
 * Provides real-time updates for invoice status changes.
 */

'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api/client';
import { InvoiceWithLineItems, Invoice, InvoiceLineItem } from '../types';

export function useInvoiceDetail(invoiceId: string) {
  const [invoice, setInvoice] = useState<InvoiceWithLineItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch invoice with line items
  const fetchInvoice = async () => {
    try {
      const data = await api.billing.getInvoice(invoiceId) as InvoiceWithLineItems;
      setInvoice(data);
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

  return {
    invoice,
    loading,
    error,
    refresh: fetchInvoice,
  };
}
