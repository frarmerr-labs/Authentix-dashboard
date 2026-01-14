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
import { getOrganizationLogoUrl } from "@/lib/utils/organization-logo";

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

// Backend returns: { profile: {...}, organization: {...}, membership: {...} }
// Frontend expects: { id, email, full_name, organization, membership: { id, role } }
interface BackendUserProfileResponse {
  profile: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    full_name: string | null;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    application_id: string;
    billing_status: string;
    industry_id: string | null;
    logo: {
      file_id: string;
      bucket: string;
      path: string;
    } | null;
  } | null;
  membership: {
    id: string;
    organization_id: string;
    username: string;
    role_id: string;
    role_key: string;
    status: string;
  } | null;
}

interface UserProfileResponse {
  id: string;
  email: string;
  full_name: string | null;
  organization?: {
    id: string;
    name: string;
    // Logo fields from backend - supports multiple structures
    logo_file_id?: string | null;
    logo_bucket?: string | null;
    logo_path?: string | null;
    logo_url?: string | null;
    // Nested structure: logo.bucket/path
    logo?: {
      bucket?: string | null;
      path?: string | null;
    } | null;
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

  // Log session data for debugging
  console.log("[DashboardLayout] Session check:", JSON.stringify({
    hasSession: !!session,
    sessionValid: session?.valid,
    hasUser: !!session?.user,
    userId: session?.user?.id,
    userEmail: session?.user?.email,
    emailVerified: session?.user?.email_verified,
    sessionData: session,
  }, null, 2));

  // Only check email verification if we have a valid session
  // This avoids unnecessary calls when not authenticated
  let me: MeResponse | null = null;
  if (session?.valid && session.user) {
    try {
      const meResult = await serverApiRequest<MeResponse>("/auth/me");
      
      // Log /auth/me response
      console.log("[DashboardLayout] /auth/me response:", JSON.stringify({
        success: meResult.success,
        hasData: !!meResult.data,
        emailVerified: meResult.data?.user?.email_verified,
        fullResponse: meResult,
      }, null, 2));
      
      me = meResult.data;
    } catch (error) {
      // If /auth/me fails, we'll check email_verified from session if available
      console.warn("[DashboardLayout] /auth/me check failed, using session data:", error);
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
        const profileResult = await serverApiRequest<BackendUserProfileResponse>("/users/me");
        
        // Log full backend response for debugging
        console.log("[DashboardLayout] /users/me response:", JSON.stringify({
          success: profileResult.success,
          hasData: !!profileResult.data,
          dataKeys: profileResult.data ? Object.keys(profileResult.data) : [],
          organization: profileResult.data?.organization ? {
            id: profileResult.data.organization.id,
            name: profileResult.data.organization.name,
            hasLogo: !!profileResult.data.organization.logo,
          } : null,
          membership: profileResult.data?.membership ? {
            id: profileResult.data.membership.id,
            role: profileResult.data.membership.role_key,
          } : null,
          fullResponse: profileResult,
        }, null, 2));
        
        if (!profileResult.data) {
          throw new ServerApiError(
            "PROFILE_NOT_READY",
            "Profile data not available",
            404
          );
        }

        const backendData = profileResult.data;
        
        // Transform backend response to frontend format
        // Backend returns: { profile, organization, membership }
        // Frontend expects: { id, email, full_name, organization, membership: { id, role } }
        const transformed: UserProfileResponse = {
          id: backendData.profile.id,
          email: backendData.profile.email,
          full_name: backendData.profile.full_name,
          organization: backendData.organization ? {
            id: backendData.organization.id,
            name: backendData.organization.name,
            logo: backendData.organization.logo ? {
              bucket: backendData.organization.logo.bucket,
              path: backendData.organization.logo.path,
            } : null,
          } : null,
          membership: backendData.membership ? {
            id: backendData.membership.id,
            role: backendData.membership.role_key,
          } : null,
        };
        
        return transformed;
      },
      {
        maxAttempts: 5,
        initialDelayMs: 500,
        maxDelayMs: 5000,
        retryableErrors: ["PROFILE_NOT_READY", "NETWORK_ERROR", "TIMEOUT"],
        retryableStatusCodes: [404, 500, 503],
      }
    );
    
    // Log successful profile fetch
    console.log("[DashboardLayout] User profile loaded successfully:", JSON.stringify({
      userId: userProfile.id,
      email: userProfile.email,
      hasOrganization: !!userProfile.organization,
      organizationId: userProfile.organization?.id,
      organizationName: userProfile.organization?.name,
      hasMembership: !!userProfile.membership,
      membershipRole: userProfile.membership?.role,
    }, null, 2));
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
  // If missing, show loading screen
  if (!userProfile.organization || !userProfile.membership) {
    // Log what's missing for debugging
    console.warn("[DashboardLayout] Missing organization or membership:", JSON.stringify({
      hasOrganization: !!userProfile.organization,
      hasMembership: !!userProfile.membership,
      organization: userProfile.organization,
      membership: userProfile.membership,
      fullProfile: userProfile,
    }, null, 2));
    
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
          // Use utility to construct logo URL from backend response structure
          logo: getOrganizationLogoUrl(userProfile.organization),
        }
      : profile?.organization
      ? {
          name: profile.organization.name,
          logo: getOrganizationLogoUrl(profile.organization),
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
