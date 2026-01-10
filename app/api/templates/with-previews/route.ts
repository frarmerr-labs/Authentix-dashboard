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
  id: string;
  name: string;
  description: string | null;
  file_type: string;
  file_path: string;
  status: string;
  certificate_category: string | null;
  certificate_subcategory: string | null;
  width: number | null;
  height: number | null;
  fields: unknown[];
  certificate_count: number;
  company_id: string;
  created_at: string;
  updated_at: string;
  preview_url?: string;
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

function getCacheKey(companyId: string, params: string): string {
  return `${companyId}:${params}`;
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

    // Build cache key (we'd need company ID for proper cache isolation)
    // For now, we'll use token hash as isolation
    const cacheKey = getCacheKey(
      accessToken.slice(-16), // Use last 16 chars as pseudo-company ID
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

    // Fetch templates list
    const templatesResponse = await serverApiRequest<TemplateListResponse>(
      `/templates?sort_by=${sortBy}&sort_order=${sortOrder}&page=${page}&limit=${limit}`
    );

    if (!templatesResponse.data) {
      return NextResponse.json({
        success: true,
        data: { items: [], pagination: { page: 1, limit: 50, total: 0, total_pages: 0 } },
      });
    }

    const templates = templatesResponse.data.items;

    // Fetch preview URLs in parallel with concurrency limit
    const CONCURRENCY = 5;
    const templatesWithPreviews: Template[] = [];

    for (let i = 0; i < templates.length; i += CONCURRENCY) {
      const batch = templates.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.all(
        batch.map(async (template) => {
          if (!template.id) return template;

          try {
            const previewResponse = await serverApiRequest<{ url: string }>(
              `/templates/${template.id}/preview-url`
            );
            return {
              ...template,
              preview_url: previewResponse.data?.url,
            };
          } catch {
            // Graceful fallback - template without preview
            return template;
          }
        })
      );
      templatesWithPreviews.push(...batchResults);
    }

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
      return NextResponse.json(
        {
          success: false,
          error: { code: error.code, message: error.message },
        },
        { status: error.status }
      );
    }

    console.error("[BFF] Templates with previews error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to fetch templates" },
      },
      { status: 500 }
    );
  }
}
