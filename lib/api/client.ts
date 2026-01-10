/**
 * AUTHENTIX BACKEND API CLIENT
 *
 * Centralized client for all backend API calls.
 * Handles authentication, error handling, and response formatting.
 */

import { getAccessToken } from '@/lib/auth/storage';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta: {
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

/**
 * Get authentication token
 */
async function getAuthToken(): Promise<string | null> {
  return getAccessToken();
}

/**
 * Make authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit & { skipAuth?: boolean } = {}
): Promise<ApiResponse<T>> {
  const { skipAuth, ...fetchOptions } = options;
  const token = await getAuthToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  // Only add Authorization header if we have a token and auth is not skipped
  if (!skipAuth) {
    if (!token) {
      throw new Error('Not authenticated');
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;
  
  let response: Response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      headers,
    });
  } catch (error) {
    // Network error (CORS, connection refused, etc.)
    const errorMessage = error instanceof Error ? error.message : 'Network error';
    console.error(`[API] Network error for ${url}:`, errorMessage);
    throw new ApiError(
      'NETWORK_ERROR',
      `Failed to connect to backend: ${errorMessage}. Please check your connection and ensure the backend is running.`,
      { url, endpoint }
    );
  }

  // Check if response is JSON before parsing
  const contentType = response.headers.get('content-type');
  let data: ApiResponse<T>;
  
  try {
    if (contentType && contentType.includes('application/json')) {
      data = (await response.json()) as ApiResponse<T>;
    } else {
      // Non-JSON response (e.g., HTML error page)
      const text = await response.text();
      throw new ApiError(
        'INVALID_RESPONSE',
        `Expected JSON but received ${contentType}. Response: ${text.substring(0, 200)}`,
        { status: response.status, statusText: response.statusText }
      );
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // JSON parse error
    throw new ApiError(
      'PARSE_ERROR',
      `Failed to parse response: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { status: response.status, statusText: response.statusText }
    );
  }

  if (!response.ok || !data.success) {
    const error = data.error ?? {
      code: 'HTTP_ERROR',
      message: `HTTP ${response.status}: ${response.statusText}`,
    };
    throw new ApiError(error.code, error.message, 'details' in error ? error.details : undefined);
  }

  return data;
}

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

/**
 * API Client methods
 */
export const api = {
  /**
   * Templates API
   */
  templates: {
    list: async (params?: {
      page?: number;
      limit?: number;
      status?: string;
      sort_by?: string;
      sort_order?: 'asc' | 'desc';
    }) => {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set('page', params.page.toString());
      if (params?.limit) queryParams.set('limit', params.limit.toString());
      if (params?.status) queryParams.set('status', params.status);
      if (params?.sort_by) queryParams.set('sort_by', params.sort_by);
      if (params?.sort_order) queryParams.set('sort_order', params.sort_order);

      const response = await apiRequest<PaginatedResponse<unknown>>(
        `/templates?${queryParams.toString()}`
      );
      return response.data!;
    },

    get: async (id: string) => {
      const response = await apiRequest(`/templates/${id}`);
      return response.data!;
    },

    create: async (file: File, metadata: {
      name: string;
      description?: string;
      file_type: 'pdf' | 'png' | 'jpg' | 'jpeg';
      certificate_category?: string;
      certificate_subcategory?: string;
      width?: number;
      height?: number;
      fields?: unknown[];
      status?: 'draft' | 'active' | 'archived';
    }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('metadata', JSON.stringify(metadata));

      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE_URL}/templates`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = (await response.json()) as ApiResponse;
      if (!response.ok || !data.success) {
        throw new ApiError(
          data.error?.code ?? 'HTTP_ERROR',
          data.error?.message ?? 'Failed to create template'
        );
      }

      return data.data!;
    },

    update: async (id: string, updates: {
      name?: string;
      description?: string;
      status?: 'draft' | 'active' | 'archived';
      fields?: unknown[];
      width?: number;
      height?: number;
    }) => {
      const response = await apiRequest(`/templates/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      return response.data!;
    },

    delete: async (id: string) => {
      const response = await apiRequest(`/templates/${id}`, {
        method: 'DELETE',
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
      }>('/templates/categories');
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
    }) => {
      const response = await apiRequest('/certificates/generate', {
        method: 'POST',
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
      sort_order?: 'asc' | 'desc';
    }) => {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set('page', params.page.toString());
      if (params?.limit) queryParams.set('limit', params.limit.toString());
      if (params?.status) queryParams.set('status', params.status);
      if (params?.sort_by) queryParams.set('sort_by', params.sort_by);
      if (params?.sort_order) queryParams.set('sort_order', params.sort_order);

      const response = await apiRequest<PaginatedResponse<unknown>>(
        `/import-jobs?${queryParams.toString()}`
      );
      return response.data!;
    },

    get: async (id: string) => {
      const response = await apiRequest(`/import-jobs/${id}`);
      return response.data!;
    },

    create: async (file: File, metadata: {
      file_name: string;
      certificate_category?: string;
      certificate_subcategory?: string;
      certificate_template_id?: string;
      reusable?: boolean;
    }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('metadata', JSON.stringify(metadata));

      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE_URL}/import-jobs`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = (await response.json()) as ApiResponse;
      if (!response.ok || !data.success) {
        throw new ApiError(
          data.error?.code ?? 'HTTP_ERROR',
          data.error?.message ?? 'Failed to create import job'
        );
      }

      return data.data!;
    },

    getData: async (id: string, params?: { page?: number; limit?: number }) => {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set('page', params.page.toString());
      if (params?.limit) queryParams.set('limit', params.limit.toString());

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
      }>('/billing/overview');
      return response.data!;
    },

    listInvoices: async (params?: {
      page?: number;
      limit?: number;
      status?: string;
      sort_by?: string;
      sort_order?: 'asc' | 'desc';
    }) => {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set('page', params.page.toString());
      if (params?.limit) queryParams.set('limit', params.limit.toString());
      if (params?.status) queryParams.set('status', params.status);
      if (params?.sort_by) queryParams.set('sort_by', params.sort_by);
      if (params?.sort_order) queryParams.set('sort_order', params.sort_order);

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
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = (await response.json()) as ApiResponse;
      if (!response.ok || !data.success) {
        throw new ApiError(
          data.error?.code ?? 'HTTP_ERROR',
          data.error?.message ?? 'Verification failed'
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
      }>('/dashboard/stats');
      return response.data!;
    },
  },

  /**
   * Companies API
   */
  companies: {
    get: async () => {
      const response = await apiRequest('/companies/me');
      return response.data!;
    },

    update: async (data: {
      name?: string;
      email?: string | null;
      phone?: string | null;
      website?: string | null;
      industry?: string | null;
      address?: string | null;
      city?: string | null;
      state?: string | null;
      country?: string | null;
      postal_code?: string | null;
      gst_number?: string | null;
      cin_number?: string | null;
    }, logoFile?: File) => {
      if (logoFile) {
        const formData = new FormData();
        formData.append('file', logoFile);
        formData.append('metadata', JSON.stringify(data));

        const token = await getAuthToken();
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_BASE_URL}/companies/me`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        const result = (await response.json()) as ApiResponse;
        if (!response.ok || !result.success) {
          throw new ApiError(
            result.error?.code ?? 'HTTP_ERROR',
            result.error?.message ?? 'Failed to update company'
          );
        }

        return result.data!;
      } else {
        const response = await apiRequest('/companies/me', {
          method: 'PUT',
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
      }>('/companies/me/api-settings');
      return response.data!;
    },

    updateAPIEnabled: async (enabled: boolean) => {
      const response = await apiRequest('/companies/me/api-settings', {
        method: 'PUT',
        body: JSON.stringify({ api_enabled: enabled }),
      });
      return response.data!;
    },

    bootstrapIdentity: async () => {
      const response = await apiRequest<{
        application_id: string;
        api_key: string;
      }>('/companies/me/bootstrap-identity', {
        method: 'POST',
      });
      return response.data!;
    },

    rotateAPIKey: async () => {
      const response = await apiRequest<{
        application_id: string;
        api_key: string;
      }>('/companies/me/rotate-api-key', {
        method: 'POST',
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
      }>('/users/me');
      return response.data!;
    },
  },

  /**
   * Auth API
   */
  auth: {
    login: async (email: string, password: string) => {
      const response = await apiRequest<{
        user: {
          id: string;
          email: string;
          full_name: string | null;
        };
        session: {
          access_token: string;
          refresh_token: string;
          expires_at: number;
        };
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        skipAuth: true, // Login doesn't require authentication
      });
      return response.data!;
    },

    signup: async (email: string, password: string, full_name: string, company_name: string) => {
      const response = await apiRequest<{
        user: {
          id: string;
          email: string;
          full_name: string | null;
        };
        session: {
          access_token: string;
          refresh_token: string;
          expires_at: number;
        };
      }>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, full_name, company_name }),
        skipAuth: true, // Signup doesn't require authentication
      });
      return response.data!;
    },

    logout: async () => {
      await apiRequest('/auth/logout', {
        method: 'POST',
      });
    },

    getSession: async () => {
      const response = await apiRequest<{
        user: {
          id: string;
          email: string;
          full_name: string | null;
        } | null;
        valid: boolean;
      }>('/auth/session');
      return response.data!;
    },
  },
};
