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
  organization_id: string;
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

  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      credentials: "include", // Include HttpOnly cookies
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(
        "TIMEOUT",
        "Request timed out. Please try again.",
        { url, endpoint }
      );
    }
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
      const responseText = await response.text();
      console.log(`[API] Raw response for ${endpoint}:`, {
        status: response.status,
        contentType,
        responseLength: responseText.length,
        responsePreview: responseText.substring(0, 500), // First 500 chars
      });
      
      try {
        data = JSON.parse(responseText) as ApiResponse<T>;
        console.log(`[API] Parsed JSON for ${endpoint}:`, {
          success: data.success,
          hasError: !!data.error,
          hasData: !!data.data,
          errorType: typeof data.error,
          dataKeys: data.data ? Object.keys(data.data) : [],
          fullData: JSON.stringify(data, null, 2),
        });
      } catch (parseError) {
        console.error(`[API] JSON parse error for ${endpoint}:`, parseError);
        console.error(`[API] Response text that failed to parse:`, responseText);
        throw new ApiError(
          "PARSE_ERROR",
          `Failed to parse JSON response`,
          { status: response.status, statusText: response.statusText, responseText: responseText.substring(0, 200) }
        );
      }
    } else {
      const text = await response.text();
      console.error(`[API] Non-JSON response for ${endpoint}:`, {
        status: response.status,
        contentType,
        textPreview: text.substring(0, 200),
      });
      throw new ApiError(
        "INVALID_RESPONSE",
        `Unexpected response format: ${contentType}`,
        { status: response.status, statusText: response.statusText }
      );
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error(`[API] Error processing response for ${endpoint}:`, error);
    throw new ApiError(
      "PARSE_ERROR",
      `Failed to process response`,
      { status: response.status, statusText: response.statusText }
    );
  }

  if (!response.ok || !data.success) {
    console.error(`[API] Request failed for ${endpoint}:`, {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      dataSuccess: data.success,
      data: JSON.stringify(data, null, 2),
      error: data.error,
      errorType: typeof data.error,
    });

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

    // Preserve status code for 409 (ORG_INDUSTRY_REQUIRED) and other specific errors
    const apiError = new ApiError(errorCode, errorMessage);
    // Attach status to error object for checking
    Object.defineProperty(apiError, 'status', {
      value: response.status,
      writable: false,
      enumerable: true,
    });
    throw apiError;
  }

  console.log(`[API] Request successful for ${endpoint}:`, {
    success: data.success,
    hasData: !!data.data,
    dataType: typeof data.data,
    dataKeys: data.data ? Object.keys(data.data) : [],
    fullData: JSON.stringify(data, null, 2),
  });

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

    bootstrap: async () => {
      const response = await apiRequest<{
        organization: { id: string; name?: string; logo?: string | null };
        membership?: { id: string; role?: string };
      }>("/auth/bootstrap", {
        method: "POST",
      });
      return response.data!;
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
     * @param email Optional email parameter for cross-device verification checks
     */
    me: async (email?: string) => {
      const url = email ? `/auth/me?email=${encodeURIComponent(email)}` : "/auth/me";
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
      }>(url);
      return response.data!;
    },

    /**
     * Check verification status by email (cookie-independent)
     * Useful for cross-device verification checks
     */
    checkVerificationStatus: async (email: string) => {
      const response = await apiRequest<{
        verified: boolean;
        email?: string;
        user_id?: string;
      }>(`/auth/verification-status?email=${encodeURIComponent(email)}`);
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

    /**
     * Get template editor data (template + version + source file + fields)
     */
    getEditorData: async (templateId: string) => {
      const response = await apiRequest<{
        template: {
          id: string;
          title: string;
          category_id: string;
          subcategory_id: string;
          category?: {
            id: string;
            name: string;
          };
          subcategory?: {
            id: string;
            name: string;
          };
        };
        version: {
          id: string;
          version_number: number;
          status: string;
        };
        source_file: {
          id: string;
          file_name: string;
          file_type: string;
          bucket?: string;
          path?: string;
          url?: string; // Signed URL if available
        };
        fields: Array<{
          id: string;
          field_key: string;
          label: string;
          type: string;
          page_number: number;
          x: number;
          y: number;
          width: number;
          height: number;
          style?: Record<string, unknown>;
          required?: boolean;
        }>;
      }>(`/templates/${templateId}/editor`);
      return response.data!;
    },

    /**
     * Save template version fields (replace semantics)
     */
    saveFields: async (
      templateId: string,
      versionId: string,
      fields: Array<{
        field_key: string;
        label: string;
        type: string;
        page_number: number;
        x: number;
        y: number;
        width: number;
        height: number;
        style?: Record<string, unknown>;
        required?: boolean;
      }>
    ) => {
      const response = await apiRequest<{
        fields: Array<{
          id: string;
          field_key: string;
          label: string;
          type: string;
          page_number: number;
          x: number;
          y: number;
          width: number;
          height: number;
          style?: Record<string, unknown>;
          required?: boolean;
        }>;
      }>(`/templates/${templateId}/versions/${versionId}/fields`, {
        method: "PUT",
        body: JSON.stringify({ fields }),
      });
      return response.data!;
    },

    /**
     * Create a new certificate template
     * 
     * IMPORTANT: Frontend sends ONLY metadata and file blob.
     * Backend is responsible for ALL storage path generation.
     * Frontend MUST NOT:
     * - Build files.path
     * - Reference org/... paths
     * - Decide bucket or folder names
     * - Generate any storage-related paths
     */
    create: async (
      file: File,
      params: {
        title: string;
        category_id: string;
        subcategory_id: string;
      }
    ): Promise<{
      id: string;
      title: string;
      category_id: string;
      subcategory_id: string;
      template?: {
        id: string;
        title: string;
        status: string;
      };
      version?: {
        id: string;
        version_number: number;
      };
      source_file?: {
        id: string;
        file_name: string;
        file_type: string;
      };
    }> => {
      // Send only file blob and metadata - backend handles all storage logic
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", params.title);
      formData.append("category_id", params.category_id);
      formData.append("subcategory_id", params.subcategory_id);

      const response = await fetch(`${API_BASE_URL}/templates`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = (await response.json()) as ApiResponse<{
        id: string;
        title: string;
        category_id: string;
        subcategory_id: string;
        template?: {
          id: string;
          title: string;
          status: string;
        };
        version?: {
          id: string;
          version_number: number;
        };
        source_file?: {
          id: string;
          file_name: string;
          file_type: string;
        };
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
      const response = await apiRequest<{ url: string }>(
        `/templates/${id}/preview-url`
      );
      return response.data!.url;
    },

    /**
     * Generate/retry preview for a template version
     */
    generatePreview: async (templateId: string, versionId: string) => {
      const response = await apiRequest<{ url?: string; status: string }>(
        `/templates/${templateId}/versions/${versionId}/preview`,
        {
          method: "POST",
        }
      );
      return response.data!;
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
          organization_id: string;
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
          organization_id: string;
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
   * Catalog API
   */
  catalog: {
    /**
     * Get grouped certificate categories
     * Returns groups with dividers (e.g., "Course Certificates", "Company Work")
     * May return 409 with ORG_INDUSTRY_REQUIRED if organization industry is not set
     */
    getCategories: async () => {
      console.log('[API] Fetching categories from /catalog/categories');
      const response = await apiRequest<{
        groups: Array<{
          group_key: string;
          label: string;
          items: Array<{
            id: string;
            name: string;
            key: string;
            // Add other fields as needed
          }>;
        }>;
        flat?: Array<{
          id: string;
          name: string;
          key: string;
        }>;
      }>("/catalog/categories");
      console.log('[API] Categories response:', JSON.stringify(response, null, 2));
      console.log('[API] Categories data:', response.data);
      console.log('[API] Returning response.data:', response.data);
      // response.data should be { groups: [...], flat: [...] }
      return response.data!;
    },

    /**
     * Get subcategories for a specific category
     * Returns subcategories with metadata
     * May return 404/403 if category is invalid or not allowed
     */
    getSubcategories: async (categoryId: string) => {
      const response = await apiRequest<{
        category_id: string;
        items: Array<{
          id: string;
          key: string;
          name: string;
          sort_order: number | null;
          is_org_custom: boolean;
        }>;
      }>(`/catalog/categories/${categoryId}/subcategories`);
      return response.data!;
    },
  },

  /**
   * Dashboard API
   */
  dashboard: {
    getStats: async () => {
      const response = await apiRequest<{
        stats: {
          totalCertificates?: number;
          pendingJobs?: number;
          verificationsToday?: number;
          revokedCertificates?: number;
        };
        recentImports?: Array<{
          id: string;
          // Backend may return file_name (derived) or use files.original_name
          file_name?: string | null;
          // Fallback: files.original_name from related files table
          files?: {
            original_name?: string | null;
          } | null;
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
        // Logo fields from backend - supports multiple structures
        logo_file_id?: string | null;
        logo_bucket?: string | null;
        logo_path?: string | null;
        logo_url?: string | null;
        // Nested structure: logo.bucket/path
        logo?: {
          bucket?: string | null;
          path?: string | null;
        } | null;
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
      // Logo fields from backend - supports multiple structures
      logo_file_id?: string | null;
      logo_bucket?: string | null;
      logo_path?: string | null;
      logo_url?: string | null;
      // Nested structure: logo.bucket/path
      logo?: {
        bucket?: string | null;
        path?: string | null;
      } | null;
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
        logo_file_id?: string | null;
        logo_bucket?: string | null;
        logo_path?: string | null;
        logo_url?: string | null;
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
        organization_id: string;
        organization: {
          name: string;
          // Logo fields from backend - supports multiple structures
          logo_file_id?: string | null;
          logo_bucket?: string | null;
          logo_path?: string | null;
          logo_url?: string | null;
          // Nested structure: logo.bucket/path
          logo?: {
            bucket?: string | null;
            path?: string | null;
          } | null;
        } | null;
      }>("/users/me");
      return response.data!;
    },
  },
};
