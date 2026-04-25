'use client';

import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDropzone } from 'react-dropzone';
import { CertificateField, ImportedData, FieldMapping } from '@/lib/types/certificate';
import { Upload, FileSpreadsheet, Download, CheckCircle2, Plus, Database, ArrowRight, Edit2, Keyboard, AlertCircle, Link2, ChevronDown, Loader2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api/client';
import { getXlsx } from '@/lib/utils/dynamic-imports';
import { DataPreview } from './DataPreview';
import { ManualDataEntry } from './ManualDataEntry';

// Semantic field types that are logically unique per person across templates
const SEMANTIC_TYPES = new Set(['name', 'course', 'start_date', 'end_date']);

const MAX_DATA_FILE_MB = 10;
const MAX_DATA_FILE_BYTES = MAX_DATA_FILE_MB * 1024 * 1024;
const MAX_ROWS = 2000;
const WARN_ROWS = 500;

interface DataSelectorProps {
  fields: CertificateField[];
  templateGroups?: Array<{ templateName: string; fields: CertificateField[] }>;
  savedImports: any[];
  importedData: ImportedData | null;
  fieldMappings: FieldMapping[];
  onDataImport: (data: ImportedData | null) => void;
  onMappingChange: (mappings: FieldMapping[]) => void;
  onLoadImport?: (importId: string) => Promise<void>;
  onContinueToGenerate?: () => void;
  onAdditionalRows?: (rows: Record<string, unknown>[]) => void;
  additionalRows?: Record<string, unknown>[];
}

export function DataSelector({
  fields,
  templateGroups,
  savedImports,
  importedData,
  fieldMappings,
  onDataImport,
  onMappingChange,
  onLoadImport,
  onContinueToGenerate,
  onAdditionalRows,
  additionalRows,
}: DataSelectorProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUpload, setShowUpload] = useState(!importedData);
  const [entryMode, setEntryMode] = useState<'upload' | 'manual'>('upload');
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [manualEditSeed, setManualEditSeed] = useState<ImportedData | undefined>(undefined);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [loadImportError, setLoadImportError] = useState<string | null>(null);
  const [showAdditionalRows, setShowAdditionalRows] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('Uploading…');

  const onDrop = useCallback(
    async (acceptedFiles: File[], rejectedFiles: any[]) => {
      if (rejectedFiles.length > 0) {
        const reason = rejectedFiles[0]?.errors?.[0]?.code;
        setUploadError(
          reason === 'file-too-large'
            ? `File exceeds the ${MAX_DATA_FILE_MB} MB limit.`
            : 'Invalid file. Please upload a .csv, .tsv, .xls, or .xlsx file.',
        );
        return;
      }
      if (acceptedFiles.length === 0) return;

      setUploadError(null);
      setIsProcessing(true);

      type FileResult = {
        file: File;
        importId: string;
        rowCount: number;
        headers: string[];
        previewRows: Record<string, unknown>[];
      };

      const results: FileResult[] = [];

      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i]!;
        const label = acceptedFiles.length > 1 ? ` (${i + 1}/${acceptedFiles.length})` : '';

        setProcessingStatus(`Uploading${label}…`);

        try {
          let importJob = await api.imports.create(file, { file_name: file.name });

          if (importJob.status !== 'completed' && importJob.status !== 'failed') {
            setProcessingStatus(`Processing${label}…`);
            const deadline = Date.now() + 120_000;
            while (
              (importJob.status === 'queued' ||
                importJob.status === 'pending' ||
                importJob.status === 'processing') &&
              Date.now() < deadline
            ) {
              await new Promise(r => setTimeout(r, 2000));
              importJob = await api.imports.get(importJob.id);
            }
          }

          if (importJob.status === 'failed') {
            setUploadError(`"${file.name}" failed: ${importJob.error_message ?? 'processing error'}`);
            setIsProcessing(false);
            return;
          }
          if (importJob.status !== 'completed') {
            setUploadError(`"${file.name}" timed out. Please try again.`);
            setIsProcessing(false);
            return;
          }

          setProcessingStatus(`Loading preview${label}…`);
          const previewResult = await api.imports.getData(importJob.id, { limit: 10 });
          // Backend returns { row_index, data: {...} } — extract the inner data object
          const rawItems = previewResult.items as Array<{ row_index: number; data: Record<string, unknown> }>;
          const previewRows = rawItems.map(r => r.data ?? r);

          if (previewRows.length === 0) {
            setUploadError(`"${file.name}" is empty or has no data rows.`);
            setIsProcessing(false);
            return;
          }

          results.push({
            file,
            importId: importJob.id,
            rowCount: importJob.total_rows ?? previewResult.pagination.total,
            headers: Object.keys(previewRows[0]!),
            previewRows,
          });
        } catch {
          setUploadError(`Failed to upload "${file.name}". Please try again.`);
          setIsProcessing(false);
          return;
        }
      }

      // Merge: union of all headers, sum of row counts, preview from first file
      const allHeaders = [...new Set(results.flatMap(r => r.headers))];
      const totalRowCount = results.reduce((sum, r) => sum + r.rowCount, 0);
      const importIds = results.map(r => r.importId);
      const fileName = results.length === 1
        ? results[0]!.file.name
        : `${results.length} files (${results.map(r => r.file.name).join(', ')})`;

      const data: ImportedData = {
        fileName,
        headers: allHeaders,
        rows: results[0]!.previewRows,
        rowCount: totalRowCount,
        importId: importIds[0],
        importIds,
      };

      onDataImport(data);
      setShowUpload(false);
      setIsProcessing(false);
    },
    [onDataImport],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
      'text/tab-separated-values': ['.tsv'],
      'text/plain': ['.tsv'],
    },
    maxFiles: 10,
    maxSize: MAX_DATA_FILE_BYTES,
    disabled: isProcessing,
  });

  const downloadSampleFile = async () => {
    const XLSX = await getXlsx();

    const sampleValue = (field: CertificateField, i: number): string => {
      const t = field.type;
      if (t === 'name') return `John Doe ${i}`;
      if (t === 'course') return 'Web Development Fundamentals';
      if (t === 'start_date') return '01/15/2026';
      if (t === 'end_date') return '03/15/2026';
      const lower = field.label.toLowerCase();
      if (lower.includes('email')) return `student${i}@example.com`;
      if (lower.includes('grade') || lower.includes('score')) return `${85 + i}%`;
      if (lower.includes('date')) return `01/${String(i).padStart(2, '0')}/2026`;
      return `${field.label} ${i}`;
    };

    const allRawFields = templateGroups ? templateGroups.flatMap(g => g.fields) : fields;
    const seenTypes = new Set<string>();
    const seenLabels = new Set<string>();
    const mappableFields = allRawFields.filter(f => {
      if (f.type === 'qr_code' || f.type === 'image') return false;
      if (SEMANTIC_TYPES.has(f.type)) {
        if (seenTypes.has(f.type)) return false;
        seenTypes.add(f.type);
      }
      const key = f.label.toLowerCase();
      if (seenLabels.has(key)) return false;
      seenLabels.add(key);
      return true;
    });

    const hasEmailCol = mappableFields.some(f => f.label.toLowerCase().includes('email'));
    const sampleData = [];
    for (let i = 1; i <= 5; i++) {
      const row: Record<string, unknown> = {};
      mappableFields.forEach(f => { row[f.label] = sampleValue(f, i); });
      if (!hasEmailCol) row['Email'] = `student${i}@example.com`;
      sampleData.push(row);
    }

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Recipients');
    XLSX.writeFile(wb, 'certificate_data_sample.xlsx');
  };

  const downloadSampleFileCSV = async () => {
    const XLSX = await getXlsx();

    const sampleValue = (field: CertificateField, i: number): string => {
      const t = field.type;
      if (t === 'name') return `John Doe ${i}`;
      if (t === 'course') return 'Web Development Fundamentals';
      if (t === 'start_date') return '01/15/2026';
      if (t === 'end_date') return '03/15/2026';
      const lower = field.label.toLowerCase();
      if (lower.includes('email')) return `student${i}@example.com`;
      if (lower.includes('grade') || lower.includes('score')) return `${85 + i}%`;
      if (lower.includes('date')) return `01/${String(i).padStart(2, '0')}/2026`;
      return `${field.label} ${i}`;
    };

    const allRawFields = templateGroups ? templateGroups.flatMap(g => g.fields) : fields;
    const seenTypes = new Set<string>();
    const seenLabels = new Set<string>();
    const mappableFields = allRawFields.filter(f => {
      if (f.type === 'qr_code' || f.type === 'image') return false;
      if (SEMANTIC_TYPES.has(f.type)) {
        if (seenTypes.has(f.type)) return false;
        seenTypes.add(f.type);
      }
      const key = f.label.toLowerCase();
      if (seenLabels.has(key)) return false;
      seenLabels.add(key);
      return true;
    });

    const hasEmailCol = mappableFields.some(f => f.label.toLowerCase().includes('email'));
    const headers = [...mappableFields.map(f => f.label), ...(hasEmailCol ? [] : ['Email'])];
    const rows: string[][] = [];
    for (let i = 1; i <= 5; i++) {
      const row = mappableFields.map(f => sampleValue(f, i));
      if (!hasEmailCol) row.push(`student${i}@example.com`);
      rows.push(row);
    }

    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'certificate_data_sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleMappingChange = (fieldId: string, columnName: string) => {
    const mappedField = fields.find((f) => f.id === fieldId);
    const fieldsToMap = mappedField && SEMANTIC_TYPES.has(mappedField.type)
      ? fields.filter((f) => f.type === mappedField.type)
      : fields.filter((f) => f.id === fieldId);

    const updated = [...fieldMappings];
    fieldsToMap.forEach((f) => {
      const idx = updated.findIndex((m) => m.fieldId === f.id);
      if (idx >= 0) updated[idx] = { ...updated[idx]!, columnName };
      else updated.push({ fieldId: f.id, columnName });
    });
    onMappingChange(updated);
  };

  const getMappedColumn = (fieldId: string) => {
    return fieldMappings.find((m) => m.fieldId === fieldId)?.columnName;
  };

  const handleManualDataSubmit = (data: ImportedData) => {
    onDataImport(data);
    setShowUpload(false);
    setIsManualEntry(true);

    const typeToColumn: Record<string, string> = {};
    data.headers.forEach((header) => {
      const matchedField = fields.find((f) =>
        header.toLowerCase().trim() === f.label.toLowerCase().trim()
      );
      if (matchedField && SEMANTIC_TYPES.has(matchedField.type)) {
        typeToColumn[matchedField.type] = header;
      }
    });

    const autoMappings = fields
      .filter((f) => f.type !== 'qr_code' && f.type !== 'image')
      .map((field) => {
        const labelMatch = data.headers.find(
          (h) => h.toLowerCase().trim() === field.label.toLowerCase().trim()
        );
        if (labelMatch) return { fieldId: field.id, columnName: labelMatch };
        if (SEMANTIC_TYPES.has(field.type) && typeToColumn[field.type]) {
          return { fieldId: field.id, columnName: typeToColumn[field.type]! };
        }
        return null;
      })
      .filter(Boolean) as FieldMapping[];

    onMappingChange(autoMappings);
  };

  const semanticFieldIds = templateGroups
    ? new Set(fields.filter(f => SEMANTIC_TYPES.has(f.type)).map(f => f.id))
    : new Set<string>();
  const columnUsageCount = fieldMappings.reduce<Record<string, number>>((acc, m) => {
    if (m.columnName && !semanticFieldIds.has(m.fieldId)) {
      acc[m.columnName] = (acc[m.columnName] ?? 0) + 1;
    }
    return acc;
  }, {});
  const duplicatedColumns = new Set(Object.entries(columnUsageCount).filter(([, count]) => count > 1).map(([col]) => col));

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header + Sample Download — only before data is imported */}
      {showUpload && (
        <>
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Import Recipient Data
            </h2>
            <p className="text-muted-foreground">
              Upload a spreadsheet or enter recipients manually
            </p>
          </div>

          <Card className="p-6 bg-primary/5 border-primary/20">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Download className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">Need a template?</h3>
                <p className="text-sm text-muted-foreground mb-1">
                  Download a sample spreadsheet pre-filled with your certificate field columns
                  {templateGroups && templateGroups.length > 1
                    ? ` (${templateGroups.length} templates combined, deduplicated)`
                    : ` (${fields.filter(f => f.type !== 'qr_code').length} field${fields.filter(f => f.type !== 'qr_code').length !== 1 ? 's' : ''})`
                  }.
                  Fill in your data and upload it back.
                </p>
                <p className="text-xs text-muted-foreground/70 mb-3">
                  Column headers match your field names exactly — including any renames you made in the designer.
                </p>
                <div className="flex gap-2">
                  <Button onClick={downloadSampleFile} variant="outline" size="sm" className="border-primary/30 hover:border-primary/60">
                    <Download className="w-4 h-4 mr-2" />
                    Download .xlsx
                  </Button>
                  <Button onClick={downloadSampleFileCSV} variant="outline" size="sm" className="border-primary/30 hover:border-primary/60">
                    <Download className="w-4 h-4 mr-2" />
                    Download .csv
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Saved Imports */}
      {savedImports.length > 0 && showUpload && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Recent Imports</h3>
          {loadImportError && (
            <p className="text-sm text-destructive mb-3">{loadImportError}</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedImports.map((importJob) => (
              <Card
                key={importJob.id}
                className="p-4 hover:shadow-md transition-all cursor-pointer group"
                onClick={async () => {
                  if (!onLoadImport) return;
                  setLoadImportError(null);
                  setIsProcessing(true);
                  try {
                    await onLoadImport(importJob.id);
                  } catch {
                    setLoadImportError('Failed to load import data. Please try again.');
                  } finally {
                    setIsProcessing(false);
                  }
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-muted-foreground shrink-0" />
                      <h4 className="font-medium truncate">{importJob.file_name}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(importJob.total_rows || 0).toLocaleString()} recipient{importJob.total_rows !== 1 ? 's' : ''}
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
        <div className="space-y-6">
          {/* Mode Toggle */}
          <div className="flex items-center justify-center gap-2 p-1 bg-muted rounded-lg w-fit mx-auto">
            <Button
              variant={entryMode === 'upload' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setEntryMode('upload')}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload File
            </Button>
            <Button
              variant={entryMode === 'manual' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setEntryMode('manual')}
              className="gap-2"
            >
              <Keyboard className="w-4 h-4" />
              Manual Entry
            </Button>
          </div>

          {entryMode === 'upload' ? (
            <div className="space-y-3">
              <Card className="border-2 border-dashed">
                <div
                  {...getRootProps()}
                  className={cn(
                    'p-12 text-center cursor-pointer transition-all',
                    isDragActive ? 'bg-primary/5' : 'hover:bg-muted/50',
                  )}
                >
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center gap-4">
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-16 h-16 text-primary animate-spin" />
                        <p className="text-sm text-muted-foreground">{processingStatus}</p>
                      </>
                    ) : isDragActive ? (
                      <>
                        <FileSpreadsheet className="w-16 h-16 text-primary" />
                        <p className="text-lg font-medium">Drop your file here</p>
                      </>
                    ) : (
                      <>
                        <div className="p-4 rounded-full bg-linear-to-br from-primary/10 to-primary/20">
                          <Upload className="w-12 h-12 text-primary" />
                        </div>
                        <div>
                          <p className="text-lg font-medium mb-1">Upload Spreadsheet</p>
                          <p className="text-sm text-muted-foreground">
                            Drop one file or up to 10 files at once — they&apos;ll be merged for generation
                          </p>
                          <p className="text-xs text-muted-foreground/60 mt-1">.csv, .tsv, .xlsx, .xls • Up to {MAX_DATA_FILE_MB} MB • Up to {MAX_ROWS.toLocaleString()} rows per file</p>
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
              {uploadError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{uploadError}</p>
                </div>
              )}
            </div>
          ) : (
            <ManualDataEntry
              fields={fields}
              onDataChange={(data) => { onDataImport(data); }}
              onDataSubmit={(data) => {
                setManualEditSeed(undefined);
                handleManualDataSubmit(data);
              }}
              initialData={manualEditSeed}
            />
          )}
        </div>
      ) : (
        // Show imported data with mapping
        <div className="space-y-6">
          {/* Full Data Preview */}
          {importedData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Data Preview</h3>
                <Button variant="outline" size="sm" onClick={() => {
                  if (isManualEntry) {
                    setEntryMode('manual');
                    setManualEditSeed(importedData ?? undefined);
                  } else {
                    setManualEditSeed(undefined);
                  }
                  setIsManualEntry(false);
                  setUploadError(null);
                  setShowUpload(true);
                  onDataImport(null);
                }}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  {isManualEntry ? 'Edit Entries' : (importedData?.importIds && importedData.importIds.length > 1 ? 'Change Files' : 'Change File')}
                </Button>
              </div>

              <DataPreview data={importedData} maxHeight="350px" />

              {importedData.rowCount >= WARN_ROWS && (
                <div className={`flex items-start gap-2 px-1 py-2 rounded-lg ${importedData.rowCount >= MAX_ROWS ? 'bg-orange-50 dark:bg-orange-950/20' : 'bg-blue-50 dark:bg-blue-950/20'}`}>
                  <Info className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${importedData.rowCount >= MAX_ROWS ? 'text-orange-500' : 'text-blue-500'}`} />
                  <p className="text-xs text-muted-foreground">
                    {importedData.rowCount.toLocaleString()} recipients detected.{' '}
                    {importedData.rowCount < MAX_ROWS
                      ? <>Generation will run as a background job and takes approximately <span className="font-medium text-foreground">~{Math.ceil(importedData.rowCount / 200)} min</span>. You can leave this page — you&apos;ll be notified when done.</>
                      : <>Maximum batch size is <span className="font-medium text-foreground">{MAX_ROWS.toLocaleString()} rows</span>. Please split your data into smaller files.</>
                    }
                  </p>
                </div>
              )}
              {importedData.rowCount < WARN_ROWS && importedData.rowCount > importedData.rows.length && (
                <div className="flex items-start gap-2 px-1">
                  <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    Preview shows first {importedData.rows.length} rows — all {importedData.rowCount.toLocaleString()} will be used for generation.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Column Mapping — only for file uploads, not manual entry */}
          {!isManualEntry && <Card className="p-6">
            <h3 className="font-semibold mb-1">Map Columns to Fields</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Match your spreadsheet columns to the certificate fields
              {templateGroups && templateGroups.length > 1 && ' — grouped by template'}
            </p>

            {templateGroups && templateGroups.length > 1 ? (
              <div className="space-y-5">
                {templateGroups.map((group, gi) => {
                  const mappableGroupFields = group.fields.filter(f => f.type !== 'qr_code' && f.type !== 'image');
                  if (mappableGroupFields.length === 0) return null;

                  const allMappableFields = templateGroups.flatMap(g => g.fields.filter(f => f.type !== 'qr_code' && f.type !== 'image'));
                  const typeCountMap: Record<string, number> = {};
                  allMappableFields.forEach(f => {
                    if (SEMANTIC_TYPES.has(f.type)) typeCountMap[f.type] = (typeCountMap[f.type] ?? 0) + 1;
                  });

                  return (
                    <div key={gi}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 rounded-full text-[11px] font-semibold text-primary">
                          <span className="w-3.5 h-3.5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[8px] font-bold">{gi + 1}</span>
                          {group.templateName}
                        </span>
                        <div className="flex-1 h-px bg-border/50" />
                        <span className="text-[10px] text-muted-foreground">
                          {mappableGroupFields.filter(f => getMappedColumn(f.id)).length}/{mappableGroupFields.length} mapped
                        </span>
                      </div>
                      <div className="space-y-2">
                        {mappableGroupFields.map((field) => {
                          const mappedColumn = getMappedColumn(field.id);
                          const isMapped = !!mappedColumn;
                          const isDuplicate = !!mappedColumn && duplicatedColumns.has(mappedColumn);
                          const isSynced = SEMANTIC_TYPES.has(field.type) && (typeCountMap[field.type] ?? 0) > 1;
                          return (
                            <div key={field.id} className={`flex items-center gap-4 p-3 rounded-lg ${isDuplicate ? 'bg-orange-50 dark:bg-orange-950/20' : 'bg-muted/30'}`}>
                              <div className="flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <Label className="text-sm font-medium">{field.label}</Label>
                                  {isSynced && (
                                    <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium" title="Mapping this field will automatically apply to the same field type in other templates">
                                      <Link2 className="w-2.5 h-2.5" />
                                      synced
                                    </span>
                                  )}
                                  {isDuplicate && <AlertCircle className="w-3.5 h-3.5 text-orange-500 shrink-0" />}
                                </div>
                                {mappedColumn && (
                                  <p className={`text-xs mt-0.5 ${isDuplicate ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'}`}>← {mappedColumn}{isDuplicate ? ' (shared)' : ''}</p>
                                )}
                              </div>
                              <div className="flex-1">
                                <Select
                                  value={mappedColumn || ''}
                                  onValueChange={(value: string) => handleMappingChange(field.id, value)}
                                >
                                  <SelectTrigger className={isDuplicate ? 'border-orange-400' : isMapped ? 'border-green-500' : ''}>
                                    <SelectValue placeholder="Select column…" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {importedData?.headers.map((header) => (
                                      <SelectItem key={header} value={header}>{header}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              {isMapped && !isDuplicate && <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />}
                              {isDuplicate && <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                {fields.filter(f => f.type !== 'qr_code' && f.type !== 'image').map((field) => {
                  const mappedColumn = getMappedColumn(field.id);
                  const isMapped = !!mappedColumn;
                  const isDuplicate = !!mappedColumn && duplicatedColumns.has(mappedColumn);
                  return (
                    <div key={field.id} className={`flex items-center gap-4 p-3 rounded-lg ${isDuplicate ? 'bg-orange-50 dark:bg-orange-950/20' : 'bg-muted/30'}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <Label className="text-sm font-medium">{field.label}</Label>
                          {isDuplicate && <AlertCircle className="w-3.5 h-3.5 text-orange-500 shrink-0" />}
                        </div>
                        {mappedColumn && (
                          <p className={`text-xs mt-0.5 ${isDuplicate ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'}`}>← {mappedColumn}{isDuplicate ? ' (shared)' : ''}</p>
                        )}
                      </div>
                      <div className="flex-1">
                        <Select
                          value={mappedColumn || ''}
                          onValueChange={(value: string) => handleMappingChange(field.id, value)}
                        >
                          <SelectTrigger className={isDuplicate ? 'border-orange-400' : isMapped ? 'border-green-500' : ''}>
                            <SelectValue placeholder="Select column..." />
                          </SelectTrigger>
                          <SelectContent>
                            {importedData?.headers.map((header) => (
                              <SelectItem key={header} value={header}>{header}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {isMapped && !isDuplicate && <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />}
                      {isDuplicate && <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            )}

            {duplicatedColumns.size > 0 && (
              <div className="mt-4 flex gap-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
                <AlertCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-medium text-orange-900 dark:text-orange-100">Duplicate column mapping</p>
                  <p className="text-orange-700 dark:text-orange-300 mt-0.5">
                    <span className="font-medium">{[...duplicatedColumns].join(', ')}</span> {duplicatedColumns.size === 1 ? 'is' : 'are'} mapped to more than one field. Each field will receive the same value — make sure this is intentional.
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6 p-4 bg-linear-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    Mapping Status: {fieldMappings.length} of {fields.filter(f => f.type !== 'qr_code' && f.type !== 'image').length} fields mapped
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                    {fieldMappings.length === fields.filter(f => f.type !== 'qr_code' && f.type !== 'image').length
                      ? 'All fields are mapped! Ready to generate certificates.'
                      : 'Unmapped fields will be left empty in the certificates.'}
                  </p>
                </div>
              </div>
            </div>
          </Card>}

          {/* Add manual entries accordion — only shown when there's already a file upload */}
          {!isManualEntry && onAdditionalRows && (
            <div className="border border-border rounded-lg overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
                onClick={() => setShowAdditionalRows(v => !v)}
              >
                <div className="flex items-center gap-2.5">
                  <Plus className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Add manual entries</span>
                  {additionalRows && additionalRows.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {additionalRows.length} {additionalRows.length === 1 ? 'entry' : 'entries'}
                    </Badge>
                  )}
                </div>
                <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', showAdditionalRows && 'rotate-180')} />
              </button>
              {showAdditionalRows && (
                <div className="border-t border-border p-5">
                  <p className="text-xs text-muted-foreground mb-4">
                    These entries will be appended after your uploaded file rows during generation.
                  </p>
                  <ManualDataEntry
                    fields={fields}
                    onDataChange={(data) => onAdditionalRows(data.rows)}
                    onDataSubmit={(data) => {
                      onAdditionalRows(data.rows);
                      setShowAdditionalRows(false);
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Continue to Generate Button */}
          {onContinueToGenerate && !!importedData && (
            <div className="flex justify-end">
              <Button size="lg" onClick={onContinueToGenerate} className="gap-2">
                Continue to Generate
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
