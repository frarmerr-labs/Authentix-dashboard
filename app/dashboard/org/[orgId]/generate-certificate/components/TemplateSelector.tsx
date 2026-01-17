'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useDropzone } from 'react-dropzone';
import { FileText, Image as ImageIcon, Upload, Plus, Check, ChevronLeft, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';
import { getPdfLib } from '@/lib/utils/dynamic-imports';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import { useCatalogCategories } from '@/lib/hooks/use-catalog-categories';
import { useCatalogSubcategories } from '@/lib/hooks/use-catalog-subcategories';
import { IndustrySelectModal } from '@/components/templates/IndustrySelectModal';
import { RecentUsedTemplates } from './RecentUsedTemplates';
import type { RecentGeneratedTemplate, InProgressTemplate } from '@/lib/api/client';

const PDFThumbnail = dynamic(() => import('./PDFThumbnail'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-secondary/50">
       <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  )
});

interface RecentTemplate {
  template_id: string;
  template_title: string;
  template_version_id: string | null;
  preview_url: string | null;
  category_name: string | null;
  subcategory_name: string | null;
  fields: Array<{
    id: string;
    field_key: string;
    label: string;
    type: string;
    page_number: number;
    x: number;
    y: number;
    width: number | null;
    height: number | null;
    style: Record<string, unknown> | null;
  }>;
}

interface TemplateSelectorProps {
  savedTemplates: any[];
  onSelectTemplate: (template: any) => void;
  onNewUpload: (file: File, width: number, height: number, saveTemplate: boolean, templateName?: string, categoryId?: string, subcategoryId?: string) => void;
  recentGenerated?: RecentGeneratedTemplate[];
  inProgress?: InProgressTemplate[];
  recentLoading?: boolean;
  onSelectRecentTemplate?: (template: RecentTemplate, loadFields: boolean) => void;
}

export function TemplateSelector({
  savedTemplates,
  onSelectTemplate,
  onNewUpload,
  recentGenerated = [],
  inProgress = [],
  recentLoading = false,
  onSelectRecentTemplate,
}: TemplateSelectorProps) {
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [saveTemplate, setSaveTemplate] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [showIndustryModal, setShowIndustryModal] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Use the catalog categories hook (same as TemplateUploadDialog)
  const {
    groups,
    loading: categoriesLoading,
    error: categoriesError,
    requiresIndustry,
    reload: reloadCategories,
  } = useCatalogCategories();

  // Fetch subcategories when category is selected
  const {
    subcategories,
    loading: subcategoriesLoading,
    error: subcategoriesError,
    reload: reloadSubcategories,
  } = useCatalogSubcategories(categoryId);

  // Reset subcategory when category changes
  useEffect(() => {
    setSubcategoryId('');
  }, [categoryId]);

  // Reload categories when modal opens (if not already loading)
  useEffect(() => {
    if (showUploadDialog && !categoriesLoading && groups.length === 0) {
      reloadCategories();
    }
  }, [showUploadDialog, categoriesLoading, groups.length, reloadCategories]);

  // Handle industry requirement - show modal when 409 is detected
  useEffect(() => {
    if (requiresIndustry && showUploadDialog && !showIndustryModal) {
      setShowIndustryModal(true);
    }
  }, [requiresIndustry, showUploadDialog, showIndustryModal]);

  // Reset form when modal closes (only after successful upload or explicit close)
  // Keep form data if user closes during upload or on error for retry
  useEffect(() => {
    if (!showUploadDialog && !isProcessing) {
      // Reset only if modal is closed and not uploading
      // This allows user to retry without losing data
      setUploadFile(null);
      setTemplateName('');
      setCategoryId('');
      setSubcategoryId('');
      setError('');
    }
  }, [showUploadDialog, isProcessing]);

  const handleIndustrySelected = async () => {
    // Reload categories after industry is set
    await reloadCategories();
    setShowIndustryModal(false);
  };

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
    ] as const;

    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index]!;
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 400;
      scrollContainerRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploadFile(file);
    setTemplateName(file.name.replace(/\.(pdf|jpe?g|png)$/i, ''));
    setIsProcessing(false);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxFiles: 1,
  });

  const handleUpload = async () => {
    if (!uploadFile) return;

    // Clear previous errors
    setError('');

    // Validate required fields
    if (!templateName.trim()) {
      setError('Template name is required');
      return;
    }

    if (!categoryId) {
      setError('Please select a category');
      return;
    }

    if (!subcategoryId) {
      if (subcategoriesLoading) {
        setError('Please wait for subcategories to load');
        return;
      }
      if (subcategories.length > 0) {
        setError('Please select a subcategory');
        return;
      }
      // If no subcategories available, still require selection per schema
      setError('Please select a subcategory');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const fileType = uploadFile.type;
      let width = 0, height = 0;

      if (fileType === 'application/pdf') {
        const { PDFDocument } = await getPdfLib();
        const arrayBuffer = await uploadFile.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const pages = pdfDoc.getPages();
        const page = pages[0];
        if (!page) {
          throw new Error('PDF has no pages');
        }
        const { width: pageWidth, height: pageHeight } = page.getSize();
        width = pageWidth;
        height = pageHeight;
      } else {
        const img = new Image();
        const imageUrl = URL.createObjectURL(uploadFile);

        await new Promise((resolve, reject) => {
          img.onload = () => {
            width = img.naturalWidth;
            height = img.naturalHeight;
            URL.revokeObjectURL(imageUrl);
            resolve(true);
          };
          img.onerror = () => {
            URL.revokeObjectURL(imageUrl);
            reject(new Error('Failed to load image'));
          };
          img.src = imageUrl;
        });
      }

      onNewUpload(uploadFile, width, height, saveTemplate, templateName.trim(), categoryId, subcategoryId);
      setShowUploadDialog(false);
      setUploadFile(null);
      setTemplateName('');
      setCategoryId('');
      setSubcategoryId('');
      setError('');
    } catch (error: any) {
      console.error('Error processing file:', error);
      setError(error.message || 'Failed to process file. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler for recent template selection
  const handleRecentSelect = (template: RecentTemplate, loadFields: boolean) => {
    if (onSelectRecentTemplate) {
      onSelectRecentTemplate(template, loadFields);
    }
  };

  // Check if we should show recent templates section
  const hasRecentTemplates = recentGenerated.length > 0 || inProgress.length > 0 || recentLoading;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          Choose Your Certificate Template
        </h2>
        <p className="text-muted-foreground">
          Select from your saved templates or upload a new one
        </p>
      </div>

      {/* Recent Used Templates Section */}
      {hasRecentTemplates && (
        <RecentUsedTemplates
          recentGenerated={recentGenerated}
          inProgress={inProgress}
          loading={recentLoading}
          onSelectTemplate={handleRecentSelect}
        />
      )}

      {/* Saved Templates Section Header */}
      {savedTemplates.length > 0 && (
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">Saved Templates</h3>
          <Badge variant="secondary" className="text-xs">
            {savedTemplates.length} template{savedTemplates.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      )}

      {/* Templates Carousel */}
      <div className="relative group/carousel px-12">
        {/* Left Arrow */}
        <Button 
          variant="outline" size="icon" 
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full opacity-0 group-hover/carousel:opacity-100 disabled:opacity-0 transition-opacity bg-background shadow-md hidden md:flex"
          onClick={() => scroll('left')}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {/* Scroll Container */}
        <div 
           ref={scrollContainerRef}
           className="flex overflow-x-auto pb-4 gap-6 px-1 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
        >
          {savedTemplates.map((template) => (
            <Card
              key={template.id}
              className="snap-start min-w-[300px] w-[300px] shrink-0 overflow-hidden hover:shadow-lg transition-all cursor-pointer group border-muted hover:border-primary/50"
              onClick={() => onSelectTemplate(template)}
            >
              <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                {(() => {
                  const isPdf = template.file_type === 'pdf' || 
                               template.preview_url?.toLowerCase().endsWith('.pdf') ||
                               template.name?.toLowerCase().endsWith('.pdf');
                  
                  if (isPdf && template.preview_url) {
                    return <PDFThumbnail url={template.preview_url} />;
                  }

                  if (template.preview_url) {
                    return (
                      <img
                        src={template.preview_url}
                        alt={template.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    );
                  }
                  
                  return (
                    <div className="w-full h-full flex items-center justify-center bg-secondary/50">
                      <ImageIcon className="w-12 h-12 text-muted-foreground/50" />
                    </div>
                  );
                })()}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button variant="secondary" size="sm" className="font-medium h-8 text-xs">
                    Use Template
                  </Button>
                </div>
              </div>
              <div className="p-4 space-y-2">
                <div>
                  <h4 className="font-semibold truncate text-sm leading-tight">{template.name}</h4>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {template.certificate_category && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] border font-normal rounded-sm px-1.5 py-0 h-4",
                          getColorForText(template.certificate_category).bg,
                          getColorForText(template.certificate_category).text,
                          getColorForText(template.certificate_category).border
                        )}
                      >
                        {template.certificate_category}
                      </Badge>
                    )}
                    {template.certificate_subcategory && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] border font-normal rounded-sm px-1.5 py-0 h-4",
                          getColorForText(template.certificate_subcategory).bg,
                          getColorForText(template.certificate_subcategory).text,
                          getColorForText(template.certificate_subcategory).border
                        )}
                      >
                        {template.certificate_subcategory}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Badge variant="outline" className="font-normal rounded-sm px-1.5 py-0 h-4 text-[10px]">
                    {template.file_type?.toUpperCase()}
                  </Badge>
                  {template.width && template.height && (
                    <span>{Math.round(template.width)} × {Math.round(template.height)}px</span>
                  )}
                </div>
              </div>
            </Card>
          ))}
          
          {/* Empty State / Spacer if needed */}
          {savedTemplates.length === 0 && (
             <div className="w-full h-[200px] flex items-center justify-center text-muted-foreground text-sm border-2 border-dashed rounded-xl">
                No saved templates found
             </div>
          )}
        </div>

        {/* Right Arrow */}
        <Button 
          variant="outline" size="icon" 
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full opacity-0 group-hover/carousel:opacity-100 disabled:opacity-0 transition-opacity bg-background shadow-md hidden md:flex"
          onClick={() => scroll('right')}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Upload New Template - Positioned Below */}
      <div className="flex justify-center mt-4">
        <>
          <IndustrySelectModal
            open={showIndustryModal}
            onOpenChange={setShowIndustryModal}
            onIndustrySelected={handleIndustrySelected}
          />
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-auto py-6 px-8 flex flex-col gap-2 border-2 border-dashed hover:border-primary/50 hover:bg-muted/30 group">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <div className="text-center">
                  <span className="font-semibold block text-base">Upload New Template</span>
                  <span className="text-xs text-muted-foreground font-normal">PDF, JPEG, or PNG</span>
                </div>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Upload Certificate Template</DialogTitle>
              </DialogHeader>

              {categoriesError && !requiresIndustry && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>{categoriesError}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => reloadCategories()}
                      className="ml-4"
                    >
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-6 py-4">
                {/* File Upload */}
                <div
                  {...getRootProps()}
                  className={`
                    border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
                    ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/50'}
                  `}
                >
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center gap-4">
                    {uploadFile ? (
                      <>
                        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                          <FileCheck className="w-8 h-8" />
                        </div>
                        <div>
                          <p className="text-base font-medium">{uploadFile.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                          <Upload className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-base font-medium">Click to upload or drag and drop</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            PDF, JPEG, or PNG (Max 10MB)
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Template Info */}
                {uploadFile && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                    {/* Template Name - Full Width */}
                    <div className="space-y-2">
                      <Label htmlFor="templateName">
                        Template Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="templateName"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="e.g., Completion Certificate"
                        required
                        disabled={isProcessing}
                      />
                    </div>

                    {/* Category Dropdown - Full Width with Grouping */}
                    <div className="space-y-2">
                      <Label htmlFor="category">
                        Category <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={categoryId}
                        onValueChange={setCategoryId}
                        disabled={isProcessing || categoriesLoading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={categoriesLoading ? "Loading categories..." : "Select category"} />
                        </SelectTrigger>
                        <SelectContent>
                          {categoriesLoading ? (
                            <div className="p-4 space-y-2">
                              {[1, 2, 3].map((i) => (
                                <div key={i} className="h-8 bg-muted animate-pulse rounded" />
                              ))}
                            </div>
                          ) : categoriesError ? (
                            <div className="p-4 space-y-3">
                              <div className="text-sm text-destructive text-center">
                                {categoriesError}
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => reloadCategories()}
                                className="w-full"
                              >
                                Retry
                              </Button>
                            </div>
                          ) : groups.length === 0 ? (
                            <div className="p-4 text-sm text-muted-foreground text-center">
                              No categories available
                            </div>
                          ) : (
                            groups.map((group, groupIndex) => (
                              <div key={group.group_key}>
                                {/* Group divider label */}
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase sticky top-0 bg-background z-10">
                                  {group.label}
                                </div>
                                {/* Group items */}
                                {group.items.map((item) => (
                                  <SelectItem key={item.id} value={item.id} className="pl-4">
                                    {item.name}
                                  </SelectItem>
                                ))}
                                {/* Separator between groups (not after last group) */}
                                {groupIndex < groups.length - 1 && (
                                  <SelectSeparator />
                                )}
                              </div>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Subcategory Dropdown - Only shown when category is selected */}
                    {categoryId && (
                      <div className="space-y-2">
                        <Label htmlFor="subcategory">
                          Subcategory <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={subcategoryId}
                          onValueChange={setSubcategoryId}
                          disabled={isProcessing || subcategoriesLoading}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                subcategoriesLoading
                                  ? "Loading subcategories..."
                                  : subcategories.length === 0
                                  ? "No subcategories available"
                                  : "Select subcategory"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {subcategoriesLoading ? (
                              <div className="p-4 space-y-2">
                                {[1, 2, 3].map((i) => (
                                  <div key={i} className="h-8 bg-muted animate-pulse rounded" />
                                ))}
                              </div>
                            ) : subcategoriesError ? (
                              <div className="p-4 space-y-3">
                                <div className="text-sm text-destructive">
                                  {subcategoriesError}
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    reloadSubcategories();
                                  }}
                                  className="w-full"
                                >
                                  Retry
                                </Button>
                              </div>
                            ) : subcategories.length === 0 ? (
                              <div className="p-4 text-sm text-muted-foreground text-center">
                                No subcategories available for this category
                              </div>
                            ) : (
                              subcategories.map((subcat) => (
                                <SelectItem key={subcat.id} value={subcat.id}>
                                  {subcat.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Save to Templates Toggle */}
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                      <div className="space-y-0.5">
                        <Label className="text-base">Save to Templates</Label>
                        <p className="text-sm text-muted-foreground">
                          Save this template for future use in the templates library
                        </p>
                      </div>
                      <button
                        onClick={() => setSaveTemplate(!saveTemplate)}
                        disabled={isProcessing}
                        className={`
                          w-11 h-6 rounded-full transition-colors relative
                          ${saveTemplate ? 'bg-primary' : 'bg-muted-foreground/30'}
                          ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        `}
                      >
                        <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${saveTemplate ? 'translate-x-5' : ''}`} />
                      </button>
                    </div>

                    {/* Error Display */}
                    {error && !isProcessing && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <Button
                      onClick={handleUpload}
                      disabled={
                        isProcessing ||
                        !templateName.trim() ||
                        !categoryId ||
                        !subcategoryId ||
                        categoriesLoading ||
                        subcategoriesLoading
                      }
                      className="w-full"
                      size="lg"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing template...
                        </>
                      ) : (
                        'Start Designing'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </>
      </div>
    </div>
  );
}



function FileCheck({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
