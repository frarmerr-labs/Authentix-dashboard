import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api/client';

interface CategoryInfo {
  name: string;
  subcategories: string[];
}

interface CategoryMap {
  [categoryName: string]: CategoryInfo;
}

export function useCertificateCategories() {
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryMap, setCategoryMap] = useState<CategoryMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch categories from backend API
      const result = await api.templates.getCategories();

      console.log('Categories API response:', result);

      if (!result.categories || result.categories.length === 0) {
        if (!result.industry) {
          setError('Industry not set. Please complete your company profile in Settings → Company to set your industry.');
        } else {
          setError(`No categories found for your industry (${result.industry}). This may be a database configuration issue. Please contact support.`);
        }
        setLoading(false);
        return;
      }

      // Convert backend categoryMap to frontend format
      const map: CategoryMap = {};
      result.categories.forEach((category) => {
        map[category] = {
          name: category,
          subcategories: result.categoryMap[category] || [],
        };
      });

      setCategories(result.categories);
      setCategoryMap(map);
    } catch (err: any) {
      console.error('Error loading categories:', err);
      // More detailed error message
      if (err.code === 'UNAUTHORIZED' || err.message?.includes('Not authenticated')) {
        setError('Authentication failed. Please log in again.');
      } else if (err.code === 'NOT_FOUND') {
        setError('Categories endpoint not found. Please check backend configuration.');
      } else {
        setError(err.message || 'Failed to load categories. Please try again or contact support.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const getSubcategories = (categoryName: string): string[] => {
    return categoryMap[categoryName]?.subcategories || [];
  };

  const requiresSubcategory = (categoryName: string): boolean => {
    const subcats = categoryMap[categoryName]?.subcategories || [];
    return subcats.length > 0;
  };

  return {
    categories,
    categoryMap,
    loading,
    error,
    getSubcategories,
    requiresSubcategory,
    reload: loadCategories,
  };
}
