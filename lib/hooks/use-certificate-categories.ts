import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

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
  const supabase = createClient();

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      // Get user's company and industry
      const { data: userData } = await supabase
        .from('users')
        .select('company_id, companies:company_id(industry)')
        .eq('id', user.id)
        .single();

      if (!userData?.company_id) {
        setError('Company not found');
        setLoading(false);
        return;
      }

      const industry = (userData as any)?.companies?.industry;
      if (!industry) {
        setError('Industry not set. Please complete your company profile.');
        setLoading(false);
        return;
      }

      // Fetch all category rows filtered by industry and company
      // Fetch company-specific and industry-wide categories
      const { data: allRows, error: fetchError } = await supabase
        .from('certificate_categories')
        .select('certificate_category, certificate_subcategory')
        .eq('industry', industry)
        .or(`company_id.is.null,company_id.eq.${userData.company_id}`);

      if (fetchError) {
        console.error('Error fetching categories:', fetchError);
        throw fetchError;
      }

      if (!allRows || allRows.length === 0) {
        setError('No categories found for your industry');
        setLoading(false);
        return;
      }

      // Build category map: DISTINCT certificate_category -> array of DISTINCT certificate_subcategory
      const map: CategoryMap = {};
      const categorySet = new Set<string>();

      (allRows || []).forEach((row: any) => {
        const category = row.certificate_category;
        const subcategory = row.certificate_subcategory;

        if (!category) return;

        categorySet.add(category);

        if (!map[category]) {
          map[category] = {
            name: category,
            subcategories: [],
          };
        }

        // Add subcategory if it exists and isn't already in the array
        if (subcategory && !map[category].subcategories.includes(subcategory)) {
          map[category].subcategories.push(subcategory);
        }
      });

      // Convert to sorted arrays
      const sortedCategories = Array.from(categorySet).sort((a, b) => a.localeCompare(b));

      // Sort subcategories within each category
      Object.keys(map).forEach((cat) => {
        map[cat].subcategories.sort((a, b) => a.localeCompare(b));
      });

      setCategories(sortedCategories);
      setCategoryMap(map);
    } catch (err: any) {
      console.error('Error loading categories:', err);
      setError(err.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
