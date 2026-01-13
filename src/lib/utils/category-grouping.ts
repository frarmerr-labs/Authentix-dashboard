/**
 * Category grouping utilities
 * Groups certificate categories into "Course Certificates" and "Company Work"
 */

export interface CategoryGroup {
  name: string;
  categories: string[];
}

/**
 * Course certificate categories (as per requirements)
 */
const COURSE_CERTIFICATE_CATEGORIES = new Set([
  "course_completion",
  "internship_letter",
  "training_certificate",
]);

/**
 * Group categories into "Course Certificates" and "Company Work"
 * @param categories - Array of category names
 * @returns Object with group names as keys and arrays of categories as values
 */
export function groupCategories(categories: string[]): Record<string, string[]> {
  const courseCertificates: string[] = [];
  const companyWork: string[] = [];

  categories.forEach((category) => {
    // Normalize category name for comparison (handle both snake_case and display names)
    const normalized = category.toLowerCase().replace(/\s+/g, "_");
    
    if (COURSE_CERTIFICATE_CATEGORIES.has(normalized)) {
      courseCertificates.push(category);
    } else {
      companyWork.push(category);
    }
  });

  const groups: Record<string, string[]> = {};
  
  if (courseCertificates.length > 0) {
    groups["Course Certificates"] = courseCertificates;
  }
  
  if (companyWork.length > 0) {
    groups["Company Work"] = companyWork;
  }

  return groups;
}

/**
 * Get category groups as an array (for easier iteration)
 */
export function getCategoryGroups(categories: string[]): CategoryGroup[] {
  const grouped = groupCategories(categories);
  return Object.entries(grouped).map(([name, categories]) => ({
    name,
    categories,
  }));
}
