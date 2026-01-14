import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api/client';
import { ApiError } from '@/lib/api/client';
import { catalogCache } from './use-catalog-cache';

export interface CatalogCategory {
  id: string;
  name: string;
  key: string;
}

export interface CatalogCategoryGroup {
  group_key: string;
  label: string;
  items: CatalogCategory[];
}

interface UseCatalogCategoriesResult {
  groups: CatalogCategoryGroup[];
  loading: boolean;
  error: string | null;
  requiresIndustry: boolean; // True if 409 ORG_INDUSTRY_REQUIRED
  reload: () => Promise<void>;
}

export function useCatalogCategories(): UseCatalogCategoriesResult {
  // Check cache first
  const cached = catalogCache.getCategories();
  const [groups, setGroups] = useState<CatalogCategoryGroup[]>(cached?.groups || []);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(cached?.error || null);
  const [requiresIndustry, setRequiresIndustry] = useState(cached?.requiresIndustry || false);

  const loadCategories = useCallback(async () => {
    // Check cache first
    const cachedData = catalogCache.getCategories();
    if (cachedData && !cachedData.loading) {
      console.log('[useCatalogCategories] Using cached categories');
      setGroups(cachedData.groups);
      setLoading(false);
      setError(cachedData.error);
      setRequiresIndustry(cachedData.requiresIndustry);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setRequiresIndustry(false);

      console.log('[useCatalogCategories] Fetching categories from /catalog/categories');
      const result = await api.catalog.getCategories();
      console.log('[useCatalogCategories] Categories response:', result);
      console.log('[useCatalogCategories] Result type:', typeof result);
      console.log('[useCatalogCategories] Result keys:', result ? Object.keys(result) : 'null/undefined');
      console.log('[useCatalogCategories] Result.groups:', result?.groups);
      console.log('[useCatalogCategories] Result.groups type:', typeof result?.groups);
      console.log('[useCatalogCategories] Result.groups is array?', Array.isArray(result?.groups));
      console.log('[useCatalogCategories] Result.groups length:', result?.groups?.length);

      // Handle different possible response structures
      let groupsToSet: CatalogCategoryGroup[] = [];
      
      if (result && Array.isArray(result)) {
        // If result is directly an array of groups
        console.log('[useCatalogCategories] Result is directly an array');
        groupsToSet = result as CatalogCategoryGroup[];
      } else if (result?.groups && Array.isArray(result.groups)) {
        // Standard structure: { groups: [...] }
        console.log('[useCatalogCategories] Result has groups property');
        groupsToSet = result.groups;
      } else if (result?.data?.groups && Array.isArray(result.data.groups)) {
        // Nested structure: { data: { groups: [...] } }
        console.log('[useCatalogCategories] Result has nested data.groups');
        groupsToSet = result.data.groups;
      } else {
        console.warn('[useCatalogCategories] No groups found in response', {
          hasResult: !!result,
          hasGroups: !!result?.groups,
          hasDataGroups: !!result?.data?.groups,
          isArray: Array.isArray(result),
          isGroupsArray: Array.isArray(result?.groups),
          resultStructure: JSON.stringify(result, null, 2),
        });
        setError('No categories available. Please contact support.');
        setLoading(false);
        return;
      }

      if (groupsToSet.length === 0) {
        console.warn('[useCatalogCategories] Groups array is empty');
        setError('No categories available. Please contact support.');
        setLoading(false);
        return;
      }

      console.log('[useCatalogCategories] Setting groups:', groupsToSet);
      console.log('[useCatalogCategories] Groups count:', groupsToSet.length);
      setGroups(groupsToSet);
      // Update cache
      catalogCache.setCategories({
        groups: groupsToSet,
      });
      console.log('[useCatalogCategories] Groups set, about to set loading to false');
      // Force a state update by setting loading to false immediately after setting groups
      setLoading(false);
      console.log('[useCatalogCategories] Loading set to false immediately after setting groups');
    } catch (err: any) {
      console.error('[useCatalogCategories] Error loading catalog categories:', err);
      console.error('[useCatalogCategories] Error details:', {
        code: err.code,
        message: err.message,
        status: (err as any).status,
        stack: err.stack,
      });
      
      // Check for 409 ORG_INDUSTRY_REQUIRED
      if (err instanceof ApiError && (err as any).status === 409 && (err.code === 'ORG_INDUSTRY_REQUIRED' || err.message?.toLowerCase().includes('industry'))) {
        setRequiresIndustry(true);
        setError('Organization industry is required to view categories.');
        catalogCache.setCategories({
          groups: [],
          error: 'Organization industry is required to view categories.',
          requiresIndustry: true,
        });
      } else if (err.code === 'UNAUTHORIZED' || err.message?.includes('Not authenticated')) {
        setError('Authentication failed. Please log in again.');
      } else if (err.code === 'NOT_FOUND' || err.message?.includes('404') || err.code === 'NOT_FOUND') {
        setError('Categories endpoint not found. Please check backend configuration.');
      } else if (err.code === 'TIMEOUT' || err.message?.includes('timeout') || err.message?.includes('Request timeout')) {
        setError('Request timed out. Please check your connection and try again.');
      } else if (err.code === 'NETWORK_ERROR') {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError(err.message || 'Failed to load categories. Please try again.');
      }
    } finally {
      console.log('[useCatalogCategories] Finally block - setting loading to false');
      // Only set loading to false if we haven't already set it
      // (we set it earlier after successfully setting groups)
      setLoading((prev) => {
        if (prev) {
          console.log('[useCatalogCategories] Loading was true, setting to false');
          return false;
        }
        console.log('[useCatalogCategories] Loading was already false');
        return prev;
      });
      console.log('[useCatalogCategories] Loading state updated');
    }
  }, []);

  useEffect(() => {
    // Subscribe to cache updates
    const unsubscribe = catalogCache.subscribe(() => {
      const cachedData = catalogCache.getCategories();
      if (cachedData) {
        setGroups(cachedData.groups);
        setLoading(cachedData.loading);
        setError(cachedData.error);
        setRequiresIndustry(cachedData.requiresIndustry);
      }
    });

    // Load categories if not cached
    const cachedData = catalogCache.getCategories();
    if (!cachedData) {
      loadCategories();
    }

    return unsubscribe;
  }, [loadCategories]);

  return {
    groups,
    loading,
    error,
    requiresIndustry,
    reload: loadCategories,
  };
}
