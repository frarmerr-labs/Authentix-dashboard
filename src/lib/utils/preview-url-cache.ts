/**
 * In-memory cache for signed preview URLs
 * Caches URLs per page session to avoid re-requesting on re-render
 */

interface CacheEntry {
  url: string;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached preview URL
 */
export function getCachedPreviewUrl(key: string): string | null {
  const entry = cache.get(key);
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  if (age > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }

  return entry.url;
}

/**
 * Cache a preview URL
 */
export function cachePreviewUrl(key: string, url: string): void {
  cache.set(key, {
    url,
    timestamp: Date.now(),
  });
}

/**
 * Generate cache key from template preview data
 */
export function getPreviewCacheKey(
  templateId: string,
  previewFileId?: string | null,
  previewBucket?: string | null,
  previewPath?: string | null
): string {
  if (previewFileId) {
    return `template:${templateId}:file:${previewFileId}`;
  }
  if (previewBucket && previewPath) {
    return `template:${templateId}:bucket:${previewBucket}:path:${previewPath}`;
  }
  return `template:${templateId}`;
}

/**
 * Clear cache for a specific template
 */
export function clearPreviewCache(templateId: string): void {
  const keysToDelete: string[] = [];
  for (const key of cache.keys()) {
    if (key.startsWith(`template:${templateId}:`)) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach((key) => cache.delete(key));
}
