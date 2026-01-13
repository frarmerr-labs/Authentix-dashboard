"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2, FileImage, FileType, File as FileIcon, AlertCircle } from "lucide-react";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { useCertificateCategories } from "@/lib/hooks/use-certificate-categories";
import { IndustrySelectModal } from "./IndustrySelectModal";
import { getCategoryGroups } from "@/lib/utils/category-grouping";

interface TemplateUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function TemplateUploadDialog({ open, onOpenChange, onSuccess }: TemplateUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [subcategoryName, setSubcategoryName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [showIndustryModal, setShowIndustryModal] = useState(false);
  const [checkingIndustry, setCheckingIndustry] = useState(false);

  // Use the shared hook for DB-driven category logic
  const {
    categories,
    loading: categoriesLoading,
    error: categoriesError,
    getSubcategories,
    requiresSubcategory,
    reload: reloadCategories,
  } = useCertificateCategories();

  // Get subcategories for selected category
  const subcategories = categoryName ? getSubcategories(categoryName) : [];
  const showSubcategory = categoryName && requiresSubcategory(categoryName);

  // Reset subcategory when category changes
  useEffect(() => {
    if (!showSubcategory) {
      setSubcategoryName("");
    }
  }, [showSubcategory]);

  // Check industry when modal opens
  useEffect(() => {
    if (open && !checkingIndustry) {
      checkIndustry();
    }
  }, [open]);

  const checkIndustry = async () => {
    setCheckingIndustry(true);
    try {
      const org = await api.organizations.get();
      if (!org.industry_id && !org.industry) {
        // No industry set - show modal
        setShowIndustryModal(true);
      }
    } catch (err) {
      console.error("Error checking industry:", err);
      // Continue anyway - let categories hook handle the error
    } finally {
      setCheckingIndustry(false);
    }
  };

  const handleIndustrySelected = () => {
    // Reload categories after industry is set
    reloadCategories();
    setShowIndustryModal(false);
  };

  // Set error from categories hook
  useEffect(() => {
    if (categoriesError) {
      setError(categoriesError);
    } else {
      // Clear error when categories load successfully
      if (!categoriesLoading && categories.length > 0) {
        setError("");
      }
    }
  }, [categoriesError, categoriesLoading, categories.length]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelected(selectedFile);
    }
  };

  const handleFileSelected = (selectedFile: File) => {
    const validTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];

    if (validTypes.includes(selectedFile.type)) {
      setFile(selectedFile);
      const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
      setTemplateName(nameWithoutExt);
      setError("");
    } else {
      setError("Please upload a valid file (PDF, PNG, JPG, DOC, DOCX, PPT, PPTX)");
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelected(droppedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!file || !templateName || !categoryName) {
      setError("Please fill in all required fields");
      return;
    }

    // Validate subcategory if required
    if (requiresSubcategory(categoryName) && !subcategoryName) {
      setError("Please select a subcategory");
      return;
    }

    setUploading(true);
    setError("");

    try {
      // Determine file type
      let fileType: 'pdf' | 'png' | 'jpg' | 'jpeg' = 'pdf';
      if (file.type.startsWith('image/')) {
        if (file.type === 'image/png') fileType = 'png';
        else if (file.type === 'image/jpeg' || file.type === 'image/jpg') fileType = 'jpg';
      }

      // Create template via API
      await api.templates.create(file, {
        name: templateName,
        file_type: fileType,
        certificate_category: categoryName,
        certificate_subcategory: subcategoryName || undefined,
        status: 'active',
      });

      setTemplateName("");
      setCategoryName("");
      setSubcategoryName("");
      setFile(null);
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || "Failed to upload certificate template");
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = () => {
    if (!file) return <Upload className="h-8 w-8" />;
    if (file.type === 'application/pdf') return <FileType className="h-8 w-8" />;
    if (file.type.startsWith('image/')) return <FileImage className="h-8 w-8" />;
    return <FileIcon className="h-8 w-8" />;
  };

  return (
    <>
      <IndustrySelectModal
        open={showIndustryModal}
        onOpenChange={setShowIndustryModal}
        onIndustrySelected={handleIndustrySelected}
      />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Upload Certificate Template</DialogTitle>
            <DialogDescription>
              Upload your certificate design and assign it to a category
            </DialogDescription>
          </DialogHeader>

        {categoriesError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {categoriesError.includes('Industry') ? (
                <>
                  <strong>Industry Not Set:</strong> Please{" "}
                  <Link href="/dashboard/organization" className="text-primary hover:underline font-medium">
                    complete your organization profile
                  </Link>{" "}
                  to continue. You must set your industry to upload templates.
                </>
              ) : (
                categoriesError
              )}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* File Upload FIRST */}
          <div className="space-y-2">
            <Label>
              Certificate Design <span className="text-destructive">*</span>
            </Label>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                file && "border-primary bg-primary/5"
              )}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <input
                id="file-upload"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.ppt,.pptx"
                onChange={handleFileChange}
                className="hidden"
                disabled={uploading}
              />

              {file ? (
                <div className="space-y-3">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-muted text-muted-foreground">
                    {getFileIcon()}
                  </div>
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setTemplateName("");
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-muted text-muted-foreground">
                    <Upload className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="font-medium">Drop your certificate design here</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      or click to browse
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Supports: PDF, PNG, JPG, DOC, DOCX, PPT, PPTX (Max 10MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Template Name (Auto-filled from filename, editable) */}
          {file && (
            <>
              <div className="space-y-2">
                <Label htmlFor="template-name">
                  Certificate Template Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="template-name"
                  placeholder="e.g., Certificate of Completion"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  disabled={uploading}
                  required
                />
              </div>

              {/* Category Dropdown with Grouping */}
              <div className="space-y-2">
                <Label htmlFor="category">
                  Category <span className="text-destructive">*</span>
                </Label>
                <Select 
                  value={categoryName} 
                  onValueChange={setCategoryName} 
                  disabled={uploading || categoriesLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={categoriesLoading ? "Loading categories..." : "Select category"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(() => {
                      const groups = getCategoryGroups(categories);
                      return groups.map((group) => (
                        <div key={group.name}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">
                            {group.name}
                          </div>
                          {group.categories.map((cat) => (
                            <SelectItem key={cat} value={cat} className="pl-4">
                              {cat}
                            </SelectItem>
                          ))}
                          {groups.indexOf(group) < groups.length - 1 && (
                            <div className="border-t my-1" />
                          )}
                        </div>
                      ));
                    })()}
                  </SelectContent>
                </Select>
              </div>

              {/* Subcategory Dropdown - Only shown if category requires it */}
              {showSubcategory && (
                <div className="space-y-2">
                  <Label htmlFor="subcategory">
                    Subcategory <span className="text-destructive">*</span>
                  </Label>
                  <Select value={subcategoryName} onValueChange={setSubcategoryName} disabled={uploading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                      {subcategories.map((subcat) => (
                        <SelectItem key={subcat} value={subcat}>
                          {subcat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                uploading || 
                !file || 
                !templateName || 
                !categoryName || 
                (showSubcategory && !subcategoryName) ||
                categoriesLoading
              }
              className="gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload Certificate Template
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}
