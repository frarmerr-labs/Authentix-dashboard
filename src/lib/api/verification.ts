/**
 * VERIFICATION DOMAIN API
 *
 * Public certificate verification endpoint.
 */

import { ApiError, ApiResponse, extractApiError, API_BASE_URL } from "./core";

export const verificationApi = {
  verify: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/verification/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    const data = (await response.json()) as ApiResponse;
    if (!response.ok || !data.success) {
      const { code, message: errorMsg } = extractApiError(data.error, "Verification failed");
      throw new ApiError(code, errorMsg);
    }

    return data.data!;
  },
};
