"use client";

/**
 * Loading screen component for dashboard initialization
 * Shows different states during workspace setup
 * Auto-refreshes after delay to detect when bootstrap completes
 */

import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface DashboardLoadingScreenProps {
  message?: string;
  submessage?: string;
  autoRefresh?: boolean; // If true, auto-refresh page after delay
  refreshDelay?: number; // Delay in seconds before refresh (default: 5)
}

export function DashboardLoadingScreen({
  message = "Initializing your workspace",
  submessage,
  autoRefresh = true,
  refreshDelay = 5,
}: DashboardLoadingScreenProps) {
  const router = useRouter();

  useEffect(() => {
    if (!autoRefresh) return;

    // Auto-refresh after delay to check if bootstrap completed
    const timer = setTimeout(() => {
      console.log("[DashboardLoadingScreen] Auto-refreshing to check bootstrap status...");
      router.refresh();
    }, refreshDelay * 1000);

    return () => clearTimeout(timer);
  }, [autoRefresh, refreshDelay, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 max-w-md px-4">
        <div className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">{message}</h2>
          {submessage && (
            <p className="text-sm text-muted-foreground">{submessage}</p>
          )}
        </div>
      </div>
    </div>
  );
}
