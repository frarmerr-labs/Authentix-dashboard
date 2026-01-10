'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { CertificateField, CertificateTemplate, ImportedData, FieldMapping } from '@/lib/types/certificate';
import { createClient } from '@/lib/supabase/client';
import { PDFDocument } from 'pdf-lib';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sparkles, Upload, Image as ImageIcon, FileText, Download,
  CheckCircle2, Circle, Layers, Palette, Database, Wand2
} from 'lucide-react';
import { CertificateCanvas } from './components/CertificateCanvas';
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

  // Fields state
  const [fields, setFields] = useState<CertificateField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  // Data import state
  const [importedData, setImportedData] = useState<ImportedData | null>(null);
  const [savedImports, setSavedImports] = useState<any[]>([]);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);

  // UI state
  const [canvasScale, setCanvasScale] = useState(0.5);
  const [currentStep, setCurrentStep] = useState<'template' | 'design' | 'data' | 'export'>('template');
  const [activeTab, setActiveTab] = useState('fields');
  const [hiddenFields, setHiddenFields] = useState<Set<string>>(new Set());

  const supabase = createClient();

  // Load saved templates and imports
  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('[Generate] No user found');
      return;
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('[Generate] Error fetching user:', userError);
    }

    if (!userData?.company_id) {
      console.log('[Generate] No company_id found for user');
      return;
    }

    console.log('[Generate] Loading templates for company:', userData.company_id);

    // Load templates (certificate_category and certificate_subcategory are text fields)
    const { data: templatesData, error: templatesError } = await supabase
      .from('certificate_templates')
      .select('*')
      .eq('company_id', userData.company_id)
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (templatesError) {
      console.error('[Generate] Error fetching templates:', {
        error: templatesError,
        message: templatesError.message,
        code: templatesError.code,
        details: templatesError.details,
        hint: templatesError.hint,
      });
    }

    console.log('[Generate] Fetched templates:', templatesData?.length || 0, templatesData);

    // Generate signed URLs for templates with storage paths
    const templatesWithSignedUrls = await Promise.all(
      (templatesData || []).map(async (template) => {
        if (template.storage_path) {
          try {
            const { data: signedUrlData, error: signedUrlError } = await supabase.storage
              .from('minecertificate')
              .createSignedUrl(template.storage_path, 3600);

            if (signedUrlError) {
              console.error('[Generate] Error generating signed URL for template:', template.id, signedUrlError);
            }

            if (signedUrlData?.signedUrl) {
              console.log('[Generate] Generated signed URL for template:', template.id);
              return { ...template, preview_url: signedUrlData.signedUrl };
            }
          } catch (error) {
            console.error('[Generate] Exception generating signed URL for template:', template.id, error);
          }
        }
        return template;
      })
    );

    console.log('[Generate] Templates with signed URLs:', templatesWithSignedUrls.length);
    setSavedTemplates(templatesWithSignedUrls);
    
    // Auto-select first template if available and in template step
    if (templatesData && templatesData.length > 0 && currentStep === 'template' && !template) {
       // Optional: We can auto-select, but the user requirement says "First existing certificate should be displayed"
       // in the selector list, which is standard behavior. 
       // If they meant "Pre-select on load", we could do it here. 
       // For now, I will let the selector render them.
    }

    // Load imports
    const { data: importsData } = await supabase
      .from('import_jobs')
      .select('*')
      .eq('company_id', userData.company_id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(10);

    setSavedImports(importsData || []);
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

  // Handlers
  const handleTemplateSelect = async (selectedTemplate: any) => {
    let fileUrl = selectedTemplate.preview_url;

    // Generate signed URL if storage_path exists to ensure access (even for private buckets)
    if (selectedTemplate.storage_path) {
      try {
        const { data, error } = await supabase.storage
          .from('minecertificate')
          .createSignedUrl(selectedTemplate.storage_path, 3600);
        
        if (data?.signedUrl) {
          fileUrl = data.signedUrl;
        }
      } catch (error) {
        console.error('Error fetching signed URL:', error);
      }
    }

    let pdfWidth = selectedTemplate.width;
    let pdfHeight = selectedTemplate.height;

    // If dimensions are missing, calculate them
    if (!pdfWidth || !pdfHeight) {
        try {
            console.log("Template missing dimensions, calculating...");
            const response = await fetch(fileUrl);
            const blob = await response.blob();
            
            if (selectedTemplate.file_type === 'pdf' || selectedTemplate.name?.toLowerCase().endsWith('.pdf')) {
                const arrayBuffer = await blob.arrayBuffer();
                const pdfDoc = await PDFDocument.load(arrayBuffer);
                const page = pdfDoc.getPages()[0];
                const { width, height } = page.getSize();
                pdfWidth = width;
                pdfHeight = height;
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

            // Update Supabase
            if (pdfWidth && pdfHeight) {
                await supabase.from('certificate_templates').update({
                    width: pdfWidth,
                    height: pdfHeight
                }).eq('id', selectedTemplate.id);
            }

        } catch (e) {
            console.error("Failed to extract dimensions", e);
            pdfWidth = 800;
            pdfHeight = 600;
        }
    }

    setTemplate({
      id: selectedTemplate.id,
      templateName: selectedTemplate.name,
      fileUrl,
      fileType: selectedTemplate.file_type === 'pdf' ? 'pdf' : 'image',
      pdfWidth: pdfWidth || 800,
      pdfHeight: pdfHeight || 600,
      fields: selectedTemplate.fields || [],
    });
    setFields(selectedTemplate.fields || []);
    setCurrentStep('design');
  };

  const handleNewTemplateUpload = async (file: File, width: number, height: number, saveTemplate: boolean, templateName?: string, categoryName?: string, subcategoryName?: string) => {
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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userData } = await supabase
          .from('users')
          .select('company_id')
          .eq('id', user.id)
          .single();

        if (!userData?.company_id) return;

        // Upload file to storage (using minecertificate bucket with templates/ folder)
        const fileName = `${Date.now()}-${file.name}`;
        const storagePath = `templates/${userData.company_id}/${fileName}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('minecertificate')
          .upload(storagePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('minecertificate')
          .getPublicUrl(storagePath);

        // Save template metadata
        const { data: templateData, error: templateError } = await supabase
          .from('certificate_templates')
          .insert({
            company_id: userData.company_id,
            name: finalTemplateName,
            certificate_category: categoryName || null,
            certificate_subcategory: subcategoryName || null,
            file_type: fileType,
            storage_path: uploadData.path,
            preview_url: publicUrl,
            fields: [],
            status: 'active',
          })
          .select()
          .single();

        if (templateError) throw templateError;

        // Update saved templates list
        setSavedTemplates((prev) => [templateData, ...prev]);

        // Update template with database ID
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
            'The storage bucket "minecertificate" might not exist or you don\'t have access.\n\n' +
            'Check:\n' +
            '1. Bucket exists in Supabase Storage\n' +
            '2. Storage policies allow uploads\n' +
            '3. User has company_id set'
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

  // Autosave template dimensions
  useEffect(() => {
    if (!template?.id) return;
    
    if (!template.pdfWidth || !template.pdfHeight) return;

    const timeoutId = setTimeout(async () => {
         try {
           await supabase
             .from('certificate_templates')
             .update({ width: template.pdfWidth, height: template.pdfHeight })
             .eq('id', template.id);
         } catch (e) {
             console.error('Failed to save dimensions', e);
         }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [template?.pdfWidth, template?.pdfHeight, template?.id, supabase]);

  // Autosave fields to template
  useEffect(() => {
    if (!template?.id || fields.length === 0) return;

    const timeoutId = setTimeout(async () => {
      try {
        await supabase
          .from('certificate_templates')
          .update({ fields: fields })
          .eq('id', template.id);
        console.log('Fields auto-saved');
      } catch (e) {
        console.error('Failed to save fields', e);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [fields, template?.id, supabase]);
  
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

  const handleDataImport = (data: ImportedData) => {
    setImportedData(data);
    const autoMappings = autoMapColumns(fields, data.headers);
    setFieldMappings(autoMappings);
    setCurrentStep('export');
  };

  const handleLoadImport = async (importId: string) => {
    try {
      const { data: importJob, error } = await supabase
        .from('import_jobs')
        .select('*')
        .eq('id', importId)
        .single();

      if (error) throw error;

      // Load the file from storage
      const { data: fileData, error: fileError } = await supabase.storage
        .from('imports')
        .download(importJob.file_storage_path);

      if (fileError) throw fileError;

      // Parse the Excel/CSV file
      const arrayBuffer = await fileData.arrayBuffer();
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(arrayBuffer);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
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
