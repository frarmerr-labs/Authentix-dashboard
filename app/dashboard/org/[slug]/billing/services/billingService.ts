/**
 * BILLING — SERVICE LAYER
 *
 * Wraps all API calls for the billing domain.
 */

import { api } from "@/lib/api/client";
import { ok, fromThrown, type ApiResult } from "@/lib/api/result";
import { logger } from "@/lib/logger";
import type { BillingUsage, BillingPriceBook, Invoice } from "@/lib/api/billing";

const svcLogger = logger.child({ service: "billing" });

export async function loadBillingOverview(): Promise<
  ApiResult<{ usage: BillingUsage; priceBook: BillingPriceBook }>
> {
  try {
    const result = await api.billing.getOverview();
    return ok({ usage: result.current_usage, priceBook: result.price_book });
  } catch (e) {
    svcLogger.error("Failed to load billing overview", { error: e instanceof Error ? e.message : String(e) });
    return fromThrown(e, "Failed to load billing overview");
  }
}

export async function listInvoices(
  params?: { page?: number; limit?: number; status?: string },
): Promise<ApiResult<{ items: Invoice[] }>> {
  try {
    const result = await api.billing.listInvoices(params);
    return ok({ items: result.items ?? [] });
  } catch (e) {
    return fromThrown(e, "Failed to load invoices");
  }
}
