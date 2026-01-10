/**
 * ORGANIZATION DASHBOARD LAYOUT (Server Component)
 *
 * Fetches session and profile data on the server for fast initial load.
 * Validates org access and redirects if unauthorized.
 * Passes pre-fetched data to the client-side DashboardShell.
 */

import { redirect } from "next/navigation";
import {
  getServerAuthData,
  isServerAuthenticated,
} from "@/lib/api/server";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

interface OrgLayoutProps {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
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

  // Fetch session and profile in parallel
  const { session, profile } = await getServerAuthData();

  // Validate session
  if (!session?.valid || !session.user) {
    redirect("/login");
  }

  // Validate org access
  if (profile?.company_id && profile.company_id !== orgId) {
    // User belongs to a different org - redirect to their org
    redirect(`/dashboard/org/${profile.company_id}`);
  }

  // Prepare user and company data for client
  const userData = session.user
    ? {
        id: session.user.id,
        email: session.user.email,
        full_name: session.user.full_name,
      }
    : null;

  const companyData = profile?.company
    ? {
        name: profile.company.name,
        logo: profile.company.logo,
      }
    : null;

  return (
    <DashboardShell
      orgId={orgId}
      initialUser={userData}
      initialCompany={companyData}
    >
      {children}
    </DashboardShell>
  );
}
