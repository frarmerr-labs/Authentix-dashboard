"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileSpreadsheet,
  Download,
  Trash2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Calendar,
  FileText,
  Layers,
  MoreHorizontal,
  ExternalLink,
  Database,
} from "lucide-react";
import { type ImportJob } from "@/lib/api/client";
import { useImports, useImportData } from "@/lib/hooks/queries/imports";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow, format } from "date-fns";

function ImportPreview({ importId }: { importId: string }) {
  const { data, isLoading } = useImportData(importId, { page: 1, limit: 5 });
  const rows = (data?.items ?? []) as Record<string, unknown>[];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No preview data available</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {Object.keys(rows[0] ?? {}).map((header) => (
                <th
                  key={header}
                  className="px-4 py-2 text-left font-medium text-muted-foreground whitespace-nowrap"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t">
                {Object.values(row).map((value, colIndex) => (
                  <td key={colIndex} className="px-4 py-2 whitespace-nowrap">
                    {value !== null && value !== undefined ? (
                      String(value)
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ImportsPage() {
  const { imports, loading, refetch } = useImports({
    sort_by: "created_at",
    sort_order: "desc",
    limit: 50,
  });

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [importToDelete, setImportToDelete] = useState<string | null>(null);

  const toggleExpand = (importId: string) => {
    setExpandedId((prev) => (prev === importId ? null : importId));
  };

  const handleDownload = async (importId: string) => {
    try {
      const downloadUrl = await api.imports.getDownloadUrl(importId);
      window.open(downloadUrl, "_blank");
    } catch (err) {
      console.error("Error getting download URL:", err);
      alert("Failed to download file");
    }
  };

  const handleDelete = () => {
    // TODO: Add delete API endpoint to backend
    setDeleteDialogOpen(false);
    setImportToDelete(null);
  };

  const handleUseForGeneration = (importId: string) => {
    window.location.href = `/dashboard/generate-certificate?import=${importId}`;
  };

  const getStatusBadge = (status: ImportJob["status"]) => {
    const variants: Record<
      ImportJob["status"],
      { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
    > = {
      completed: { variant: "default", label: "Completed" },
      queued: { variant: "secondary", label: "Queued" },
      pending: { variant: "secondary", label: "Pending" },
      processing: { variant: "outline", label: "Processing" },
      failed: { variant: "destructive", label: "Failed" },
    };
    const config = variants[status] ?? variants.queued;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Imported Data</h1>
          <p className="text-muted-foreground mt-1.5 text-base">
            View and manage data files used for certificate generation
          </p>
        </div>
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Imported Data</h1>
          <p className="text-muted-foreground mt-1.5 text-base">
            View and manage data files used for certificate generation
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Import Cards */}
      {imports.length === 0 ? (
        <Card className="border-2 border-dashed border-border bg-card/40">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mb-6">
              <Database className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-bold mb-2">No imported data yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-8 leading-relaxed">
              Data files will appear here after you upload them during certificate generation.
            </p>
            <Button asChild>
              <a href="/dashboard/generate-certificate">Generate Certificates</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {(imports as ImportJob[]).map((importItem) => (
            <Card
              key={importItem.id}
              className={cn(
                "transition-all duration-200",
                expandedId === importItem.id && "ring-1 ring-primary"
              )}
            >
              {/* Card Header - Always Visible */}
              <div
                className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => toggleExpand(importItem.id)}
              >
                <div className="flex items-start gap-4">
                  {/* File Icon */}
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="h-6 w-6 text-primary" />
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-base truncate">
                          {importItem.file_name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Layers className="h-3.5 w-3.5" />
                            {importItem.total_rows || 0} rows
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5" />
                            {formatFileSize(importItem.file_size)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDistanceToNow(new Date(importItem.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {getStatusBadge(importItem.status)}

                        {/* Actions Dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleDownload(importItem.id)}>
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleUseForGeneration(importItem.id)}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Use for Generation
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => {
                                setImportToDelete(importItem.id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Expand/Collapse Icon */}
                        <div className="text-muted-foreground">
                          {expandedId === importItem.id ? (
                            <ChevronUp className="h-5 w-5" />
                          ) : (
                            <ChevronDown className="h-5 w-5" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Category/Subcategory Tags */}
                    {(importItem.certificate_category || importItem.certificate_subcategory) && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {importItem.certificate_category && (
                          <Badge variant="outline" className="text-xs">
                            {importItem.certificate_category}
                          </Badge>
                        )}
                        {importItem.certificate_subcategory && (
                          <Badge variant="outline" className="text-xs">
                            {importItem.certificate_subcategory}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Content - Data Preview */}
              {expandedId === importItem.id && (
                <div className="border-t">
                  <div className="p-4">
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">
                      Data Preview (Top 5 rows)
                    </h4>

                    <ImportPreview importId={importItem.id} />

                    {/* Additional Details */}
                    <div className="mt-4 pt-4 border-t">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">File Type</p>
                          <p className="font-medium">{importItem.file_type.toUpperCase()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Uploaded</p>
                          <p className="font-medium">
                            {format(
                              new Date(importItem.created_at),
                              "MMM d, yyyy 'at' h:mm a"
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Reusable</p>
                          <p className="font-medium">{importItem.reusable ? "Yes" : "No"}</p>
                        </div>
                        {importItem.error_message && (
                          <div className="col-span-2 md:col-span-4">
                            <p className="text-muted-foreground">Error</p>
                            <p className="font-medium text-destructive">
                              {importItem.error_message}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Import</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this import? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
