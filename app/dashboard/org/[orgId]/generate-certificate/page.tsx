'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { CertificateField, CertificateTemplate, ImportedData, FieldMapping } from '@/lib/types/certificate';
import { api } from '@/lib/api/client';
import type { RecentGeneratedTemplate, InProgressTemplate } from '@/lib/api/client';
import { getPdfLib, getXlsx } from '@/lib/utils/dynamic-imports';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sparkles, Upload, Image as ImageIcon, FileText, Download,
  CheckCircle2, Circle, Layers, Palette, Database, Wand2
} from 'lucide-react';
import { CertificateCanvas } from './components/CertificateCanvas';
import { InfiniteCanvas } from './components/InfiniteCanvas';
import { RightPanel } from './components/RightPanel';
import { TemplateSelector } from './components/TemplateSelector';
import { AssetLibrary } from './components/AssetLibrary';
import { DataSelector } from './components/DataSelector';
import { FieldTypeSelector } from './components/FieldTypeSelector';
import { FieldLayersList } from './components/FieldLayersList';
import { ExportSection } from './components/ExportSection';

export default function GenerateCertificatePage() {
  // Get query parameters
  const searchParams = useSearchParams();
  const templateIdFromUrl = searchParams.get('template');

  // Template state
  const [template, setTemplate] = useState<CertificateTemplate | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [savedTemplates, setSavedTemplates] = useState<any[]>([]);
  const [templateVersionId, setTemplateVersionId] = useState<string | null>(null);

  // Fields state
  const [fields, setFields] = useState<CertificateField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  // Data import state
  const [importedData, setImportedData] = useState<ImportedData | null>(null);
  const [savedImports, setSavedImports] = useState<any[]>([]);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);

  // Recent templates state
  const [recentGenerated, setRecentGenerated] = useState<RecentGeneratedTemplate[]>([]);
  const [inProgressTemplates, setInProgressTemplates] = useState<InProgressTemplate[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);

  // UI state
  const [canvasScale, setCanvasScale] = useState(0.5);
  const [currentStep, setCurrentStep] = useState<'template' | 'design' | 'data' | 'export'>('template');
  const [activeTab, setActiveTab] = useState('fields');
  const [hiddenFields, setHiddenFields] = useState<Set<string>>(new Set());
  const [useInfiniteCanvas, setUseInfiniteCanvas] = useState(true); // Toggle between canvas modes

  // Multi-page PDF support
  const [currentPage, setCurrentPage] = useState(0); // 0-indexed page number
  const [totalPages, setTotalPages] = useState(1);

  // Load saved templates and imports
  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    try {
      // Load templates and recent usage in parallel
      const [templatesResponse, recentUsageResponse] = await Promise.all([
        api.templates.list({ sort_by: 'created_at', sort_order: 'desc' }),
        api.templates.getRecentUsage(10).catch((error) => {
          console.warn('[Generate] Error loading recent usage:', error);
          return { recent_generated: [], in_progress: [] };
        }),
      ]);

      const templatesData = templatesResponse.items || [];

      // Get preview URLs for templates (with graceful error handling)
      const templatesWithSignedUrls = await Promise.all(
        templatesData.map(async (template: any) => {
          if (template.id) {
            try {
              const previewUrl = await api.templates.getPreviewUrl(template.id);
              return { ...template, preview_url: previewUrl };
            } catch (error: any) {
              // Gracefully handle missing preview - template can still be used
              console.warn('[Generate] Preview not available for template:', template.id, error?.message || error);
              // Return template without preview_url - it will use source file as fallback
              return template;
            }
          }
          return template;
        })
      );

      console.log('[Generate] Templates with signed URLs:', templatesWithSignedUrls.length);
      setSavedTemplates(templatesWithSignedUrls);

      // Set recent usage data
      setRecentGenerated(recentUsageResponse.recent_generated || []);
      setInProgressTemplates(recentUsageResponse.in_progress || []);
      setRecentLoading(false);
      console.log('[Generate] Recent usage loaded:', {
        generated: recentUsageResponse.recent_generated?.length || 0,
        inProgress: recentUsageResponse.in_progress?.length || 0,
      });

      // Load imports (remove status filter - backend handles filtering)
      try {
      const importsResponse = await api.imports.list({ sort_by: 'created_at', sort_order: 'desc', limit: 10 });
      setSavedImports(importsResponse.items || []);
      } catch (error) {
        console.warn('[Generate] Error loading imports:', error);
        // Continue without imports - user can still proceed
        setSavedImports([]);
      }
    } catch (error) {
      console.error('[Generate] Error loading saved data:', error);
      setRecentLoading(false);
    }
  };

  // Auto-select template from URL parameter
  useEffect(() => {
    if (templateIdFromUrl && savedTemplates.length > 0 && !template) {
      console.log('[Generate] Auto-selecting template from URL:', templateIdFromUrl);
      const templateToSelect = savedTemplates.find((t) => t.id === templateIdFromUrl);
      if (templateToSelect) {
        console.log('[Generate] Found template, auto-selecting:', templateToSelect.name);
        handleTemplateSelect(templateToSelect);
      } else {
        console.warn('[Generate] Template not found:', templateIdFromUrl);
      }
    }
  }, [templateIdFromUrl, savedTemplates, template]);

  // Handler for selecting a recent template (with or without loading fields)
  const handleRecentTemplateSelect = async (recentTemplate: any, loadFields: boolean) => {
    // Find the corresponding saved template
    let templateToSelect = savedTemplates.find((t) => t.id === recentTemplate.template_id);

    // If not found in saved templates, create a minimal template object from recent data
    if (!templateToSelect) {
      templateToSelect = {
        id: recentTemplate.template_id,
        name: recentTemplate.template_title,
        preview_url: recentTemplate.preview_url,
        category_name: recentTemplate.category_name,
        subcategory_name: recentTemplate.subcategory_name,
      };
    }

    // Load the template
    await handleTemplateSelect(templateToSelect);

    // If loadFields is true and we have fields from recent usage, use them
    if (loadFields && recentTemplate.fields && recentTemplate.fields.length > 0) {
      const mappedFields = recentTemplate.fields.map((field: any) => ({
        id: field.id || field.field_key,
        type: mapBackendTypeToFrontend(field.type),
        label: field.label,
        x: field.x,
        y: field.y,
        width: field.width || 200,
        height: field.height || 30,
        fontSize: (field.style as any)?.fontSize || 16,
        fontFamily: (field.style as any)?.fontFamily || 'Helvetica',
        color: (field.style as any)?.color || '#000000',
        fontWeight: (field.style as any)?.fontWeight || 'normal',
        fontStyle: (field.style as any)?.fontStyle || 'normal',
        textAlign: (field.style as any)?.textAlign || 'left',
        dateFormat: (field.style as any)?.dateFormat,
        prefix: (field.style as any)?.prefix,
        suffix: (field.style as any)?.suffix,
      }));
      setFields(mappedFields);
    }

    // If it's in-progress, set the version ID
    if (recentTemplate.template_version_id) {
      setTemplateVersionId(recentTemplate.template_version_id);
    }
  };

  // Handlers
  const handleTemplateSelect = async (selectedTemplate: any) => {
    let fileUrl = selectedTemplate.preview_url;

    // Get editor data to access source_file with mime_type
    let editorData = null;
    if (selectedTemplate.id) {
      try {
        editorData = await api.templates.getEditorData(selectedTemplate.id);
        // Use source_file URL if available, otherwise get preview URL
        if (editorData.source_file?.url) {
          fileUrl = editorData.source_file.url;
        } else {
          try {
          const previewUrl = await api.templates.getPreviewUrl(selectedTemplate.id);
          fileUrl = previewUrl;
          } catch (previewError) {
            console.warn('Preview URL not available, will use source file:', previewError);
            // Continue - will use source file from editor data
          }
        }
      } catch (error) {
        console.warn('Error fetching template editor data:', error);
        // Fallback to preview URL if available
        if (selectedTemplate.preview_url) {
          fileUrl = selectedTemplate.preview_url;
        } else {
        try {
          const previewUrl = await api.templates.getPreviewUrl(selectedTemplate.id);
          fileUrl = previewUrl;
        } catch (previewError) {
            console.warn('Preview URL not available:', previewError);
            // Continue without preview - user will need to upload or select different template
          }
        }
      }
    }

    let pdfWidth = selectedTemplate.width;
    let pdfHeight = selectedTemplate.height;
    let pageCount = 1; // Default to 1 page

    // If dimensions are missing, calculate them
    if (!pdfWidth || !pdfHeight) {
        try {
            console.log("Template missing dimensions, calculating...");
            const response = await fetch(fileUrl);
            const blob = await response.blob();

            // Determine file type from editor data or template data
            const fileType = editorData?.source_file?.file_type ||
                           selectedTemplate.file_type ||
                           (selectedTemplate.name?.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image');
            const mimeType = editorData?.source_file?.file_type || blob.type;

            if (fileType === 'pdf' || mimeType === 'application/pdf' || selectedTemplate.name?.toLowerCase().endsWith('.pdf')) {
                const arrayBuffer = await blob.arrayBuffer();
                // Dynamic import of pdf-lib for bundle optimization
                const { PDFDocument } = await getPdfLib();
                const pdfDoc = await PDFDocument.load(arrayBuffer);
                const pages = pdfDoc.getPages();
                const page = pages[0];
                if (!page) {
                    throw new Error('PDF has no pages');
                }
                const { width, height } = page.getSize();
                pdfWidth = width;
                pdfHeight = height;

                // Set total pages for multi-page PDF support
                pageCount = pages.length;
                setTotalPages(pageCount);
                setCurrentPage(0); // Reset to first page
            } else {
                 const img = new Image();
                 const objectUrl = URL.createObjectURL(blob);
                 await new Promise((resolve, reject) => {
                    img.onload = () => {
                        pdfWidth = img.naturalWidth;
                        pdfHeight = img.naturalHeight;
                        resolve(true);
                    };
                    img.onerror = reject;
                    img.src = objectUrl;
                 });
                 URL.revokeObjectURL(objectUrl);
            }

            // Note: Dimensions are not stored on template in new schema
            // They're calculated from the source file when needed
            // We skip the update to avoid errors

        } catch (e) {
            console.error("Failed to extract dimensions", e);
            pdfWidth = 800;
            pdfHeight = 600;
        }
    }

    // Determine file type from editor data or template
    const fileType = editorData?.source_file?.file_type === 'pdf' || 
                    editorData?.source_file?.file_type === 'application/pdf' ||
                    selectedTemplate.file_type === 'pdf' ? 'pdf' : 'image';

    // Store version ID for autosave
    if (editorData?.version?.id) {
      setTemplateVersionId(editorData.version.id);
    }

    // Map backend fields to frontend format if needed
    const mappedFields = editorData?.fields?.map((field: any) => ({
      id: field.id || field.field_key,
      type: mapBackendTypeToFrontend(field.type),
      label: field.label,
      x: field.x,
      y: field.y,
      width: field.width || 200,
      height: field.height || 30,
      fontSize: (field.style as any)?.fontSize || 16,
      fontFamily: (field.style as any)?.fontFamily || 'Helvetica',
      color: (field.style as any)?.color || '#000000',
      fontWeight: (field.style as any)?.fontWeight || 'normal',
      fontStyle: (field.style as any)?.fontStyle || 'normal',
      textAlign: (field.style as any)?.textAlign || 'left',
      dateFormat: (field.style as any)?.dateFormat,
      prefix: (field.style as any)?.prefix,
      suffix: (field.style as any)?.suffix,
    })) || selectedTemplate.fields || [];

    setTemplate({
      id: selectedTemplate.id,
      templateName: selectedTemplate.title || selectedTemplate.name,
      fileUrl,
      fileType,
      pdfWidth: pdfWidth || 800,
      pdfHeight: pdfHeight || 600,
      pageCount,
      fields: mappedFields,
    });
    setFields(mappedFields);
    setCurrentStep('design');
  };

  const handleNewTemplateUpload = async (file: File, width: number, height: number, saveTemplate: boolean, templateName?: string, categoryId?: string, subcategoryId?: string) => {
    const fileType: 'pdf' | 'image' = file.type === 'application/pdf' ? 'pdf' : 'image';
    const finalTemplateName = templateName || file.name.replace(/\.(pdf|jpe?g|png)$/i, '');

    const newTemplate: CertificateTemplate = {
      templateName: finalTemplateName,
      fileUrl: URL.createObjectURL(file),
      fileType,
      pdfWidth: width,
      pdfHeight: height,
      fields: [],
    };

    setTemplate(newTemplate);
    setPdfFile(file);
    setFields([]);
    setSelectedFieldId(null);
    setCurrentStep('design');

    if (saveTemplate) {
      try {
        // Validate category/subcategory IDs are provided
        if (!categoryId || !subcategoryId) {
          throw new Error('Category and subcategory IDs are required');
        }
        
        // Use backend API to create template (same as TemplateUploadDialog)
        const templateData = await api.templates.create(file, {
          title: finalTemplateName.trim(),
          category_id: categoryId,
          subcategory_id: subcategoryId,
        });

        // Update saved templates list
        setSavedTemplates((prev) => [templateData, ...prev]);

        // Update template with database ID and get version ID for autosave
        if (templateData.version?.id) {
          setTemplateVersionId(templateData.version.id);
        }
        setTemplate((prev) => prev ? { ...prev, id: templateData.id } : null);
      } catch (error: any) {
        console.error('Error saving template:', error);
        console.error('Error details:', {
          message: error?.message,
          statusCode: error?.statusCode,
          error: error
        });
        
        // Check if it's a bucket not found error
        if (error?.message?.includes('Bucket not found') || error?.message?.includes('bucket') || error?.statusCode === 404) {
          alert(
            '❌ Storage Bucket Error\n\n' +
            `Error: ${error?.message}\n\n` +
            'The storage bucket "authentix" might not exist or you don\'t have access.\n\n' +
            'Check:\n' +
            '1. Bucket exists in Supabase Storage\n' +
            '2. Storage policies allow uploads\n' +
            '3. User has organization_id set'
          );
        } else {
          alert(`Failed to save template: ${error?.message || 'Unknown error'}\n\nYou can still use it for this session.`);
        }
      }
    }
  };

  const handleAddField = (field: CertificateField) => {
    setFields((prev) => [...prev, field]);
    setSelectedFieldId(field.id);
  };

  const handleUpdateField = (fieldId: string, updates: Partial<CertificateField>) => {
    setFields((prev) =>
      prev.map((field) => (field.id === fieldId ? { ...field, ...updates } : field))
    );
  };

  const handleDeleteField = (fieldId: string) => {
    setFields((prev) => prev.filter((field) => field.id !== fieldId));
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
  };

  const handleFieldSelect = (fieldId: string) => {
    setSelectedFieldId(fieldId);
  };

  const handleTemplateResize = (width: number, height: number) => {
    setTemplate(prev => prev ? { ...prev, pdfWidth: width, pdfHeight: height } : null);
  };

  // Note: Dimensions are not stored on template in new schema
  // They're calculated from the source file when needed
  // Removed autosave for dimensions

  // Autosave fields to certificate_template_fields table
  useEffect(() => {
    const templateId = template?.id;
    const versionId = templateVersionId;
    
    if (!templateId || !versionId || fields.length === 0) return;

    const timeoutId = setTimeout(async () => {
      // Track field_keys to ensure uniqueness
      const usedFieldKeys = new Set<string>();
      
      // Map frontend fields to backend format
      let fieldsToSave: Array<{
        field_key: string;
        label: string;
        type: string;
        page_number: number;
        x: number;
        y: number;
        width?: number;
        height?: number;
        style?: Record<string, unknown>;
        required: boolean;
      }> = [];

      try {
        fieldsToSave = fields.map((field, index) => {
          // Generate field_key from field id or label (sanitize to lowercase alphanumeric with underscores)
          // Must be 2-64 characters, lowercase alphanumeric with underscores only
          let fieldKey = field.id
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
          
          // If field_key is empty or too short, use label or generate one
          if (!fieldKey || fieldKey.length < 2) {
            const labelBasedKey = (field.label || field.type || `field_${index}`)
              .toLowerCase()
              .replace(/[^a-z0-9_]/g, '_')
              .replace(/_+/g, '_')
              .replace(/^_|_$/g, '');
            fieldKey = labelBasedKey.length >= 2 ? labelBasedKey : `field_${String(index).padStart(2, '0')}`;
          }
          
          // Ensure it's at least 2 characters and max 64
          if (fieldKey.length < 2) {
            fieldKey = `field_${String(index).padStart(2, '0')}`;
          }
          if (fieldKey.length > 64) {
            fieldKey = fieldKey.substring(0, 64);
          }

          // Final validation: ensure field_key matches regex: lowercase alphanumeric with underscores only
          if (!/^[a-z0-9_]+$/.test(fieldKey)) {
            // Fallback: generate a safe field_key
            fieldKey = `field_${String(index).padStart(2, '0')}`;
          }

          // Ensure field_key is unique (backend requires unique field_keys)
          let uniqueFieldKey = fieldKey;
          let suffix = 1;
          while (usedFieldKeys.has(uniqueFieldKey)) {
            uniqueFieldKey = `${fieldKey}_${suffix}`;
            suffix++;
            // Ensure it doesn't exceed 64 characters
            if (uniqueFieldKey.length > 64) {
              uniqueFieldKey = `${fieldKey.substring(0, 60)}_${suffix}`;
            }
          }
          usedFieldKeys.add(uniqueFieldKey);
          fieldKey = uniqueFieldKey;

          // Map frontend type to backend type
          const backendType = mapFrontendTypeToBackend(field.type);

          // Ensure label is at least 2 characters and max 80 (schema requirement)
          let label = (field.label || field.type || 'Field').trim();
          if (label.length < 2) {
            label = `Field ${index + 1}`;
          }
          if (label.length > 80) {
            label = label.substring(0, 80);
          }

          // Build style object - include original field ID for mapping
          const style: Record<string, unknown> = {
            fontSize: field.fontSize || 16,
            fontFamily: field.fontFamily || 'Helvetica',
            color: field.color || '#000000',
            fontWeight: field.fontWeight || 'normal',
            fontStyle: field.fontStyle || 'normal',
            textAlign: field.textAlign || 'left',
            originalFieldId: field.id, // Store original ID for field mapping
          };

          if (field.dateFormat) style.dateFormat = field.dateFormat;
          if (field.prefix) style.prefix = field.prefix;
          if (field.suffix) style.suffix = field.suffix;

          // Calculate width and height - ensure they're positive numbers
          // Provide defaults to ensure fields are always valid
          const width = field.width && field.width > 0 ? field.width : 200;
          const height = field.height && field.height > 0 ? field.height : 30;

          const fieldData: {
            field_key: string;
            label: string;
            type: string;
            page_number: number;
            x: number;
            y: number;
            width: number;
            height: number;
            style?: Record<string, unknown>;
            required: boolean;
          } = {
            field_key: fieldKey,
            label: label,
            type: backendType,
            page_number: (field.pageNumber ?? 0) + 1, // Convert 0-indexed to 1-indexed
            x: Math.max(0, field.x || 0),
            y: Math.max(0, field.y || 0),
            width: width,
            height: height,
            required: false,
          };

          // Include style if it has content
          if (Object.keys(style).length > 0) {
            fieldData.style = style;
          }

          return fieldData;
        });

        // Filter out any invalid fields before sending
        fieldsToSave = fieldsToSave.filter(field => {
          // Ensure field_key is valid
          if (!field.field_key || field.field_key.length < 2 || field.field_key.length > 64) {
            console.warn('[Generate] Skipping invalid field (invalid field_key):', field);
            return false;
          }
          // Ensure label is valid
          if (!field.label || field.label.length < 2 || field.label.length > 80) {
            console.warn('[Generate] Skipping invalid field (invalid label):', field);
            return false;
          }
          // Ensure type is valid
          if (!['text', 'date', 'qrcode', 'custom'].includes(field.type)) {
            console.warn('[Generate] Skipping invalid field (invalid type):', field);
            return false;
          }
          return true;
        });

        // Don't send if no valid fields
        if (fieldsToSave.length === 0) {
          console.log('[Generate] No valid fields to save, skipping autosave');
          return;
        }

        // Log the data we're about to send for debugging
        console.log('[Generate] Attempting to save fields:', {
          templateId,
          versionId,
          fieldsCount: fieldsToSave.length,
          fieldsPreview: fieldsToSave.slice(0, 2).map(f => ({
            field_key: f.field_key,
            label: f.label,
            type: f.type,
            page_number: f.page_number,
            x: f.x,
            y: f.y,
            hasWidth: f.width !== undefined,
            hasHeight: f.height !== undefined,
            hasStyle: f.style !== undefined,
          })),
        });

        await api.templates.saveFields(templateId, versionId, fieldsToSave);
        console.log('[Generate] Fields auto-saved to certificate_template_fields', {
          templateId,
          versionId,
          fieldsCount: fieldsToSave.length,
        });
      } catch (e: unknown) {
        // Log error details for debugging
        const errorMessage = e instanceof Error ? e.message : String(e);
        const errorCode = e && typeof e === 'object' && 'code' in e ? (e.code as string) : 'UNKNOWN';
        
        // Only log if it's not a network error (network errors are expected if backend is down)
        const isNetworkError = errorCode === 'NETWORK_ERROR';
        if (!isNetworkError) {
          console.warn('[Generate] Failed to autosave fields (non-fatal):', {
            error: errorMessage,
            code: errorCode,
            templateId,
            versionId,
            fieldsCount: fieldsToSave.length,
            fieldsPreview: fieldsToSave.slice(0, 2).map(f => ({
              field_key: f.field_key,
              label: f.label,
              type: f.type,
            })),
            fullError: e,
          });
        }
      }
    }, 1000); // Debounce: wait 1 second after last change

    return () => clearTimeout(timeoutId);
  }, [fields, template?.id, templateVersionId]);
  
  const handleToggleVisibility = (fieldId: string) => {
    setHiddenFields(prev => {
      const next = new Set(prev);
      if (next.has(fieldId)) {
        next.delete(fieldId);
      } else {
        next.add(fieldId);
      }
      return next;
    });
  };

  const handleDataImport = (data: ImportedData | null) => {
    setImportedData(data);
    if (data) {
      const autoMappings = autoMapColumns(fields, data.headers);
      setFieldMappings(autoMappings);
      // Don't auto-navigate - let user click Continue button
    } else {
      // Clear mappings when data is cleared
      setFieldMappings([]);
    }
  };

  const handleContinueToGenerate = () => {
    if (importedData && fieldMappings.length > 0) {
      setCurrentStep('export');
    }
  };

  const handleLoadImport = async (importId: string) => {
    try {
      // Get import job from backend
      const importJob = await api.imports.get(importId);

      // Get download URL from backend
      const downloadUrl = await api.imports.getDownloadUrl(importId);

      // Fetch the file
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error('Failed to download file');

      // Parse the Excel/CSV file (dynamic import for bundle optimization)
      const arrayBuffer = await response.arrayBuffer();
      const XLSX = await getXlsx();
      const workbook = XLSX.read(arrayBuffer);
      
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        throw new Error('The workbook contains no sheets.');
      }
      
      const firstSheet = workbook.Sheets[firstSheetName];
      if (!firstSheet) {
        throw new Error('Failed to read the first sheet.');
      }
      
      const jsonData = XLSX.utils.sheet_to_json(firstSheet);

      if (jsonData.length === 0) {
        throw new Error('The import file is empty or has no data.');
      }

      const headers = Object.keys(jsonData[0] as Record<string, any>);

      // Parse the imported data
      const importedData: ImportedData = {
        fileName: importJob.file_name,
        headers,
        rows: jsonData as Record<string, any>[],
        rowCount: importJob.total_rows || jsonData.length,
      };

      setImportedData(importedData);

      // Set field mappings if they exist
      if (importJob.mapping) {
        const mappings = Object.entries(importJob.mapping).map(([fieldId, columnName]) => ({
          fieldId,
          columnName: columnName as string,
        }));
        setFieldMappings(mappings);
      }

      setCurrentStep('export');
    } catch (error) {
      console.error('Error loading import:', error);
      throw error;
    }
  };

  const selectedField = fields.find((f) => f.id === selectedFieldId);

  // Step indicators
  const steps = [
    { id: 'template', label: 'Choose Template', icon: FileText, completed: !!template },
    { id: 'design', label: 'Design Fields', icon: Palette, completed: !!template && fields.length > 0 },
    { id: 'data', label: 'Import Data', icon: Database, completed: !!importedData },
    { id: 'export', label: 'Generate', icon: Wand2, completed: false },
  ];

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const stepperContent = (
    <div className="flex items-center gap-2 bg-muted/30 p-1.5 rounded-full border">
      {steps.map((step, index) => {
        const isActive = currentStep === step.id;
        const isCompleted = step.completed;

        return (
          <div key={step.id} className="flex items-center">
            <button
              onClick={() => {
                // Allow navigation to completed steps or next step if current is completed
                if (step.completed || isActive) {
                  setCurrentStep(step.id as any);
                } else if (index === steps.findIndex(s => s.id === currentStep) + 1) {
                  // Allow moving to next step even if not completed
                  setCurrentStep(step.id as any);
                }
              }}
              disabled={!step.completed && !isActive && index !== steps.findIndex(s => s.id === currentStep) + 1}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                ${isActive 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : isCompleted 
                  ? 'text-foreground hover:bg-muted-foreground/10' 
                  : index === steps.findIndex(s => s.id === currentStep) + 1
                  ? 'text-foreground/70 hover:bg-muted-foreground/10'
                  : 'text-muted-foreground opacity-50 cursor-not-allowed'
                }
              `}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${isActive ? 'border-primary-foreground/30' : 'border-muted-foreground'}`}>{index + 1}</span>
              )}
              <span className="hidden sm:inline">{step.label}</span>
            </button>
            {index < steps.length - 1 && (
              <div className="w-4 h-px bg-border mx-2" />
            )}
          </div>
        );
      })}
    </div>
  );

  const titleContent = (
    <div className="flex flex-col justify-center">
       <h1 className="text-sm font-semibold tracking-tight">Generate Certificate</h1>
       <p className="text-[10px] text-muted-foreground hidden lg:block">
         Design, customize, and issue certificates in four simple steps.
       </p>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      {mounted && typeof document !== 'undefined' && document.getElementById('header-portal') && createPortal(
        stepperContent,
        document.getElementById('header-portal')!
      )}
      {mounted && typeof document !== 'undefined' && document.getElementById('header-left-portal') && createPortal(
        titleContent,
        document.getElementById('header-left-portal')!
      )}
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Step Content */}
        {currentStep === 'template' && (
          <div className="flex-1 p-8 overflow-y-auto">
            <TemplateSelector
              savedTemplates={savedTemplates}
              onSelectTemplate={handleTemplateSelect}
              onNewUpload={handleNewTemplateUpload}
              recentGenerated={recentGenerated}
              inProgress={inProgressTemplates}
              recentLoading={recentLoading}
              onSelectRecentTemplate={handleRecentTemplateSelect}
            />
          </div>
        )}

        {currentStep === 'design' && template && (
          <>
            {/* Left Sidebar - Design Tools */}
            <div className="w-64 border-r bg-card flex flex-col">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                <div className="px-4 pt-4 pb-2">
                   <TabsList className="w-full grid grid-cols-2">
                    <TabsTrigger value="fields" className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5" />
                      <span>Fields</span>
                    </TabsTrigger>
                    <TabsTrigger value="assets" className="flex items-center gap-2">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Assets</span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0">
                  <TabsContent value="fields" className="p-4 mt-0 space-y-6 h-full">
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Add Fields</h3>
                      <FieldTypeSelector
                        onAddField={handleAddField}
                        pdfWidth={template.pdfWidth}
                        pdfHeight={template.pdfHeight}
                        currentPage={currentPage}
                      />
                    </div>

                    <div className="pb-4">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Layers</h3>
                      <FieldLayersList
                        fields={fields}
                        selectedFieldId={selectedFieldId}
                        hiddenFields={hiddenFields}
                        onFieldSelect={handleFieldSelect}
                        onFieldDelete={handleDeleteField}
                        onToggleVisibility={handleToggleVisibility}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="assets" className="p-4 mt-0 h-full">
                    <AssetLibrary />
                  </TabsContent>
                </div>
              </Tabs>
            </div>

            {/* Center Canvas */}
            <div className="flex-1 bg-muted/20 flex flex-col overflow-hidden relative">
              {useInfiniteCanvas ? (
                <InfiniteCanvas
                  fileUrl={template.fileUrl}
                  fileType={template.fileType}
                  pdfWidth={template.pdfWidth}
                  pdfHeight={template.pdfHeight}
                  fields={fields.filter(f => (f.pageNumber ?? 0) === currentPage)}
                  selectedFieldId={selectedFieldId}
                  hiddenFields={hiddenFields}
                  scale={canvasScale}
                  currentPage={currentPage + 1}
                  totalPages={totalPages}
                  onFieldUpdate={handleUpdateField}
                  onFieldSelect={handleFieldSelect}
                  onScaleChange={setCanvasScale}
                  onFieldDelete={handleDeleteField}
                  onTemplateResize={handleTemplateResize}
                  onPageChange={(page) => setCurrentPage(page - 1)}
                />
              ) : (
                <div className="flex-1 overflow-auto flex items-center justify-center p-8">
                  <CertificateCanvas
                    fileUrl={template.fileUrl}
                    fileType={template.fileType}
                    pdfWidth={template.pdfWidth}
                    pdfHeight={template.pdfHeight}
                    fields={fields}
                    selectedFieldId={selectedFieldId}
                    hiddenFields={hiddenFields}
                    scale={canvasScale}
                    onFieldUpdate={handleUpdateField}
                    onFieldSelect={handleFieldSelect}
                    onScaleChange={setCanvasScale}
                    onFieldDelete={handleDeleteField}
                    onTemplateResize={handleTemplateResize}
                  />
                </div>
              )}
            </div>

            {/* Right Sidebar - Properties (Only shown when field selected) */}
            {selectedField && (
              <div className="w-72 border-l bg-card overflow-y-auto">
                <RightPanel
                  selectedField={selectedField}
                  onFieldUpdate={(updates) => {
                    if (selectedFieldId) {
                      handleUpdateField(selectedFieldId, updates);
                    }
                  }}
                />
              </div>
            )}
          </>
        )}

        {currentStep === 'data' && (
          <div className="flex-1 p-8 overflow-y-auto">
            <DataSelector
              fields={fields}
              savedImports={savedImports}
              importedData={importedData}
              fieldMappings={fieldMappings}
              onDataImport={handleDataImport}
              onMappingChange={setFieldMappings}
              onLoadImport={handleLoadImport}
              onContinueToGenerate={handleContinueToGenerate}
            />
          </div>
        )}

        {currentStep === 'export' && (
          <div className="flex-1 p-8 overflow-y-auto">
            <ExportSection
              template={template}
              fields={fields}
              importedData={importedData}
              fieldMappings={fieldMappings}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Map frontend field type to backend field type
function mapFrontendTypeToBackend(frontendType: CertificateField['type']): 'text' | 'date' | 'qrcode' | 'custom' {
  switch (frontendType) {
    case 'name':
    case 'course':
    case 'custom_text':
      return 'text';
    case 'start_date':
    case 'end_date':
      return 'date';
    case 'qr_code':
      return 'qrcode';
    default:
      return 'text';
  }
}

// Map backend field type to frontend field type
function mapBackendTypeToFrontend(backendType: string): CertificateField['type'] {
  switch (backendType) {
    case 'text':
      return 'custom_text';
    case 'date':
      return 'start_date';
    case 'qrcode':
      return 'qr_code';
    default:
      return 'custom_text';
  }
}

// Auto-map Excel columns to certificate fields
function autoMapColumns(fields: CertificateField[], headers: string[]): FieldMapping[] {
  const mappings: FieldMapping[] = [];

  fields.forEach((field) => {
    const matchingHeader = headers.find((header) => {
      const normalizedHeader = header.toLowerCase().trim();
      const normalizedLabel = field.label.toLowerCase().trim();

      if (normalizedHeader === normalizedLabel) return true;
      if (field.type === 'name' && normalizedHeader.includes('name')) return true;
      if (field.type === 'course' && normalizedHeader.includes('course')) return true;
      if (field.type === 'start_date' && normalizedHeader.includes('start')) return true;
      if (field.type === 'end_date' && normalizedHeader.includes('end')) return true;

      return false;
    });

    if (matchingHeader) {
      mappings.push({
        fieldId: field.id,
        columnName: matchingHeader,
      });
    }
  });

  return mappings;
}
