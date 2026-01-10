'use client';

import { useState } from 'react';
import { CertificateTemplate, CertificateField, ImportedData, FieldMapping } from '@/lib/types/certificate';
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

export function ExportSection({ template, fields, importedData, fieldMappings }: ExportSectionProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState('certificates');
  const [includeQR, setIncludeQR] = useState(true);
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'generating' | 'completed' | 'error'>('idle');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!template || !importedData) return;

    setIsGenerating(true);
    setGenerationStatus('generating');
    setProgress(0);

    try {
      // Prepare the payload
      const payload = {
        template: {
          fileUrl: template.fileUrl,
          fileType: template.fileType,
          pdfWidth: template.pdfWidth,
          pdfHeight: template.pdfHeight,
          fields: fields,
        },
        data: importedData.rows,
        fieldMappings,
        options: {
          includeQR,
          fileName,
        },
      };

      // Call the API to generate certificates
      const response = await fetch('/api/certificates/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to generate certificates');
      }

      const result = await response.json();

      // If background job, poll for status
      if (result.jobId) {
        await pollJobStatus(result.jobId);
      } else if (result.downloadUrl) {
        setDownloadUrl(result.downloadUrl);
        setGenerationStatus('completed');
        setProgress(100);
      }
    } catch (error) {
      console.error('Generation error:', error);
      setGenerationStatus('error');
      alert('Failed to generate certificates. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/certificates/generate/${jobId}`);
        const job = await response.json();

        setProgress((job.processedCertificates / job.totalCertificates) * 100);

        if (job.status === 'completed') {
          clearInterval(pollInterval);
          setDownloadUrl(job.downloadUrl);
          setGenerationStatus('completed');
          setProgress(100);
          setIsGenerating(false);
        } else if (job.status === 'failed') {
          clearInterval(pollInterval);
          setGenerationStatus('error');
          setIsGenerating(false);
          alert('Generation failed: ' + job.errorMessage);
        }
      } catch (error) {
        clearInterval(pollInterval);
        setGenerationStatus('error');
        setIsGenerating(false);
      }
    }, 2000); // Poll every 2 seconds
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
            <span className="font-medium">Individual PDFs (ZIP)</span>
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
