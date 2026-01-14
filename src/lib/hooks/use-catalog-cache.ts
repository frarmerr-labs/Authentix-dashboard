/**
 * Shared cache for catalog data (categories and subcategories)
 * This allows pre-fetching data in one component and using it in another
 */

import { CatalogCategoryGroup } from './use-catalog-categories';
import { CatalogSubcategory } from './use-catalog-subcategories';

interface CatalogCache {
  categories: {
    groups: CatalogCategoryGroup[];
    loading: boolean;
    error: string | null;
    requiresIndustry: boolean;
    timestamp: number;
  };
  subcategories: Map<string, {
    items: CatalogSubcategory[];
    loading: boolean;
    error: string | null;
    timestamp: number;
  }>;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

class CatalogCacheManager {
  private cache: CatalogCache = {
    categories: {
      groups: [],
      loading: false,
      error: null,
      requiresIndustry: false,
      timestamp: 0,
    },
    subcategories: new Map(),
  };

  private listeners = new Set<() => void>();

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(listener => listener());
  }

  getCategories() {
    const cached = this.cache.categories;
    const isExpired = Date.now() - cached.timestamp > CACHE_TTL;
    
    if (isExpired) {
      return null;
    }
    
    return cached;
  }

  setCategories(data: {
    groups: CatalogCategoryGroup[];
    error?: string | null;
    requiresIndustry?: boolean;
  }) {
    this.cache.categories = {
      groups: data.groups,
      loading: false,
      error: data.error || null,
      requiresIndustry: data.requiresIndustry || false,
      timestamp: Date.now(),
    };
    this.notify();
  }

  setCategoriesLoading(loading: boolean) {
    this.cache.categories.loading = loading;
    this.notify();
  }

  getSubcategories(categoryId: string) {
    const cached = this.cache.subcategories.get(categoryId);
    if (!cached) return null;
    
    const isExpired = Date.now() - cached.timestamp > CACHE_TTL;
    if (isExpired) {
      this.cache.subcategories.delete(categoryId);
      return null;
    }
    
    return cached;
  }

  setSubcategories(categoryId: string, data: {
    items: CatalogSubcategory[];
    error?: string | null;
  }) {
    this.cache.subcategories.set(categoryId, {
      items: data.items,
      loading: false,
      error: data.error || null,
      timestamp: Date.now(),
    });
    this.notify();
  }

  setSubcategoriesLoading(categoryId: string, loading: boolean) {
    const existing = this.cache.subcategories.get(categoryId);
    if (existing) {
      existing.loading = loading;
      this.notify();
    }
  }

  clear() {
    this.cache.categories = {
      groups: [],
      loading: false,
      error: null,
      requiresIndustry: false,
      timestamp: 0,
    };
    this.cache.subcategories.clear();
    this.notify();
  }
}

export const catalogCache = new CatalogCacheManager();
