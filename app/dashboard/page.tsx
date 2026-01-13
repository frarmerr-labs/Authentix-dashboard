"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { Loader2 } from "lucide-react";

/**
 * Dashboard resolver - redirects to /dashboard/org/[orgId]
 */
export default function DashboardResolver() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function resolveOrg() {
      try {
        // Use a timeout to avoid hanging if the request is slow
        const profilePromise = api.users.getProfile();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Request timeout")), 5000)
        );
        
        const profile = await Promise.race([profilePromise, timeoutPromise]) as Awaited<ReturnType<typeof api.users.getProfile>>;
        
        if (!profile.company_id) {
          setError("No organization found.");
          return;
        }

        // Check for redirect path from saved URLs
        const redirectPath = document.cookie
          .split("; ")
          .find((row) => row.startsWith("redirect_path="))
          ?.split("=")[1];
        document.cookie = "redirect_path=; path=/; max-age=0";

        const targetPath = redirectPath ? redirectPath.replace("/dashboard", "") : "";
        router.replace(`/dashboard/org/${profile.company_id}${targetPath}`);
      } catch (error) {
        console.error("[DashboardResolver] Error:", error);
        // If it's a timeout or 401, redirect to login
        router.replace("/login");
      }
    }
    resolveOrg();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive">{error}</p>
          <button onClick={() => router.push("/login")} className="text-primary hover:underline">Return to login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading workspace...</p>
      </div>
    </div>
  );
}
