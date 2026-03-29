'use client';

/**
 * useCertificateCategories — TanStack Query backed
 *
 * Wraps useTemplateCategories for backward compatibility.
 * Exposes the same interface as the previous useEffect-based version.
 */

import { useTemplateCategories } from '@/lib/hooks/queries/templates';

interface CategoryInfo {
  name: string;
  subcategories: string[];
}

interface CategoryMap {
  [categoryName: string]: CategoryInfo;
}

export function useCertificateCategories() {
  const query = useTemplateCategories();

  const rawData = query.data as
    | { categories?: string[]; categoryMap?: Record<string, string[]>; industry?: string }
    | undefined;

  const categories: string[] = rawData?.categories ?? [];

  const categoryMap: CategoryMap = (() => {
    if (!rawData?.categories) return {};
    const map: CategoryMap = {};
    rawData.categories.forEach((cat) => {
      map[cat] = { name: cat, subcategories: rawData.categoryMap?.[cat] ?? [] };
    });
    return map;
  })();

  const error = (() => {
    if (!query.error && rawData && categories.length === 0) {
      if (!rawData.industry) {
        return 'Industry not set. Please complete your company profile in Settings → Company to set your industry.';
      }
      return `No categories found for your industry (${rawData.industry}). Please contact support.`;
    }
    return query.error instanceof Error ? query.error.message : null;
  })();

  const getSubcategories = (categoryName: string): string[] =>
    categoryMap[categoryName]?.subcategories ?? [];

  const requiresSubcategory = (categoryName: string): boolean =>
    getSubcategories(categoryName).length > 0;

  return {
    categories,
    categoryMap,
    loading: query.isLoading,
    error,
    getSubcategories,
    requiresSubcategory,
    reload: () => query.refetch(),
  };
}
