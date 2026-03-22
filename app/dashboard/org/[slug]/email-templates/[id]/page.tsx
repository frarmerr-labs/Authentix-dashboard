"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Save, Loader2, AlertCircle, Monitor,
  Smartphone, Code2, ChevronDown, ImageIcon, Info,
  Plus, X, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { useOrg } from "@/lib/org";
import {
  EmailBlockBuilder,
  blocksToHtml,
  defaultBlock,
  STARTER_BLOCKS,
  PALETTE,
  applyPreviewMocks,
  type EmailBlock,
  type BlockType,
} from "./EmailBlockBuilder";
import { nanoid } from "nanoid";
import { cn } from "@/lib/utils";

// ── Live preview ──────────────────────────────────────────────────────────────

function LivePreview({ html, previewWidth }: { html: string; previewWidth: "desktop" | "mobile" }) {
  const rendered = applyPreviewMocks(html);

  const srcDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,sans-serif}</style></head><body><div style="padding:16px">${rendered}</div></body></html>`;

  return (
    <div
      className={cn(
        "mx-auto transition-all duration-300 w-full",
        previewWidth === "mobile" ? "max-w-[360px]" : "max-w-[560px]"
      )}
    >
      <iframe
        key={srcDoc.length}
        srcDoc={srcDoc}
        className="w-full border-0 block rounded-xl shadow-sm"
        style={{ minHeight: 480 }}
        onLoad={(e) => {
          const iframe = e.target as HTMLIFrameElement;
          const body = iframe.contentDocument?.body;
          if (body) iframe.style.height = Math.max(body.scrollHeight + 32, 480) + "px";
        }}
        title="Email Preview"
        sandbox="allow-same-origin"
      />
    </div>
  );
}

// ── Certificate image toggle ──────────────────────────────────────────────────

function CertImageToggle({
  blocks,
  outOfSync,
  body,
  onAdd,
  onRemove,
}: {
  blocks: EmailBlock[];
  outOfSync: boolean;
  body: string;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const embedded = outOfSync
    ? body.includes("certificate_image_url")
    : blocks.some(b => b.type === "cert_image");

  return (
    <div className={cn(
      "rounded-lg border p-3 transition-colors",
      embedded ? "border-[#3ECF8E]/50 bg-[#3ECF8E]/5" : "border-dashed border-border bg-muted/20"
    )}>
      <div className="flex items-start gap-2.5">
        <div className={cn(
          "mt-0.5 shrink-0 w-7 h-7 rounded-md flex items-center justify-center",
          embedded ? "bg-[#3ECF8E]/15" : "bg-muted"
        )}>
          <ImageIcon className={cn("w-3.5 h-3.5", embedded ? "text-[#3ECF8E]" : "text-muted-foreground")} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn("text-xs font-semibold", embedded ? "text-[#3ECF8E]" : "text-muted-foreground")}>
            Certificate Image
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
            {embedded
              ? "Shown inline in email body. Also attached as file."
              : "Attached as file only. Not shown inline."}
          </p>
          {embedded ? (
            <button
              type="button"
              onClick={onRemove}
              className="mt-2 flex items-center gap-1 text-[10px] font-medium text-destructive/70 hover:text-destructive transition-colors"
            >
              <X className="w-3 h-3" />
              Remove from email body
            </button>
          ) : (
            <button
              type="button"
              onClick={onAdd}
              className="mt-2 flex items-center gap-1 text-[10px] font-medium text-[#3ECF8E] hover:text-[#34b87a] transition-colors"
            >
              <Plus className="w-3 h-3" />
              Embed inline in email
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main editor page ──────────────────────────────────────────────────────────

export default function EmailTemplateEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { orgPath } = useOrg();
  const templateId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Template data
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [variables, setVariables] = useState<string[]>([]);

  // Builder state
  const [blocks, setBlocks] = useState<EmailBlock[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [outOfSync, setOutOfSync] = useState(false);
  const builderInitRef = useRef(false);

  // UI state
  const [previewWidth, setPreviewWidth] = useState<"desktop" | "mobile">("desktop");
  const [htmlSourceOpen, setHtmlSourceOpen] = useState(false);

  useEffect(() => {
    loadTemplate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const loadTemplate = async () => {
    try {
      const list = await api.delivery.listTemplates();
      const template = list.find(t => t.id === templateId);
      if (!template) {
        router.push(orgPath("/email-templates"));
        return;
      }
      setName(template.name);
      setSubject(template.email_subject ?? "");
      setIsDefault(template.is_default);
      setIsActive(template.is_active);
      setVariables(template.variables ?? []);

      const bodyHtml = template.body ?? "";
      setBody(bodyHtml);

      if (!builderInitRef.current) {
        builderInitRef.current = true;
        if (!bodyHtml.trim()) {
          // Fresh template — start with defaults
          const starters = STARTER_BLOCKS.map(b => ({ ...b, id: nanoid(8) }));
          setBlocks(starters);
          const starterHtml = blocksToHtml(starters);
          setBody(starterHtml);
          syncVariables(starterHtml, template.email_subject ?? "");
          setOutOfSync(false);
        } else {
          // Existing HTML — show preview mode; don't show out-of-sync warning
          // outOfSync is only set when the user ACTIVELY types in the HTML textarea
          setBlocks([]);
          setOutOfSync(false);
          syncVariables(bodyHtml, template.email_subject ?? "");
        }
      }
    } catch (err: any) {
      setError(err.message ?? "Failed to load template");
    } finally {
      setLoading(false);
    }
  };

  const syncVariables = useCallback((bodyText: string, subjectText: string) => {
    const matches = new Set<string>();
    const pattern = /\{\{(\s*[\w.]+\s*)\}\}/g;
    let m;
    const combined = bodyText + " " + subjectText;
    while ((m = pattern.exec(combined)) !== null) {
      matches.add(m[1]!.trim());
    }
    setVariables(Array.from(matches));
  }, []);

  // ── Block handlers ──────────────────────────────────────────

  const handleBlocksChange = useCallback((newBlocks: EmailBlock[]) => {
    setBlocks(newBlocks);
    const html = blocksToHtml(newBlocks);
    setBody(html);
    syncVariables(html, subject);
  }, [subject, syncVariables]);

  const addBlock = (type: BlockType) => {
    if (outOfSync) return;
    const b = defaultBlock(type);
    const newBlocks = [...blocks, b];
    handleBlocksChange(newBlocks);
    setSelectedId(b.id);
    // Scroll canvas to bottom
    requestAnimationFrame(() => {
      document.getElementById("block-canvas")?.scrollTo({ top: 99999, behavior: "smooth" });
    });
  };

  const handleStartFresh = () => {
    const starters = STARTER_BLOCKS.map(b => ({ ...b, id: nanoid(8) }));
    const html = blocksToHtml(starters);
    setBlocks(starters);
    setBody(html);
    syncVariables(html, subject);
    setOutOfSync(false);
    setSelectedId(null);
    setHtmlSourceOpen(false);
  };

  // ── Cert image handlers ─────────────────────────────────────

  const handleAddCertImage = () => {
    if (outOfSync) {
      // In HTML mode — append block HTML directly
      const imgBlock = `\n<div style="margin: 32px; text-align: center;">\n  <img src="{{certificate_image_url}}" alt="Your Certificate" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,0.10);" />\n</div>`;
      const newBody = body + imgBlock;
      setBody(newBody);
      syncVariables(newBody, subject);
    } else {
      addBlock("cert_image");
    }
  };

  const handleRemoveCertImage = () => {
    if (outOfSync) {
      const cleaned = body
        .replace(/<div[^>]*>[\s\S]*?<img[^>]*certificate_image_url[^>]*\/?>[\s\S]*?<\/div>/gi, "")
        .replace(/<img[^>]*certificate_image_url[^>]*\/?>/gi, "")
        .trim();
      setBody(cleaned);
      syncVariables(cleaned, subject);
    } else {
      const newBlocks = blocks.filter(b => b.type !== "cert_image");
      handleBlocksChange(newBlocks);
    }
  };

  // ── Subject + HTML source handlers ─────────────────────────

  const handleSubjectChange = (val: string) => {
    setSubject(val);
    syncVariables(body, val);
  };

  const handleHtmlSourceEdit = (html: string) => {
    setBody(html);
    setBlocks([]);
    setOutOfSync(true);
    syncVariables(html, subject);
  };

  // ── Save ────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!name.trim()) { setError("Template name is required"); return; }
    if (!body.trim()) { setError("Template body is required"); return; }
    setSaving(true);
    setError("");
    try {
      await api.delivery.updateTemplate(templateId, {
        name: name.trim(),
        email_subject: subject.trim() || undefined,
        body,
        variables,
        is_default: isDefault,
        is_active: isActive,
      });
      toast.success("Template saved");
    } catch (err: any) {
      setError(err.message ?? "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-12">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Loading template…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] -m-6">
      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-2.5 border-b bg-background shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(orgPath("/email-templates"))}
          className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Templates
        </Button>

        <div className="h-4 w-px bg-border" />

        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Template name"
          className="h-8 w-52 text-sm font-medium border-transparent focus:border-input bg-transparent px-1"
        />

        {variables.length > 0 && (
          <Badge variant="secondary" className="text-xs shrink-0 font-mono gap-1">
            {variables.length} var{variables.length !== 1 ? "s" : ""}
          </Badge>
        )}

        <div className="flex-1" />

        {error && (
          <p className="text-xs text-destructive max-w-xs truncate flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </p>
        )}

        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving}
          className="gap-2 bg-[#3ECF8E] hover:bg-[#34b87a] text-white"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save
        </Button>
      </div>

      {/* ── 3-column body ────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT PANEL ──────────────────────────────────────── */}
        <div className="w-[252px] shrink-0 border-r flex flex-col overflow-y-auto bg-background">

          {/* Subject line */}
          <div className="p-4 border-b space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Subject Line</Label>
            <Input
              value={subject}
              onChange={e => handleSubjectChange(e.target.value)}
              placeholder="Your Certificate from {{organization_name}}"
              className="h-8 text-sm font-mono"
            />
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Use <span className="font-mono bg-muted px-1 rounded">{"{{variable}}"}</span> for dynamic values.
            </p>
          </div>

          {/* Certificate image toggle */}
          <div className="p-4 border-b">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5 block">Certificate Image</Label>
            <CertImageToggle
              blocks={blocks}
              outOfSync={outOfSync}
              body={body}
              onAdd={handleAddCertImage}
              onRemove={handleRemoveCertImage}
            />
          </div>

          {/* Block palette */}
          <div className="p-4 border-b flex-1">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Add Blocks</Label>
              {outOfSync && (
                <span className="text-[10px] text-muted-foreground/60 italic">Builder paused</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {PALETTE.map(item => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => addBlock(item.type)}
                  disabled={outOfSync}
                  title={outOfSync ? "Start fresh to use the builder" : item.desc}
                  className={cn(
                    "flex items-center gap-1.5 p-2 rounded-lg border transition-all text-left",
                    outOfSync
                      ? "opacity-40 cursor-not-allowed border-transparent bg-muted/20"
                      : "border-transparent bg-muted/30 hover:bg-muted/60 hover:border-border cursor-pointer group"
                  )}
                >
                  <span className={cn("shrink-0 text-muted-foreground", !outOfSync && "group-hover:text-[#3ECF8E] transition-colors")}>
                    {item.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium truncate">{item.label}</p>
                    <p className="text-[9px] text-muted-foreground truncate leading-tight">{item.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Multiple certs info */}
          <div className="px-4 py-3 border-b">
            <div className="flex items-start gap-2 text-[10px] text-muted-foreground">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-400" />
              <p className="leading-relaxed">
                One email is sent per certificate row. A recipient with multiple rows gets separate emails for each certificate.
              </p>
            </div>
          </div>

          {/* Template settings */}
          <div className="p-4 border-b space-y-3">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Template Settings</Label>
            <div className="flex items-center justify-between">
              <Label htmlFor="is_default_sw" className="text-xs cursor-pointer text-muted-foreground">Default template</Label>
              <Switch id="is_default_sw" checked={isDefault} onCheckedChange={setIsDefault} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="is_active_sw" className="text-xs cursor-pointer text-muted-foreground">Active</Label>
              <Switch id="is_active_sw" checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>

          {/* HTML source accordion */}
          <div className="border-b">
            <button
              type="button"
              onClick={() => setHtmlSourceOpen(v => !v)}
              className="flex items-center justify-between w-full px-4 py-3 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5" />
                HTML Source
                {outOfSync && <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 font-semibold">ACTIVE</span>}
              </span>
              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", htmlSourceOpen && "rotate-180")} />
            </button>
            {htmlSourceOpen && (
              <div className="px-4 pb-4 space-y-2">
                {outOfSync && (
                  <p className="text-[10px] text-amber-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    Builder is out of sync — HTML is the active source.
                  </p>
                )}
                <textarea
                  value={body}
                  onChange={e => handleHtmlSourceEdit(e.target.value)}
                  className="w-full h-52 p-2 font-mono text-[10px] border rounded-lg bg-muted/20 focus:outline-none focus:ring-1 focus:ring-[#3ECF8E]/40 resize-none leading-relaxed"
                  placeholder="<div>Hello {{recipient_name}},...</div>"
                  spellCheck={false}
                />
                <p className="text-[9px] text-muted-foreground">Editing HTML disables the visual block builder.</p>
              </div>
            )}
          </div>

          {/* Variable reference (collapsed hint) */}
          <div className="p-4">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5 block">Available Variables</Label>
            <div className="space-y-1">
              {[
                { v: "recipient_name", d: "Recipient's name" },
                { v: "organization_name", d: "Your org name" },
                { v: "course_name", d: "Course / program" },
                { v: "issue_date", d: "Issue date" },
                { v: "verification_url", d: "Verify link" },
                { v: "certificate_image_url", d: "Certificate image" },
              ].map(({ v, d }) => (
                <div key={v} className="flex items-center gap-1.5 py-0.5">
                  <code className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono shrink-0">{`{{${v}}}`}</code>
                  <span className="text-[9px] text-muted-foreground truncate">{d}</span>
                </div>
              ))}
              <p className="text-[9px] text-muted-foreground/60 italic mt-1.5">Any spreadsheet column header is also a variable.</p>
            </div>
          </div>
        </div>

        {/* ── CENTER: Block canvas ──────────────────────────── */}
        {!outOfSync && blocks.length === 0 && body.trim() ? (
          /* HTML preview mode — template loaded with existing HTML */
          <div className="flex-1 overflow-y-auto bg-muted/5 min-w-0">
            <div className="sticky top-0 z-10 flex items-center gap-2 px-5 py-2.5 border-b bg-background/95 backdrop-blur-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex-1">Email Preview</p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleStartFresh}
                className="gap-1.5 h-7 text-xs border-[#3ECF8E]/40 text-[#3ECF8E] hover:bg-[#3ECF8E]/10"
              >
                <RefreshCw className="w-3 h-3" />
                Start fresh with Builder
              </Button>
            </div>
            <div className="py-5 px-4">
              <div className="max-w-[600px] mx-auto shadow-xl rounded-2xl overflow-hidden border border-gray-200/70">
                <div className="bg-white border-b border-gray-100 px-5 py-3.5 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#3ECF8E] flex items-center justify-center text-white text-sm font-bold shrink-0 select-none">A</div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Authentix Academy</p>
                    <p className="text-xs text-gray-400">{subject || "Your certificate is ready"}</p>
                  </div>
                </div>
                <div
                  className="bg-white"
                  dangerouslySetInnerHTML={{ __html: applyPreviewMocks(body) }}
                />
              </div>
              <p className="text-center text-[10px] text-muted-foreground/50 mt-4">
                This template uses custom HTML · Edit in HTML Source panel or start fresh with the visual builder
              </p>
            </div>
          </div>
        ) : (
          <div id="block-canvas" className="flex-1 overflow-y-auto bg-muted/5 min-w-0">
            {/* Canvas header */}
            <div className="sticky top-0 z-10 flex items-center gap-2 px-5 py-2.5 border-b bg-background/95 backdrop-blur-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex-1">Email Builder</p>
              <p className="text-[10px] text-muted-foreground">
                {blocks.length > 0 && !outOfSync ? `${blocks.length} block${blocks.length !== 1 ? "s" : ""}` : ""}
              </p>
            </div>

            <EmailBlockBuilder
              blocks={blocks}
              selectedId={selectedId}
              outOfSync={outOfSync}
              subject={subject}
              onChange={handleBlocksChange}
              onSelect={setSelectedId}
              onStartFresh={handleStartFresh}
            />
          </div>
        )}

        {/* ── RIGHT: Live preview ───────────────────────────── */}
        <div className="w-[380px] shrink-0 border-l flex flex-col overflow-hidden bg-slate-50 dark:bg-zinc-950">
          {/* Preview header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b bg-background/95 backdrop-blur-sm shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Live Preview</p>
            <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-muted/30">
              <button
                onClick={() => setPreviewWidth("desktop")}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  previewWidth === "desktop" ? "bg-background shadow-sm" : "hover:bg-muted/50"
                )}
                title="Desktop"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPreviewWidth("mobile")}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  previewWidth === "mobile" ? "bg-background shadow-sm" : "hover:bg-muted/50"
                )}
                title="Mobile"
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Preview area */}
          <div className="flex-1 overflow-y-auto p-4">
            {body.trim() ? (
              <LivePreview html={body} previewWidth={previewWidth} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                  <Monitor className="w-5 h-5 text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground">Add blocks to see a preview</p>
              </div>
            )}
          </div>

          {/* Preview footer note */}
          <div className="border-t px-4 py-2.5 shrink-0">
            <p className="text-[10px] text-muted-foreground">
              Preview uses sample values.{" "}
              <span className="text-amber-600">Yellow highlights</span>{" "}
              = unknown variables replaced at send time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
