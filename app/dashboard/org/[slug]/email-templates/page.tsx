"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Mail, Plus, Edit2, Trash2, Loader2, AlertCircle,
  Copy, Sparkles, ChevronLeft, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { api, type DeliveryTemplate } from "@/lib/api/client";
import { useOrg } from "@/lib/org";
import { useRouter } from "next/navigation";
import { PREDEFINED_TEMPLATES, type PredefinedTemplate } from "./PREDEFINED_TEMPLATES";
import { applyPreviewMocks } from "./[id]/EmailBlockBuilder";

// ── Category filter bar ───────────────────────────────────────────────────────

const CATEGORY_FILTERS = ["All", "Education", "Awards", "Events", "Corporate", "Membership", "General"] as const;
type CategoryFilter = (typeof CATEGORY_FILTERS)[number];

// ── Category accent colors for template cards ─────────────────────────────────

const CATEGORY_ACCENT: Record<string, string> = {
  Education: "bg-emerald-500",
  Awards: "bg-amber-500",
  Events: "bg-orange-400",
  Corporate: "bg-blue-700",
  Membership: "bg-violet-600",
  General: "bg-slate-400",
};

// ── Mock values for live email preview ───────────────────────────────────────

const PREVIEW_MOCK: Record<string, string> = {
  recipient_name: "Alex Johnson",
  organization_name: "Authentix Academy",
  issue_date: "March 22, 2026",
  course_name: "Advanced React Development",
  event_name: "Annual Tech Summit 2026",
  event_date: "March 22, 2026",
  award_name: "Employee of the Year",
  training_name: "Leadership Excellence Program",
  membership_type: "Gold Member",
  valid_until: "December 31, 2026",
  completion_date: "March 22, 2026",
  certificate_image_url: "/email-templates/certificate-modern.avif",
  verification_url: "#",
};

function renderPreview(html: string): string {
  return html.replace(/\{\{(\s*[\w.]+\s*)\}\}/g, (_, key: string) => {
    return PREVIEW_MOCK[key.trim()] ?? "";
  });
}

// ── Certificate image options for the preview selector ───────────────────────

const CERT_IMAGES = [
  "/email-templates/certificate-modern.avif",
  "/email-templates/certificate-classic.avif",
  "/email-templates/certificate-elegant.avif",
  "/email-templates/certificate-premium.avif",
];

const BASE_MOCK: Record<string, string> = {
  recipient_name: "Alex Johnson",
  organization_name: "Authentix Academy",
  issue_date: "March 22, 2026",
  course_name: "Advanced React Development",
  event_name: "Annual Tech Summit 2026",
  event_date: "March 22, 2026",
  award_name: "Employee of the Year",
  training_name: "Leadership Excellence Program",
  membership_type: "Gold Member",
  valid_until: "December 31, 2026",
  completion_date: "March 22, 2026",
  verification_url: "#",
};

// ── SampleChooser — carousel-based dialog body ───────────────────────────────

function SampleChooser({
  templates,
  creatingFromId,
  onUse,
}: {
  templates: PredefinedTemplate[];
  creatingFromId: string | null;
  onUse: (t: PredefinedTemplate) => void;
}) {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("All");
  const [activeIdx, setActiveIdx] = useState(0);
  const [certImg, setCertImg] = useState(CERT_IMAGES[0]);
  const [fromName, setFromName] = useState("Authentix Academy");
  const [iframeH, setIframeH] = useState(700);

  const filteredTemplates =
    categoryFilter === "All"
      ? templates
      : templates.filter(t => t.category === categoryFilter);

  // Reset index when filter changes
  useEffect(() => {
    setActiveIdx(0);
  }, [categoryFilter]);

  const safeIdx = activeIdx < filteredTemplates.length ? activeIdx : 0;
  const activeTemplate = filteredTemplates[safeIdx] ?? filteredTemplates[0];

  const prev = () => setActiveIdx(i => (i - 1 + filteredTemplates.length) % filteredTemplates.length);
  const next = () => setActiveIdx(i => (i + 1) % filteredTemplates.length);

  const mockVars = { ...BASE_MOCK, certificate_image_url: certImg };

  const renderedHtml = activeTemplate
    ? activeTemplate.body.replace(/\{\{(\s*[\w.]+\s*)\}\}/g, (_, key: string) => (mockVars as Record<string, string>)[key.trim()] ?? "")
    : "";

  // Add <base> so relative paths like /email-templates/certificate-modern.avif resolve correctly in srcDoc iframes
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const srcDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><base href="${origin}/"><style>*{box-sizing:border-box}body{margin:0;padding:0;background:#ffffff}</style></head><body>${renderedHtml}</body></html>`;

  if (!activeTemplate) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <p className="text-sm text-muted-foreground">No templates in this category.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b shrink-0">
        <DialogTitle className="text-xl font-bold tracking-tight">Choose a Starting Point</DialogTitle>
        <p className="text-muted-foreground text-sm mt-1">Pick a design, customize it, then use it.</p>

        {/* Category pills */}
        <div className="flex flex-wrap gap-1.5 mt-4">
          {CATEGORY_FILTERS.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                categoryFilter === cat
                  ? "bg-[#3ECF8E] text-white shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main body */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* Left: email preview */}
        <div className="flex flex-col border-r border-border/40" style={{ width: "62%" }}>

          {/* Sticky chrome bar */}
          <div className="shrink-0 flex items-center gap-2 px-4 py-2 bg-white border-b border-border/30 z-10">
            <div className="flex gap-1.5 shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
            </div>
            <div className="flex-1 min-w-0 ml-2">
              <span className="text-xs font-medium">{fromName || "Sender"}</span>
              <span className="text-[10px] text-muted-foreground ml-1.5 opacity-60">&lt;info@xencus.com&gt;</span>
              <span className="text-[10px] text-muted-foreground mx-2 opacity-40">·</span>
              <span className="text-[10px] text-muted-foreground truncate">{activeTemplate.email_subject}</span>
            </div>
          </div>

          {/* Scrollable email body */}
          <div className="flex-1 overflow-y-auto bg-slate-100 flex justify-center py-8 px-6">
            <div style={{ width: 600, background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
              <iframe
                key={activeTemplate.id + certImg}
                srcDoc={srcDoc}
                style={{ width: 600, height: iframeH, border: "none", display: "block" }}
                onLoad={(e) => {
                  const h = (e.target as HTMLIFrameElement).contentDocument?.body?.scrollHeight;
                  if (h) setIframeH(h + 40);
                }}
                title={`Preview: ${activeTemplate.name}`}
                sandbox="allow-same-origin"
              />
            </div>
          </div>

          {/* Nav: arrows + dots */}
          <div className="shrink-0 flex items-center justify-between px-6 py-3 border-t bg-background">
            <Button variant="ghost" size="sm" onClick={prev} disabled={filteredTemplates.length <= 1} className="gap-1.5">
              <ChevronLeft className="w-4 h-4" /> Prev
            </Button>
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                {filteredTemplates.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIdx(i)}
                    className={`rounded-full transition-all ${i === safeIdx ? "w-4 h-2 bg-[#3ECF8E]" : "w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"}`}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground ml-1">{safeIdx + 1} / {filteredTemplates.length}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={next} disabled={filteredTemplates.length <= 1} className="gap-1.5">
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Right: info + controls */}
        <div className="flex flex-col overflow-y-auto px-6 py-5 gap-5" style={{ width: "38%" }}>
          {/* Category + name + description */}
          <div>
            <Badge
              className="text-[10px] font-semibold text-white border-0 mb-3"
              style={{ backgroundColor: activeTemplate.accentColor }}
            >
              {activeTemplate.category}
            </Badge>
            <h2 className="text-xl font-bold leading-tight mt-1">{activeTemplate.name}</h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{activeTemplate.description}</p>
            <p className="text-xs text-muted-foreground/60 mt-1.5 italic">{activeTemplate.layout}</p>
          </div>

          <Separator />

          {/* Sender name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sender Display Name</Label>
            <Input
              value={fromName}
              onChange={e => setFromName(e.target.value)}
              placeholder="Your Organization"
              className="h-9"
            />
            <p className="text-[11px] text-muted-foreground">Updates the "From" name shown in the preview</p>
          </div>

          {/* Cert image selector */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Certificate Style Preview</Label>
            <div className="grid grid-cols-2 gap-2">
              {CERT_IMAGES.map((img) => (
                <button
                  key={img}
                  onClick={() => setCertImg(img)}
                  className={`rounded-lg overflow-hidden border-2 transition-all ${certImg === img ? "border-[#3ECF8E] shadow-md" : "border-transparent hover:border-border"}`}
                >
                  <img src={img} alt="Certificate style" className="w-full h-16 object-cover" />
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">Swaps the certificate image in the preview</p>
          </div>

          <Separator />

          {/* Variables */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Template Variables</Label>
            <div className="flex flex-wrap gap-1.5">
              {activeTemplate.variables
                .filter(v => v !== "certificate_image_url" && v !== "verification_url")
                .map(v => (
                  <span key={v} className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono bg-muted text-muted-foreground border border-border/50">
                    {`{{${v}}}`}
                  </span>
                ))}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-auto pt-2">
            <Button
              className="w-full h-10 gap-2 bg-[#3ECF8E] hover:bg-[#34b87a] text-white font-semibold"
              disabled={creatingFromId === activeTemplate.id}
              onClick={() => onUse(activeTemplate)}
            >
              {creatingFromId === activeTemplate.id
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
                : <><Copy className="w-4 h-4" /> Use this template</>}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center mt-2">You can edit everything after creating</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── User template card ────────────────────────────────────────────────────────

function TemplateCard({
  template,
  onEdit,
  onDelete,
  onDuplicate,
  deleting,
  duplicating,
}: {
  template: DeliveryTemplate;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  deleting: boolean;
  duplicating: boolean;
}) {
  const previewHtml = template.body ? applyPreviewMocks(template.body) : null;

  return (
    <Card className="group overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer" onClick={onEdit}>
      {/* Email thumbnail preview */}
      <div className="h-40 overflow-hidden relative bg-slate-50 border-b border-border/20">
        {previewHtml ? (
          <>
            <div
              className="absolute top-0 left-0 pointer-events-none select-none origin-top-left"
              style={{ width: 600, transform: "scale(0.5)" }}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
            {/* Bottom fade */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/80 pointer-events-none" />
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <Mail className="w-8 h-8 text-muted-foreground/20" />
          </div>
        )}
        {/* Badges overlay top-right */}
        <div className="absolute top-2 right-2 flex gap-1.5">
          {template.is_default && (
            <Badge className="text-[10px] border-[#3ECF8E]/50 text-[#3ECF8E] bg-background/90" variant="outline">Default</Badge>
          )}
          {!template.is_active && (
            <Badge variant="secondary" className="text-[10px] bg-background/90">Inactive</Badge>
          )}
        </div>
      </div>

      <CardHeader className="pb-1.5 pt-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold truncate">{template.name}</CardTitle>
            <CardDescription className="text-xs mt-0.5 truncate text-muted-foreground/70">
              {template.email_subject ?? "(no subject)"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-3">
        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
          <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={onEdit}>
            <Edit2 className="w-3.5 h-3.5" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            title="Duplicate template"
            disabled={duplicating}
            onClick={onDuplicate}
            className="shrink-0"
          >
            {duplicating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={deleting}
            onClick={onDelete}
            className="shrink-0"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-destructive" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function EmailTemplatesPage() {
  const { orgPath } = useOrg();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<DeliveryTemplate[]>([]);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [creatingFromId, setCreatingFromId] = useState<string | null>(null);
  const [showPredefined, setShowPredefined] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const list = await api.delivery.listTemplates();
      setTemplates(list);
    } catch (err: any) {
      setError(err.message ?? "Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFromPredefined = async (predefined: PredefinedTemplate) => {
    setCreatingFromId(predefined.id);
    try {
      const created = await api.delivery.createTemplate({
        channel: "email",
        name: predefined.name,
        email_subject: predefined.email_subject,
        body: predefined.body,
        variables: predefined.variables,
        is_default: templates.length === 0,
        is_active: true,
      });
      setShowPredefined(false);
      toast.success(`Template "${predefined.name}" created`);
      router.push(orgPath(`/email-templates/${created.id}`));
    } catch (err: any) {
      setError(err.message ?? "Failed to create template");
    } finally {
      setCreatingFromId(null);
    }
  };

  const handleCreateBlank = async () => {
    setCreatingFromId("blank");
    try {
      const created = await api.delivery.createTemplate({
        channel: "email",
        name: "New Template",
        email_subject: "Your Certificate",
        body: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 32px;">
  <p>Hi <strong>{{recipient_name}}</strong>,</p>
  <p>Please find your certificate attached.</p>
  <p>— {{organization_name}}</p>
</div>`,
        variables: ["recipient_name", "organization_name"],
        is_default: templates.length === 0,
        is_active: true,
      });
      router.push(orgPath(`/email-templates/${created.id}`));
    } catch (err: any) {
      setError(err.message ?? "Failed to create template");
    } finally {
      setCreatingFromId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setConfirmDeleteId(null);
    try {
      await api.delivery.deleteTemplate(id);
      toast.success("Template deleted");
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete template");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDuplicate = async (id: string) => {
    setDuplicatingId(id);
    try {
      const duplicated = await api.delivery.duplicateTemplate(id);
      toast.success(`"${duplicated.name}" created`);
      await load();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to duplicate template");
    } finally {
      setDuplicatingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Templates</h1>
          <p className="text-muted-foreground mt-1.5 text-base">
            Design and manage the emails sent to recipients when certificates are issued.
            Choose a sample design or build from scratch.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={() => setShowPredefined(true)}>
            <Sparkles className="w-4 h-4 mr-2" />
            From Sample
          </Button>
          <Button
            onClick={handleCreateBlank}
            disabled={creatingFromId === "blank"}
            className="bg-[#3ECF8E] hover:bg-[#34b87a] text-white"
          >
            {creatingFromId === "blank"
              ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              : <Plus className="w-4 h-4 mr-2" />}
            New Template
          </Button>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Templates grid */}
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-8">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading templates…</span>
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-5 rounded-full bg-gradient-to-br from-[#3ECF8E]/15 to-[#1a9f6a]/10 mb-5 ring-1 ring-[#3ECF8E]/20">
            <Mail className="w-10 h-10 text-[#3ECF8E]" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No email templates yet</h3>
          <p className="text-muted-foreground text-sm max-w-sm mb-8">
            Create your first email template to start sending certificates.
            Choose a professionally designed sample or start from scratch.
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowPredefined(true)}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Browse Samples
            </Button>
            <Button
              size="lg"
              onClick={handleCreateBlank}
              disabled={creatingFromId === "blank"}
              className="gap-2 bg-[#3ECF8E] hover:bg-[#34b87a] text-white"
            >
              {creatingFromId === "blank"
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Plus className="w-4 h-4" />}
              Create Blank
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={() => router.push(orgPath(`/email-templates/${template.id}`))}
              onDelete={() => setConfirmDeleteId(template.id)}
              onDuplicate={() => handleDuplicate(template.id)}
              deleting={deletingId === template.id}
              duplicating={duplicatingId === template.id}
            />
          ))}
        </div>
      )}

      {/* Predefined templates modal */}
      <Dialog open={showPredefined} onOpenChange={setShowPredefined}>
        <DialogContent className="max-w-5xl h-[88vh] flex flex-col overflow-hidden p-0">
          <SampleChooser
            templates={PREDEFINED_TEMPLATES}
            creatingFromId={creatingFromId}
            onUse={handleCreateFromPredefined}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the template. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
