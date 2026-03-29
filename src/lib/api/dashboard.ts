/**
 * DASHBOARD DOMAIN API
 *
 * Dashboard stats and analytics.
 */

import { apiRequest } from "./core";

export const dashboardApi = {
  getStats: async () => {
    const response = await apiRequest<{
      stats: {
        totalCertificates?: number;
        pendingJobs?: number;
        verificationsToday?: number;
        revokedCertificates?: number;
        verificationEventsTotal?: number;
      };
      recentImports?: Array<{
        id: string;
        file_name?: string | null;
        files?: { original_name?: string | null } | null;
        status: string;
        total_rows: number;
        created_at: string;
      }>;
      recentVerifications?: Array<{
        id: string;
        result?: string | null;
        verified_at: string;
        certificate?: {
          recipient_name?: string | null;
          course_name?: string | null;
        } | null;
      }>;
      certificatesDaily?: Array<{
        date: string;
        issued: number;
        revoked: number;
        verificationScans?: number;
      }>;
      certificateCategoryMix?: Array<{
        categoryId: string | null;
        subcategoryId: string | null;
        categoryName: string;
        subcategoryName: string;
        count: number;
      }>;
    }>("/dashboard/stats");
    return response.data!;
  },
};
