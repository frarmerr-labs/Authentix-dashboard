'use client';

import { useState } from 'react';
import { CertificateTemplate, CertificateField, ImportedData, FieldMapping } from '@/lib/types/certificate';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Download, Loader2, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';
import { ExpiryDateSelector, type ExpiryType } from './ExpiryDateSelector';
import { CertificateTable, type GeneratedCertificate } from './CertificateTable';

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
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'generating' | 'completed' | 'error'>('idle');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  // Expiry settings
  const [expiryType, setExpiryType] = useState<ExpiryType>('year');
  const [customExpiryDate, setCustomExpiryDate] = useState<string>('');
  const [issueDate, setIssueDate] = useState<string>('');
  const [useCustomIssueDate, setUseCustomIssueDate] = useState(false);

  // Generated certificates for table display
  const [generatedCertificates, setGeneratedCertificates] = useState<GeneratedCertificate[]>([]);
  const [totalGenerated, setTotalGenerated] = useState(0);

  // Detect if template has QR code field
  const hasQrCodeField = fields.some(f => f.type === 'qr_code');

  const handleGenerate = async () => {
    if (!template || !importedData || !template.id) return;

    setIsGenerating(true);
    setGenerationStatus('generating');
    setProgress(0);
    setGeneratedCertificates([]);
    setTotalGenerated(0);

    try {
      // Build options with expiry settings
      const options: {
        includeQR: boolean;
        expiry_type: ExpiryType;
        custom_expiry_date?: string;
        issue_date?: string;
      } = {
        includeQR: hasQrCodeField, // Auto-detect from fields
        expiry_type: expiryType,
      };

      // Add custom expiry date if selected
      if (expiryType === 'custom' && customExpiryDate) {
        options.custom_expiry_date = new Date(customExpiryDate).toISOString();
      }

      // Add custom issue date if selected
      if (useCustomIssueDate && issueDate) {
        options.issue_date = new Date(issueDate).toISOString();
      }

      // Prepare the payload for backend API
      const result = await api.certificates.generate({
        template_id: template.id,
        data: importedData.rows,
        field_mappings: fieldMappings,
        options,
      });

      // Handle response with individual certificates
      if (result.certificates && result.certificates.length > 0) {
        // Map backend response to our GeneratedCertificate interface
        const certs: GeneratedCertificate[] = result.certificates.map((cert: any) => ({
          id: cert.id,
          certificate_number: cert.certificate_number,
          recipient_name: cert.recipient_name,
          recipient_email: cert.recipient_email || null,
          issued_at: cert.issued_at,
          expires_at: cert.expires_at || null,
          download_url: cert.download_url || null,
          preview_url: cert.preview_url || null,
        }));

        setGeneratedCertificates(certs);
        setTotalGenerated(result.total_certificates || certs.length);
      }

      // Set ZIP download URL if available (for > 10 certificates)
      const downloadLink = result.zip_download_url ?? result.download_url;
      setDownloadUrl(downloadLink ?? null);
      setGenerationStatus('completed');
      setProgress(100);
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

  // Handle expiry change
  const handleExpiryChange = (type: ExpiryType, customDate?: string) => {
    setExpiryType(type);
    if (customDate !== undefined) {
      setCustomExpiryDate(customDate);
    }
  };

  return (
    <div className="space-y-6">
      {/* Generated Certificates Table - Show at top when completed */}
      {generationStatus === 'completed' && generatedCertificates.length > 0 && (
        <CertificateTable
          certificates={generatedCertificates}
          zipDownloadUrl={downloadUrl}
          totalCount={totalGenerated}
        />
      )}

      {/* Generation Settings - Hide when completed */}
      {generationStatus !== 'completed' && (
        <>
          {/* Expiry Date Settings */}
          <ExpiryDateSelector
            value={expiryType}
            customDate={customExpiryDate}
            issueDate={useCustomIssueDate ? issueDate : undefined}
            onChange={handleExpiryChange}
          />

          {/* Issue Date Settings */}
          <Card className="p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <Label className="text-sm font-medium">Issue Date</Label>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="issueDate"
                    checked={!useCustomIssueDate}
                    onChange={() => setUseCustomIssueDate(false)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Today (generation date)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="issueDate"
                    checked={useCustomIssueDate}
                    onChange={() => setUseCustomIssueDate(true)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Custom date</span>
                </label>
              </div>

              {useCustomIssueDate && (
                <Input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="max-w-xs"
                />
              )}
            </div>
          </Card>
        </>
      )}

      {/* Warnings - Show before generation */}
      {generationStatus !== 'completed' && unmappedFields.length > 0 && (
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

      {/* Summary - Show before generation */}
      {generationStatus !== 'completed' && (
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
            {hasQrCodeField && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">QR Code:</span>
                <span className="font-medium text-green-600">Included (from design)</span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Generate Button - Show before generation */}
      {generationStatus !== 'completed' && (
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
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Generate Certificates
            </>
          )}
        </Button>
      )}

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

      {/* Generate More Button - Show after completion */}
      {generationStatus === 'completed' && (
        <div className="flex gap-3">
          <Button
            className="flex-1"
            variant="outline"
            onClick={() => {
              setGenerationStatus('idle');
              setGeneratedCertificates([]);
              setTotalGenerated(0);
              setDownloadUrl(null);
            }}
          >
            Generate More Certificates
          </Button>
        </div>
      )}
    </div>
  );
}
