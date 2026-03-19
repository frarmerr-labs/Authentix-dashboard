"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Dashboard resolver - redirects to /dashboard/org/[orgId]
 */
export default function DashboardResolver() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function resolveOrg() {
      try {
        const TIMEOUT_MS = 12000;
        let timeoutId: NodeJS.Timeout | undefined;

        const mePromise = fetch("/api/auth/me", {
          credentials: "include",
        }).then(async (res) => {
          const responseData = await res.json();
          
          // Log full backend response
          console.log("[DashboardResolver] /api/auth/me response:", JSON.stringify({
            status: res.status,
            ok: res.ok,
            response: responseData,
          }, null, 2));
          
          if (!res.ok) {
            throw new Error(`Me request failed: ${res.status}`);
          }
          return responseData as {
            success: boolean;
            data?: {
              authenticated: boolean;
              user: { id: string; email: string } | null;
              organization?: { id: string; name?: string } | null;
            };
          };
        });

        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error("Request timeout")), TIMEOUT_MS);
        });

        const me = await Promise.race([mePromise, timeoutPromise]);

        if (timeoutId) clearTimeout(timeoutId);

        if (!me.data?.authenticated) {
          router.replace("/login");
          return;
        }

        const orgId = me.data?.organization?.id;
        console.log("[DashboardResolver] Organization check:", JSON.stringify({
          hasOrgId: !!orgId,
          orgId: orgId,
          authenticated: me.data?.authenticated,
          hasUser: !!me.data?.user,
          userId: me.data?.user?.id,
          userEmail: me.data?.user?.email,
          fullMeData: me.data,
        }, null, 2));
        
        if (!orgId) {
          // Organization missing - try calling bootstrap if we have a session
          // This handles cases where bootstrap didn't run after login
          console.log("[DashboardResolver] No organization found, attempting bootstrap...");
          try {
            const bootstrapResponse = await fetch("/api/proxy/auth/bootstrap", {
              method: "POST",
              credentials: "include",
            });

            const bootstrapData = await bootstrapResponse.json();
            
            // Log full bootstrap response
            console.log("[DashboardResolver] Bootstrap response:", JSON.stringify({
              status: bootstrapResponse.status,
              ok: bootstrapResponse.ok,
              response: bootstrapData,
            }, null, 2));

            if (bootstrapResponse.ok && bootstrapData.data?.organization?.id) {
              const newOrgId = bootstrapData.data.organization.id;
              console.log("[DashboardResolver] Bootstrap succeeded, redirecting to org:", newOrgId);
              // Bootstrap succeeded - redirect to new org
              router.replace(`/dashboard/org/${newOrgId}`);
              return;
            } else {
              console.warn("[DashboardResolver] Bootstrap response missing orgId, retrying /api/auth/me...");
              
              // Bootstrap might have succeeded but /users/me isn't ready yet
              // Retry /api/auth/me a few times with delays
              for (let attempt = 1; attempt <= 3; attempt++) {
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // 1s, 2s, 3s
                
                try {
                  const retryMeResponse = await fetch("/api/auth/me", {
                    credentials: "include",
                  });
                  
                  if (retryMeResponse.ok) {
                    const retryMeData = await retryMeResponse.json();
                    const retryOrgId = retryMeData.data?.organization?.id;
                    
                    console.log(`[DashboardResolver] Retry ${attempt}/3 - orgId:`, retryOrgId);
                    
                    if (retryOrgId) {
                      router.replace(`/dashboard/org/${retryOrgId}`);
                      return;
                    }
                  }
                } catch (retryError) {
                  console.warn(`[DashboardResolver] Retry ${attempt}/3 failed:`, retryError);
                }
              }
              
              // If still no org after retries, show error
              console.error("[DashboardResolver] No organization found after bootstrap and retries");
              setError("Organization setup is taking longer than expected. Please refresh the page.");
              return;
            }
          } catch (bootstrapError) {
            console.error("[DashboardResolver] Bootstrap error:", bootstrapError);
            setError("Failed to set up organization. Please try logging in again.");
            return;
          }
        }

        // Check for redirect path from saved URLs
        const redirectPath = document.cookie
          .split("; ")
          .find((row) => row.startsWith("redirect_path="))
          ?.split("=")[1];
        document.cookie = "redirect_path=; path=/; max-age=0";

        const targetPath = redirectPath ? redirectPath.replace("/dashboard", "") : "";
        router.replace(`/dashboard/org/${orgId}${targetPath}`);
      } catch (error: unknown) {
        // Handle timeout gracefully
        if (error instanceof Error && error.message === "Request timeout") {
          setError("Request timed out. Please try again.");
          return;
        }

        console.error("[DashboardResolver] Error:", error);
        // Fallback: redirect to login
        router.replace("/login");
      }
    }
    resolveOrg();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-md px-4">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-destructive">Setup Error</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <div className="flex flex-col gap-2 pt-4">
            <button
              onClick={() => router.refresh()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => router.push("/login")}
              className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Dashboard Skeleton */}
      <div className="flex">
        {/* Sidebar Skeleton */}
        <aside className="fixed top-0 left-0 z-40 h-screen w-14 bg-card border-r">
          <div className="flex flex-col h-full">
            {/* Logo skeleton */}
            <div className="h-16 flex items-center justify-center border-b">
              <div className="w-8 h-8 rounded-lg bg-muted animate-pulse" />
            </div>
            
            {/* Navigation skeleton */}
            <nav className="flex-1 p-2 space-y-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 w-full rounded-lg bg-muted animate-pulse"
                />
              ))}
            </nav>
            
            {/* Bottom actions skeleton */}
            <div className="p-2 border-t space-y-1">
              <div className="h-10 w-full rounded-lg bg-muted animate-pulse" />
              <div className="h-10 w-full rounded-lg bg-muted animate-pulse" />
            </div>
          </div>
        </aside>

        {/* Main content skeleton */}
        <div className="pl-14 flex-1">
          {/* Header skeleton */}
          <header className="h-16 bg-card border-b sticky top-0 z-30">
            <div className="h-full px-6 flex items-center justify-between">
              <div className="h-6 w-48 bg-muted animate-pulse rounded" />
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
              </div>
            </div>
          </header>

          {/* Content skeleton */}
          <main className="p-6">
            <div className="max-w-[1400px] mx-auto space-y-8">
              {/* Header section skeleton */}
              <div className="space-y-2">
                <div className="h-8 w-64 bg-muted animate-pulse rounded" />
                <div className="h-4 w-96 bg-muted animate-pulse rounded" />
              </div>

              {/* KPI Cards skeleton */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-lg border bg-card p-6 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="h-11 w-11 rounded-xl bg-muted animate-pulse" />
                      <div className="h-6 w-16 bg-muted animate-pulse rounded-full" />
                    </div>
                    <div className="h-4 w-28 bg-muted animate-pulse rounded" />
                    <div className="h-9 w-20 bg-muted animate-pulse rounded" />
                  </div>
                ))}
              </div>

              {/* Activity Grid skeleton */}
              <div className="grid gap-6 lg:grid-cols-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-lg border bg-card"
                  >
                    <div className="border-b bg-muted/30 p-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 bg-muted animate-pulse rounded" />
                        <div className="h-5 w-32 bg-muted animate-pulse rounded" />
                      </div>
                      <div className="h-8 w-20 bg-muted animate-pulse rounded" />
                    </div>
                    <div className="p-6 space-y-4">
                      {Array.from({ length: 3 }).map((_, j) => (
                        <div key={j} className="flex items-start gap-4">
                          <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                            <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
