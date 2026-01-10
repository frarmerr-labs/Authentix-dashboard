"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Organization context for URL-based org routing
 * Provides orgId throughout the dashboard
 */
export interface OrgContextValue {
  /** Current organization ID from URL */
  orgId: string;
  /** Base path for current org: /dashboard/org/[orgId] */
  basePath: string;
  /** Generate a path within the current org */
  orgPath: (path: string) => string;
}

const OrgContext = createContext<OrgContextValue | null>(null);

interface OrgProviderProps {
  children: ReactNode;
  orgId: string;
}

export function OrgProvider({ children, orgId }: OrgProviderProps) {
  const basePath = `/dashboard/org/${orgId}`;
  
  const orgPath = (path: string) => {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${basePath}${normalizedPath}`;
  };

  return (
    <OrgContext.Provider value={{ orgId, basePath, orgPath }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg(): OrgContextValue {
  const context = useContext(OrgContext);
  if (!context) {
    throw new Error("useOrg must be used within an OrgProvider");
  }
  return context;
}

export function useOrgId(): string {
  return useOrg().orgId;
}
