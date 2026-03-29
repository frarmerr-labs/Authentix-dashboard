/**
 * Organization Logo Utility
 *
 * Returns the canonical logo URL provided by the backend.
 * URL construction from raw bucket/path is a backend responsibility;
 * the backend should always return a ready-to-use `logo_url`.
 */

interface OrganizationLogoFields {
  logo_url?: string | null;
}

export function getOrganizationLogoUrl(
  org: OrganizationLogoFields | null | undefined
): string | null {
  return org?.logo_url ?? null;
}
