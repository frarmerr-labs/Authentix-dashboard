"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Shield, Download, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function VerificationLogsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Verification Logs</h1>
          <p className="text-muted-foreground mt-1.5 text-base">
            Track all certificate verification attempts
          </p>
        </div>
        <Button variant="outline" className="h-9 px-4 gap-2">
          <Download className="h-4 w-4" />
          Export Logs
        </Button>
      </div>

      {/* Empty State */}
      <Card className="border-2 border-dashed border-border bg-card/40 relative overflow-hidden">
        <CardContent className="relative flex flex-col items-center justify-center py-16">
          <div className="mb-6">
            <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
              <Shield className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <h3 className="text-2xl font-bold mb-2">No verifications yet</h3>
          <p className="text-muted-foreground text-center max-w-md leading-relaxed">
            Verification logs will appear here when recipients verify their certificates.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
