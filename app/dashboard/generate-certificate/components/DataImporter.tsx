'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { CertificateField, ImportedData, FieldMapping } from '@/lib/types/certificate';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { getXlsx } from '@/lib/utils/dynamic-imports';

interface DataImporterProps {
  fields: CertificateField[];
  importedData: ImportedData | null;
  fieldMappings: FieldMapping[];
  onDataImport: (data: ImportedData) => void;
  onMappingChange: (mappings: FieldMapping[]) => void;
}

export function DataImporter({
  fields,
  importedData,
  fieldMappings,
  onDataImport,
  onMappingChange,
}: DataImporterProps) {
  const [isProcessing, setIsProcessing] = useState(false);

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
    <div className="space-y-4">
      {/* File Upload */}
      {!importedData ? (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
            ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary hover:bg-primary/5'}
          `}
        >
          <input {...getInputProps()} />

          <div className="flex flex-col items-center gap-3">
            {isProcessing ? (
              <>
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Processing file...</p>
              </>
            ) : isDragActive ? (
              <>
                <FileSpreadsheet className="w-10 h-10 text-primary" />
                <p className="text-sm font-medium">Drop your file here</p>
              </>
            ) : (
              <>
                <Upload className="w-10 h-10 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Upload Excel or CSV</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Drag & drop or click to browse
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <Card className="p-4 bg-muted/50">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">{importedData.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {importedData.rowCount} row{importedData.rowCount !== 1 ? 's' : ''} • {importedData.headers.length} column{importedData.headers.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDataImport(null as any)}
            >
              Remove
            </Button>
          </div>

          {/* Data Preview */}
          <div className="mt-3 border rounded-lg overflow-hidden">
            <div className="bg-muted p-2 text-xs font-medium">Data Preview (first 3 rows)</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    {importedData.headers.map((header) => (
                      <th key={header} className="px-2 py-1 text-left font-medium">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {importedData.rows.slice(0, 3).map((row, idx) => (
                    <tr key={idx} className="border-t">
                      {importedData.headers.map((header) => (
                        <td key={header} className="px-2 py-1">
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
      )}

      {/* Column Mapping */}
      {importedData && (
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-semibold">Map Columns to Fields</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Match Excel columns to certificate fields
            </p>
          </div>

          <div className="space-y-2">
            {fields.filter(f => f.type !== 'qr_code' && f.type !== 'custom_text').map((field) => {
              const mappedColumn = getMappedColumn(field.id);
              const isMapped = !!mappedColumn;

              return (
                <div key={field.id} className="flex items-center gap-2">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">{field.label}</Label>
                  </div>
                  <div className="flex-1">
                    <Select
                      value={mappedColumn || ''}
                      onValueChange={(value: string) => handleMappingChange(field.id, value)}
                    >
                      <SelectTrigger className={`h-8 text-xs ${isMapped ? 'border-green-500' : ''}`}>
                        <SelectValue placeholder="Select column..." />
                      </SelectTrigger>
                      <SelectContent>
                        {importedData.headers.map((header) => (
                          <SelectItem key={header} value={header} className="text-xs">
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {isMapped && <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />}
                </div>
              );
            })}
          </div>

          {/* Mapping Summary */}
          <Card className="p-3 bg-muted/30">
            <div className="text-xs">
              <span className="font-medium">Mapping Status:</span>{' '}
              <span className="text-muted-foreground">
                {fieldMappings.length} of {fields.filter(f => f.type !== 'qr_code' && f.type !== 'custom_text').length} fields mapped
              </span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
