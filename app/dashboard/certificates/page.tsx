"use client";

import { Card, CardContent } from "@/components/ui/card";
import { FileCheck, Search, Filter, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function CertificatesPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Certificates</h1>
          <p className="text-muted-foreground mt-1.5 text-base">
            View and manage all issued certificates
          </p>
        </div>
        <Button className="h-9 px-4 gap-2">
          <Download className="h-4 w-4" />
          Export All
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="p-4 border border-border bg-card/60">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name, email, or certificate ID..."
              className="pl-10 h-10"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>
      </Card>

      {/* Empty State */}
      <Card className="border-2 border-dashed border-border bg-card/40 relative overflow-hidden">
        <CardContent className="relative flex flex-col items-center justify-center py-16">
          <div className="mb-6">
            <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
              <FileCheck className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <h3 className="text-2xl font-bold mb-2">No certificates yet</h3>
          <p className="text-muted-foreground text-center max-w-md mb-8 leading-relaxed">
            Certificates will appear here after you import an Excel file with recipient data.
          </p>
          <Button className="h-9 px-4">
            Import Certificates
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
