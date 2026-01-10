"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2, FileImage, FileType, File as FileIcon, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { useCertificateCategories } from "@/lib/hooks/use-certificate-categories";

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
  const supabase = createClient();

  // Use the shared hook for DB-driven category logic
  const {
    categories,
    loading: categoriesLoading,
    error: categoriesError,
    getSubcategories,
    requiresSubcategory,
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

  // Set error from categories hook
  useEffect(() => {
    if (categoriesError) {
      setError(categoriesError);
    }
  }, [categoriesError]);

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_id, companies:company_id ( application_id )')
        .eq('id', user.id)
        .maybeSingle();

      // If no userData found, this shouldn't happen with the trigger, but handle it gracefully
      if (!userData) {
        throw new Error("User profile not found. Please try again or contact support.");
      }

      if (!userData?.company_id) throw new Error("Company ID not found");

      const folderId = (userData as any)?.companies?.application_id || userData.company_id;

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `templates/${folderId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('minecertificate')
        .upload(filePath, file);

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      const { data: urlData } = supabase.storage
        .from('minecertificate')
        .getPublicUrl(filePath);

      let fileType = 'pdf';
      if (file.type.startsWith('image/')) fileType = 'image';
      else if (file.type.includes('word')) fileType = 'doc';
      else if (file.type.includes('presentation')) fileType = 'ppt';

      const { error: insertError } = await supabase
        .from('certificate_templates')
        .insert({
          company_id: userData.company_id,
          name: templateName,
          file_type: fileType,
          storage_path: filePath,
          preview_url: urlData.publicUrl,
          status: 'active',
          certificate_category: categoryName,
          certificate_subcategory: subcategoryName || null,
        });

      if (insertError) throw new Error(`Database insert failed: ${insertError.message}`);

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
                  <Link href="/dashboard/company" className="text-primary hover:underline font-medium">
                    complete your company profile
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

              {/* Category Dropdown */}
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
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
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
  );
}
