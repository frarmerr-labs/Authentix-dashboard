/**
 * ORGANIZATION DASHBOARD LAYOUT (Server Component)
 *
 * Fetches session and profile data on the server for fast initial load.
 * Validates org access and redirects if unauthorized.
 * Checks email verification status and redirects if not verified.
 * Passes pre-fetched data to the client-side DashboardShell.
 */

import { redirect } from "next/navigation";
import {
  getServerAuthData,
  isServerAuthenticated,
  serverApiRequest,
} from "@/lib/api/server";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

interface OrgLayoutProps {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}

interface MeResponse {
  authenticated: boolean;
  user: {
    id: string;
    email: string;
    email_verified: boolean;
    full_name: string | null;
  } | null;
  organization?: {
    id: string;
    name: string;
  } | null;
}

export default async function OrgDashboardLayout({
  children,
  params,
}: OrgLayoutProps) {
  // Unwrap params (Next.js 16 async params)
  const { orgId } = await params;

  // Check authentication server-side
  const isAuthenticated = await isServerAuthenticated();
  if (!isAuthenticated) {
    redirect("/login");
  }

  // Fetch session and profile first (these are fast)
  const { session, profile } = await getServerAuthData();

  // Only check email verification if we have a valid session
  // This avoids unnecessary calls when not authenticated
  let me: MeResponse | null = null;
  if (session?.valid && session.user) {
    try {
      const meResult = await serverApiRequest<MeResponse>("/auth/me");
      me = meResult.data;
    } catch (error) {
      // If /auth/me fails, we'll check email_verified from session if available
      console.debug("[DashboardLayout] /auth/me check failed, using session data");
    }
  }

  // Validate session
  if (!session?.valid || !session.user) {
    redirect("/login");
  }

  // Check email verification status
  // If backend returns email_verified field, use it; otherwise check via /auth/me
  const emailVerified = me?.user?.email_verified ?? false;
  if (!emailVerified) {
    redirect("/auth/verify-email");
  }

  // Validate org access
  if (profile?.organization_id && profile.organization_id !== orgId) {
    // User belongs to a different org - redirect to their org
    redirect(`/dashboard/org/${profile.organization_id}`);
  }

  // Prepare user and organization data for client
  const userData = session.user
    ? {
        id: session.user.id,
        email: session.user.email,
        full_name: session.user.full_name,
      }
    : null;

  const organizationData = profile?.organization
    ? {
        name: profile.organization.name,
        logo: profile.organization.logo,
      }
    : null;

  return (
    <DashboardShell
      orgId={orgId}
      initialUser={userData}
      initialCompany={organizationData}
    >
      {children}
    </DashboardShell>
  );
}
