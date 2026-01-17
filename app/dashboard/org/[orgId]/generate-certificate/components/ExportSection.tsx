'use client';

import { useState } from 'react';
import { CertificateTemplate, CertificateField, ImportedData, FieldMapping } from '@/lib/types/certificate';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface ExportSectionProps {
  template: CertificateTemplate | null;
  fields: CertificateField[];
  importedData: ImportedData | null;
  fieldMappings: FieldMapping[];
}

/**
 * Get the output format description based on template type
 */
function getExportFormatDescription(template: CertificateTemplate | null): string {
  if (!template) return 'Individual Files (ZIP)';

  // If the template is a PDF, output as PDF
  // If the template is an image (PNG, JPEG, WebP), output as the same image format
  if (template.fileType === 'pdf') {
    return 'Individual PDFs (ZIP)';
  }

  // For images, determine the format from the file URL or type
  const fileUrl = template.fileUrl?.toLowerCase() || '';
  if (fileUrl.endsWith('.png')) {
    return 'Individual PNG Images (ZIP)';
  } else if (fileUrl.endsWith('.webp')) {
    return 'Individual WebP Images (ZIP)';
  } else {
    return 'Individual JPEG Images (ZIP)';
  }
}

export function ExportSection({ template, fields, importedData, fieldMappings }: ExportSectionProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState('certificates');
  const [includeQR, setIncludeQR] = useState(true);
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'generating' | 'completed' | 'error'>('idle');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!template || !importedData || !template.id) return;

    setIsGenerating(true);
    setGenerationStatus('generating');
    setProgress(0);

    try {
      // Prepare the payload for backend API
      const result = await api.certificates.generate({
        template_id: template.id,
        data: importedData.rows,
        field_mappings: fieldMappings,
        options: {
          includeQR,
          fileName,
        },
      });

      // If background job, poll for status (future: implement job status endpoint)
      const downloadLink = result.download_url ?? result.zip_url;
      if (result.job_id) {
        // For now, assume synchronous completion
        // TODO: Implement job status polling when backend supports it
        setDownloadUrl(downloadLink ?? null);
        setGenerationStatus('completed');
        setProgress(100);
      } else if (downloadLink) {
        setDownloadUrl(downloadLink);
        setGenerationStatus('completed');
        setProgress(100);
      } else {
        throw new Error('No download URL returned');
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      setGenerationStatus('error');
      alert(`Failed to generate certificates: ${error.message || 'Please try again.'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const canGenerate = template && importedData && fieldMappings.length > 0;

  const unmappedFields = fields
    .filter((f) => f.type !== 'qr_code' && f.type !== 'custom_text')
    .filter((f) => !fieldMappings.find((m) => m.fieldId === f.id));

  return (
    <div className="space-y-4">
      {/* Export Settings */}
      <div className="space-y-3">
        <div>
          <Label htmlFor="fileName" className="text-sm">File Name</Label>
          <Input
            id="fileName"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="certificates"
            className="mt-1.5"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Output: {fileName || 'certificates'}.zip
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="includeQR" className="text-sm">Include QR Code</Label>
            <p className="text-xs text-muted-foreground">Add verification QR code to each certificate</p>
          </div>
          <Switch
            id="includeQR"
            checked={includeQR}
            onCheckedChange={setIncludeQR}
          />
        </div>
      </div>

      {/* Warnings */}
      {unmappedFields.length > 0 && (
        <Card className="p-3 bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
          <div className="flex gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-medium text-yellow-900 dark:text-yellow-100">Unmapped Fields</p>
              <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                {unmappedFields.map((f) => f.label).join(', ')} {unmappedFields.length === 1 ? 'is' : 'are'} not mapped and will be left empty.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Summary */}
      <Card className="p-4 bg-muted/50">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Certificates:</span>
            <span className="font-medium">{importedData?.rowCount || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Mapped Fields:</span>
            <span className="font-medium">
              {fieldMappings.length} / {fields.filter((f) => f.type !== 'qr_code' && f.type !== 'custom_text').length}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Export Format:</span>
            <span className="font-medium">{getExportFormatDescription(template)}</span>
          </div>
        </div>
      </Card>

      {/* Generate Button */}
      <Button
        className="w-full"
        size="lg"
        disabled={!canGenerate || isGenerating}
        onClick={handleGenerate}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating... {Math.round(progress)}%
          </>
        ) : generationStatus === 'completed' ? (
          <>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Generated Successfully
          </>
        ) : (
          <>
            <Download className="w-4 h-4 mr-2" />
            Generate Certificates
          </>
        )}
      </Button>

      {/* Progress Bar */}
      {isGenerating && (
        <div className="space-y-2">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-center text-muted-foreground">
            Processing {Math.round(progress)}%...
          </p>
        </div>
      )}

      {/* Download Button */}
      {generationStatus === 'completed' && downloadUrl && (
        <Button
          className="w-full"
          variant="outline"
          size="lg"
          asChild
        >
          <a href={downloadUrl} download>
            <Download className="w-4 h-4 mr-2" />
            Download ZIP File
          </a>
        </Button>
      )}
    </div>
  );
}
