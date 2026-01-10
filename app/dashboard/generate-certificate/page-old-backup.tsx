'use client';

import { useState } from 'react';
import { CertificateField, CertificateTemplate, ImportedData, FieldMapping } from '@/lib/types/certificate';
import { PDFCanvas } from './components/PDFCanvas';
import { LeftPanel } from './components/LeftPanel';
import { RightPanel } from './components/RightPanel';
import { Card } from '@/components/ui/card';

export default function GenerateCertificatePage() {
  // Template state
  const [template, setTemplate] = useState<CertificateTemplate | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  // Fields state
  const [fields, setFields] = useState<CertificateField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  // Data import state
  const [importedData, setImportedData] = useState<ImportedData | null>(null);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);

  // UI state
  const [canvasScale, setCanvasScale] = useState(1);

  // Handlers
  const handlePdfUpload = (file: File, width: number, height: number) => {
    setPdfFile(file);
    const fileType = file.type === 'application/pdf' ? 'pdf' : 'image';
    const templateName = file.name.replace(/\.(pdf|jpe?g|png)$/i, '');

    setTemplate({
      templateName,
      fileUrl: URL.createObjectURL(file),
      fileType,
      pdfWidth: width,
      pdfHeight: height,
      fields: [],
    });
    setFields([]);
    setSelectedFieldId(null);
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

  const handleDataImport = (data: ImportedData) => {
    setImportedData(data);
    // Auto-map columns to fields based on similarity
    const autoMappings = autoMapColumns(fields, data.headers);
    setFieldMappings(autoMappings);
  };

  const selectedField = fields.find((f) => f.id === selectedFieldId);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-muted/30">
      {/* Header */}
      <div className="border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Generate Certificates</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Upload your certificate template, customize fields, and generate certificates in bulk
            </p>
          </div>
          {template && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{fields.length} fields</span>
              {importedData && <span>• {importedData.rowCount} recipients</span>}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <div className="w-80 border-r bg-background overflow-y-auto">
          <LeftPanel
            template={template}
            fields={fields}
            importedData={importedData}
            selectedFieldId={selectedFieldId}
            onPdfUpload={handlePdfUpload}
            onAddField={handleAddField}
            onFieldSelect={handleFieldSelect}
            onFieldDelete={handleDeleteField}
            onDataImport={handleDataImport}
            fieldMappings={fieldMappings}
            onMappingChange={setFieldMappings}
          />
        </div>

        {/* Center Canvas */}
        <div className="flex-1 flex items-center justify-center p-8 overflow-auto bg-muted/30">
          {template ? (
            <PDFCanvas
              fileUrl={template.fileUrl}
              fileType={template.fileType}
              pdfWidth={template.pdfWidth}
              pdfHeight={template.pdfHeight}
              fields={fields}
              selectedFieldId={selectedFieldId}
              scale={canvasScale}
              onFieldUpdate={handleUpdateField}
              onFieldSelect={handleFieldSelect}
              onScaleChange={setCanvasScale}
            />
          ) : (
            <Card className="p-12 text-center max-w-md">
              <div className="space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <svg
                    className="w-8 h-8 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">No Template Uploaded</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Upload a PDF certificate template to get started
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Right Panel */}
        {template && (
          <div className="w-80 border-l bg-background overflow-y-auto">
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
      </div>
    </div>
  );
}

// Auto-map Excel columns to certificate fields
function autoMapColumns(fields: CertificateField[], headers: string[]): FieldMapping[] {
  const mappings: FieldMapping[] = [];

  fields.forEach((field) => {
    // Try to find matching column
    const matchingHeader = headers.find((header) => {
      const normalizedHeader = header.toLowerCase().trim();
      const normalizedLabel = field.label.toLowerCase().trim();

      // Exact match
      if (normalizedHeader === normalizedLabel) return true;

      // Partial match
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
