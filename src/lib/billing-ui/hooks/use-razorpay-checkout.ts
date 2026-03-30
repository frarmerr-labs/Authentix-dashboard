'use client';

/**
 * useRazorpayCheckout
 *
 * Loads Razorpay Checkout JS on demand, opens the payment modal,
 * and calls the backend verify endpoint on success.
 *
 * Usage:
 *   const { pay, loading } = useRazorpayCheckout({ onSuccess, onError });
 *   await pay(invoiceId);
 */

import { useState, useCallback } from 'react';
import { api } from '@/lib/api/client';
import type { Invoice } from '@/lib/api/billing';

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: { email?: string; contact?: string; name?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open(): void;
}

interface UseRazorpayCheckoutOptions {
  orgName?: string;
  billingEmail?: string;
  onSuccess?: (invoice: Invoice) => void;
  onError?: (message: string) => void;
  onDismiss?: () => void;
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay checkout script'));
    document.body.appendChild(script);
  });
}

export function useRazorpayCheckout(options: UseRazorpayCheckoutOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = useCallback(async (invoiceId: string) => {
    setLoading(true);
    setError(null);

    try {
      await loadRazorpayScript();

      const order = await api.billing.createPaymentOrder(invoiceId);

      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: order.razorpay_key_id,
          amount: order.amount_paise,
          currency: order.currency,
          name: options.orgName ?? 'Authentix',
          description: `Invoice ${order.invoice_number}`,
          order_id: order.razorpay_order_id,
          prefill: {
            email: options.billingEmail,
          },
          notes: { invoice_id: invoiceId },
          theme: { color: '#0066FF' },
          handler: async (response) => {
            try {
              const result = await api.billing.verifyPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                invoice_id: invoiceId,
              });
              options.onSuccess?.(result.invoice);
              resolve();
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Payment verification failed';
              setError(msg);
              options.onError?.(msg);
              reject(err);
            }
          },
          modal: {
            ondismiss: () => {
              options.onDismiss?.();
              resolve();
            },
          },
        });

        rzp.open();
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Payment failed';
      setError(msg);
      options.onError?.(msg);
    } finally {
      setLoading(false);
    }
  }, [options]);

  return { pay, loading, error };
}
