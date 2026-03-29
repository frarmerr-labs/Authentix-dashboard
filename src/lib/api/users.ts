/**
 * USERS DOMAIN API
 *
 * User profile retrieval and updates.
 */

import { apiRequest, ApiError, ApiResponse, API_BASE_URL } from "./core";
import type { OrganizationLogoFields } from "@/lib/types/organization";

export const usersApi = {
  getProfile: async () => {
    const response = await apiRequest<{
      id: string;
      email: string;
      full_name: string | null;
      organization_id: string;
      organization: ({ name: string } & OrganizationLogoFields) | null;
    }>("/users/me");
    return response.data!;
  },

  updateProfile: async (data: { full_name?: string }, avatarFile?: File) => {
    if (avatarFile) {
      const formData = new FormData();
      if (data.full_name) formData.append("full_name", data.full_name);
      formData.append("avatar", avatarFile);

      const response = await fetch(`${API_BASE_URL}/users/me`, {
        method: "PATCH",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new ApiError("HTTP_ERROR", "Failed to update user profile with avatar");
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const json = (await response.json()) as ApiResponse<any>;
      return json.data!;
    }

    const response = await apiRequest<{
      id: string;
      email: string;
      full_name: string | null;
    }>("/users/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return response.data!;
  },
};
