"use server";

import { createClient } from "@/lib/supabase/server";
import { generateApplicationId, generateAPIKey, hashAPIKey } from "@/lib/utils/ids";

export interface BootstrapResult {
  success: boolean;
  applicationId?: string;
  apiKey?: string;
  error?: string;
}

/**
 * Bootstrap or Regenerate Company Identity
 *
 * This action:
 * 1. Generates a new application_id (xen_<env>_<base32>)
 * 2. Generates a new API key (xen_<env>_live_<base64url>)
 * 3. Hashes the API key using SHA-256
 * 4. Updates the company record
 *
 * SECURITY:
 * - Only admins can execute this
 * - API key is returned ONCE
 * - Only SHA-256 hash is stored
 *
 * @returns The new application_id and API key (shown once)
 */
export async function bootstrapCompanyIdentity(): Promise<BootstrapResult> {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Authentication required",
      };
    }

    // Get user's company and role
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("company_id, role")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      return {
        success: false,
        error: "User not found",
      };
    }

    // Only admins can bootstrap
    if (userData.role !== "admin") {
      return {
        success: false,
        error: "Admin access required",
      };
    }

    // Generate new identifiers
    const newApplicationId = generateApplicationId();
    const newAPIKey = generateAPIKey();
    const apiKeyHash = hashAPIKey(newAPIKey);

    // Update company with new identifiers
    const { error: updateError } = await supabase
      .from("companies")
      .update({
        application_id: newApplicationId,
        api_key_hash: apiKeyHash,
        api_enabled: true,
        api_key_created_at: new Date().toISOString(),
        api_key_last_rotated_at: new Date().toISOString(),
      })
      .eq("id", userData.company_id);

    if (updateError) {
      console.error("Failed to update company:", updateError);
      return {
        success: false,
        error: "Failed to update company identity",
      };
    }

    // Return the plaintext API key (shown once)
    return {
      success: true,
      applicationId: newApplicationId,
      apiKey: newAPIKey,
    };
  } catch (error: any) {
    console.error("Bootstrap error:", error);
    return {
      success: false,
      error: error.message || "Internal error",
    };
  }
}

/**
 * Rotate API Key Only
 *
 * Generates a new API key without changing application_id
 *
 * @returns The new API key (shown once)
 */
export async function rotateAPIKey(): Promise<BootstrapResult> {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Authentication required",
      };
    }

    // Get user's company and role
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("company_id, role")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      return {
        success: false,
        error: "User not found",
      };
    }

    // Only admins can rotate keys
    if (userData.role !== "admin") {
      return {
        success: false,
        error: "Admin access required",
      };
    }

    // Get current application_id
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("application_id")
      .eq("id", userData.company_id)
      .single();

    if (companyError || !company) {
      return {
        success: false,
        error: "Company not found",
      };
    }

    // Generate new API key
    const newAPIKey = generateAPIKey();
    const apiKeyHash = hashAPIKey(newAPIKey);

    // Update only the API key
    const { error: updateError } = await supabase
      .from("companies")
      .update({
        api_key_hash: apiKeyHash,
        api_enabled: true,
        api_key_last_rotated_at: new Date().toISOString(),
      })
      .eq("id", userData.company_id);

    if (updateError) {
      console.error("Failed to rotate API key:", updateError);
      return {
        success: false,
        error: "Failed to rotate API key",
      };
    }

    // Return the plaintext API key (shown once)
    return {
      success: true,
      applicationId: company.application_id,
      apiKey: newAPIKey,
    };
  } catch (error: any) {
    console.error("API key rotation error:", error);
    return {
      success: false,
      error: error.message || "Internal error",
    };
  }
}
