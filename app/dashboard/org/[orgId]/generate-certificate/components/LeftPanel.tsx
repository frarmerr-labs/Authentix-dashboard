'use client';

import { useState } from 'react';
import { CertificateField, CertificateTemplate, ImportedData, FieldMapping, FIELD_TYPE_CONFIG } from '@/lib/types/certificate';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { TemplateUploader } from './TemplateUploader';
import { FieldTypeSelector } from './FieldTypeSelector';
import { FieldLayersList } from './FieldLayersList';
import { DataImporter } from './DataImporter';
import { ExportSection } from './ExportSection';
import { Upload, Layers, Database, Download } from 'lucide-react';

interface LeftPanelProps {
  template: CertificateTemplate | null;
  fields: CertificateField[];
  importedData: ImportedData | null;
  selectedFieldId: string | null;
  hiddenFields: Set<string>;
  onPdfUpload: (file: File, width: number, height: number) => void;
  onAddField: (field: CertificateField) => void;
  onFieldSelect: (fieldId: string) => void;
  onFieldDelete: (fieldId: string) => void;
  onToggleVisibility: (fieldId: string) => void;
  onDataImport: (data: ImportedData) => void;
  fieldMappings: FieldMapping[];
  onMappingChange: (mappings: FieldMapping[]) => void;
}

export function LeftPanel({
  template,
  fields,
  importedData,
  selectedFieldId,
  hiddenFields,
  onPdfUpload,
  onAddField,
  onFieldSelect,
  onFieldDelete,
  onToggleVisibility,
  onDataImport,
  fieldMappings,
  onMappingChange,
}: LeftPanelProps) {
  const [activeTab, setActiveTab] = useState('upload');

  return (
    <div className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-4 m-4 mb-0">
          <TabsTrigger value="upload" className="flex items-center gap-1.5">
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Upload</span>
          </TabsTrigger>
          <TabsTrigger value="fields" disabled={!template} className="flex items-center gap-1.5">
            <Layers className="w-4 h-4" />
            <span className="hidden sm:inline">Fields</span>
          </TabsTrigger>
          <TabsTrigger value="data" disabled={!template || fields.length === 0} className="flex items-center gap-1.5">
            <Database className="w-4 h-4" />
            <span className="hidden sm:inline">Data</span>
          </TabsTrigger>
          <TabsTrigger value="export" disabled={!importedData} className="flex items-center gap-1.5">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          {/* Upload Tab */}
          <TabsContent value="upload" className="p-4 space-y-4 mt-0">
            <div>
              <h3 className="font-semibold mb-2">Certificate Template</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload your PDF certificate template to begin customization
              </p>
              <TemplateUploader onUpload={onPdfUpload} />
            </div>

            {template && (
              <Card className="p-4 bg-muted/50">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Template:</span>
                    <span className="font-medium">{template.templateName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dimensions:</span>
                    <span className="font-medium">
                      {template.pdfWidth} × {template.pdfHeight}px
                    </span>
                  </div>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* Fields Tab */}
          <TabsContent value="fields" className="p-4 space-y-4 mt-0">
            <div>
              <h3 className="font-semibold mb-2">Add Fields</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Click to add fields to your certificate
              </p>
              <FieldTypeSelector onAddField={onAddField} pdfWidth={template?.pdfWidth || 0} pdfHeight={template?.pdfHeight || 0} />
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-2">Field Layers</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {fields.length === 0 ? 'No fields added yet' : `${fields.length} field(s)`}
              </p>
              <FieldLayersList
                fields={fields}
                selectedFieldId={selectedFieldId}
                hiddenFields={hiddenFields}
                onFieldSelect={onFieldSelect}
                onFieldDelete={onFieldDelete}
                onToggleVisibility={onToggleVisibility}
              />
            </div>
          </TabsContent>

          {/* Data Tab */}
          <TabsContent value="data" className="p-4 space-y-4 mt-0">
            <div>
              <h3 className="font-semibold mb-2">Import Recipients Data</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload an Excel or CSV file containing recipient information
              </p>
              <DataImporter
                fields={fields}
                importedData={importedData}
                fieldMappings={fieldMappings}
                onDataImport={onDataImport}
                onMappingChange={onMappingChange}
              />
            </div>
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="p-4 space-y-4 mt-0">
            <div>
              <h3 className="font-semibold mb-2">Generate & Export</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Generate certificates and download as ZIP file
              </p>
              <ExportSection
                template={template}
                fields={fields}
                importedData={importedData}
                fieldMappings={fieldMappings}
              />
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
