"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Save, Loader2, AlertCircle, Monitor,
  Smartphone, Eye, Code2, Variable,
} from "lucide-react";
import { toast } from "sonner";
import { api, type DeliveryTemplate } from "@/lib/api/client";
import { useOrg } from "@/lib/org";

// ── Known template variables ──────────────────────────────────────────────────

const STANDARD_VARIABLES = [
  { key: "recipient_name", label: "Recipient Name", description: "Full name of the certificate recipient" },
  { key: "organization_name", label: "Organization Name", description: "Your organization name" },
  { key: "issue_date", label: "Issue Date", description: "Certificate issue date" },
  { key: "course_name", label: "Course Name", description: "Course or program name" },
  { key: "event_name", label: "Event Name", description: "Event or workshop name" },
  { key: "event_date", label: "Event Date", description: "Date of the event" },
  { key: "award_name", label: "Award Name", description: "Name of the award" },
  { key: "training_name", label: "Training Name", description: "Training program name" },
  { key: "membership_type", label: "Membership Type", description: "Type of membership" },
  { key: "valid_until", label: "Valid Until", description: "Certificate validity date" },
  { key: "completion_date", label: "Completion Date", description: "Date of completion" },
];

// Mock data for variable preview
const MOCK_VALUES: Record<string, string> = {
  recipient_name: "Alex Johnson",
  organization_name: "Authentix Academy",
  issue_date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
  course_name: "Advanced React Development",
  event_name: "Annual Tech Summit 2026",
  event_date: "March 22, 2026",
  award_name: "Employee of the Year",
  training_name: "Leadership Excellence Program",
  membership_type: "Gold Member",
  valid_until: "December 31, 2026",
  completion_date: "March 22, 2026",
};

// ── Variable inserter ─────────────────────────────────────────────────────────

function VariableChip({
  variable,
  onClick,
}: {
  variable: { key: string; label: string; description: string };
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-start gap-2 p-2 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted/60 hover:border-border transition-all text-left w-full"
      title={variable.description}
    >
      <span className="font-mono text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0 mt-0.5">
        {`{{${variable.key}}}`}
      </span>
      <span className="text-xs text-muted-foreground group-hover:text-foreground truncate">{variable.label}</span>
    </button>
  );
}

// ── HTML preview ──────────────────────────────────────────────────────────────

function HtmlPreview({
  html,
  variables,
  previewWidth,
}: {
  html: string;
  variables: string[];
  previewWidth: "desktop" | "mobile";
}) {
  // Replace {{var}} with mock values
  const rendered = html.replace(/\{\{(\s*[\w.]+\s*)\}\}/g, (_, key: string) => {
    const k = key.trim();
    return MOCK_VALUES[k] ?? `<span style="background:#fef3c7;color:#92400e;padding:0 3px;border-radius:2px;font-family:monospace;font-size:12px">{{${k}}}</span>`;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto flex justify-center bg-muted/20 p-4">
        <div
          style={{ width: previewWidth === "mobile" ? 380 : "100%", maxWidth: 700 }}
          className="bg-white rounded-lg shadow-sm overflow-hidden transition-all duration-300"
        >
          <iframe
            srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;padding:0;background:#fff}</style></head><body>${rendered}</body></html>`}
            className="w-full border-0"
            style={{ minHeight: 500, display: "block" }}
            onLoad={(e) => {
              const iframe = e.target as HTMLIFrameElement;
              const body = iframe.contentDocument?.body;
              if (body) {
                iframe.style.height = Math.max(body.scrollHeight, 400) + "px";
              }
            }}
            title="Email Preview"
          />
        </div>
      </div>

      {/* Unresolved variables warning */}
      {variables.length > 0 && (
        <div className="border-t p-3 bg-amber-500/5">
          <p className="text-xs text-amber-700 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            Variables shown in yellow will be replaced with actual recipient data at send time.
          </p>
        </div>
      )}
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

  // Template fields
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [variables, setVariables] = useState<string[]>([]);

  // which field to insert variable into: 'subject' | 'body'
  const [insertTarget, setInsertTarget] = useState<"subject" | "body">("body");

  // UI state
  const [previewWidth, setPreviewWidth] = useState<"desktop" | "mobile">("desktop");
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor");
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadTemplate();
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
      setBody(template.body);
      setIsDefault(template.is_default);
      setIsActive(template.is_active);
      setVariables(template.variables ?? []);
    } catch (err: any) {
      setError(err.message ?? "Failed to load template");
    } finally {
      setLoading(false);
    }
  };

  // Extract variables from body + subject
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

  const handleBodyChange = (val: string) => {
    setBody(val);
    syncVariables(val, subject);
  };

  const handleSubjectChange = (val: string) => {
    setSubject(val);
    syncVariables(body, val);
  };

  const insertVariable = (key: string) => {
    const tag = `{{${key}}}`;

    if (insertTarget === "subject") {
      const el = subjectRef.current;
      const start = el?.selectionStart ?? subject.length;
      const end = el?.selectionEnd ?? subject.length;
      const newSubject = subject.slice(0, start) + tag + subject.slice(end);
      setSubject(newSubject);
      syncVariables(body, newSubject);
      requestAnimationFrame(() => {
        if (!el) return;
        el.focus();
        el.selectionStart = start + tag.length;
        el.selectionEnd = start + tag.length;
      });
    } else {
      const el = bodyRef.current;
      if (!el) return;
      const start = el.selectionStart ?? body.length;
      const end = el.selectionEnd ?? body.length;
      const newBody = body.slice(0, start) + tag + body.slice(end);
      setBody(newBody);
      syncVariables(newBody, subject);
      requestAnimationFrame(() => {
        el.focus();
        el.selectionStart = start + tag.length;
        el.selectionEnd = start + tag.length;
      });
    }
  };

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
    <div className="flex flex-col h-[calc(100vh-80px)] gap-0 -m-6">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b bg-background shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(orgPath("/email-templates"))}
          className="gap-2 text-muted-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Templates
        </Button>

        <div className="h-4 w-px bg-border" />

        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Template name"
          className="h-8 w-56 text-sm font-medium border-transparent focus:border-input bg-transparent px-1"
        />

        <div className="flex-1" />

        {/* Desktop / Mobile toggle */}
        <div className="flex items-center gap-1 border rounded-lg p-0.5">
          <button
            onClick={() => setPreviewWidth("desktop")}
            className={`p-1.5 rounded-md transition-colors ${previewWidth === "desktop" ? "bg-muted" : "hover:bg-muted/50"}`}
            title="Desktop preview"
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button
            onClick={() => setPreviewWidth("mobile")}
            className={`p-1.5 rounded-md transition-colors ${previewWidth === "mobile" ? "bg-muted" : "hover:bg-muted/50"}`}
            title="Mobile preview"
          >
            <Smartphone className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <p className="text-xs text-destructive max-w-xs truncate">{error}</p>
        )}

        <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save
        </Button>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Editor */}
        <div className="flex flex-col w-1/2 border-r overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Subject */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Subject</Label>
              <Input
                ref={subjectRef}
                value={subject}
                onChange={e => handleSubjectChange(e.target.value)}
                onFocus={() => setInsertTarget("subject")}
                placeholder="Your Certificate from {{organization_name}}"
                className={`font-mono text-sm transition-colors ${insertTarget === "subject" ? "ring-2 ring-primary/30" : ""}`}
              />
              <p className="text-xs text-muted-foreground">
                Click a variable below to insert it at the cursor position.
              </p>
            </div>

            {/* Body */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  HTML Body
                </Label>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Code2 className="w-3 h-3" />
                  HTML supported
                </div>
              </div>
              <textarea
                ref={bodyRef}
                value={body}
                onChange={e => handleBodyChange(e.target.value)}
                onFocus={() => setInsertTarget("body")}
                className="w-full min-h-[420px] p-3 font-mono text-xs border rounded-md bg-muted/20 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-y leading-relaxed"
                placeholder="<div>Hello {{recipient_name}},...</div>"
                spellCheck={false}
              />
            </div>

            {/* Settings */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="flex items-center gap-2">
                <Switch id="is_default_editor" checked={isDefault} onCheckedChange={setIsDefault} />
                <Label htmlFor="is_default_editor" className="text-sm cursor-pointer">Default template</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="is_active_editor" checked={isActive} onCheckedChange={setIsActive} />
                <Label htmlFor="is_active_editor" className="text-sm cursor-pointer">Active</Label>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Variables + Preview */}
        <div className="flex flex-col w-1/2 overflow-hidden">
          <Tabs value={activeTab} onValueChange={v => setActiveTab(v as "editor" | "preview")} className="flex flex-col h-full">
            <TabsList className="m-3 mb-0 shrink-0 w-auto self-start">
              <TabsTrigger value="editor" className="gap-1.5 text-xs">
                <Variable className="w-3.5 h-3.5" />
                Variables
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-1.5 text-xs">
                <Eye className="w-3.5 h-3.5" />
                Preview
              </TabsTrigger>
            </TabsList>

            {/* Variables tab */}
            <TabsContent value="editor" className="flex-1 overflow-y-auto p-4 space-y-4 m-0">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Click to insert into:
                  </p>
                  <div className="flex items-center gap-1 border rounded-md p-0.5 bg-muted/30">
                    <button
                      type="button"
                      onClick={() => setInsertTarget("subject")}
                      className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${insertTarget === "subject" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Subject
                    </button>
                    <button
                      type="button"
                      onClick={() => setInsertTarget("body")}
                      className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${insertTarget === "body" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Body
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {STANDARD_VARIABLES.map(v => (
                    <VariableChip key={v.key} variable={v} onClick={() => insertVariable(v.key)} />
                  ))}
                </div>
              </div>

              {variables.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Used in this template
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {variables.map(v => (
                      <Badge key={v} variant="secondary" className="font-mono text-xs">
                        {`{{${v}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <strong>Custom fields:</strong> Any column header from your uploaded data (CSV/Excel)
                  can also be used as a variable. For example, if your data has a &ldquo;grade&rdquo; column,
                  you can write <code className="bg-muted px-1 rounded text-xs">{"{{grade}}"}</code> in the template.
                </p>
              </div>
            </TabsContent>

            {/* Preview tab */}
            <TabsContent value="preview" className="flex-1 overflow-hidden m-0">
              <HtmlPreview html={body} variables={variables} previewWidth={previewWidth} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
