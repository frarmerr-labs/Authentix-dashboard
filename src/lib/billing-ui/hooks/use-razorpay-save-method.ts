'use client';

/**
 * useRazorpaySaveCard
 *
 * Opens a standard Razorpay ₹1 payment to capture and save card details.
 * No mandate/subscription_registration — works with all test and production cards.
 *
 * Test card details (Razorpay test mode):
 *   Card number : 4111 1111 1111 1111
 *   Expiry      : any future date (e.g. 12/26)
 *   CVV         : 111
 *   OTP         : 1234
 */

import { useState, useCallback } from 'react';
import { api } from '@/lib/api/client';
import type { PaymentMethod } from '@/lib/api/billing';

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

interface UseRazorpaySaveCardOptions {
  orgName?: string;
  billingEmail?: string;
  onSuccess?: (method: PaymentMethod) => void;
  onError?: (message: string) => void;
  onDismiss?: () => void;
}

export function useRazorpaySaveMethod(options: UseRazorpaySaveCardOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveMethod = useCallback(async (_methodType: 'card' | 'upi') => {
    // UPI is handled via the UPI dialog — this hook only handles card
    setLoading(true);
    setError(null);

    try {
      await loadRazorpayScript();

      const setup = await api.billing.setupCardPayment();

      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: setup.razorpay_key_id,
          amount: setup.amount_paise,
          currency: setup.currency,
          order_id: setup.razorpay_order_id,
          name: options.orgName ?? 'Authentix',
          description: 'Add card for future payments',
          prefill: { email: options.billingEmail },
          theme: { color: '#0066FF' },
          handler: async (response) => {
            try {
              const result = await api.billing.saveCardFromCheckout({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              });
              options.onSuccess?.(result.method);
              resolve();
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Failed to save card';
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
      const msg = err instanceof Error ? err.message : 'Card setup failed';
      setError(msg);
      options.onError?.(msg);
    } finally {
      setLoading(false);
    }
  }, [options]);

  return { saveMethod, loading, error };
}
