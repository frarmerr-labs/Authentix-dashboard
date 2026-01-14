/**
 * ORGANIZATION DASHBOARD LAYOUT (Server Component)
 *
 * Fetches session and profile data on the server for fast initial load.
 * Validates org access and redirects if unauthorized.
 * Checks email verification status and redirects if not verified.
 * Passes pre-fetched data to the client-side DashboardShell.
 *
 * Resilient initialization:
 * - Retries profile fetch with exponential backoff if PROFILE_NOT_READY
 * - Shows loading states during initialization
 * - Handles specific error codes (AUTH_ERROR, ORG_NOT_FOUND)
 * - Frontend is read-only (no bootstrap calls)
 */

import { redirect } from "next/navigation";
import {
  getServerAuthData,
  isServerAuthenticated,
  serverApiRequest,
  ServerApiError,
} from "@/lib/api/server";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardLoadingScreen } from "@/components/dashboard/DashboardLoadingScreen";
import { retryWithBackoff } from "@/lib/utils/retry";

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

interface UserProfileResponse {
  id: string;
  email: string;
  full_name: string | null;
  organization?: {
    id: string;
    name: string;
    // New logo fields from backend
    logo_file_id: string | null;
    logo_bucket?: string | null;
    logo_path?: string | null;
    logo_url?: string | null;
  } | null;
  membership?: {
    id: string;
    role: string;
  } | null;
}

function ProfileErrorScreen({
  errorCode,
  message,
}: {
  errorCode?: string;
  message?: string;
}) {
  if (errorCode === "AUTH_ERROR" || errorCode === "UNAUTHORIZED") {
    // This will be handled by redirect, but just in case
    return null;
  }

  if (errorCode === "ORG_NOT_FOUND") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-4">
          <p className="text-destructive text-lg font-semibold">
            Organization not found
          </p>
          <p className="text-muted-foreground">
            Your account setup is incomplete. Please contact support.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4 max-w-md px-4">
        <p className="text-destructive text-lg font-semibold">
          {message || "Failed to load your workspace"}
        </p>
        <p className="text-muted-foreground">
          Please refresh the page to retry. If this persists, contact support.
        </p>
      </div>
    </div>
  );
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
  // Priority: 1) /auth/me response, 2) session.user.email_verified, 3) assume true if valid session
  // (Step-1 auth typically only issues sessions after email verification)
  const emailVerified = 
    me?.user?.email_verified ?? 
    session.user?.email_verified ?? 
    (session.valid ? true : false);
  
  if (!emailVerified) {
    redirect("/verify-email");
  }

  // Fetch full user profile (includes membership/org) with retry logic
  // Frontend is read-only - we do NOT create organizations/roles/profiles
  let userProfile: UserProfileResponse | null = null;
  let profileError: ServerApiError | null = null;

  try {
    // Retry profile fetch with exponential backoff
    // Handles PROFILE_NOT_READY, 404, and transient 500 errors
    userProfile = await retryWithBackoff(
      async () => {
        const profileResult = await serverApiRequest<UserProfileResponse>("/users/me");
        if (!profileResult.data) {
          throw new ServerApiError(
            "PROFILE_NOT_READY",
            "Profile data not available",
            404
          );
        }
        return profileResult.data;
      },
      {
        maxAttempts: 5,
        initialDelayMs: 500,
        maxDelayMs: 5000,
        retryableErrors: ["PROFILE_NOT_READY", "NETWORK_ERROR", "TIMEOUT"],
        retryableStatusCodes: [404, 500, 503],
      }
    );
  } catch (error) {
    // Handle specific error codes
    if (error instanceof ServerApiError) {
      profileError = error;

      // AUTH_ERROR or UNAUTHORIZED -> redirect to login
      if (
        error.code === "AUTH_ERROR" ||
        error.code === "UNAUTHORIZED" ||
        error.status === 401
      ) {
        redirect("/login");
      }

      // ORG_NOT_FOUND -> show error screen
      if (error.code === "ORG_NOT_FOUND" || error.code === "ORGANIZATION_NOT_FOUND") {
        return <ProfileErrorScreen errorCode={error.code} />;
      }

      // PROFILE_NOT_READY after all retries -> show loading state
      // This indicates backend is still setting up the profile
      if (error.code === "PROFILE_NOT_READY") {
        return (
          <DashboardLoadingScreen
            message="Finalizing account setup"
            submessage="Your workspace is being prepared. This may take a few moments."
          />
        );
      }
    }

    // Log unexpected errors but don't crash
    console.error("[DashboardLayout] Failed to fetch user profile after retries:", error);
  }

  // If profile is still null after retries, show error
  if (!userProfile) {
    return (
      <ProfileErrorScreen
        errorCode={profileError?.code}
        message={profileError?.message || "Failed to load your workspace"}
      />
    );
  }

  // Verify organization and membership exist
  // Frontend is read-only - backend must have created these
  if (!userProfile.organization || !userProfile.membership) {
    return (
      <DashboardLoadingScreen
        message="Finalizing account setup"
        submessage="Your organization is being set up. Please wait..."
      />
    );
  }

  // Derive orgId from profile (don't trust URL param until verified)
  const effectiveOrgId = userProfile.organization.id;

  // Validate org access - redirect if URL param doesn't match actual org
  if (effectiveOrgId !== orgId) {
    // User belongs to a different org - redirect to their actual org
    redirect(`/dashboard/org/${effectiveOrgId}`);
  }

  // Prepare user and organization data for client
  const userData = session.user
    ? {
        id: session.user.id,
        email: session.user.email,
        full_name: session.user.full_name,
      }
    : null;

  const organizationData =
    userProfile?.organization
      ? {
          name: userProfile.organization.name,
          // Prefer backend-provided logo_url; otherwise, no logo (placeholder in UI)
          logo: userProfile.organization.logo_url ?? null,
        }
      : profile?.organization
      ? {
          name: profile.organization.name,
          logo: profile.organization.logo_url ?? null,
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
