"use client";

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";

/**
 * Organization context for URL-based multi-tenant routing
 *
 * Pattern: Context with minimal state, derived from URL params
 * This is a modern React 19 pattern - context for static config,
 * not for fetched data (which should use Server Components or hooks)
 */

/** Organization context value type */
export interface OrgContextValue {
  /** Current organization slug from URL */
  readonly slug: string;
  /** Base path for current org: /dashboard/org/[slug] */
  readonly basePath: string;
  /** Generate a path within the current org - memoized */
  orgPath: (path: string) => string;
}

const OrgContext = createContext<OrgContextValue | null>(null);

interface OrgProviderProps {
  readonly children: ReactNode;
  readonly slug: string;
}

/**
 * Provider for organization context
 *
 * @example
 * // In layout.tsx
 * <OrgProvider slug={slug}>
 *   {children}
 * </OrgProvider>
 *
 * // In child components
 * const { orgPath } = useOrg();
 * <Link href={orgPath("/templates")}>Templates</Link>
 */
export function OrgProvider({ children, slug }: OrgProviderProps) {
  const basePath = `/dashboard/org/${slug}` as const;

  const orgPath = useCallback(
    (path: string): string => {
      // Handle empty path or root
      if (!path || path === "/") return basePath;
      // Ensure path starts with /
      const normalizedPath = path.startsWith("/") ? path : `/${path}`;
      return `${basePath}${normalizedPath}`;
    },
    [basePath]
  );

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<OrgContextValue>(
    () => ({ slug, basePath, orgPath }),
    [slug, basePath, orgPath]
  );

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

/**
 * Hook to access organization context
 * @throws Error if used outside OrgProvider
 *
 * @example
 * const { slug, orgPath } = useOrg();
 */
export function useOrg(): OrgContextValue {
  const context = useContext(OrgContext);
  if (!context) {
    throw new Error(
      "useOrg must be used within an OrgProvider. " +
        "Make sure your component is wrapped in <OrgProvider>."
    );
  }
  return context;
}

/**
 * Hook to get just the org slug
 * Use this when you only need the slug for simpler components
 */
export function useOrgSlug(): string {
  return useOrg().slug;
}

/**
 * @deprecated Use useOrgSlug() instead
 */
export function useOrgId(): string {
  return useOrg().slug;
}

/**
 * Hook to get just the path generator
 * Use this when you only need navigation
 */
export function useOrgPath(): (path: string) => string {
  return useOrg().orgPath;
}
