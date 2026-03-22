'use client';

import { useState, useRef, useEffect } from 'react';
import { CertificateTemplate, CertificateField, ImportedData, FieldMapping } from '@/lib/types/certificate';
import { api, type DeliveryIntegration, type DeliveryTemplate } from '@/lib/api/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format, isValid } from 'date-fns';
import {
  Download, Loader2, CheckCircle2, AlertCircle, Calendar, Plus, X,
  FileText, ChevronDown, ChevronUp, Settings2, Eye, ChevronLeft, ChevronRight,
  ShieldCheck, BadgeCheck, Mail, Send, ExternalLink,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ExpiryDateSelector, type ExpiryType } from './ExpiryDateSelector';
import { CertificateTable, type GeneratedCertificate } from './CertificateTable';
import Link from 'next/link';
import { useOrg } from '@/lib/org';

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
export function autoMapForTemplate(
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

// ── Send Email Modal ──────────────────────────────────────────────────────────

interface SendEmailModalProps {
  jobId: string;
  recipientCount: number;
  orgPath: (path: string) => string;
  onClose: () => void;
  onEmailSent?: (statuses: Record<string, string>) => void;
}

type SendModalStep = 'checking' | 'no_integration' | 'no_template' | 'confirm' | 'sending' | 'done' | 'error';

function SendEmailModal({ jobId, recipientCount, orgPath, onClose, onEmailSent }: SendEmailModalProps) {
  const [step, setStep] = useState<SendModalStep>('checking');
  const [integrations, setIntegrations] = useState<DeliveryIntegration[]>([]);
  const [templates, setTemplates] = useState<DeliveryTemplate[]>([]);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [subjectOverride, setSubjectOverride] = useState('');
  const [fromNameOverride, setFromNameOverride] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const selectedIntegration = integrations.find(i => i.id === selectedIntegrationId) ?? null;
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId) ?? null;

  useEffect(() => { check(); }, []);

  const check = async () => {
    setStep('checking');
    try {
      const [intList, tplList] = await Promise.all([
        api.delivery.listIntegrations(),
        api.delivery.listTemplates(),
      ]);

      const activeIntegrations = intList.filter(i => i.is_active && i.channel === 'email');
      const activeTemplates = tplList.filter(t => t.is_active && t.channel === 'email');

      setIntegrations(activeIntegrations);
      setTemplates(activeTemplates);

      if (activeIntegrations.length === 0) { setStep('no_integration'); return; }
      if (activeTemplates.length === 0) { setStep('no_template'); return; }

      const defaultInt = activeIntegrations.find(i => i.is_default) ?? activeIntegrations[0]!;
      const defaultTpl = activeTemplates.find(t => t.is_default) ?? activeTemplates[0]!;
      setSelectedIntegrationId(defaultInt.id);
      setSelectedTemplateId(defaultTpl.id);
      setStep('confirm');
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Failed to load configuration');
      setStep('error');
    }
  };

  const handleSend = async () => {
    if (!selectedIntegration || !selectedTemplate) return;
    setStep('sending');
    try {
      const result = await api.delivery.sendJobEmails({
        generation_job_id: jobId,
        integration_id: selectedIntegration.id,
        template_id: selectedTemplate.id,
        subject_override: subjectOverride.trim() || undefined,
        from_name_override: fromNameOverride.trim() || undefined,
      });
      setSendResult({ sent: result.sent, failed: result.failed });
      setStep('done');
      toast.success(`${result.sent} email${result.sent !== 1 ? 's' : ''} sent!`);
      // Build status map for the table
      if (onEmailSent && result.messages) {
        const statuses: Record<string, string> = {};
        for (const m of result.messages) {
          statuses[m.recipient_id] = m.status;
        }
        onEmailSent(statuses);
      }
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Failed to send emails');
      setStep('error');
    }
  };

  const handleTestSend = async () => {
    if (!testEmail.trim()) return;
    setTestSending(true);
    try {
      await api.delivery.testSend({
        test_email: testEmail.trim(),
        integration_id: selectedIntegrationId || undefined,
        template_id: selectedTemplateId || undefined,
        subject_override: subjectOverride.trim() || undefined,
        from_name_override: fromNameOverride.trim() || undefined,
      });
      toast.success(`Test email sent to ${testEmail}`);
    } catch (err: any) {
      toast.error(err.message ?? 'Test send failed');
    } finally {
      setTestSending(false);
    }
  };

  const effectiveFromName = fromNameOverride.trim() || selectedIntegration?.from_name || '';
  const effectiveSender = effectiveFromName
    ? `${effectiveFromName} <${selectedIntegration?.from_email ?? ''}>`
    : selectedIntegration?.from_email ?? '';

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          Send via Email
        </DialogTitle>

        {/* Checking */}
        {step === 'checking' && (
          <div className="flex items-center gap-3 py-6 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin shrink-0" />
            <span>Checking email configuration…</span>
          </div>
        )}

        {/* No integration */}
        {step === 'no_integration' && (
          <div className="space-y-4">
            <Alert className="border-amber-500/30 bg-amber-500/5">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm text-amber-800">
                No active email integration configured. Set up your sender to enable sending.
              </AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
              <Link href={orgPath('/settings/delivery')} className="flex-1">
                <Button className="w-full gap-2">Configure Email <ExternalLink className="w-3.5 h-3.5" /></Button>
              </Link>
            </div>
          </div>
        )}

        {/* No template */}
        {step === 'no_template' && (
          <div className="space-y-4">
            <Alert className="border-amber-500/30 bg-amber-500/5">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm text-amber-800">
                No active email template found. Create one to continue.
              </AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
              <Link href={orgPath('/email-templates')} className="flex-1">
                <Button className="w-full gap-2">Create Template <ExternalLink className="w-3.5 h-3.5" /></Button>
              </Link>
            </div>
          </div>
        )}

        {/* Confirm */}
        {step === 'confirm' && selectedIntegration && selectedTemplate && (
          <div className="space-y-4">
            {/* Recipient count pill */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
              <span className="text-sm font-medium">Recipients</span>
              <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
                {recipientCount} {recipientCount === 1 ? 'person' : 'people'}
              </Badge>
            </div>

            {/* Integration selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Send From</Label>
              {integrations.length === 1 ? (
                <div className="flex items-center gap-2 p-2.5 rounded-md border bg-muted/30 text-sm">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{effectiveSender || selectedIntegration.from_email}</span>
                </div>
              ) : (
                <Select value={selectedIntegrationId} onValueChange={setSelectedIntegrationId}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select integration…" />
                  </SelectTrigger>
                  <SelectContent>
                    {integrations.map(i => (
                      <SelectItem key={i.id} value={i.id}>
                        <span className="flex items-center gap-2">
                          <span>{i.display_name}</span>
                          <span className="text-xs text-muted-foreground">{i.from_email}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Template selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email Template</Label>
              {templates.length === 1 ? (
                <div className="flex items-center gap-2 p-2.5 rounded-md border bg-muted/30 text-sm">
                  <span className="truncate">{selectedTemplate.name}</span>
                  {selectedTemplate.email_subject && (
                    <span className="text-xs text-muted-foreground truncate">— {selectedTemplate.email_subject}</span>
                  )}
                </div>
              ) : (
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select template…" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        <span className="flex items-center gap-2">
                          <span>{t.name}</span>
                          {t.is_default && <span className="text-xs text-muted-foreground">(default)</span>}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Advanced overrides toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(v => !v)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showAdvanced ? 'Hide' : 'Customize'} sender name & subject
            </button>

            {showAdvanced && (
              <div className="space-y-3 p-3 rounded-lg border bg-muted/20">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Sender Name Override</Label>
                  <Input
                    value={fromNameOverride}
                    onChange={e => setFromNameOverride(e.target.value)}
                    placeholder={selectedIntegration.from_name ?? 'e.g. Authentix Academy'}
                    className="h-8 text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Overrides "{selectedIntegration.from_name || 'not set'}" for this send only.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Subject Override</Label>
                  <Input
                    value={subjectOverride}
                    onChange={e => setSubjectOverride(e.target.value)}
                    placeholder={selectedTemplate.email_subject ?? 'e.g. Your Certificate is Ready'}
                    className="h-8 text-sm font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Overrides the template subject. Supports <code className="bg-muted px-1 rounded">{`{{variables}}`}</code>.
                  </p>
                </div>
              </div>
            )}

            {/* Test email */}
            <div className="border-t pt-3 space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Send Test Email</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={testEmail}
                  onChange={e => setTestEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="h-8 text-sm flex-1"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleTestSend}
                  disabled={testSending || !testEmail.trim()}
                  className="shrink-0 gap-1.5"
                >
                  {testSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Test
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Uses mock data. No certificate attached.</p>
            </div>

            <p className="text-xs text-muted-foreground">
              Certificates will be attached as PDF files to each email.
            </p>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
              <Button onClick={handleSend} className="flex-1 gap-2">
                <Send className="w-4 h-4" />
                Send {recipientCount} Email{recipientCount !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        )}

        {/* Sending */}
        {step === 'sending' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Sending {recipientCount} email{recipientCount !== 1 ? 's' : ''}…</p>
          </div>
        )}

        {/* Done */}
        {step === 'done' && sendResult && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">Emails sent!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {sendResult.sent} sent
                  {sendResult.failed > 0 && (
                    <span className="text-destructive"> · {sendResult.failed} failed</span>
                  )}
                </p>
              </div>
            </div>
            {sendResult.failed > 0 && (
              <Alert className="border-amber-500/30 bg-amber-500/5">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-sm text-amber-800">
                  {sendResult.failed} email{sendResult.failed !== 1 ? 's' : ''} failed to send. This may be due to invalid email addresses.
                </AlertDescription>
              </Alert>
            )}
            <Button className="w-full" onClick={onClose}>Done</Button>
          </div>
        )}

        {/* Error */}
        {step === 'error' && (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1">Close</Button>
              <Button onClick={check} className="flex-1">Retry</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
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
  const { orgPath } = useOrg();

  // 'hidden' = not generating, 'generating' = in progress, 'success' = done animation
  const [overlayState, setOverlayState] = useState<'hidden' | 'generating' | 'success'>('hidden');
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
  const isMountedRef = useRef(true);
  useEffect(() => { isMountedRef.current = true; return () => { isMountedRef.current = false; }; }, []);


  // Expiry settings
  const [expiryType, setExpiryType] = useState<ExpiryType>('year');
  const [customExpiryDate, setCustomExpiryDate] = useState<string>('');
  const [issueDate, setIssueDate] = useState<string>('');
  const [useCustomIssueDate, setUseCustomIssueDate] = useState(false);

  // Generated certificates
  const [generatedCertificates, setGeneratedCertificates] = useState<GeneratedCertificate[]>([]);
  const [totalGenerated, setTotalGenerated] = useState(0);
  const [generationSummary, setGenerationSummary] = useState<Array<{ label: string; count: number }>>([]);
  const [generationJobId, setGenerationJobId] = useState<string | null>(null);

  // Send via Email modal
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [emailStatuses, setEmailStatuses] = useState<Record<string, string> | undefined>(undefined);

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

    setOverlayState('generating');
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
    let firstJobId: string | null = null;

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
        const frac = Math.min(elapsed / estimatedMs, 0.98);
        const within = frac * templateProgressShare * 0.98;
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

        if (result.job_id && !firstJobId) firstJobId = result.job_id;

        if (result.certificates?.length) {
          const savedTpl = savedTemplates.find((t: any) => t.id === cfg.template.id);
          const certs: GeneratedCertificate[] = result.certificates.map((cert: any) => ({
            id: cert.id,
            certificate_number: cert.certificate_number,
            recipient_name: cert.recipient_name,
            recipient_email: cert.recipient_email || null,
            issued_at: cert.issued_at,
            expires_at: cert.expires_at || null,
            download_url: cert.download_url || null,
            preview_url: cert.preview_url || null,
            category: savedTpl?.certificate_category || null,
            subcategory: savedTpl?.certificate_subcategory || null,
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

    if (!isMountedRef.current) return;

    // Commit results and snap bar to 100%
    setProgress(100);
    setSimulatedCount(totalRows);
    setProgressLabel('');
    setGeneratedCertificates(allCerts);
    setTotalGenerated(allCerts.length);
    setGenerationSummary(summary);
    setGenerationJobId(firstJobId);
    setDownloadUrl(lastZipUrl);
    setGenerationStatus(allCerts.length > 0 ? 'completed' : 'error');

    // Show success animation, then dismiss overlay.
    // Direct setTimeout — no useEffect, no state-change dependency, always fires.
    setOverlayState('success');
    setTimeout(() => {
      if (!isMountedRef.current) return;
      setOverlayState('hidden');
    }, 2500);
  };

  const handleExpiryChange = (type: ExpiryType, customDate?: string) => {
    setExpiryType(type);
    if (customDate !== undefined) setCustomExpiryDate(customDate);
  };

  const unmappedFields = fields
    .filter(f => f.type !== 'qr_code' && f.type !== 'custom_text' && f.type !== 'image')
    .filter(f => !fieldMappings.find(m => m.fieldId === f.id));

  // ── Render ──────────────────────────────────────────────────────────────────

  // Full-screen generation overlay
  if (overlayState !== 'hidden') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background select-none overflow-hidden">
        <style>{`
          @keyframes genZoomIn    { from{opacity:0;transform:scale(0.6)} to{opacity:1;transform:scale(1)} }
          @keyframes genRipple    { 0%{transform:scale(1);opacity:0.65} 100%{transform:scale(2.6);opacity:0} }
          @keyframes genShieldPop { 0%{opacity:0;transform:scale(0.4) rotate(-12deg)} 65%{transform:scale(1.12) rotate(4deg)} 100%{opacity:1;transform:scale(1) rotate(0deg)} }
          @keyframes genBadgePop  { 0%{opacity:0;transform:scale(0) rotate(20deg)} 70%{transform:scale(1.18) rotate(-6deg)} 100%{opacity:1;transform:scale(1) rotate(0deg)} }
          @keyframes genBadgeFloat{ 0%,100%{transform:translateY(0px) rotate(-6deg)} 50%{transform:translateY(-6px) rotate(-2deg)} }
          @keyframes genShieldGlow{ 0%,100%{filter:drop-shadow(0 0 8px #3ECF8E55)} 50%{filter:drop-shadow(0 0 22px #3ECF8Eaa)} }
          @keyframes genPulse     { 0%,100%{opacity:0.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.06)} }
          @keyframes genSpin      { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
          @keyframes genSpinRev   { from{transform:rotate(0deg)} to{transform:rotate(-360deg)} }
          @keyframes genOrbit     { from{transform:rotate(0deg) translateX(90px) rotate(0deg)} to{transform:rotate(360deg) translateX(90px) rotate(-360deg)} }
          @keyframes genOrbit2    { from{transform:rotate(120deg) translateX(70px) rotate(-120deg)} to{transform:rotate(480deg) translateX(70px) rotate(-480deg)} }
          @keyframes genOrbit3    { from{transform:rotate(240deg) translateX(110px) rotate(-240deg)} to{transform:rotate(600deg) translateX(110px) rotate(-600deg)} }
          @keyframes genDocLine   { 0%,100%{opacity:0.25} 50%{opacity:0.7} }
          @keyframes genFadeSlide { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        `}</style>

        {/* Bottom notice */}
        {overlayState === 'generating' && (
          <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none">
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Please keep this page open until generation completes</p>
          </div>
        )}

        <div className="flex flex-col items-center gap-10">
          {overlayState === 'success' ? (
            /* ── Success ── */
            <div className="flex flex-col items-center gap-10">
              {/* Icon cluster */}
              <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
                {/* Ripple rings */}
                <div className="absolute w-48 h-48 rounded-full" style={{ border: '2px solid #3ECF8E55', animation: 'genRipple 1.6s ease-out infinite' }} />
                <div className="absolute w-48 h-48 rounded-full" style={{ border: '1.5px solid #3ECF8E33', animation: 'genRipple 1.6s ease-out 0.5s infinite' }} />
                <div className="absolute w-48 h-48 rounded-full" style={{ border: '1px solid #3ECF8E1a', animation: 'genRipple 1.6s ease-out 1s infinite' }} />

                {/* Glow backdrop */}
                <div className="absolute w-36 h-36 rounded-full" style={{ background: 'radial-gradient(circle, #3ECF8E22 0%, transparent 70%)' }} />

                {/* Main shield */}
                <ShieldCheck
                  style={{
                    width: 96, height: 96,
                    color: '#3ECF8E',
                    animation: 'genShieldPop 0.55s cubic-bezier(0.34,1.56,0.64,1) both, genShieldGlow 2s ease-in-out 0.6s infinite',
                  }}
                />

                {/* Floating badge — top right */}
                <div style={{
                  position: 'absolute', top: 14, right: 10,
                  animation: 'genBadgePop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.2s both',
                }}>
                  <div style={{
                    animation: 'genBadgeFloat 2.8s ease-in-out 0.7s infinite',
                  }}>
                    <BadgeCheck style={{ width: 36, height: 36, color: '#3ECF8E' }} />
                  </div>
                </div>
              </div>

              {/* Text */}
              <div className="text-center" style={{ animation: 'genFadeSlide 0.5s ease-out 0.35s both' }}>
                <p className="text-4xl font-bold mb-4">All done!</p>
                <p className="text-lg text-muted-foreground">
                  {totalGenerated} certificate{totalGenerated !== 1 ? 's' : ''} generated successfully
                </p>
              </div>
            </div>
          ) : (
            /* ── Generating animation ── */
            <>
              {/* Central animated visual */}
              <div className="relative flex items-center justify-center" style={{ width: 260, height: 260 }}>

                {/* Outermost slow-spinning dashed ring */}
                <div className="absolute inset-0 rounded-full pointer-events-none" style={{
                  border: '1px dashed rgba(62,207,142,0.25)',
                  animation: 'genSpin 18s linear infinite',
                }} />

                {/* Mid spinning ring */}
                <div className="absolute rounded-full pointer-events-none" style={{
                  inset: 18,
                  border: '1.5px dashed rgba(62,207,142,0.35)',
                  animation: 'genSpinRev 12s linear infinite',
                }} />

                {/* Inner glowing ring */}
                <div className="absolute rounded-full pointer-events-none" style={{
                  inset: 38,
                  border: '2px solid rgba(62,207,142,0.45)',
                  boxShadow: '0 0 18px rgba(62,207,142,0.15) inset',
                  animation: 'genPulse 2.4s ease-in-out infinite',
                }} />

                {/* Orbiting dot 1 */}
                <div style={{ position: 'absolute', top: '50%', left: '50%', animation: 'genOrbit 4s linear infinite' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3ECF8E', boxShadow: '0 0 8px #3ECF8E' }} />
                </div>
                {/* Orbiting dot 2 */}
                <div style={{ position: 'absolute', top: '50%', left: '50%', animation: 'genOrbit2 3s linear infinite' }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#3ECF8Eaa' }} />
                </div>
                {/* Orbiting dot 3 */}
                <div style={{ position: 'absolute', top: '50%', left: '50%', animation: 'genOrbit3 6s linear infinite' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3ECF8E77', boxShadow: '0 0 6px #3ECF8E55' }} />
                </div>

                {/* Centre: document icon */}
                <div className="relative flex flex-col items-center justify-center rounded-2xl" style={{
                  width: 100, height: 120,
                  background: 'rgba(62,207,142,0.08)',
                  border: '1.5px solid rgba(62,207,142,0.4)',
                  boxShadow: '0 0 32px rgba(62,207,142,0.12)',
                  animation: 'genPulse 2.4s ease-in-out infinite',
                }}>
                  {/* Folded corner */}
                  <div style={{
                    position: 'absolute', top: 0, right: 0,
                    width: 0, height: 0,
                    borderStyle: 'solid',
                    borderWidth: '0 18px 18px 0',
                    borderColor: 'transparent rgba(62,207,142,0.5) transparent transparent',
                  }} />
                  {/* Doc lines */}
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} style={{
                      height: 3,
                      borderRadius: 2,
                      background: 'rgba(62,207,142,0.5)',
                      width: i === 0 ? 52 : i === 3 ? 32 : 64,
                      marginBottom: i < 3 ? 8 : 0,
                      animation: `genDocLine 1.8s ease-in-out ${i * 0.18}s infinite`,
                    }} />
                  ))}
                  {/* Seal dot */}
                  <div style={{
                    position: 'absolute', bottom: 12, right: 12,
                    width: 18, height: 18, borderRadius: '50%',
                    background: 'rgba(62,207,142,0.2)',
                    border: '1.5px solid rgba(62,207,142,0.6)',
                  }} />
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ width: 480 }} className="space-y-2">
                <div className="relative rounded-full overflow-visible" style={{ height: 10, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.16)' }}>
                  {/* Fill — dragger is a child so it moves with the bar, always in sync */}
                  <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      width: `${progress}%`,
                      background: '#3ECF8E',
                      boxShadow: progress > 0 ? '0 0 10px #3ECF8E88' : 'none',
                      minWidth: progress > 0 ? 10 : 0,
                      transition: 'width 600ms linear',
                    }}
                  >
                    {/* Dragger dot — pinned to right edge of fill, always perfectly in sync */}
                    {progress > 0 && progress < 100 && (
                      <div style={{
                        position: 'absolute',
                        right: -7,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 14, height: 14, borderRadius: '50%',
                        background: 'white',
                        boxShadow: '0 0 0 2.5px #3ECF8E, 0 0 8px #3ECF8E66',
                      }} />
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-sm font-bold tabular-nums" style={{ color: '#3ECF8E' }}>{progress}%</span>
                  <span className="text-xs text-muted-foreground">{progressLabel || 'Generating certificates…'}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {simulatedCount > 0 ? `${simulatedCount} / ${importedData?.rowCount ?? '?'}` : '—'}
                  </span>
                </div>
              </div>
            </>
          )}
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
            emailStatuses={emailStatuses}
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
            {canGenerate && overlayState === 'hidden' && (
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
              disabled={!canGenerate || overlayState !== 'hidden'}
              onClick={handleGenerate}
            >
              {overlayState !== 'hidden' ? (
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

      {/* ── Post-generation actions ── */}
      {generationStatus === 'completed' && (
        <div className="flex gap-2">
          <Button
            className="flex-1"
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
              setGenerationJobId(null);
              setEmailStatuses(undefined);
            }}
          >
            Generate More
          </Button>
          <Button
            className="flex-1 gap-2"
            disabled={!generationJobId}
            onClick={() => setSendModalOpen(true)}
            title={generationJobId ? 'Send certificates by email' : 'No job ID available'}
          >
            <Send className="w-4 h-4" />
            Send via Email
          </Button>
        </div>
      )}

      {/* ── Send via Email modal ── */}
      {sendModalOpen && generationJobId && (
        <SendEmailModal
          jobId={generationJobId}
          recipientCount={totalGenerated}
          orgPath={orgPath}
          onClose={() => setSendModalOpen(false)}
          onEmailSent={(statuses) => setEmailStatuses(statuses)}
        />
      )}

      {/* ── Preview Modal ── */}
      <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
        <DialogContent className={`w-full p-0 overflow-hidden bg-black/95 border-border/40 [&>button:last-child]:hidden ${template && template.pdfWidth > template.pdfHeight ? 'max-w-5xl' : 'max-w-3xl'}`}>
          <DialogTitle className="sr-only">Certificate Preview</DialogTitle>
          <div className="relative flex flex-col items-center justify-center" style={{ minHeight: template && template.pdfWidth > template.pdfHeight ? '40vh' : '60vh' }}>
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
                  className={`w-full object-contain transition-opacity duration-300 ${previewImageLoaded ? 'opacity-100' : 'opacity-0'}`}
                  style={{ maxHeight: '85vh' }}
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
