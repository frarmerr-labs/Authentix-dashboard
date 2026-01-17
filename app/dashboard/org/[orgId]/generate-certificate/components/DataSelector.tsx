'use client';

import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDropzone } from 'react-dropzone';
import { CertificateField, ImportedData, FieldMapping } from '@/lib/types/certificate';
import { Upload, FileSpreadsheet, Download, CheckCircle2, Plus, Database } from 'lucide-react';
import { getXlsx } from '@/lib/utils/dynamic-imports';

interface DataSelectorProps {
  fields: CertificateField[];
  savedImports: any[];
  importedData: ImportedData | null;
  fieldMappings: FieldMapping[];
  onDataImport: (data: ImportedData | null) => void;
  onMappingChange: (mappings: FieldMapping[]) => void;
  onLoadImport?: (importId: string) => Promise<void>;
}

export function DataSelector({
  fields,
  savedImports,
  importedData,
  fieldMappings,
  onDataImport,
  onMappingChange,
  onLoadImport,
}: DataSelectorProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUpload, setShowUpload] = useState(!importedData);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setIsProcessing(true);

      try {
        const XLSX = await getXlsx();
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          throw new Error('No sheets found in workbook');
        }
        const firstSheet = workbook.Sheets[sheetName];
        if (!firstSheet) {
          throw new Error('Sheet not found');
        }
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        if (jsonData.length === 0) {
          alert('The file is empty or has no data.');
          return;
        }

        const firstRow = jsonData[0];
        if (!firstRow || typeof firstRow !== 'object') {
          throw new Error('Invalid data format');
        }
        const headers = Object.keys(firstRow as Record<string, unknown>);

        const data: ImportedData = {
          fileName: file.name,
          headers,
          rows: jsonData as Record<string, unknown>[],
          rowCount: jsonData.length,
        };

        onDataImport(data);
        setShowUpload(false);
      } catch (error) {
        console.error('Error parsing file:', error);
        alert('Failed to parse file. Please ensure it is a valid Excel or CSV file.');
      } finally {
        setIsProcessing(false);
      }
    },
    [onDataImport]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    disabled: isProcessing,
  });

  const downloadSampleFile = async () => {
    // Dynamic import for bundle optimization
    const XLSX = await getXlsx();
    
    // Create sample data based on fields
    const sampleData = [];
    for (let i = 1; i <= 5; i++) {
      const row: Record<string, unknown> = {};
      fields.forEach((field) => {
        if (field.type === 'name') row['Recipient Name'] = `John Doe ${i}`;
        else if (field.type === 'course') row['Course Name'] = 'Web Development Fundamentals';
        else if (field.type === 'start_date') row['Start Date'] = '01/15/2026';
        else if (field.type === 'end_date') row['End Date'] = '03/15/2026';
        else if (field.type === 'custom_text') row[field.label] = `Sample Value ${i}`;
      });
      sampleData.push(row);
    }

    // Create workbook
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Recipients');

    // Download
    XLSX.writeFile(wb, 'certificate_data_sample.xlsx');
  };

  const handleMappingChange = (fieldId: string, columnName: string) => {
    const existingMapping = fieldMappings.find((m) => m.fieldId === fieldId);

    if (existingMapping) {
      onMappingChange(
        fieldMappings.map((m) => (m.fieldId === fieldId ? { ...m, columnName } : m))
      );
    } else {
      onMappingChange([...fieldMappings, { fieldId, columnName }]);
    }
  };

  const getMappedColumn = (fieldId: string) => {
    return fieldMappings.find((m) => m.fieldId === fieldId)?.columnName;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          Import Recipient Data
        </h2>
        <p className="text-muted-foreground">
          Upload an Excel or CSV file with recipient information
        </p>
      </div>

      {/* Sample File Download */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
            <Download className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
              Need a template?
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
              Download a sample Excel file pre-configured with your certificate fields. Just fill in your data and upload!
            </p>
            <Button onClick={downloadSampleFile} variant="outline" size="sm" className="border-blue-300 dark:border-blue-700">
              <Download className="w-4 h-4 mr-2" />
              Download Sample File
            </Button>
          </div>
        </div>
      </Card>

      {/* Saved Imports */}
      {savedImports.length > 0 && showUpload && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Recent Imports</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedImports.map((importJob) => (
              <Card
                key={importJob.id}
                className="p-4 hover:shadow-md transition-all cursor-pointer group"
                onClick={async () => {
                  if (onLoadImport) {
                    setIsProcessing(true);
                    try {
                      await onLoadImport(importJob.id);
                    } catch (error) {
                      console.error('Error loading import:', error);
                      alert('Failed to load import data');
                    } finally {
                      setIsProcessing(false);
                    }
                  }
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <h4 className="font-medium truncate">{importJob.file_name}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {importJob.total_rows || 0} recipients
                    </p>
                  </div>
                  <Badge variant={importJob.status === 'completed' ? 'default' : 'secondary'} className="ml-2">
                    {importJob.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(importJob.created_at).toLocaleDateString()}
                </p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Upload New Data */}
      {showUpload ? (
        <Card className="border-2 border-dashed">
          <div
            {...getRootProps()}
            className={`
              p-12 text-center cursor-pointer transition-all
              ${isDragActive ? 'bg-primary/5' : 'hover:bg-muted/50'}
            `}
          >
            <input {...getInputProps()} />

            <div className="flex flex-col items-center gap-4">
              {isProcessing ? (
                <>
                  <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground">Processing file...</p>
                </>
              ) : isDragActive ? (
                <>
                  <FileSpreadsheet className="w-16 h-16 text-primary" />
                  <p className="text-lg font-medium">Drop your file here</p>
                </>
              ) : (
                <>
                  <div className="p-4 rounded-full bg-gradient-to-br from-primary/10 to-primary/20">
                    <Upload className="w-12 h-12 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-medium mb-1">Upload Excel or CSV File</p>
                    <p className="text-sm text-muted-foreground">
                      Drag & drop or click to browse • .xlsx, .xls, .csv
                    </p>
                  </div>
                  <Button variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Choose File
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>
      ) : (
        // Show imported data with mapping
        <div className="space-y-6">
          {/* Data Preview */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold">{importedData?.fileName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {importedData?.rowCount} recipient{importedData?.rowCount !== 1 ? 's' : ''} • {importedData?.headers.length} column{importedData?.headers.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => {
                setShowUpload(true);
                onDataImport(null);
              }}>
                Change File
              </Button>
            </div>

            {/* Data Table Preview */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted p-2 text-xs font-medium">Data Preview (first 3 rows)</div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      {importedData?.headers.map((header) => (
                        <th key={header} className="px-3 py-2 text-left font-medium whitespace-nowrap">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importedData?.rows.slice(0, 3).map((row, idx) => (
                      <tr key={idx} className="border-t">
                        {importedData.headers.map((header) => (
                          <td key={header} className="px-3 py-2 whitespace-nowrap">
                            {row[header]?.toString() || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>

          {/* Column Mapping */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Map Columns to Fields</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Match your Excel columns to the certificate fields
            </p>

            <div className="space-y-3">
              {fields.filter(f => f.type !== 'qr_code' && f.type !== 'custom_text').map((field) => {
                const mappedColumn = getMappedColumn(field.id);
                const isMapped = !!mappedColumn;

                return (
                  <div key={field.id} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                    <div className="flex-1">
                      <Label className="text-sm font-medium">{field.label}</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">Certificate field</p>
                    </div>
                    <div className="flex-1">
                      <Select
                        value={mappedColumn || ''}
                        onValueChange={(value: string) => handleMappingChange(field.id, value)}
                      >
                        <SelectTrigger className={isMapped ? 'border-green-500' : ''}>
                          <SelectValue placeholder="Select column..." />
                        </SelectTrigger>
                        <SelectContent>
                          {importedData?.headers.map((header) => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {isMapped && (
                      <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Mapping Summary */}
            <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    Mapping Status: {fieldMappings.length} of {fields.filter(f => f.type !== 'qr_code' && f.type !== 'custom_text').length} fields mapped
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                    {fieldMappings.length === fields.filter(f => f.type !== 'qr_code' && f.type !== 'custom_text').length
                      ? 'All fields are mapped! Ready to generate certificates.'
                      : 'Unmapped fields will be left empty in the certificates.'}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
