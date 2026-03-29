/**
 * DELIVERY SETTINGS — SERVICE LAYER
 *
 * Wraps all API calls for the delivery settings page.
 */

import { api, type DeliveryIntegration, type CreateIntegrationDto } from "@/lib/api/client";
import { ok, fromThrown, type ApiResult } from "@/lib/api/result";
import { logger } from "@/lib/logger";
import type { IntegrationFormData } from "../schema/types";

const svcLogger = logger.child({ service: "deliverySettings" });

/**
 * Load all delivery integrations for the current organisation.
 */
export async function loadIntegrations(): Promise<ApiResult<DeliveryIntegration[]>> {
  try {
    const list = await api.delivery.listIntegrations();
    return ok(list ?? []);
  } catch (e) {
    return fromThrown(e, "Failed to load delivery integrations");
  }
}

/**
 * Create a new delivery integration.
 * Maps IntegrationFormData (UI shape) → CreateIntegrationDto (API shape).
 */
export async function createIntegration(
  data: IntegrationFormData,
): Promise<ApiResult<DeliveryIntegration>> {
  try {
    const dto: CreateIntegrationDto = {
      channel: "email",
      provider: data.provider,
      display_name: data.display_name,
      from_email: data.from_email,
      from_name: data.from_name,
      reply_to: data.reply_to,
      is_default: data.is_default,
      smtp_host: data.smtp_host,
      smtp_port: data.smtp_port,
      smtp_secure: data.smtp_secure,
      smtp_user: data.smtp_user,
      smtp_password: data.smtp_password,
    };
    const result = await api.delivery.createIntegration(dto);
    svcLogger.info("Integration created", { provider: data.provider });
    return ok(result);
  } catch (e) {
    return fromThrown(e, "Failed to create integration");
  }
}

/**
 * Update an existing delivery integration.
 */
export async function updateIntegration(
  id: string,
  data: Partial<IntegrationFormData>,
): Promise<ApiResult<DeliveryIntegration>> {
  try {
    const result = await api.delivery.updateIntegration(id, data as Partial<CreateIntegrationDto>);
    svcLogger.info("Integration updated", { id });
    return ok(result);
  } catch (e) {
    return fromThrown(e, "Failed to update integration");
  }
}

/**
 * Delete a delivery integration.
 */
export async function deleteIntegration(id: string): Promise<ApiResult<void>> {
  try {
    await api.delivery.deleteIntegration(id);
    svcLogger.info("Integration deleted", { id });
    return ok(undefined);
  } catch (e) {
    return fromThrown(e, "Failed to delete integration");
  }
}
