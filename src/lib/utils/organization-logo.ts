/**
 * Organization Logo Utility
 * 
 * Constructs logo URL from backend response structure.
 * Backend may return:
 * - logo_path (direct path)
 * - logo.bucket/path (nested structure)
 * - logo_url (pre-signed URL if backend provides it)
 * 
 * Returns null if no logo is available (UI should show placeholder).
 */

interface OrganizationLogoFields {
  logo_path?: string | null;
  logo_bucket?: string | null;
  logo_url?: string | null;
  // Nested structure: logo.bucket/path
  logo?: {
    bucket?: string | null;
    path?: string | null;
  } | null;
}

/**
 * Get organization logo URL from backend response
 * 
 * Priority:
 * 1. logo_url (pre-signed URL if backend provides it)
 * 2. logo_path (direct path)
 * 3. logo.bucket + logo.path (nested structure)
 * 4. null (no logo - UI should show placeholder)
 */
export function getOrganizationLogoUrl(
  org: OrganizationLogoFields | null | undefined
): string | null {
  if (!org) return null;

  // Priority 1: Pre-signed URL (if backend provides it)
  if (org.logo_url) {
    return org.logo_url;
  }

  // Priority 2: Direct logo_path
  if (org.logo_path) {
    return org.logo_path;
  }

  // Priority 3: Nested logo.bucket/path structure
  if (org.logo?.bucket && org.logo?.path) {
    // Construct path from bucket and path
    // Format depends on your storage provider (S3, GCS, etc.)
    // For now, assume simple concatenation or backend provides full path
    return `${org.logo.bucket}/${org.logo.path}`;
  }

  // Also check logo_bucket + logo_path if provided separately
  if (org.logo_bucket && org.logo_path) {
    return `${org.logo_bucket}/${org.logo_path}`;
  }

  // No logo available
  return null;
}
