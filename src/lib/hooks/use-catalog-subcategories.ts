import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api/client';
import { ApiError } from '@/lib/api/client';

export interface CatalogSubcategory {
  id: string;
  key: string;
  name: string;
  sort_order: number | null;
  is_org_custom: boolean;
}

interface UseCatalogSubcategoriesResult {
  subcategories: CatalogSubcategory[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/**
 * Hook to fetch subcategories for a specific category
 * Includes caching and request cancellation
 */
export function useCatalogSubcategories(categoryId: string | null): UseCatalogSubcategoriesResult {
  const [subcategories, setSubcategories] = useState<CatalogSubcategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Cache for subcategories per category
  const cacheRef = useRef<Map<string, CatalogSubcategory[]>>(new Map());
  
  // Track the categoryId for the current request to ignore stale responses
  const currentRequestCategoryRef = useRef<string | null>(null);

  const loadSubcategories = useCallback(async () => {
    // Reset state if no category selected
    if (!categoryId) {
      setSubcategories([]);
      setLoading(false);
      setError(null);
      currentRequestCategoryRef.current = null;
      return;
    }

    // Check cache first
    const cached = cacheRef.current.get(categoryId);
    if (cached) {
      setSubcategories(cached);
      setLoading(false);
      setError(null);
      currentRequestCategoryRef.current = categoryId;
      return;
    }

    // Mark this category as the current request
    currentRequestCategoryRef.current = categoryId;

    try {
      setLoading(true);
      setError(null);

      const result = await api.catalog.getSubcategories(categoryId);

      // Check if category changed while fetching (ignore stale response)
      if (currentRequestCategoryRef.current !== categoryId) {
        return;
      }

      if (!result.items || result.items.length === 0) {
        setSubcategories([]);
        // Don't set error for empty subcategories - some categories may not have subcategories
      } else {
        // Sort by sort_order if available, otherwise by name
        const sorted = [...result.items].sort((a, b) => {
          if (a.sort_order !== null && b.sort_order !== null) {
            return a.sort_order - b.sort_order;
          }
          if (a.sort_order !== null) return -1;
          if (b.sort_order !== null) return 1;
          return a.name.localeCompare(b.name);
        });

        setSubcategories(sorted);
        // Cache the result
        cacheRef.current.set(categoryId, sorted);
      }
    } catch (err: any) {
      console.error('Error loading subcategories:', err);
      
      if (err instanceof ApiError) {
        if (err.code === 'NOT_FOUND' || (err as any).status === 404) {
          setError('Category not found or subcategories not available.');
        } else if (err.code === 'FORBIDDEN' || (err as any).status === 403) {
          setError('You do not have permission to view subcategories for this category.');
        } else {
          setError(err.message || 'Failed to load subcategories. Please try again.');
        }
      } else {
        setError(err.message || 'Failed to load subcategories. Please try again.');
      }
      
      setSubcategories([]);
    } finally {
      // Only update loading state if this is still the current request
      if (currentRequestCategoryRef.current === categoryId) {
        setLoading(false);
      }
    }
  }, [categoryId]);

  useEffect(() => {
    loadSubcategories();

    // Cleanup: mark request as stale when category changes
    return () => {
      if (currentRequestCategoryRef.current !== categoryId) {
        currentRequestCategoryRef.current = null;
      }
    };
  }, [loadSubcategories, categoryId]);

  return {
    subcategories,
    loading,
    error,
    reload: loadSubcategories,
  };
}
