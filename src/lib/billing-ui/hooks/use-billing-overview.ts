/**
 * USE BILLING OVERVIEW HOOK
 *
 * Fetches current month usage and billing profile from backend API.
 */

'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api/client';
import { CurrentMonthUsage, BillingProfile } from '../types';

export function useBillingOverview(organizationId: string) {
  const [usage, setUsage] = useState<CurrentMonthUsage | null>(null);
  const [billingProfile, setBillingProfile] = useState<BillingProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = async () => {
    try {
      setLoading(true);
      setError(null);

      const overview = await api.billing.getOverview();

      // Map backend response to frontend types
      if (overview.billing_profile) {
        setBillingProfile(overview.billing_profile);
      }

      if (overview.current_usage) {
        setUsage(overview.current_usage);
      }

      setLoading(false);
    } catch (err: any) {
      console.error('Failed to fetch billing overview:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organizationId) {
      loadOverview();
    }
  }, [organizationId]);

  return {
    usage,
    billingProfile,
    loading,
    error,
    refresh: loadOverview,
  };
}
