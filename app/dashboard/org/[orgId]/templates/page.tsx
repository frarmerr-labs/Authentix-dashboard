"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Eye, Trash2, FileImage, FileType, Sparkles } from "lucide-react";
import { api } from "@/lib/api/client";
import { Badge } from "@/components/ui/badge";
import { TemplateUploadDialog } from "@/components/templates/TemplateUploadDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useOrg } from "@/lib/org";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<any | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const { orgPath } = useOrg();

  // Generate consistent color for category/subcategory badges
  const getColorForText = (text: string): { bg: string; text: string; border: string } => {
    const colors = [
      { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
      { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
      { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
      { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
      { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-300' },
      { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-300' },
      { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
      { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-300' },
      { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
      { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-300' },
    ];

    // Simple hash function to get consistent index
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index]!;
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      // Use BFF route to fetch templates with previews in single request
      // This eliminates N+1 pattern by fetching everything server-side
      const response = await fetch(
        "/api/templates/with-previews?sort_by=created_at&sort_order=desc",
        { credentials: "include" }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch templates");
      }

      const result = await response.json();
      const data = result.data?.items || [];
      setTemplates(data);
    } catch (error: unknown) {
      console.error("Error loading templates:", error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCertificate = (template: any) => {
    // Navigate to generate certificate page which will auto-select this template
    router.push(orgPath(`/generate-certificate?template=${template.id}`));
  };

  const handleDeleteClick = (template: any) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;

    setDeleting(true);
    try {
      await api.templates.delete(templateToDelete.id);

      console.log('[Templates] Template deleted:', templateToDelete.name);

      // Remove from local state
      setTemplates((prev) => prev.filter((t) => t.id !== templateToDelete.id));

      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    } catch (error: any) {
      console.error('[Templates] Error deleting template:', error);
      alert(`Failed to delete template: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
            <div className="h-4 w-96 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-11 w-36 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <div className="aspect-[4/3] bg-muted animate-pulse" />
              <CardContent className="p-4">
                <div className="h-5 w-3/4 bg-muted animate-pulse rounded mb-2" />
                <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Certificate Templates</h1>
            <p className="text-muted-foreground mt-1.5 text-base">
              Manage your certificate templates
            </p>
          </div>
          <Button
            className="h-9 px-4 gap-2"
            onClick={() => setUploadDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Upload Certificate Template
          </Button>
        </div>

        {templates.length === 0 ? (
          <Card className="border-2 border-dashed border-border bg-card/40 relative overflow-hidden">
            <CardContent className="relative flex flex-col items-center justify-center py-16">
              <div className="mb-6">
                <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-2">No certificate templates yet</h3>
              <p className="text-muted-foreground text-center mb-8 max-w-md leading-relaxed">
                Upload your certificate design to create your first template.
              </p>
              <Button
                className="h-9 px-4 gap-2"
                onClick={() => setUploadDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Upload Your First Certificate Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {templates.map((template) => (
              <Card
                key={template.id}
                className="group overflow-hidden hover:shadow-md transition-all duration-300 border border-border bg-card/60 p-0"
              >
                {/* Preview / Icon - No gaps from top, left, right */}
                <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                  {template.preview_url ? (
                    (template.file_type === 'png' || template.file_type === 'jpg' || template.file_type === 'jpeg') ? (
                      <img
                        src={template.preview_url}
                        alt={template.name}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      // PDF preview using iframe so the browser renders first page
                      <iframe
                        src={template.preview_url}
                        className="w-full h-full border-0"
                      />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {template.file_type === 'pdf' ? (
                        <FileType className="h-12 w-12 text-muted-foreground/50" />
                      ) : (
                        <FileImage className="h-12 w-12 text-muted-foreground/50" />
                      )}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    {template.preview_url && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-8 gap-1.5 shadow-lg"
                        onClick={() => {
                          setPreviewTemplate(template);
                          setPreviewOpen(true);
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Preview
                      </Button>
                    )}
                  </div>

                  {/* File Type Badge */}
                  <div className="absolute top-3 right-3">
                    <Badge variant="secondary" className="text-xs uppercase shadow-sm">
                      {template.file_type || 'pdf'}
                    </Badge>
                  </div>
                </div>
                
                {/* Content */}
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold truncate mb-1">{template.name}</h3>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {template.certificate_category && (() => {
                          const category = template.certificate_category;
                          const categoryColors = getColorForText(category);
                          return (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs border",
                                categoryColors.bg,
                                categoryColors.text,
                                categoryColors.border
                            )}
                          >
                              {category}
                          </Badge>
                          );
                        })()}
                        {template.certificate_subcategory && (() => {
                          const subcategory = template.certificate_subcategory;
                          const subcategoryColors = getColorForText(subcategory);
                          return (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs border",
                                subcategoryColors.bg,
                                subcategoryColors.text,
                                subcategoryColors.border
                            )}
                          >
                              {subcategory}
                          </Badge>
                          );
                        })()}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {template.certificate_count || 0} certificates issued
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={template.status === 'active' ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {template.status === 'active' ? 'Active' : template.status === 'draft' ? 'Draft' : 'Archived'}
                      </Badge>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-9 gap-1.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGenerateCertificate(template);
                        }}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Generate Certificate
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 gap-1.5 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(template);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <TemplateUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onSuccess={loadTemplates}
      />

      {/* Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl w-full">
          {previewTemplate && (
            <>
              <DialogHeader>
                <DialogTitle>{previewTemplate.name}</DialogTitle>
              </DialogHeader>
              <div className="mt-4">
                <div className="w-full aspect-[4/3] bg-muted overflow-hidden rounded-md">
                  {(previewTemplate.file_type === 'png' || previewTemplate.file_type === 'jpg' || previewTemplate.file_type === 'jpeg') && previewTemplate.preview_url ? (
                    <img
                      src={previewTemplate.preview_url}
                      alt={previewTemplate.name}
                      className="w-full h-full object-contain"
                    />
                  ) : previewTemplate.preview_url ? (
                    <iframe
                      src={previewTemplate.preview_url}
                      className="w-full h-full border-0"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {previewTemplate.file_type === 'pdf' ? (
                        <FileType className="h-12 w-12 text-muted-foreground/50" />
                      ) : (
                        <FileImage className="h-12 w-12 text-muted-foreground/50" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setTemplateToDelete(null);
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
