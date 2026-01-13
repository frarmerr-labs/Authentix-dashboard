/**
 * TEMPLATES FEATURE - TYPE DEFINITIONS
 *
 * Type definitions specific to the templates domain.
 * Uses TypeScript 5.9 patterns: const assertions, satisfies, discriminated unions
 */

/**
 * Template status options (const assertion for type narrowing)
 */
export const TEMPLATE_STATUSES = ["draft", "active", "archived"] as const;
export type TemplateStatus = (typeof TEMPLATE_STATUSES)[number];

/**
 * Supported template file types
 */
export const TEMPLATE_FILE_TYPES = ["pdf", "png", "jpg", "jpeg"] as const;
export type TemplateFileType = (typeof TEMPLATE_FILE_TYPES)[number];

/**
 * Certificate field types
 */
export const CERTIFICATE_FIELD_TYPES = [
  "name",
  "course",
  "date",
  "start_date",
  "end_date",
  "custom",
  "custom_text",
  "qr_code",
] as const;
export type CertificateFieldType = (typeof CERTIFICATE_FIELD_TYPES)[number];

/**
 * Text alignment options
 */
export const TEXT_ALIGNMENTS = ["left", "center", "right"] as const;
export type TextAlignment = (typeof TEXT_ALIGNMENTS)[number];

/**
 * Sort field options for templates
 */
export const TEMPLATE_SORT_FIELDS = ["created_at", "updated_at", "name"] as const;
export type TemplateSortField = (typeof TEMPLATE_SORT_FIELDS)[number];

/**
 * Sort order options
 */
export const SORT_ORDERS = ["asc", "desc"] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

/**
 * Certificate field configuration
 * Base interface for all field types
 */
interface CertificateFieldBase {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  fontFamily?: string;
  fontColor?: string;
  textAlign?: TextAlignment;
}

/**
 * Text-based field (name, course, custom)
 */
interface TextCertificateField extends CertificateFieldBase {
  type: "name" | "course" | "custom" | "custom_text";
  prefix?: string;
  suffix?: string;
}

/**
 * Date-based field
 */
interface DateCertificateField extends CertificateFieldBase {
  type: "date" | "start_date" | "end_date";
  dateFormat?: string;
  prefix?: string;
  suffix?: string;
}

/**
 * QR code field
 */
interface QRCodeCertificateField extends CertificateFieldBase {
  type: "qr_code";
}

/**
 * Discriminated union for certificate fields
 */
export type CertificateField =
  | TextCertificateField
  | DateCertificateField
  | QRCodeCertificateField;

/**
 * Template data from API
 */
export interface Template {
  readonly id: string;
  name: string;
  description: string | null;
  file_type: TemplateFileType;
  file_path: string;
  status: TemplateStatus;
  certificate_category: string | null;
  certificate_subcategory: string | null;
  width: number | null;
  height: number | null;
  fields: CertificateField[];
  certificate_count: number;
  organization_id: string;
  readonly created_at: string;
  readonly updated_at: string;
  /** Computed at runtime - signed URL for preview */
  preview_url?: string;
}

/**
 * Template creation metadata
 * Uses Partial for optional fields with explicit required fields
 */
export interface CreateTemplateMetadata {
  name: string;
  description?: string;
  file_type?: TemplateFileType;
  certificate_category?: string;
  certificate_subcategory?: string;
  width?: number;
  height?: number;
  fields?: CertificateField[];
  status?: TemplateStatus;
}

/**
 * Template update data
 * All fields optional for partial updates
 */
export interface UpdateTemplateData {
  name?: string;
  description?: string;
  status?: TemplateStatus;
  fields?: CertificateField[];
  width?: number;
  height?: number;
}

/**
 * Template list query params
 */
export interface TemplateListParams {
  page?: number;
  limit?: number;
  status?: TemplateStatus;
  sort_by?: TemplateSortField;
  sort_order?: SortOrder;
}

/**
 * Template categories response
 */
export interface TemplateCategoriesResponse {
  categories: string[];
  categoryMap: Record<string, string[]>;
  industry: string | null;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

/**
 * Template list response
 */
export interface TemplateListResponse {
  items: Template[];
  pagination: PaginationMeta;
}

/**
 * API Result discriminated union
 * Modern pattern for type-safe API responses
 */
export type ApiResult<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: string };

/**
 * Type guards for runtime type checking
 */
export function isTemplateStatus(value: unknown): value is TemplateStatus {
  return typeof value === "string" && TEMPLATE_STATUSES.includes(value as TemplateStatus);
}

export function isTemplateFileType(value: unknown): value is TemplateFileType {
  return typeof value === "string" && TEMPLATE_FILE_TYPES.includes(value as TemplateFileType);
}

export function isCertificateFieldType(value: unknown): value is CertificateFieldType {
  return typeof value === "string" && CERTIFICATE_FIELD_TYPES.includes(value as CertificateFieldType);
}

/**
 * Default values using satisfies for type checking
 */
export const DEFAULT_TEMPLATE_STATUS = "draft" satisfies TemplateStatus;
export const DEFAULT_SORT_ORDER = "desc" satisfies SortOrder;
export const DEFAULT_SORT_FIELD = "created_at" satisfies TemplateSortField;
export const DEFAULT_PAGE_SIZE = 10;
