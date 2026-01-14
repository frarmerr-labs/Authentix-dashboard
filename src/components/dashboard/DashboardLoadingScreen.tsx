/**
 * Loading screen component for dashboard initialization
 * Shows different states during workspace setup
 */

import { Loader2 } from "lucide-react";

interface DashboardLoadingScreenProps {
  message?: string;
  submessage?: string;
}

export function DashboardLoadingScreen({
  message = "Initializing your workspace",
  submessage,
}: DashboardLoadingScreenProps) {
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
