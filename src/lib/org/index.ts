/**
 * Organization Context Module
 * 
 * Provides URL-based organization routing for multi-tenant dashboard.
 * 
 * @example
 * // In layout
 * import { OrgProvider } from "@/lib/org";
 * <OrgProvider orgId={orgId}>{children}</OrgProvider>
 * 
 * // In components
 * import { useOrg, useOrgPath } from "@/lib/org";
 * const { orgId } = useOrg();
 * const orgPath = useOrgPath();
 */

export { OrgProvider, useOrg, useOrgId, useOrgSlug, useOrgPath } from "./context";
export type { OrgContextValue } from "./context";
