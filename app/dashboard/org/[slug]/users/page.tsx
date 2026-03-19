"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Users, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UsersPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Members</h1>
          <p className="text-muted-foreground mt-1.5 text-base">
            Manage your team and their permissions
          </p>
        </div>
        <Button className="h-9 px-4 gap-2">
          <UserPlus className="h-4 w-4" />
          Invite Member
        </Button>
      </div>

      {/* Empty State */}
      <Card className="border-2 border-dashed border-border bg-card/40 relative overflow-hidden">
        <CardContent className="relative flex flex-col items-center justify-center py-16">
          <div className="mb-6">
            <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <h3 className="text-2xl font-bold mb-2">Invite your team</h3>
          <p className="text-muted-foreground text-center max-w-md mb-8 leading-relaxed">
            Add team members to collaborate on certificate management and share responsibilities.
          </p>
          <Button className="h-9 px-4 gap-2">
            <UserPlus className="h-4 w-4" />
            Invite Team Member
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
