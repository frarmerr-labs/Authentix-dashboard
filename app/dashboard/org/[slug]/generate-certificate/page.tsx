'use client';

// Module-level flag: false after a hard page reload, true after any SPA navigation.
// Used to prevent session restore on normal navigation (only restore on actual reload).
let _initialLoadDone = false;

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { CertificateField, CertificateTemplate, ImportedData, FieldMapping } from '@/lib/types/certificate';
import type { Asset } from './components/AssetLibrary';
import { api } from '@/lib/api/client';
import type { RecentGeneratedTemplate, InProgressTemplate } from '@/lib/api/client';
import { getPdfLib, getXlsx } from '@/lib/utils/dynamic-imports';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sparkles, Upload, Image as ImageIcon, FileText, Download,
  CheckCircle2, Circle, Layers, Palette, Database, Wand2,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, GripHorizontal, X, Eye,
  SlidersHorizontal, Maximize2,
} from 'lucide-react';
import dynamic from 'next/dynamic';

// Heavy components lazy-loaded to reduce initial bundle and speed up first render
const CertificateCanvas  = dynamic(() => import('./components/CertificateCanvas').then(m => ({ default: m.CertificateCanvas })),  { ssr: false });
const InfiniteCanvas     = dynamic(() => import('./components/InfiniteCanvas').then(m => ({ default: m.InfiniteCanvas })),     { ssr: false });
const RightPanel         = dynamic(() => import('./components/RightPanel').then(m => ({ default: m.RightPanel })),         { ssr: false });
const TemplateSelector   = dynamic(() => import('./components/TemplateSelector').then(m => ({ default: m.TemplateSelector })),   { ssr: false });
const AssetLibrary       = dynamic(() => import('./components/AssetLibrary').then(m => ({ default: m.AssetLibrary })),       { ssr: false });
const DataSelector       = dynamic(() => import('./components/DataSelector').then(m => ({ default: m.DataSelector })),       { ssr: false });
const FieldTypeSelector  = dynamic(() => import('./components/FieldTypeSelector').then(m => ({ default: m.FieldTypeSelector })),  { ssr: false });
const FieldLayersList    = dynamic(() => import('./components/FieldLayersList').then(m => ({ default: m.FieldLayersList })),    { ssr: false });
const ExportSection      = dynamic(() => import('./components/ExportSection').then(m => ({ default: m.ExportSection })),      { ssr: false });
const CertificatePreview = dynamic(() => import('./components/CertificatePreview').then(m => ({ default: m.CertificatePreview })), { ssr: false });

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
  // Asset library state (lifted from AssetLibrary to survive tab switches)
  const [libraryAssets, setLibraryAssets] = useState<Asset[]>([]);

  // Left floating panel
  const [leftPanelVisible, setLeftPanelVisible] = useState(true);
  const [leftPanelPos, setLeftPanelPos] = useState({ x: 16, y: 24 });

  // Right properties panel visibility (separate from field selection so it can be minimised)
  const [rightPanelVisible, setRightPanelVisible] = useState(true);

  // Preview panel
  const [previewOpen, setPreviewOpen] = useState(false);

  // Template metadata (category/subcategory for display in minimised panel)
  const [templateMeta, setTemplateMeta] = useState({ category: '', subcategory: '' });
  const leftPanelDragOrigin = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);

  // Stepper bottom bar
  const [stepperExpanded, setStepperExpanded] = useState(true);

  // Draggable properties panel
  const [panelPos, setPanelPos] = useState({ x: 0, y: 0 });
  const [panelReady, setPanelReady] = useState(false);
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const panelDragOrigin = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);

  // Template resize tracking — used to scale fields proportionally
  const templateResizeOrigin = useRef<{ w: number; h: number; fields: CertificateField[] }>({ w: 0, h: 0, fields: [] });

  // Race-condition guard: cancel stale handleTemplateSelect calls
  const selectRequestRef = useRef(0);

  // Multi-page PDF support
  const [currentPage, setCurrentPage] = useState(0); // 0-indexed page number
  const [totalPages, setTotalPages] = useState(1);

  // ── Session persistence ────────────────────────────────────────────────────
  // Track whether initial mount has passed so we don't wipe the session on first render.
  const sessionInitRef = useRef(false);

  useEffect(() => {
    if (currentStep === 'design' && template?.id) {
      sessionInitRef.current = true; // session is now actively managed
      try {
        sessionStorage.setItem('gencert_session', JSON.stringify({
          templateId: template.id,
          fields,
          currentPage,
          canvasScale,
          templateVersionId,
        }));
      } catch { /* quota exceeded – ignore */ }
    } else if (currentStep === 'template' && sessionInitRef.current) {
      // Only clear when the user deliberately navigates back to template selection,
      // not on the initial mount where currentStep starts as 'template'.
      sessionStorage.removeItem('gencert_session');
    }
  }, [currentStep, template?.id, fields, currentPage, canvasScale, templateVersionId]);

  // Reset right-panel position when a new template is loaded or preview opens/closes
  useEffect(() => {
    setPanelReady(false);
  }, [template?.id, previewOpen]);

  // Load saved templates and imports
  useEffect(() => {
    const isInitialMount = !_initialLoadDone;
    _initialLoadDone = true;
    loadSavedData(isInitialMount);
  }, []);

  const loadSavedData = async (isInitialMount = false) => {
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

      // ── Restore session on page RELOAD only ───────────────────────────────
      // Only restore when the user hard-reloaded (F5/Ctrl+R) on the first mount.
      // _initialLoadDone guards against re-running after SPA navigation, where
      // performance.getEntriesByType may still report 'reload' from the original load.
      const navType = (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)?.type;
      const isReload = isInitialMount && navType === 'reload';

      if (isReload && !new URLSearchParams(window.location.search).get('template')) {
        try {
          const saved = sessionStorage.getItem('gencert_session');
          if (saved) {
            const { templateId, fields: savedFields, currentPage: savedPage, canvasScale: savedScale, templateVersionId: savedVersionId } = JSON.parse(saved);
            if (templateId && savedFields?.length >= 0) {
              const templateObj = templatesWithSignedUrls.find((t: any) => t.id === templateId) || { id: templateId };
              await handleTemplateSelect(templateObj);
              setFields(savedFields);
              if (savedPage !== undefined) setCurrentPage(savedPage);
              if (savedScale) setCanvasScale(savedScale);
              if (savedVersionId) setTemplateVersionId(savedVersionId);
            }
          }
        } catch {
          sessionStorage.removeItem('gencert_session');
        }
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
        fontWeight: (field.style as any)?.fontWeight || '400',
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
    // Increment request ID — any previous in-flight call will see a stale ID and bail out
    const requestId = ++selectRequestRef.current;

    // Reset state for new template to prevent stale data
    setTemplate(null);
    setTotalPages(1);
    setCurrentPage(0);
    setFields([]);
    setSelectedFieldId(null);
    setTemplateVersionId(null);

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
        if (!fileUrl) {
            // No file URL available, use defaults
            pdfWidth = 800;
            pdfHeight = 600;
        } else
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
                // Reset to single page for image templates
                setTotalPages(1);
                setCurrentPage(0);
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
      fontWeight: (field.style as any)?.fontWeight || '400',
      fontStyle: (field.style as any)?.fontStyle || 'normal',
      textAlign: (field.style as any)?.textAlign || 'left',
      dateFormat: (field.style as any)?.dateFormat,
      prefix: (field.style as any)?.prefix,
      suffix: (field.style as any)?.suffix,
    })) || selectedTemplate.fields || [];

    // If the user already clicked a different template, discard this result
    if (selectRequestRef.current !== requestId) return;

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
    setTemplateMeta({
      category: selectedTemplate.category_name || '',
      subcategory: selectedTemplate.subcategory_name || '',
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
    setRightPanelVisible(true);
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

  const handleFieldDuplicate = (field: CertificateField) => {
    const newField: CertificateField = { ...field, id: crypto.randomUUID() };
    setFields((prev) => [...prev, newField]);
    setSelectedFieldId(newField.id);
  };

  const handleFieldSelect = (fieldId: string) => {
    if (previewOpen) return; // don't open right panel in preview mode
    setSelectedFieldId(fieldId);
    setRightPanelVisible(true);
  };

  const handleTemplateResizeStart = (width: number, height: number) => {
    templateResizeOrigin.current = { w: width, h: height, fields: [...fields] };
  };

  const handleTemplateResize = (width: number, height: number) => {
    const { w: ow, h: oh, fields: origFields } = templateResizeOrigin.current;
    if (ow > 0 && oh > 0 && origFields.length > 0) {
      const sx = width / ow;
      const sy = height / oh;
      setFields(origFields.map(f => ({
        ...f,
        x: f.x * sx,
        y: f.y * sy,
        width: f.width * sx,
        height: f.height * sy,
      })));
    }
    setTemplate(prev => prev ? { ...prev, pdfWidth: width, pdfHeight: height } : null);
  };

  const handleAddAssetField = (url: string, name: string, x?: number, y?: number) => {
    const defaultSize = template
      ? Math.max(200, Math.round(Math.min(template.pdfWidth, template.pdfHeight) * 0.25))
      : 200;
    const newField: CertificateField = {
      id: crypto.randomUUID(),
      type: 'image',
      label: name,
      imageUrl: url,
      x: x !== undefined ? x - defaultSize / 2 : (template ? (template.pdfWidth - defaultSize) / 2 : 100),
      y: y !== undefined ? y - defaultSize / 2 : (template ? (template.pdfHeight - defaultSize) / 2 : 100),
      width: defaultSize,
      height: defaultSize,
      pageNumber: currentPage,
      fontSize: 0,
      fontFamily: 'Arial',
      color: '#000000',
      fontWeight: '400',
      fontStyle: 'normal',
      textAlign: 'left',
      opacity: 100,
      cornerRadius: 0,
    };
    handleAddField(newField);
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
            fontWeight: field.fontWeight || '400',
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
                const canNavigate = step.completed || isActive || index === steps.findIndex(s => s.id === currentStep) + 1;
                if (!canNavigate) return;
                // Going back to template selection — clear active template so a fresh one can be picked
                if (step.id === 'template' && currentStep !== 'template') {
                  selectRequestRef.current++; // cancel any in-flight template load
                  setTemplate(null);
                  setFields([]);
                  setSelectedFieldId(null);
                  setPanelReady(false);
                }
                setCurrentStep(step.id as any);
              }}
              disabled={!step.completed && !isActive && index !== steps.findIndex(s => s.id === currentStep) + 1 && step.id !== 'template'}
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

  // Position the panel in the upper-right of the canvas area on first show
  const initPanelPos = () => {
    if (panelReady) return;
    const rect = canvasAreaRef.current?.getBoundingClientRect();
    if (rect) {
      setPanelPos({ x: rect.width - 304, y: 16 }); // 288px panel + 16px margin
      setPanelReady(true);
    }
  };

  const handlePanelDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    panelDragOrigin.current = { mx: e.clientX, my: e.clientY, px: panelPos.x, py: panelPos.y };
    const onMove = (ev: MouseEvent) => {
      if (!panelDragOrigin.current) return;
      const { mx, px } = panelDragOrigin.current;
      setPanelPos(prev => ({ ...prev, x: px + ev.clientX - mx }));
    };
    const onUp = () => {
      panelDragOrigin.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const handleLeftPanelDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    leftPanelDragOrigin.current = { mx: e.clientX, my: e.clientY, px: leftPanelPos.x, py: leftPanelPos.y };
    const onMove = (ev: MouseEvent) => {
      if (!leftPanelDragOrigin.current) return;
      const { mx, px } = leftPanelDragOrigin.current;
      setLeftPanelPos(prev => ({ ...prev, x: px + ev.clientX - mx }));
    };
    const onUp = () => {
      leftPanelDragOrigin.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  return (
    <>
      {/* Normal flow layout (template / data / export steps) */}
      <div className="flex flex-col h-[calc(100vh-7rem)]">
        {mounted && currentStep !== 'design' && typeof document !== 'undefined' && document.getElementById('header-portal') && createPortal(
          stepperContent,
          document.getElementById('header-portal')!
        )}
        {mounted && typeof document !== 'undefined' && document.getElementById('header-left-portal') && createPortal(
          titleContent,
          document.getElementById('header-left-portal')!
        )}

        <div className="flex-1 flex overflow-hidden">
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

      {/* ── Full-screen design overlay ── */}
      {currentStep === 'design' && template && (
        <div className="fixed top-0 left-14 right-0 bottom-0 z-50 bg-background flex flex-col">

          {/* Canvas area + optional preview — flex row */}
          <div className="flex-1 flex overflow-hidden">

          {/* Editing canvas — fills remaining width */}
          <div className="flex-1 relative overflow-hidden min-w-0" ref={canvasAreaRef}>
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
                onTemplateResizeStart={handleTemplateResizeStart}
                onPageChange={(page) => setCurrentPage(page - 1)}
                onAssetDrop={(url, name, x, y) => handleAddAssetField(url, name, x, y)}
                onFieldDuplicate={handleFieldDuplicate}
                onPreviewToggle={() => {
                  const opening = !previewOpen;
                  setPreviewOpen(opening);
                  if (opening) {
                    setLeftPanelVisible(false);
                    setRightPanelVisible(false);
                    setSelectedFieldId(null);
                  }
                }}
                previewOpen={previewOpen}
              />
            ) : (
              <div className="absolute inset-0 overflow-auto flex items-center justify-center p-8">
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

            {/* ── Left panel collapsed card (wide, short) ── */}
            {!leftPanelVisible && (
              <div
                className="absolute z-40 flex items-center gap-2.5 bg-card border border-border/50 rounded-xl shadow-md px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors select-none"
                style={{ left: leftPanelPos.x, top: 16, width: 256 }}
                onClick={() => setLeftPanelVisible(true)}
                title="Expand layers panel"
              >
                <SlidersHorizontal className="w-4 h-4 text-muted-foreground/70 shrink-0" />
                <div className="flex-1 min-w-0">
                  {template ? (
                    <>
                      <p className="text-[10px] font-semibold text-foreground truncate leading-tight">{template.templateName}</p>
                      {(templateMeta.category || templateMeta.subcategory) && (
                        <p className="text-[9px] text-muted-foreground truncate leading-tight">
                          {[templateMeta.category, templateMeta.subcategory].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">Layers</p>
                  )}
                </div>
                <Maximize2 className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
              </div>
            )}

            {/* ── Left floating panel ── */}
            {leftPanelVisible && (
              <div
                className="absolute z-40 w-64 flex flex-col bg-card border border-border/50 rounded-xl shadow-2xl overflow-hidden"
                style={{
                  left: leftPanelPos.x,
                  top: 16,
                  height: 'calc(100% - 32px)',
                }}
              >
                {/* Drag handle header */}
                <div
                  className="flex items-center gap-2 px-3 py-2 bg-muted/40 border-b border-border/40 cursor-grab active:cursor-grabbing shrink-0 select-none"
                  onMouseDown={handleLeftPanelDragStart}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs font-medium text-foreground flex-1">Layers</span>
                  <button
                    onClick={() => setLeftPanelVisible(false)}
                    className="text-muted-foreground hover:text-foreground rounded p-0.5 hover:bg-muted transition-colors"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Scrollable tab content */}
                <div className="flex-1 overflow-y-auto min-h-0">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col">
                    <div className="px-3 pt-2 pb-1 shrink-0">
                      <div className="flex items-center bg-muted rounded-lg p-1 gap-1 h-8">
                        <button
                          onClick={() => setActiveTab('fields')}
                          className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium rounded-md h-full transition-all ${
                            activeTab === 'fields' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <Layers className="w-3 h-3" />
                          Fields
                        </button>
                        <button
                          onClick={() => setActiveTab('assets')}
                          className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium rounded-md h-full transition-all ${
                            activeTab === 'assets' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <ImageIcon className="w-3 h-3" />
                          Assets
                        </button>
                      </div>
                    </div>

                    <TabsContent value="fields" className="p-3 mt-0 space-y-5">
                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Add Fields</p>
                        <FieldTypeSelector
                          onAddField={handleAddField}
                          onAddImageField={handleAddAssetField}
                          pdfWidth={template.pdfWidth}
                          pdfHeight={template.pdfHeight}
                          currentPage={currentPage}
                        />
                      </div>
                      <div className="pb-4">
                        <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Layers</p>
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

                    <TabsContent value="assets" className="p-3 mt-0">
                      <AssetLibrary
                        assets={libraryAssets}
                        onAssetsChange={setLibraryAssets}
                        onAddAsset={handleAddAssetField}
                      />
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            )}

            {/* ── Top-right: panel restore only (preview is in toolbar) ── */}
            <div className="absolute top-4 right-4 z-41 flex flex-col gap-2">
              {/* Properties restore — only when right panel hidden, field selected, not in preview */}
              {selectedField && !rightPanelVisible && !previewOpen && (
                <button
                  className="w-8 h-8 flex items-center justify-center bg-card border border-border/50 rounded-lg shadow-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  onClick={() => setRightPanelVisible(true)}
                  title="Show properties panel"
                >
                  <Palette className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* ── Right properties panel (draggable floating popout) ── */}
            {selectedField && rightPanelVisible && (
              <div
                className="absolute z-40 w-72 flex flex-col bg-card border border-border/50 rounded-xl shadow-2xl overflow-hidden"
                style={{
                  left: panelPos.x,
                  top: 16,
                  height: 'calc(100% - 32px)',
                }}
                ref={(el) => { if (el && !panelReady) initPanelPos(); }}
              >
                {/* Drag handle header */}
                <div
                  className="flex items-center gap-2 px-3 py-2 bg-muted/40 border-b border-border/40 cursor-grab active:cursor-grabbing shrink-0 select-none"
                  onMouseDown={handlePanelDragStart}
                >
                  <GripHorizontal className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs font-medium text-foreground flex-1">Properties</span>
                  <button
                    onClick={() => setRightPanelVisible(false)}
                    className="text-muted-foreground hover:text-foreground rounded p-0.5 hover:bg-muted transition-colors"
                    onMouseDown={(e) => e.stopPropagation()}
                    title="Minimise panel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto min-h-0">
                  <RightPanel
                    selectedField={selectedField}
                    onFieldUpdate={(updates) => {
                      if (selectedFieldId) handleUpdateField(selectedFieldId, updates);
                    }}
                  />
                </div>
              </div>
            )}
          </div>{/* end editing canvas */}

          {/* ── Preview panel ── */}
          {previewOpen && (
            <div className="flex-1 flex flex-col border-l border-border/40 min-w-0">
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-border/30 bg-card/80 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-semibold">Preview</span>
                  <span className="text-[10px] text-muted-foreground/60">· sample values</span>
                </div>
                <button
                  onClick={() => setPreviewOpen(false)}
                  className="text-muted-foreground hover:text-foreground rounded p-0.5 hover:bg-muted transition-colors"
                  title="Close preview"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {/* Preview content */}
              <div className="flex-1 overflow-hidden">
                <CertificatePreview
                  template={template}
                  fields={fields}
                  currentPage={currentPage}
                />
              </div>
            </div>
          )}

          </div>{/* end flex row */}

          {/* ── Stepper bottom bar ── */}
          <div className="shrink-0 border-t border-border/40 bg-card/95 backdrop-blur-sm">
            <div className="flex items-center px-4 py-2 gap-2">
              <div className="flex-1 flex justify-center">
                {stepperExpanded ? (
                  stepperContent
                ) : (
                  <span className="text-xs font-medium text-muted-foreground select-none">
                    {steps.find(s => s.id === currentStep)?.label ?? 'Design Fields'}
                  </span>
                )}
              </div>
              <button
                className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                onClick={() => setStepperExpanded(v => !v)}
                title={stepperExpanded ? 'Collapse steps' : 'Expand steps'}
              >
                {stepperExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

        </div>
      )}
    </>
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
