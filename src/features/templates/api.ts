/**
 * TEMPLATES FEATURE - API CLIENT
 *
 * Template-specific API functions.
 * Re-exports from the main API client for domain-specific usage.
 */

import { api } from "@/lib/api/client";
import type {
  Template,
  TemplateListParams,
  TemplateListResponse,
  CreateTemplateMetadata,
  UpdateTemplateData,
  TemplateCategoriesResponse,
} from "./types";

/**
 * Fetch list of templates with optional filters
 */
export async function listTemplates(
  params?: TemplateListParams
): Promise<TemplateListResponse> {
  return api.templates.list(params) as Promise<TemplateListResponse>;
}

/**
 * Fetch a single template by ID
 */
export async function getTemplate(id: string): Promise<Template> {
  return api.templates.get(id) as Promise<Template>;
}

/**
 * Create a new template
 */
export async function createTemplate(
  file: File,
  metadata: CreateTemplateMetadata
): Promise<Template> {
  // Map CreateTemplateMetadata to API expected format
  const apiParams = {
    title: metadata.name,
    category_id: metadata.certificate_category || '',
    subcategory_id: metadata.certificate_subcategory || '',
  };
  return api.templates.create(file, apiParams) as unknown as Promise<Template>;
}

/**
 * Update an existing template
 */
export async function updateTemplate(
  id: string,
  updates: UpdateTemplateData
): Promise<Template> {
  return api.templates.update(id, updates) as Promise<Template>;
}

/**
 * Delete a template
 */
export async function deleteTemplate(id: string): Promise<void> {
  await api.templates.delete(id);
}

/**
 * Get signed preview URL for a template
 */
export async function getTemplatePreviewUrl(id: string): Promise<string> {
  return api.templates.getPreviewUrl(id);
}

/**
 * Get available template categories
 */
export async function getTemplateCategories(): Promise<TemplateCategoriesResponse> {
  return api.templates.getCategories();
}

/**
 * Fetch templates with preview URLs
 * Convenience function that loads templates and attaches preview URLs
 */
export async function listTemplatesWithPreviews(
  params?: TemplateListParams
): Promise<Template[]> {
  const response = await listTemplates(params);

  const templatesWithPreviews = await Promise.all(
    response.items.map(async (template) => {
      if (template.id) {
        try {
          const previewUrl = await getTemplatePreviewUrl(template.id);
          return { ...template, preview_url: previewUrl };
        } catch (error) {
          console.error(
            "[Templates] Error generating preview URL:",
            template.id,
            error
          );
        }
      }
      return template;
    })
  );

  return templatesWithPreviews;
}
