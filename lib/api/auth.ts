import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";
import { verifyAPIKey, validateApplicationId, validateAPIKey } from "@/lib/utils/ids";

export interface APIAuthContext {
  companyId: string;
  applicationId: string;
  authenticated: true;
}

export interface APIAuthError {
  authenticated: false;
  error: string;
  status: number;
}

export type APIAuthResult = APIAuthContext | APIAuthError;

/**
 * Authenticates API requests using Application ID and API Key
 *
 * Expected Headers:
 * - X-Application-ID: The company's application_id
 * - Authorization: Bearer <api-key>
 *
 * Returns company context if valid, or error details if invalid
 */
export async function authenticateAPIRequest(
  request: NextRequest
): Promise<APIAuthResult> {
  const applicationId = request.headers.get("x-application-id");
  const authHeader = request.headers.get("authorization");

  // Validate headers are present
  if (!applicationId) {
    return {
      authenticated: false,
      error: "Missing X-Application-ID header",
      status: 401,
    };
  }

  // Validate Application ID format
  if (!validateApplicationId(applicationId)) {
    return {
      authenticated: false,
      error: "Invalid Application ID format. Expected: xen_<env>_<base32>",
      status: 401,
    };
  }

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      authenticated: false,
      error: "Missing or invalid Authorization header. Expected: Bearer <api-key>",
      status: 401,
    };
  }

  const apiKey = authHeader.substring(7); // Remove "Bearer " prefix

  if (!apiKey) {
    return {
      authenticated: false,
      error: "API key is empty",
      status: 401,
    };
  }

  // Validate API Key format
  if (!validateAPIKey(apiKey)) {
    return {
      authenticated: false,
      error: "Invalid API key format. Expected: xen_<env>_live_<base64url>",
      status: 401,
    };
  }

  try {
    const supabase = await createClient();

    // Fetch company with application_id and api_key_hash
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, api_enabled, api_key_hash, deleted_at")
      .eq("application_id", applicationId)
      .is("deleted_at", null)
      .single();

    if (companyError || !company) {
      return {
        authenticated: false,
        error: "Invalid Application ID",
        status: 401,
      };
    }

    // Check if API is enabled for this company
    if (!company.api_enabled) {
      return {
        authenticated: false,
        error: "API access is disabled for this company",
        status: 403,
      };
    }

    // Check if API key hash exists
    if (!company.api_key_hash) {
      return {
        authenticated: false,
        error: "No API key configured for this company",
        status: 401,
      };
    }

    // Verify the API key by hashing in code and comparing
    // CRITICAL: Hash is computed in application code, not in database
    const isValid = verifyAPIKey(apiKey, company.api_key_hash);

    if (!isValid) {
      return {
        authenticated: false,
        error: "Invalid API key",
        status: 401,
      };
    }

    // Authentication successful
    return {
      authenticated: true,
      companyId: company.id,
      applicationId: applicationId,
    };
  } catch (error: any) {
    console.error("API authentication error:", error);
    return {
      authenticated: false,
      error: "Internal authentication error",
      status: 500,
    };
  }
}

/**
 * Helper to create a JSON error response
 */
export function createAPIErrorResponse(error: string, status: number) {
  return Response.json(
    {
      error,
      success: false,
    },
    { status }
  );
}

/**
 * Middleware wrapper for API routes requiring authentication
 *
 * Usage:
 * ```
 * export async function POST(request: NextRequest) {
 *   return withAPIAuth(request, async (context) => {
 *     // Your authenticated route logic here
 *     // Access context.companyId and context.applicationId
 *     return Response.json({ success: true });
 *   });
 * }
 * ```
 */
export async function withAPIAuth(
  request: NextRequest,
  handler: (context: APIAuthContext) => Promise<Response>
): Promise<Response> {
  const authResult = await authenticateAPIRequest(request);

  if (!authResult.authenticated) {
    return createAPIErrorResponse(authResult.error, authResult.status);
  }

  return handler(authResult);
}
