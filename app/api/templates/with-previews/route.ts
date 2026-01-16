/**
 * TEMPLATES WITH PREVIEWS BFF ROUTE
 *
 * Aggregates templates list + preview URLs in a single request
 * to eliminate N+1 pattern from the client.
 *
 * Features:
 * - Parallel preview URL fetching
 * - Short TTL in-memory cache for burst protection
 * - Graceful fallback if preview fails
 */

import { NextRequest, NextResponse } from "next/server";
import { serverApiRequest, ServerApiError, AUTH_COOKIES } from "@/lib/api/server";
import { cookies } from "next/headers";

// ============================================================================
// Types
// ============================================================================

interface Template {
  // Backend may return template_id or id
  id?: string;
  template_id?: string;
  // Backend returns title (not name)
  title: string;
  name?: string; // Legacy field for backward compatibility
  description?: string | null;
  file_type?: string;
  file_path?: string;
  status: string;
  // Backend returns category_id and category_name (from v_templates_list view)
  category_id?: string;
  category_name?: string;
  subcategory_id?: string;
  subcategory_name?: string;
  // Legacy fields for backward compatibility
  certificate_category?: string | null;
  certificate_subcategory?: string | null;
  category?: { id: string; name: string };
  subcategory?: { id: string; name: string };
  width?: number | null;
  height?: number | null;
  fields?: unknown[];
  certificate_count?: number;
  organization_id: string;
  created_at: string;
  updated_at: string;
  // Preview fields from backend (v_templates_list returns preview_bucket and preview_path)
  preview_url?: string;
  preview_bucket?: string | null;
  preview_path?: string | null;
  preview_file_id?: string | null;
  latest_preview_file_id?: string | null;
  preview_status?: "pending" | "ready" | "failed" | null;
  // Version fields
  latest_version_id?: string | null;
  latest_version_number?: number | null;
  latest_page_count?: number | null;
  latest_source_file_id?: string | null;
}

interface TemplateListResponse {
  items: Template[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// ============================================================================
// Simple In-Memory Cache (burst protection)
// ============================================================================

interface CacheEntry {
  data: TemplateListResponse;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10_000; // 10 seconds

function getCacheKey(organizationId: string, params: string): string {
  return `${organizationId}:${params}`;
}

function getFromCache(key: string): TemplateListResponse | null {
  const entry = cache.get(key);
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  if (age > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

function setCache(key: string, data: TemplateListResponse): void {
  // Limit cache size
  if (cache.size > 100) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, { data, timestamp: Date.now() });
}

// ============================================================================
// Handler
// ============================================================================

export async function GET(request: NextRequest) {
  // Check authentication
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_COOKIES.ACCESS_TOKEN)?.value;

  if (!accessToken) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  try {
    // Get query params
    const { searchParams } = request.nextUrl;
    const sortBy = searchParams.get("sort_by") || "created_at";
    const sortOrder = searchParams.get("sort_order") || "desc";
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "50";

    // Build cache key (we'd need organization ID for proper cache isolation)
    // For now, we'll use token hash as isolation
    const cacheKey = getCacheKey(
      accessToken.slice(-16), // Use last 16 chars as pseudo-organization ID
      `${sortBy}:${sortOrder}:${page}:${limit}`
    );

    // Check cache
    const cached = getFromCache(cacheKey);
    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    // Fetch templates list with preview URLs included
    // Backend supports include=preview_url query param to batch generate signed URLs
    let templatesResponse;
    try {
      const backendUrl = `/templates?sort_by=${sortBy}&sort_order=${sortOrder}&page=${page}&limit=${limit}&include=preview_url`;
      console.log('[BFF] Fetching templates from backend:', backendUrl);
      
      templatesResponse = await serverApiRequest<TemplateListResponse>(backendUrl);
      
      console.log('[BFF] Backend response received:', {
        hasData: !!templatesResponse.data,
        itemsCount: templatesResponse.data?.items?.length || 0,
      });
    } catch (error) {
      console.error('[BFF] Error fetching templates from backend:', {
        error,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        isServerApiError: error instanceof ServerApiError,
        serverApiErrorCode: error instanceof ServerApiError ? error.code : undefined,
        serverApiErrorStatus: error instanceof ServerApiError ? error.status : undefined,
      });
      
      // If backend request fails, throw ServerApiError so it's handled below
      if (error instanceof ServerApiError) {
        throw error;
      }
      // Wrap unknown errors
      throw new ServerApiError(
        'BACKEND_ERROR',
        error instanceof Error ? error.message : 'Failed to fetch templates from backend',
        502
      );
    }

    if (!templatesResponse.data) {
      return NextResponse.json({
        success: true,
        data: { items: [], pagination: { page: 1, limit: 50, total: 0, total_pages: 0 } },
      });
    }

    const templates = templatesResponse.data.items;

    // Debug: Log first template to see what backend returns
    if (templates.length > 0) {
      console.log('[BFF] First template from backend:', JSON.stringify(templates[0], null, 2));
    }

    // If backend doesn't include category/subcategory names, we need to fetch them
    // Collect unique category/subcategory IDs that need name lookup
    const categoryIdsToLookup = new Set<string>();
    const subcategoryIdsToLookup = new Set<string>();
    
    templates.forEach((template: any) => {
      // If category_id exists but category_name is missing, add to lookup set
      if (template.category_id && !template.category_name && !template.category?.name) {
        categoryIdsToLookup.add(template.category_id);
      }
      // If subcategory_id exists but subcategory_name is missing, add to lookup set
      if (template.subcategory_id && !template.subcategory_name && !template.subcategory?.name) {
        subcategoryIdsToLookup.add(template.subcategory_id);
      }
    });

    // If we have category/subcategory IDs but no names, fetch them from catalog API
    // This is a fallback if backend doesn't include JOINs
    // Initialize maps outside the if block so they're accessible in the map function
    const categoryNameMap = new Map<string, string>();
    const subcategoryNameMap = new Map<string, string>();

    if (categoryIdsToLookup.size > 0 || subcategoryIdsToLookup.size > 0) {
      try {
        // Fetch all categories to build a lookup map
        const categoriesResponse = await serverApiRequest<{
          groups: Array<{
            items: Array<{ id: string; name: string }>;
          }>;
          flat?: Array<{ id: string; name: string }>;
        }>('/catalog/categories');

        if (categoriesResponse.data) {
          // Build category name map from flat list or groups
          const allCategories = categoriesResponse.data.flat || 
            categoriesResponse.data.groups.flatMap(g => g.items);
          
          allCategories.forEach((cat: { id: string; name: string }) => {
            if (categoryIdsToLookup.has(cat.id)) {
              categoryNameMap.set(cat.id, cat.name);
            }
          });

          // For each category, fetch subcategories
          for (const categoryId of Array.from(categoryIdsToLookup)) {
            try {
              const subcatsResponse = await serverApiRequest<{
                items: Array<{ id: string; name: string }>;
              }>(`/catalog/categories/${categoryId}/subcategories`);

              if (subcatsResponse.data?.items) {
                subcatsResponse.data.items.forEach((subcat: { id: string; name: string }) => {
                  if (subcategoryIdsToLookup.has(subcat.id)) {
                    subcategoryNameMap.set(subcat.id, subcat.name);
                  }
                });
              }
            } catch (err) {
              console.warn(`[BFF] Failed to fetch subcategories for category ${categoryId}:`, err);
            }
          }
        }
      } catch (err) {
        console.warn('[BFF] Failed to fetch category/subcategory names:', err);
      }
    }

    // Normalize and process templates - handle new schema (certificate_templates table)
    // Backend now returns: id, title, category_id, subcategory_id, and should include category/subcategory names via JOINs
    const templatesWithPreviews: Template[] = templates.map((template: any) => {
      // Backend returns 'id' from certificate_templates table (not template_id)
      const normalizedId = template.id || template.template_id;
      
      // Backend returns 'title' from certificate_templates table
      const normalizedTitle = template.title || template.name;
      
      // Backend returns category_id/subcategory_id (UUIDs) and may include names via JOINs
      // Check multiple possible locations for category/subcategory names
      // Fallback to lookup map if backend didn't include names
      const categoryName = 
        template.category_name ||           // From JOIN with certificate_categories
        template.category?.name ||          // Nested object
        template.certificate_category ||     // Legacy field
        (template.category_id ? categoryNameMap.get(template.category_id) : null); // Fallback lookup
      
      const subcategoryName = 
        template.subcategory_name ||        // From JOIN with certificate_subcategories
        template.subcategory?.name ||       // Nested object
        template.certificate_subcategory ||  // Legacy field
        (template.subcategory_id ? subcategoryNameMap.get(template.subcategory_id) : null); // Fallback lookup
      
      // Preview fields - backend may return preview_url directly (if include=preview_url)
      // Or may return preview_bucket/preview_path for client-side URL generation
      const previewFileId = 
        template.latest_preview_file_id ||  // From JOIN with certificate_template_versions
        template.preview_file_id;          // Legacy field
      
      const previewBucket = template.preview_bucket;
      const previewPath = template.preview_path;
      
      // Debug: Log normalized values for first template
      if (templates.indexOf(template) === 0) {
        console.log('[BFF] Normalized template:', {
          id: normalizedId,
          title: normalizedTitle,
          categoryName,
          subcategoryName,
        });
      }

      // Build normalized template object
      const normalized: Template = {
        id: normalizedId,
        title: normalizedTitle || 'Untitled Template', // Ensure title is never empty
        name: normalizedTitle || 'Untitled Template', // For backward compatibility
        description: template.description || null,
        file_type: template.file_type || 'pdf',
        file_path: template.file_path || '',
        status: template.status || 'draft',
        category_id: template.category_id,
        category_name: categoryName || null,
        subcategory_id: template.subcategory_id,
        subcategory_name: subcategoryName || null,
        // Legacy fields for backward compatibility
        certificate_category: categoryName || null,
        certificate_subcategory: subcategoryName || null,
        category: categoryName ? { id: template.category_id || '', name: categoryName } : undefined,
        subcategory: subcategoryName ? { id: template.subcategory_id || '', name: subcategoryName } : undefined,
        width: template.width || null,
        height: template.height || null,
        fields: template.fields || [],
        certificate_count: template.certificate_count || 0,
        organization_id: template.organization_id,
        created_at: template.created_at,
        updated_at: template.updated_at,
        preview_url: template.preview_url, // If backend already provides signed URL
        preview_bucket: previewBucket || null,
        preview_path: previewPath || null,
        preview_file_id: previewFileId || null,
        latest_preview_file_id: previewFileId || null,
        preview_status: template.preview_status || null,
        latest_version_id: template.latest_version_id || null,
        latest_version_number: template.latest_version_number || null,
        latest_page_count: template.latest_page_count || null,
        latest_source_file_id: template.latest_source_file_id || null,
      };
      
      // If preview_url already exists, return as-is
      if (normalized.preview_url) {
        return normalized;
      }

      // If preview_bucket and preview_path exist but no URL, mark as pending
      // Frontend will fetch preview URL via GET /templates/[id]/preview-url
      if (previewBucket && previewPath) {
        return {
          ...normalized,
          preview_status: normalized.preview_status || "pending",
        };
      }

      // No preview data available
      return {
        ...normalized,
        preview_status: normalized.preview_status || null,
      };
    });

    const result: TemplateListResponse = {
      items: templatesWithPreviews,
      pagination: templatesResponse.data.pagination,
    };

    // Update cache
    setCache(cacheKey, result);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof ServerApiError) {
      console.error("[BFF] ServerApiError caught:", {
        code: error.code,
        message: error.message,
        status: error.status,
        details: error.details,
        stack: error.stack,
      });
      return NextResponse.json(
        {
          success: false,
          error: { code: error.code, message: error.message },
        },
        { status: error.status }
      );
    }

    console.error("[BFF] Unexpected error in templates with previews:", {
      error,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        success: false,
        error: { 
          code: "INTERNAL_ERROR", 
          message: error instanceof Error ? error.message : "Failed to fetch templates" 
        },
      },
      { status: 500 }
    );
  }
}
