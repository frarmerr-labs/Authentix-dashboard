/**
 * USE BILLING OVERVIEW HOOK
 *
 * Fetches current month usage and billing profile.
 * Provides real-time updates via Supabase subscriptions.
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CurrentMonthUsage, BillingProfile } from '../types';
import { getCurrentBillingPeriod } from '../utils/invoice-helpers';

export function useBillingOverview(companyId: string) {
  const [usage, setUsage] = useState<CurrentMonthUsage | null>(null);
  const [billingProfile, setBillingProfile] = useState<BillingProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Fetch billing profile
  useEffect(() => {
    async function fetchBillingProfile() {
      try {
        const { data, error } = await supabase
          .from('billing_profiles')
          .select('*')
          .eq('company_id', companyId)
          .single();

        if (error) throw error;
        setBillingProfile(data);
      } catch (err: any) {
        console.error('Failed to fetch billing profile:', err);
        setError(err.message);
      }
    }

    if (companyId) {
      fetchBillingProfile();
    }
  }, [companyId, supabase]);

  // Calculate current month usage
  const calculateUsage = async () => {
    if (!billingProfile) return;

    try {
      const period = getCurrentBillingPeriod();

      // Count unbilled certificates in current month
      const { count, error: countError } = await supabase
        .from('certificates')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gte('issued_at', period.start.toISOString())
        .lte('issued_at', period.end.toISOString())
        .is('invoice_id', null) // Only unbilled certificates
        .is('deleted_at', null);

      if (countError) throw countError;

      const certificate_count = count || 0;

      // Calculate estimated costs
      const platform_fee = billingProfile.platform_fee_amount;
      const usage_cost = certificate_count * billingProfile.certificate_unit_price;
      const subtotal = platform_fee + usage_cost;
      const gst_amount = subtotal * (billingProfile.gst_rate / 100);
      const estimated_total = subtotal + gst_amount;

      setUsage({
        certificate_count,
        platform_fee,
        usage_cost,
        subtotal,
        gst_amount,
        estimated_total,
        currency: billingProfile.currency,
        gst_rate: billingProfile.gst_rate,
      });

      setLoading(false);
    } catch (err: any) {
      console.error('Failed to calculate usage:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  // Initial calculation
  useEffect(() => {
    if (billingProfile) {
      calculateUsage();
    }
  }, [billingProfile]);

  // Real-time subscription to certificates
  useEffect(() => {
    if (!companyId || !billingProfile) return;

    const period = getCurrentBillingPeriod();

    // Subscribe to certificate changes
    const channel = supabase
      .channel(`billing_overview_${companyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'certificates',
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          console.log('[Billing] Certificate change detected:', payload);
          // Recalculate usage
          calculateUsage();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, billingProfile]);

  return {
    usage,
    billingProfile,
    loading,
    error,
    refresh: calculateUsage,
  };
}
