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
import {
  Mail, Plus, Edit2, Trash2, Loader2, AlertCircle,
  Copy, FileText, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { api, type DeliveryTemplate } from "@/lib/api/client";
import { useOrg } from "@/lib/org";
import { useRouter } from "next/navigation";
import { PREDEFINED_TEMPLATES, type PredefinedTemplate } from "./PREDEFINED_TEMPLATES";

// ── Predefined template card ──────────────────────────────────────────────────

function PredefinedCard({
  template,
  onUse,
  loading,
}: {
  template: PredefinedTemplate;
  onUse: () => void;
  loading: boolean;
}) {
  return (
    <Card className="group hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-[#3ECF8E] to-[#1a9f6a]" />
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{template.name}</CardTitle>
            <CardDescription className="text-xs mt-0.5">{template.description}</CardDescription>
          </div>
          <Badge variant="secondary" className="text-xs shrink-0">{template.category}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1 mb-4">
          {template.variables.map(v => (
            <span
              key={v}
              className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-muted text-muted-foreground"
            >
              {`{{${v}}}`}
            </span>
          ))}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="w-full gap-2"
          disabled={loading}
          onClick={onUse}
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
          Use this template
        </Button>
      </CardContent>
    </Card>
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
  return (
    <Card className="group hover:shadow-md transition-all duration-200 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base truncate">{template.name}</CardTitle>
              {template.is_default && (
                <Badge variant="outline" className="text-xs shrink-0">Default</Badge>
              )}
              {!template.is_active && (
                <Badge variant="secondary" className="text-xs shrink-0">Inactive</Badge>
              )}
            </div>
            <CardDescription className="text-xs mt-0.5 truncate">
              {template.email_subject ?? "(no subject)"}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-xs shrink-0">Email</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {template.variables.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {template.variables.slice(0, 4).map(v => (
              <span
                key={v}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-muted text-muted-foreground"
              >
                {`{{${v}}}`}
              </span>
            ))}
            {template.variables.length > 4 && (
              <span className="text-xs text-muted-foreground">+{template.variables.length - 4} more</span>
            )}
          </div>
        )}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1 gap-2" onClick={onEdit}>
            <Edit2 className="w-3.5 h-3.5" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            title="Duplicate template"
            disabled={duplicating}
            onClick={onDuplicate}
          >
            {duplicating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={deleting}
            onClick={onDelete}
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
            Design the emails sent to recipients when certificates are issued
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={() => setShowPredefined(true)}>
            <Sparkles className="w-4 h-4 mr-2" />
            From Sample
          </Button>
          <Button onClick={handleCreateBlank} disabled={creatingFromId === "blank"}>
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
          <div className="p-4 rounded-full bg-muted mb-4">
            <Mail className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No email templates yet</h3>
          <p className="text-muted-foreground text-sm max-w-sm mb-6">
            Create your first email template to start sending certificates.
            Choose a predefined design or start from scratch.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowPredefined(true)}>
              <Sparkles className="w-4 h-4 mr-2" />
              Browse Samples
            </Button>
            <Button onClick={handleCreateBlank} disabled={creatingFromId === "blank"}>
              {creatingFromId === "blank"
                ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                : <Plus className="w-4 h-4 mr-2" />}
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
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogTitle className="text-xl font-bold">Choose a Sample Template</DialogTitle>
          <p className="text-muted-foreground text-sm -mt-2">
            Pick a design to use as your starting point. You can customize everything after.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
            {PREDEFINED_TEMPLATES.map(t => (
              <PredefinedCard
                key={t.id}
                template={t}
                onUse={() => handleCreateFromPredefined(t)}
                loading={creatingFromId === t.id}
              />
            ))}
          </div>
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
