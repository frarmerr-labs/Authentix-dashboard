/**
 * CATALOG DOMAIN API
 *
 * Certificate category and subcategory retrieval.
 */

import { apiRequest } from "./core";

export const catalogApi = {
  /**
   * Get grouped certificate categories.
   * May return 409 with ORG_INDUSTRY_REQUIRED if organization industry is not set.
   */
  getCategories: async () => {
    const response = await apiRequest<{
      groups: Array<{
        group_key: string;
        label: string;
        items: Array<{ id: string; name: string; key: string }>;
      }>;
      flat?: Array<{ id: string; name: string; key: string }>;
    }>("/catalog/categories");
    return response.data!;
  },

  /**
   * Get subcategories for a specific category.
   */
  getSubcategories: async (categoryId: string) => {
    const response = await apiRequest<{
      category_id: string;
      items: Array<{
        id: string;
        key: string;
        name: string;
        sort_order: number | null;
        is_org_custom: boolean;
      }>;
    }>(`/catalog/categories/${categoryId}/subcategories`);
    return response.data!;
  },
};
