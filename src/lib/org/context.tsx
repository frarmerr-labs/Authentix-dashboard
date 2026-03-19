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
  /** Current organization ID from URL */
  readonly orgId: string;
  /** Base path for current org: /dashboard/org/[orgId] */
  readonly basePath: string;
  /** Generate a path within the current org - memoized */
  orgPath: (path: string) => string;
}

const OrgContext = createContext<OrgContextValue | null>(null);

interface OrgProviderProps {
  readonly children: ReactNode;
  readonly orgId: string;
}

/**
 * Provider for organization context
 * 
 * @example
 * // In layout.tsx
 * <OrgProvider orgId={orgId}>
 *   {children}
 * </OrgProvider>
 * 
 * // In child components
 * const { orgPath } = useOrg();
 * <Link href={orgPath("/templates")}>Templates</Link>
 */
export function OrgProvider({ children, orgId }: OrgProviderProps) {
  const basePath = `/dashboard/org/${orgId}` as const;

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
    () => ({ orgId, basePath, orgPath }),
    [orgId, basePath, orgPath]
  );

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

/**
 * Hook to access organization context
 * @throws Error if used outside OrgProvider
 * 
 * @example
 * const { orgId, orgPath } = useOrg();
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
 * Hook to get just the orgId
 * Use this when you only need the ID for simpler components
 */
export function useOrgId(): string {
  return useOrg().orgId;
}

/**
 * Hook to get just the path generator
 * Use this when you only need navigation
 */
export function useOrgPath(): (path: string) => string {
  return useOrg().orgPath;
}
