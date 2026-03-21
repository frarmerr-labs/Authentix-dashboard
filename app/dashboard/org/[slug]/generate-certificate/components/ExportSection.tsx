'use client';

import { useState, useRef } from 'react';
import { CertificateTemplate, CertificateField, ImportedData, FieldMapping } from '@/lib/types/certificate';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { format, isValid } from 'date-fns';
import {
  Download, Loader2, CheckCircle2, AlertCircle, Calendar, Plus, X,
  FileText, ChevronDown, ChevronUp, Settings2, Eye, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ExpiryDateSelector, type ExpiryType } from './ExpiryDateSelector';
import { CertificateTable, type GeneratedCertificate } from './CertificateTable';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CertificateConfig {
  /** Unique key for this config within the list */
  key: string;
  template: CertificateTemplate;
  fields: CertificateField[];
  fieldMappings: FieldMapping[];
  /** Display label set by the user, e.g. "Course Completion" */
  label: string;
}

interface ExportSectionProps {
  /** Primary (first) template – required */
  template: CertificateTemplate | null;
  fields: CertificateField[];
  importedData: ImportedData | null;
  fieldMappings: FieldMapping[];
  /** All saved templates so user can pick additional ones */
  savedTemplates?: any[];
  /** Additional certificate configurations added by the user */
  additionalConfigs?: CertificateConfig[];
  onAdditionalConfigsChange?: (configs: CertificateConfig[]) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getExportFormatDescription(template: CertificateTemplate | null): string {
  if (!template) return 'ZIP';
  if (template.fileType === 'pdf') return 'PDF';
  return 'PNG';
}

// Auto-map imported data headers to a template's fields.
// Uses exact label match first, then type-based fallback so renamed fields
// (e.g. "Student Name" vs "Recipient Name") still resolve correctly.
function autoMapForTemplate(
  fields: CertificateField[],
  headers: string[]
): FieldMapping[] {
  const mappings: FieldMapping[] = [];
  fields.forEach((field) => {
    const match = headers.find((h) => {
      const nh = h.toLowerCase().trim();
      const nl = field.label.toLowerCase().trim();
      if (nh === nl) return true;
      // Type-based fallback for semantic fields
      if (field.type === 'name' && nh.includes('name')) return true;
      if (field.type === 'course' && (nh.includes('course') || nh.includes('program'))) return true;
      if (field.type === 'start_date' && (nh.includes('start') || nh.includes('issue'))) return true;
      if (field.type === 'end_date' && (nh.includes('end') || nh.includes('expir'))) return true;
      return false;
    });
    if (match) mappings.push({ fieldId: field.id, columnName: match });
  });
  return mappings;
}

// ── Sub-component: single template config row ─────────────────────────────────

interface ConfigRowProps {
  config: CertificateConfig;
  importedData: ImportedData | null;
  index: number;
  onRemove: () => void;
  onMappingChange: (fieldId: string, column: string) => void;
  onLabelChange: (label: string) => void;
}

function ConfigRow({ config, importedData, index, onRemove, onMappingChange, onLabelChange }: ConfigRowProps) {
  const [expanded, setExpanded] = useState(false);
  const mappableFields = config.fields.filter(f => f.type !== 'qr_code' && f.type !== 'custom_text' && f.type !== 'image');
  const mappedCount = config.fieldMappings.length;

  return (
    <Card className="overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 p-3">
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <input
            className="text-sm font-medium bg-transparent border-none outline-none w-full placeholder:text-muted-foreground/50"
            value={config.label}
            placeholder={`Certificate Type ${index + 1}`}
            onChange={e => onLabelChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground truncate">{config.template.templateName}</p>
        </div>
        <Badge variant="outline" className={`text-xs shrink-0 ${mappedCount === mappableFields.length && mappedCount > 0 ? 'border-green-500 text-green-600' : ''}`}>
          {mappedCount}/{mappableFields.length} mapped
        </Badge>
        <button
          className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          onClick={() => setExpanded(v => !v)}
          title={expanded ? 'Collapse mappings' : 'Edit field mappings'}
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <Settings2 className="w-4 h-4" />}
        </button>
        {index > 0 && (
          <button
            className="p-1 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            title="Remove this certificate type"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Expanded field mapping */}
      {expanded && (
        <div className="border-t p-3 space-y-2 bg-muted/20">
          {mappableFields.length === 0 ? (
            <p className="text-xs text-muted-foreground">No mappable fields on this template.</p>
          ) : (
            mappableFields.map(field => {
              const mapped = config.fieldMappings.find(m => m.fieldId === field.id)?.columnName;
              return (
                <div key={field.id} className="flex items-center gap-3">
                  <Label className="text-xs w-32 shrink-0 truncate" title={field.label}>{field.label}</Label>
                  <Select
                    value={mapped || ''}
                    onValueChange={val => onMappingChange(field.id, val)}
                  >
                    <SelectTrigger className={`h-7 text-xs ${mapped ? 'border-green-500' : ''}`}>
                      <SelectValue placeholder="Select column…" />
                    </SelectTrigger>
                    <SelectContent>
                      {(importedData?.headers ?? []).map(h => (
                        <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {mapped && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                </div>
              );
            })
          )}
        </div>
      )}
    </Card>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function ExportSection({
  template,
  fields,
  importedData,
  fieldMappings,
  savedTemplates = [],
  additionalConfigs = [],
  onAdditionalConfigsChange,
}: ExportSectionProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [simulatedCount, setSimulatedCount] = useState(0);
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'generating' | 'completed' | 'error'>('idle');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewImageLoaded, setPreviewImageLoaded] = useState(false);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Expiry settings
  const [expiryType, setExpiryType] = useState<ExpiryType>('year');
  const [customExpiryDate, setCustomExpiryDate] = useState<string>('');
  const [issueDate, setIssueDate] = useState<string>('');
  const [useCustomIssueDate, setUseCustomIssueDate] = useState(false);

  // Generated certificates
  const [generatedCertificates, setGeneratedCertificates] = useState<GeneratedCertificate[]>([]);
  const [totalGenerated, setTotalGenerated] = useState(0);
  const [generationSummary, setGenerationSummary] = useState<Array<{ label: string; count: number }>>([]);

  // Template picker for adding extra configs
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [loadingTemplateId, setLoadingTemplateId] = useState<string | null>(null);

  const hasQrCodeField = fields.some(f => f.type === 'qr_code');
  // Fields that actually require a CSV column mapping (excludes auto-rendered types)
  const mappableFields = fields.filter(f => f.type !== 'qr_code' && f.type !== 'custom_text' && f.type !== 'image');
  // Allow generation even when there are 0 mappable fields (e.g. image/QR-only templates)
  const allMappableFieldsMapped = mappableFields.every(f => fieldMappings.some(m => m.fieldId === f.id));
  const canGenerate = !!(template && importedData && template.id && allMappableFieldsMapped);

  // All configs including the primary one (for unified rendering)
  const allConfigs: CertificateConfig[] = [
    {
      key: '__primary__',
      template: template!,
      fields,
      fieldMappings,
      label: template?.templateName || 'Certificate',
    },
    ...additionalConfigs,
  ];

  // ── Add a template as extra config ────────────────────────────────────────
  const handleAddTemplate = async (savedTemplate: any) => {
    setLoadingTemplateId(savedTemplate.id);
    try {
      const editorData = await api.templates.getEditorData(savedTemplate.id);
      const templateFields: CertificateField[] = (editorData?.fields ?? []).map((f: any) => ({
        id: f.id || f.field_key,
        type: f.type === 'qrcode' ? 'qr_code' : f.type === 'date' ? 'start_date' : 'custom_text',
        label: f.label,
        x: f.x,
        y: f.y,
        width: f.width || 200,
        height: f.height || 30,
        fontSize: (f.style as any)?.fontSize || 16,
        fontFamily: (f.style as any)?.fontFamily || 'Helvetica',
        color: (f.style as any)?.color || '#000000',
        fontWeight: (f.style as any)?.fontWeight || '400',
        fontStyle: (f.style as any)?.fontStyle || 'normal',
        textAlign: (f.style as any)?.textAlign || 'left',
      }));

      const autoMappings = autoMapForTemplate(templateFields, importedData?.headers ?? []);

      const newConfig: CertificateConfig = {
        key: crypto.randomUUID(),
        template: {
          id: savedTemplate.id,
          templateName: savedTemplate.title || savedTemplate.name,
          fileUrl: savedTemplate.preview_url || '',
          fileType: savedTemplate.file_type === 'pdf' ? 'pdf' : 'image',
          pdfWidth: savedTemplate.width || 800,
          pdfHeight: savedTemplate.height || 600,
          fields: templateFields,
        },
        fields: templateFields,
        fieldMappings: autoMappings,
        label: savedTemplate.title || savedTemplate.name || `Certificate ${additionalConfigs.length + 2}`,
      };

      onAdditionalConfigsChange?.([...additionalConfigs, newConfig]);
    } catch (err) {
      console.error('Failed to load template fields:', err);
    } finally {
      setLoadingTemplateId(null);
      setShowTemplatePicker(false);
    }
  };

  const handleRemoveConfig = (key: string) => {
    onAdditionalConfigsChange?.(additionalConfigs.filter(c => c.key !== key));
  };

  const handleConfigMappingChange = (key: string, fieldId: string, column: string) => {
    onAdditionalConfigsChange?.(
      additionalConfigs.map(c =>
        c.key !== key ? c : {
          ...c,
          fieldMappings: c.fieldMappings.find(m => m.fieldId === fieldId)
            ? c.fieldMappings.map(m => m.fieldId === fieldId ? { ...m, columnName: column } : m)
            : [...c.fieldMappings, { fieldId, columnName: column }],
        }
      )
    );
  };

  const handleConfigLabelChange = (key: string, label: string) => {
    onAdditionalConfigsChange?.(additionalConfigs.map(c => c.key !== key ? c : { ...c, label }));
  };

  // ── Preview first row ────────────────────────────────────────────────────────
  const handlePreviewFirstRow = async () => {
    if (!template?.id || !importedData?.rows.length) return;
    setIsPreviewing(true);
    try {
      const options: any = { includeQR: hasQrCodeField, expiry_type: expiryType };
      if (expiryType === 'custom' && customExpiryDate) options.custom_expiry_date = new Date(customExpiryDate).toISOString();

      // Preview first row across all configs (primary + additional)
      const configsToPreview = allConfigs.filter(c => c.template?.id);
      const urls: string[] = [];
      for (const cfg of configsToPreview) {
        const result = await api.certificates.generate({
          template_id: cfg.template.id!,
          data: [importedData.rows[0]!],
          field_mappings: cfg.fieldMappings,
          options,
        });
        const url = result.certificates?.[0]?.preview_url ?? result.certificates?.[0]?.download_url;
        if (url) urls.push(url);
      }
      if (urls.length > 0) {
        setPreviewUrls(urls);
        setPreviewIndex(0);
        setPreviewImageLoaded(false);
        setPreviewModalOpen(true);
      }
    } catch (err) {
      console.error('Preview generation failed:', err);
    } finally {
      setIsPreviewing(false);
    }
  };

  // ── Generate ────────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!template || !importedData || !template.id) return;

    setIsGenerating(true);
    setGenerationStatus('generating');
    setProgress(0);
    setSimulatedCount(0);
    setProgressLabel('');
    setGeneratedCertificates([]);
    setTotalGenerated(0);
    setGenerationSummary([]);

    const options: {
      includeQR: boolean;
      expiry_type: ExpiryType;
      custom_expiry_date?: string;
      issue_date?: string;
    } = {
      includeQR: hasQrCodeField,
      expiry_type: expiryType,
    };
    if (expiryType === 'custom' && customExpiryDate) {
      options.custom_expiry_date = new Date(customExpiryDate).toISOString();
    }
    if (useCustomIssueDate && issueDate) {
      options.issue_date = new Date(issueDate).toISOString();
    }

    const configsToRun = allConfigs.filter(c => c.template?.id);
    const totalRows = importedData.rowCount;
    const allCerts: GeneratedCertificate[] = [];
    const summary: Array<{ label: string; count: number }> = [];
    let lastZipUrl: string | null = null;

    for (let i = 0; i < configsToRun.length; i++) {
      const cfg = configsToRun[i]!;

      // Per-template progress label
      const templateLabel = configsToRun.length > 1
        ? `Template ${i + 1} of ${configsToRun.length}: ${cfg.label} — ${totalRows} recipient${totalRows !== 1 ? 's' : ''}`
        : `Generating ${totalRows} certificate${totalRows !== 1 ? 's' : ''}…`;
      setProgressLabel(templateLabel);

      // Simulate time-based progress while the API call is in-flight
      const templateBaseProgress = (i / configsToRun.length) * 100;
      const templateProgressShare = (1 / configsToRun.length) * 100;
      const estimatedMs = Math.max(3000, totalRows * 150);
      const tickMs = 200;
      let elapsed = 0;
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      progressTimerRef.current = setInterval(() => {
        elapsed += tickMs;
        const frac = Math.min(elapsed / estimatedMs, 0.92);
        const within = frac * templateProgressShare * 0.9;
        setProgress(Math.round(templateBaseProgress + within));
        setSimulatedCount(Math.max(1, Math.round(frac * totalRows)));
      }, tickMs);

      try {
        const result = await api.certificates.generate({
          template_id: cfg.template.id!,
          data: importedData.rows,
          field_mappings: cfg.fieldMappings,
          options,
        });

        if (result.certificates?.length) {
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
          allCerts.push(...certs);
          summary.push({ label: cfg.label, count: certs.length });
        }
        if (result.zip_download_url ?? result.download_url) {
          lastZipUrl = result.zip_download_url ?? result.download_url ?? null;
        }
      } catch (err: any) {
        console.error(`Generation failed for config "${cfg.label}":`, err);
        summary.push({ label: cfg.label, count: 0 });
      }

      // Complete this template's progress segment
      if (progressTimerRef.current) { clearInterval(progressTimerRef.current); progressTimerRef.current = null; }
      setSimulatedCount(totalRows);
      setProgress(Math.round(((i + 1) / configsToRun.length) * 100));
    }

    setProgressLabel('');
    setGeneratedCertificates(allCerts);
    setTotalGenerated(allCerts.length);
    setGenerationSummary(summary);
    setDownloadUrl(lastZipUrl);
    setGenerationStatus(allCerts.length > 0 ? 'completed' : 'error');
    setIsGenerating(false);
  };

  const handleExpiryChange = (type: ExpiryType, customDate?: string) => {
    setExpiryType(type);
    if (customDate !== undefined) setCustomExpiryDate(customDate);
  };

  const unmappedFields = fields
    .filter(f => f.type !== 'qr_code' && f.type !== 'custom_text' && f.type !== 'image')
    .filter(f => !fieldMappings.find(m => m.fieldId === f.id));

  // ── Render ──────────────────────────────────────────────────────────────────

  // Generation animation — clean modern card stack
  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 select-none">
        {/* Stacked certificate cards */}
        <div className="relative w-56 h-36">
          {/* Back cards */}
          {[2, 1].map((i) => (
            <div
              key={i}
              className="absolute inset-0 rounded-2xl border bg-card"
              style={{
                transform: `translate(${i * 5}px, ${i * 5}px) rotate(${i * 2}deg)`,
                opacity: 0.5 - i * 0.1,
              }}
            />
          ))}
          {/* Front card — animates content */}
          <div className="absolute inset-0 rounded-2xl border border-primary/30 bg-card shadow-xl overflow-hidden">
            {/* Shimmer sweep */}
            <div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/8 to-transparent"
              style={{
                transform: `translateX(${(progress / 100) * 200 - 100}%)`,
                transition: 'transform 0.5s ease-out',
              }}
            />
            <div className="p-5 space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                </div>
                <div className="h-2 bg-muted rounded-full animate-pulse flex-1" />
              </div>
              <div className="h-1.5 bg-muted/70 rounded-full animate-pulse" style={{ width: '75%', animationDelay: '0.1s' }} />
              <div className="h-1.5 bg-muted/50 rounded-full animate-pulse" style={{ width: '55%', animationDelay: '0.2s' }} />
              <div className="mt-3 flex gap-2">
                <div className="h-1.5 bg-primary/20 rounded-full animate-pulse flex-1" style={{ animationDelay: '0.3s' }} />
                <div className="h-1.5 bg-primary/20 rounded-full animate-pulse flex-1" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
            {/* Progress fill from bottom */}
            <div
              className="absolute bottom-0 left-0 right-0 bg-primary/10 transition-all duration-500 ease-out"
              style={{ height: `${progress}%` }}
            />
          </div>
          {/* Progress badge */}
          <div className="absolute -top-3 -right-3 h-9 w-9 rounded-full bg-primary flex items-center justify-center shadow-lg ring-2 ring-background">
            <span className="text-[11px] font-bold text-primary-foreground tabular-nums">{progress}%</span>
          </div>
        </div>

        {/* Labels */}
        <div className="text-center space-y-1.5">
          <p className="text-sm font-semibold">{progressLabel || 'Generating certificates…'}</p>
          <p className="text-xs text-muted-foreground">
            {simulatedCount > 0
              ? `${simulatedCount} of ${importedData?.rowCount ?? '?'} processed`
              : 'Starting generation…'}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-xs space-y-1.5">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground/60 tabular-nums">
            <span>{progress}%</span>
            <span>Please keep this page open</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Results table */}
      {generationStatus === 'completed' && generatedCertificates.length > 0 && (
        <div className="space-y-4">
          {/* Per-template summary */}
          {generationSummary.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {generationSummary.map((s, i) => (
                <Badge key={i} variant="outline" className="gap-1.5">
                  <FileText className="w-3 h-3" />
                  {s.label}: {s.count} certificate{s.count !== 1 ? 's' : ''}
                </Badge>
              ))}
            </div>
          )}
          <CertificateTable
            certificates={generatedCertificates}
            zipDownloadUrl={downloadUrl}
            totalCount={totalGenerated}
            isImageTemplate={template?.fileType !== 'pdf'}
          />
        </div>
      )}

      {/* Settings — hidden after completion */}
      {generationStatus !== 'completed' && (
        <>
          {/* ── Multi-certificate configuration ── */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Certificate Types</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Generate multiple certificate types from the same data in one click.
                </p>
              </div>
              <Badge variant="secondary" className="text-xs">
                {allConfigs.filter(c => c.template?.id).length} type{allConfigs.filter(c => c.template?.id).length !== 1 ? 's' : ''}
              </Badge>
            </div>

            <div className="space-y-2">
              {/* Primary config */}
              {template && (
                <ConfigRow
                  config={allConfigs[0]!}
                  importedData={importedData}
                  index={0}
                  onRemove={() => {}}
                  onMappingChange={() => {}}
                  onLabelChange={() => {}}
                />
              )}

              {/* Additional configs */}
              {additionalConfigs.map((cfg, idx) => (
                <ConfigRow
                  key={cfg.key}
                  config={cfg}
                  importedData={importedData}
                  index={idx + 1}
                  onRemove={() => handleRemoveConfig(cfg.key)}
                  onMappingChange={(fieldId, col) => handleConfigMappingChange(cfg.key, fieldId, col)}
                  onLabelChange={(label) => handleConfigLabelChange(cfg.key, label)}
                />
              ))}
            </div>

            {/* Add template picker */}
            {showTemplatePicker ? (
              <div className="border rounded-lg p-3 space-y-2 bg-muted/20">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">Select a saved template</p>
                  <button
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => setShowTemplatePicker(false)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {savedTemplates.filter(t => t.id !== template?.id).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No other saved templates found.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {savedTemplates
                      .filter(t => t.id && t.id !== template?.id && !additionalConfigs.find(c => c.template.id === t.id))
                      .map(t => (
                        <button
                          key={t.id}
                          disabled={loadingTemplateId === t.id}
                          onClick={() => handleAddTemplate(t)}
                          className="flex items-center gap-2 p-2 text-left rounded-md border border-border/50 hover:bg-muted/50 transition-colors text-xs"
                        >
                          {loadingTemplateId === t.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                            : <FileText className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                          }
                          <span className="truncate">{t.title || t.name}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 border-dashed"
                onClick={() => setShowTemplatePicker(true)}
              >
                <Plus className="w-4 h-4" />
                Add Another Certificate Type
              </Button>
            )}
          </Card>

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
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-sm">Today (generation date)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="issueDate"
                    checked={useCustomIssueDate}
                    onChange={() => setUseCustomIssueDate(true)}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-sm">Custom date</span>
                </label>
              </div>
              {useCustomIssueDate && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      data-empty={!issueDate}
                      className="w-[212px] justify-between font-normal data-[empty=true]:text-muted-foreground"
                    >
                      {issueDate && isValid(new Date(issueDate))
                        ? format(new Date(issueDate), 'PPP')
                        : <span>Pick a date</span>}
                      <ChevronDown />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start" sideOffset={4}>
                    <CalendarPicker
                      mode="single"
                      selected={issueDate && isValid(new Date(issueDate)) ? new Date(issueDate) : undefined}
                      onSelect={(d) => setIssueDate(d ? format(d, 'yyyy-MM-dd') : '')}
                      defaultMonth={issueDate && isValid(new Date(issueDate)) ? new Date(issueDate) : undefined}
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </Card>

          {/* Unmapped field warning */}
          {unmappedFields.length > 0 && (
            <Card className="p-3 bg-destructive/5 border-destructive/30">
              <div className="flex gap-2">
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-medium text-destructive">Unmapped Fields</p>
                  <p className="text-destructive/80 mt-1">
                    {unmappedFields.map(f => f.label).join(', ')} {unmappedFields.length === 1 ? 'is' : 'are'} not mapped and will be left empty.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Summary */}
          <Card className="p-4 bg-muted/50">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recipients:</span>
                <span className="font-medium">{importedData?.rowCount || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Certificate Types:</span>
                <span className="font-medium">{allConfigs.filter(c => c.template?.id).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total to Generate:</span>
                <span className="font-medium font-mono">
                  {(importedData?.rowCount || 0) * allConfigs.filter(c => c.template?.id).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Export Format:</span>
                <span className="font-medium">{getExportFormatDescription(template)}</span>
              </div>
              {hasQrCodeField && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">QR Code:</span>
                  <span className="font-medium text-green-600">Included</span>
                </div>
              )}
            </div>
          </Card>

          {/* Generate + Preview row */}
          <div className="flex gap-2">
            {canGenerate && !isGenerating && (
              <Button
                variant="outline"
                size="lg"
                className="gap-2 shrink-0"
                disabled={isPreviewing}
                onClick={handlePreviewFirstRow}
                title="Generate a preview using the first data row"
              >
                {isPreviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                Preview
              </Button>
            )}
            <Button
              className="flex-1"
              size="lg"
              disabled={!canGenerate || isGenerating}
              onClick={handleGenerate}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Generate {allConfigs.filter(c => c.template?.id).length > 1
                    ? `${allConfigs.filter(c => c.template?.id).length} Certificate Types`
                    : 'Certificates'}
                </>
              )}
            </Button>
          </div>
        </>
      )}

      {/* ── Generate more ── */}
      {generationStatus === 'completed' && (
        <Button
          className="w-full"
          variant="outline"
          onClick={() => {
            setGenerationStatus('idle');
            setGeneratedCertificates([]);
            setTotalGenerated(0);
            setGenerationSummary([]);
            setDownloadUrl(null);
            setProgress(0);
            setSimulatedCount(0);
            setProgressLabel('');
          }}
        >
          Generate More Certificates
        </Button>
      )}

      {/* ── Preview Modal ── */}
      <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
        <DialogContent className="max-w-4xl w-full p-0 overflow-hidden bg-black/95 border-border/40 [&>button:last-child]:hidden">
          <DialogTitle className="sr-only">Certificate Preview</DialogTitle>
          <div className="relative flex flex-col items-center justify-center min-h-[60vh]">
            {/* Close button */}
            <button
              onClick={() => setPreviewModalOpen(false)}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Certificate number badge */}
            {previewUrls.length > 1 && (
              <div className="absolute top-3 left-3 z-10 text-xs text-white/60 bg-white/10 px-2 py-1 rounded-full">
                {previewIndex + 1} / {previewUrls.length}
              </div>
            )}

            {/* Image */}
            {previewUrls[previewIndex] && (
              <div className="relative flex items-center justify-center w-full min-h-[40vh]">
                {!previewImageLoaded && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-white/60" />
                    <p className="text-xs text-white/40">Loading preview…</p>
                  </div>
                )}
                <img
                  key={previewUrls[previewIndex]}
                  src={previewUrls[previewIndex]}
                  alt="Certificate preview"
                  className={`max-w-full max-h-[80vh] object-contain transition-opacity duration-300 ${previewImageLoaded ? 'opacity-100' : 'opacity-0'}`}
                  onLoad={() => setPreviewImageLoaded(true)}
                />
              </div>
            )}

            {/* Carousel controls */}
            {previewUrls.length > 1 && (
              <>
                <button
                  onClick={() => { setPreviewImageLoaded(false); setPreviewIndex(i => Math.max(0, i - 1)); }}
                  disabled={previewIndex === 0}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors disabled:opacity-30"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => { setPreviewImageLoaded(false); setPreviewIndex(i => Math.min(previewUrls.length - 1, i + 1)); }}
                  disabled={previewIndex === previewUrls.length - 1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors disabled:opacity-30"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Dot indicators */}
            {previewUrls.length > 1 && (
              <div className="absolute bottom-4 flex gap-1.5">
                {previewUrls.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPreviewIndex(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${i === previewIndex ? 'bg-white w-4' : 'bg-white/40'}`}
                  />
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
