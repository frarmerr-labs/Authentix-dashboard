/**
 * BILLING — SERVICE LAYER
 *
 * Wraps all API calls for the billing domain.
 * Normalises responses into ApiResult<T> for consistent error handling.
 */

import { api } from "@/lib/api/client";
import { ok, fromThrown, type ApiResult } from "@/lib/api/result";
import { logger } from "@/lib/logger";
import type { BillingUsage, BillingProfile, Invoice } from "../schema/types";

const svcLogger = logger.child({ service: "billing" });

// ── Overview ──────────────────────────────────────────────────────────────────

/**
 * Load the current billing overview (usage + profile).
 */
export async function loadBillingOverview(): Promise<
  ApiResult<{ usage: BillingUsage; profile: BillingProfile }>
> {
  try {
    const result = await api.billing.getOverview();
    const usage = (result.current_usage ?? result.current_period ?? {}) as BillingUsage;
    const profile = (result.billing_profile ?? {}) as BillingProfile;
    return ok({ usage, profile });
  } catch (e) {
    svcLogger.error("Failed to load billing overview", { error: e instanceof Error ? e.message : String(e) });
    return fromThrown(e, "Failed to load billing overview");
  }
}

// ── Invoices ──────────────────────────────────────────────────────────────────

/**
 * List invoices, paginated.
 */
export async function listInvoices(
  params?: { page?: number; limit?: number; status?: string },
): Promise<ApiResult<{ items: Invoice[] }>> {
  try {
    const result = await api.billing.listInvoices(params);
    return ok({ items: (result.items ?? []) as Invoice[] });
  } catch (e) {
    return fromThrown(e, "Failed to load invoices");
  }
}
