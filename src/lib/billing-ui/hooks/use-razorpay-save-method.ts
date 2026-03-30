'use client';

/**
 * useRazorpaySaveMethod
 *
 * Opens Razorpay Checkout in recurring / mandate-setup mode to tokenize
 * a card or UPI VPA. On success the token is saved via the backend.
 *
 * RBI-compliant flow (2026):
 *   1. Backend creates an order with customer_id attached (₹1 auth charge)
 *   2. Checkout JS opens with recurring:1 + subscription_registration config
 *   3. User authorises; Razorpay creates a token on the customer
 *   4. Backend verifies signature, fetches token details, stores locally
 */

import { useState, useCallback } from 'react';
import { api } from '@/lib/api/client';
import type { PaymentMethod } from '@/lib/api/billing';

declare global {
  interface Window {
    Razorpay: new (options: RazorpayRecurringOptions) => { open(): void };
  }
}

interface RazorpayRecurringOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  customer_id: string;
  name: string;
  description: string;
  recurring: number;           // 1 = mandate setup
  subscription_registration: {
    method: 'card' | 'upi';
    auth_type: '3ds' | 'netbanking';
    max_payment_amount: number; // in paise — ceiling for future charges
    expire_by: number;          // epoch seconds
  };
  prefill?: { email?: string; contact?: string; name?: string };
  theme?: { color?: string };
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  modal?: { ondismiss?: () => void };
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

interface UseRazorpaySaveMethodOptions {
  orgName?: string;
  billingEmail?: string;
  onSuccess?: (method: PaymentMethod) => void;
  onError?: (message: string) => void;
  onDismiss?: () => void;
}

export function useRazorpaySaveMethod(options: UseRazorpaySaveMethodOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveMethod = useCallback(async (methodType: 'card' | 'upi') => {
    setLoading(true);
    setError(null);

    try {
      await loadRazorpayScript();

      // Backend creates order for mandate setup
      const setup = await api.billing.setupPaymentMethod(methodType);

      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: setup.razorpay_key_id,
          amount: setup.amount_paise,        // ₹1 authorization
          currency: setup.currency,
          order_id: setup.razorpay_order_id,
          customer_id: setup.razorpay_customer_id,
          name: options.orgName ?? 'Authentix',
          description: methodType === 'card' ? 'Save card for future payments' : 'Set up UPI autopay',
          recurring: 1,
          subscription_registration: {
            method: methodType,
            // 3ds for card (Visa/MC OTP), netbanking for UPI (UPI PIN)
            auth_type: methodType === 'card' ? '3ds' : 'netbanking',
            // Max ₹5,00,000 per charge — adjust if needed
            max_payment_amount: 50000000,
            // Mandate valid for 10 years
            expire_by: Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 60 * 60,
          },
          prefill: { email: options.billingEmail },
          theme: { color: '#0066FF' },
          handler: async (response) => {
            try {
              const result = await api.billing.savePaymentMethod({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                method_type: methodType,
              });
              options.onSuccess?.(result.method);
              resolve();
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Failed to save payment method';
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
      const msg = err instanceof Error ? err.message : 'Payment method setup failed';
      setError(msg);
      options.onError?.(msg);
    } finally {
      setLoading(false);
    }
  }, [options]);

  return { saveMethod, loading, error };
}
