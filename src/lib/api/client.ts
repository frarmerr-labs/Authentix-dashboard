/**
 * AUTHENTIX FRONTEND API CLIENT
 *
 * Centralized client for all API calls.
 * Uses cookie-based authentication (HttpOnly cookies set by server).
 *
 * Auth endpoints use Next.js Route Handlers (/api/auth/*).
 * Other endpoints go through /api/proxy/* to avoid CORS issues.
 */

/**
 * API Base URL - uses Next.js proxy route to avoid CORS
 * All requests go through /api/proxy which forwards to the backend
 */
const API_BASE_URL = "/api/proxy";

export interface ApiErrorData {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiErrorData | string;
  meta?: {
    request_id: string;
    timestamp: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface ImportJob {
  id: string;
  company_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  certificate_category?: string;
  certificate_subcategory?: string;
  certificate_template_id?: string;
  reusable: boolean;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_rows?: number;
  mapping?: Record<string, string>;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
  }
}

/**
 * Make API request to Next.js Route Handler (auth endpoints)
 */
async function authApiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `/api${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include", // Include cookies
  });

  const data = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !data.success) {
    const errorMessage =
      typeof data.error === "string"
        ? data.error
        : data.error?.message ?? "Request failed";
    const errorCode =
      typeof data.error === "object" ? data.error?.code ?? "API_ERROR" : "API_ERROR";

    throw new ApiError(errorCode, errorMessage);
  }

  return data.data as T;
}

/**
 * Make authenticated API request to backend
 * Cookies are automatically included via credentials: 'include'
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const url = `${API_BASE_URL}${endpoint}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      credentials: "include", // Include HttpOnly cookies
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Network error";
    console.error(`[API] Network error for ${url}:`, errorMessage);
    throw new ApiError(
      "NETWORK_ERROR",
      `Failed to connect to server. Please check your connection.`,
      { url, endpoint }
    );
  }

  // Handle non-JSON responses
  const contentType = response.headers.get("content-type");
  let data: ApiResponse<T>;

  try {
    if (contentType?.includes("application/json")) {
      data = (await response.json()) as ApiResponse<T>;
    } else {
      const text = await response.text();
      throw new ApiError(
        "INVALID_RESPONSE",
        `Unexpected response format`,
        { status: response.status, statusText: response.statusText }
      );
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      "PARSE_ERROR",
      `Failed to process response`,
      { status: response.status, statusText: response.statusText }
    );
  }

  if (!response.ok || !data.success) {
    // Handle 401 by potentially redirecting to login
    if (response.status === 401) {
      // Session expired - could trigger refresh here
      throw new ApiError("UNAUTHORIZED", "Session expired. Please sign in again.");
    }

    const error = data.error;
    const errorCode = typeof error === "object" ? error?.code ?? "HTTP_ERROR" : "HTTP_ERROR";
    const errorMessage =
      typeof error === "object"
        ? error?.message ?? `HTTP ${response.status}`
        : typeof error === "string"
        ? error
        : `HTTP ${response.status}: ${response.statusText}`;

    throw new ApiError(errorCode, errorMessage);
  }

  return data;
}

/**
 * API Client methods
 */
export const api = {
  /**
   * Auth API (uses Next.js Route Handlers)
   */
  auth: {
    login: async (email: string, password: string) => {
      return authApiRequest<{
        user: {
          id: string;
          email: string;
          full_name: string | null;
        };
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    },

    signup: async (
      email: string,
      password: string,
      full_name: string,
      company_name: string
    ) => {
      return authApiRequest<{
        user: {
          id: string;
          email: string;
          full_name: string | null;
        };
      }>("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password, full_name, company_name }),
      });
    },

    logout: async () => {
      return authApiRequest<void>("/auth/logout", {
        method: "POST",
      });
    },

    getSession: async () => {
      return authApiRequest<{
        user: {
          id: string;
          email: string;
          full_name: string | null;
        } | null;
        valid: boolean;
      }>("/auth/session");
    },

    /**
     * Get current authenticated user info including email verification status
     */
    me: async () => {
      const response = await apiRequest<{
        authenticated: boolean;
        user: {
          id: string;
          email: string;
          email_verified: boolean;
          full_name: string | null;
        } | null;
        organization?: {
          id: string;
          name: string;
        } | null;
      }>("/auth/me");
      return response.data!;
    },

    /**
     * Resend verification email
     */
    resendVerification: async () => {
      return authApiRequest<void>("/auth/resend-verification", {
        method: "POST",
      });
    },

    refresh: async () => {
      return authApiRequest<void>("/auth/refresh", {
        method: "POST",
      });
    },
  },

  /**
   * Templates API
   */
  templates: {
    list: async (params?: {
      page?: number;
      limit?: number;
      status?: string;
      sort_by?: string;
      sort_order?: "asc" | "desc";
    }) => {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set("page", params.page.toString());
      if (params?.limit) queryParams.set("limit", params.limit.toString());
      if (params?.status) queryParams.set("status", params.status);
      if (params?.sort_by) queryParams.set("sort_by", params.sort_by);
      if (params?.sort_order) queryParams.set("sort_order", params.sort_order);

      const response = await apiRequest<PaginatedResponse<unknown>>(
        `/templates?${queryParams.toString()}`
      );
      return response.data!;
    },

    get: async (id: string) => {
      const response = await apiRequest(`/templates/${id}`);
      return response.data!;
    },

    create: async (
      file: File,
      metadata: {
        name: string;
        description?: string;
        file_type?: "pdf" | "png" | "jpg" | "jpeg";
        certificate_category?: string;
        certificate_subcategory?: string;
        width?: number;
        height?: number;
        fields?: unknown[];
        status?: "draft" | "active" | "archived";
      }
    ): Promise<{
      id: string;
      name: string;
      file_type: string;
      status: string;
      certificate_category?: string;
      certificate_subcategory?: string;
      width?: number;
      height?: number;
      fields?: unknown[];
    }> => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("metadata", JSON.stringify(metadata));

      const response = await fetch(`${API_BASE_URL}/templates`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = (await response.json()) as ApiResponse<{
        id: string;
        name: string;
        file_type: string;
        status: string;
        certificate_category?: string;
        certificate_subcategory?: string;
        width?: number;
        height?: number;
        fields?: unknown[];
      }>;
      if (!response.ok || !data.success) {
        const errorMsg =
          typeof data.error === "object"
            ? data.error?.message ?? "Failed to create template"
            : typeof data.error === "string"
            ? data.error
            : "Failed to create template";
        throw new ApiError(
          typeof data.error === "object" ? data.error?.code ?? "HTTP_ERROR" : "HTTP_ERROR",
          errorMsg
        );
      }

      return data.data!;
    },

    update: async (
      id: string,
      updates: {
        name?: string;
        description?: string;
        status?: "draft" | "active" | "archived";
        fields?: unknown[];
        width?: number;
        height?: number;
      }
    ) => {
      const response = await apiRequest(`/templates/${id}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });
      return response.data!;
    },

    delete: async (id: string) => {
      const response = await apiRequest(`/templates/${id}`, {
        method: "DELETE",
      });
      return response.data!;
    },

    getPreviewUrl: async (id: string) => {
      const response = await apiRequest<{ preview_url: string }>(
        `/templates/${id}/preview`
      );
      return response.data!.preview_url;
    },

    getCategories: async () => {
      const response = await apiRequest<{
        categories: string[];
        categoryMap: Record<string, string[]>;
        industry: string | null;
      }>("/templates/categories");
      return response.data!;
    },
  },

  /**
   * Certificates API
   */
  certificates: {
    generate: async (params: {
      template_id: string;
      data: Array<Record<string, unknown>>;
      field_mappings: Array<{ fieldId: string; columnName: string }>;
      options?: {
        includeQR?: boolean;
        fileName?: string;
      };
    }): Promise<{
      job_id?: string;
      download_url?: string;
      zip_url?: string;
      status?: string;
    }> => {
      const response = await apiRequest<{
        job_id?: string;
        download_url?: string;
        zip_url?: string;
        status?: string;
      }>("/certificates/generate", {
        method: "POST",
        body: JSON.stringify(params),
      });
      return response.data!;
    },
  },

  /**
   * Imports API
   */
  imports: {
    list: async (params?: {
      page?: number;
      limit?: number;
      status?: string;
      sort_by?: string;
      sort_order?: "asc" | "desc";
    }): Promise<PaginatedResponse<ImportJob>> => {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set("page", params.page.toString());
      if (params?.limit) queryParams.set("limit", params.limit.toString());
      if (params?.status) queryParams.set("status", params.status);
      if (params?.sort_by) queryParams.set("sort_by", params.sort_by);
      if (params?.sort_order) queryParams.set("sort_order", params.sort_order);

      const response = await apiRequest<PaginatedResponse<ImportJob>>(
        `/import-jobs?${queryParams.toString()}`
      );
      return response.data!;
    },

    get: async (id: string): Promise<ImportJob> => {
      const response = await apiRequest<ImportJob>(`/import-jobs/${id}`);
      return response.data!;
    },

    create: async (
      file: File,
      metadata: {
        file_name: string;
        certificate_category?: string;
        certificate_subcategory?: string;
        certificate_template_id?: string;
        reusable?: boolean;
      }
    ): Promise<ImportJob> => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("metadata", JSON.stringify(metadata));

      const response = await fetch(`${API_BASE_URL}/import-jobs`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = (await response.json()) as ApiResponse<ImportJob>;
      if (!response.ok || !data.success) {
        const errorMsg =
          typeof data.error === "object"
            ? data.error?.message ?? "Failed to create import job"
            : typeof data.error === "string"
            ? data.error
            : "Failed to create import job";
        throw new ApiError(
          typeof data.error === "object" ? data.error?.code ?? "HTTP_ERROR" : "HTTP_ERROR",
          errorMsg
        );
      }

      return data.data!;
    },

    getData: async (id: string, params?: { page?: number; limit?: number }) => {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set("page", params.page.toString());
      if (params?.limit) queryParams.set("limit", params.limit.toString());

      const response = await apiRequest<PaginatedResponse<unknown>>(
        `/import-jobs/${id}/data?${queryParams.toString()}`
      );
      return response.data!;
    },

    getDownloadUrl: async (id: string) => {
      const response = await apiRequest<{ download_url: string }>(
        `/import-jobs/${id}/download`
      );
      return response.data!.download_url;
    },
  },

  /**
   * Billing API
   */
  billing: {
    getOverview: async () => {
      const response = await apiRequest<{
        current_period: {
          certificate_count: number;
          estimated_amount: number;
        };
        recent_invoices: Array<{
          id: string;
          company_id: string;
          invoice_number: string;
          period_start: string;
          period_end: string;
          subtotal: number;
          tax_amount: number;
          total_amount: number;
          currency: string;
          status: string;
          razorpay_invoice_id: string | null;
          razorpay_payment_link: string | null;
          razorpay_status: string | null;
          due_date: string;
          paid_at: string | null;
          created_at: string;
          updated_at: string;
        }>;
        total_outstanding: number;
        billing_profile: {
          id: string;
          company_id: string;
          platform_fee_amount: number;
          certificate_unit_price: number;
          gst_rate: number;
          currency: string;
          razorpay_customer_id: string | null;
          created_at: string;
          updated_at: string;
        };
        current_usage: {
          certificate_count: number;
          platform_fee: number;
          usage_cost: number;
          subtotal: number;
          gst_amount: number;
          estimated_total: number;
          currency: string;
          gst_rate: number;
        };
      }>("/billing/overview");
      return response.data!;
    },

    listInvoices: async (params?: {
      page?: number;
      limit?: number;
      status?: string;
      sort_by?: string;
      sort_order?: "asc" | "desc";
    }) => {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set("page", params.page.toString());
      if (params?.limit) queryParams.set("limit", params.limit.toString());
      if (params?.status) queryParams.set("status", params.status);
      if (params?.sort_by) queryParams.set("sort_by", params.sort_by);
      if (params?.sort_order) queryParams.set("sort_order", params.sort_order);

      const response = await apiRequest<PaginatedResponse<unknown>>(
        `/billing/invoices?${queryParams.toString()}`
      );
      return response.data!;
    },

    getInvoice: async (id: string) => {
      const response = await apiRequest(`/billing/invoices/${id}`);
      return response.data!;
    },
  },

  /**
   * Verification API (public)
   */
  verification: {
    verify: async (token: string) => {
      const response = await fetch(`${API_BASE_URL}/verification/${token}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = (await response.json()) as ApiResponse;
      if (!response.ok || !data.success) {
        const errorMsg =
          typeof data.error === "object"
            ? data.error?.message ?? "Verification failed"
            : typeof data.error === "string"
            ? data.error
            : "Verification failed";
        throw new ApiError(
          typeof data.error === "object" ? data.error?.code ?? "HTTP_ERROR" : "HTTP_ERROR",
          errorMsg
        );
      }

      return data.data!;
    },
  },

  /**
   * Dashboard API
   */
  dashboard: {
    getStats: async () => {
      const response = await apiRequest<{
        stats: {
          totalCertificates: number;
          pendingJobs: number;
          verificationsToday: number;
          revokedCertificates: number;
        };
        recentImports: Array<{
          id: string;
          file_name: string | null;
          status: string;
          total_rows: number;
          created_at: string;
        }>;
        recentVerifications: Array<{
          id: string;
          result: string;
          verified_at: string;
          certificate: {
            recipient_name: string;
            course_name: string | null;
          } | null;
        }>;
      }>("/dashboard/stats");
      return response.data!;
    },
  },

  /**
   * Organizations API (renamed from Companies)
   */
  organizations: {
    get: async () => {
      const response = await apiRequest<{
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        website: string | null;
        industry: string | null;
        industry_id: string | null;
        address: string | null;
        city: string | null;
        state: string | null;
        country: string | null;
        postal_code: string | null;
        gst_number: string | null;
        cin_number: string | null;
        logo: string | null;
        created_at: string;
        updated_at: string;
      }>("/organizations/me");
      return response.data!;
    },

    update: async (
      data: {
        name?: string;
        email?: string | null;
        phone?: string | null;
        website?: string | null;
        industry?: string | null;
        industry_id?: string | null;
        address?: string | null;
        city?: string | null;
        state?: string | null;
        country?: string | null;
        postal_code?: string | null;
        gst_number?: string | null;
        cin_number?: string | null;
      },
      logoFile?: File
    ): Promise<{
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      website: string | null;
      industry: string | null;
      industry_id: string | null;
      address: string | null;
      city: string | null;
      state: string | null;
      country: string | null;
      postal_code: string | null;
      gst_number: string | null;
      cin_number: string | null;
      logo: string | null;
      created_at: string;
      updated_at: string;
    }> => {
      type OrganizationResponse = {
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        website: string | null;
        industry: string | null;
        industry_id: string | null;
        address: string | null;
        city: string | null;
        state: string | null;
        country: string | null;
        postal_code: string | null;
        gst_number: string | null;
        cin_number: string | null;
        logo: string | null;
        created_at: string;
        updated_at: string;
      };

      if (logoFile) {
        const formData = new FormData();
        formData.append("file", logoFile);
        formData.append("metadata", JSON.stringify(data));

        const response = await fetch(`${API_BASE_URL}/organizations/me`, {
          method: "PUT",
          body: formData,
          credentials: "include",
        });

        const result = (await response.json()) as ApiResponse<OrganizationResponse>;
        if (!response.ok || !result.success) {
          const errorMsg =
            typeof result.error === "object"
              ? result.error?.message ?? "Failed to update organization"
              : typeof result.error === "string"
              ? result.error
              : "Failed to update organization";
          throw new ApiError(
            typeof result.error === "object" ? result.error?.code ?? "HTTP_ERROR" : "HTTP_ERROR",
            errorMsg
          );
        }

        return result.data!;
      } else {
        const response = await apiRequest<OrganizationResponse>("/organizations/me", {
          method: "PUT",
          body: JSON.stringify(data),
        });
        return response.data!;
      }
    },

    getAPISettings: async () => {
      const response = await apiRequest<{
        application_id: string;
        api_enabled: boolean;
        api_key_exists: boolean;
        api_key_created_at: string | null;
        api_key_last_rotated_at: string | null;
      }>("/organizations/me/api-settings");
      return response.data!;
    },

    updateAPIEnabled: async (enabled: boolean) => {
      const response = await apiRequest("/organizations/me/api-settings", {
        method: "PUT",
        body: JSON.stringify({ api_enabled: enabled }),
      });
      return response.data!;
    },

    bootstrapIdentity: async () => {
      const response = await apiRequest<{
        application_id: string;
        api_key: string;
      }>("/organizations/me/bootstrap-identity", {
        method: "POST",
      });
      return response.data!;
    },

    rotateAPIKey: async () => {
      const response = await apiRequest<{
        application_id: string;
        api_key: string;
      }>("/organizations/me/rotate-api-key", {
        method: "POST",
      });
      return response.data!;
    },
  },


  /**
   * Users API
   */
  users: {
    getProfile: async () => {
      const response = await apiRequest<{
        id: string;
        email: string;
        full_name: string | null;
        company_id: string;
        company: {
          name: string;
          logo: string | null;
        } | null;
      }>("/users/me");
      return response.data!;
    },
  },
};
