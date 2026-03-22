"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Mail, CheckCircle2, AlertCircle, Loader2, Plus, Trash2,
  Info, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { api, type DeliveryIntegration } from "@/lib/api/client";
import Link from "next/link";
import { useOrg } from "@/lib/org";

// ── Status badge ─────────────────────────────────────────────────────────────

function IntegrationStatus({ integration }: { integration: DeliveryIntegration }) {
  if (!integration.is_active) {
    return <Badge variant="secondary">Inactive</Badge>;
  }
  return (
    <Badge className="bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/10">
      <CheckCircle2 className="w-3 h-3 mr-1" />
      Active
    </Badge>
  );
}

// ── Integration form ──────────────────────────────────────────────────────────

interface IntegrationFormProps {
  initial?: Partial<DeliveryIntegration>;
  onSave: (data: {
    from_email: string;
    from_name: string;
    reply_to: string;
    display_name: string;
    is_default: boolean;
  }) => Promise<void>;
  onCancel?: () => void;
  saving: boolean;
}

function IntegrationForm({ initial, onSave, onCancel, saving }: IntegrationFormProps) {
  const [fromEmail, setFromEmail] = useState(initial?.from_email ?? "");
  const [fromName, setFromName] = useState(initial?.from_name ?? "");
  const [replyTo, setReplyTo] = useState(initial?.reply_to ?? "");
  const [displayName, setDisplayName] = useState(initial?.display_name ?? "My Email");
  const [isDefault, setIsDefault] = useState(initial?.is_default ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ from_email: fromEmail, from_name: fromName, reply_to: replyTo, display_name: displayName, is_default: isDefault });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="from_email">From Email *</Label>
          <Input
            id="from_email"
            type="email"
            placeholder="certificates@yourdomain.com"
            value={fromEmail}
            onChange={e => setFromEmail(e.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">Must be verified in AWS SES</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="from_name">Sender Name</Label>
          <Input
            id="from_name"
            placeholder="Your Organization"
            value={fromName}
            onChange={e => setFromName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reply_to">Reply-To Email</Label>
          <Input
            id="reply_to"
            type="email"
            placeholder="support@yourdomain.com"
            value={replyTo}
            onChange={e => setReplyTo(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="display_name">Display Name</Label>
          <Input
            id="display_name"
            placeholder="My Email"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Switch id="is_default" checked={isDefault} onCheckedChange={setIsDefault} />
        <Label htmlFor="is_default" className="cursor-pointer">Set as default integration</Label>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={saving || !fromEmail}>
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : "Save Integration"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function EmailDeliverySettingsPage() {
  const { orgPath } = useOrg();
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<DeliveryIntegration[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const list = await api.delivery.listIntegrations();
      setIntegrations(list);
    } catch (err: any) {
      setError(err.message ?? "Failed to load integrations");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: {
    from_email: string; from_name: string; reply_to: string;
    display_name: string; is_default: boolean;
  }) => {
    setSaving(true);
    setError("");
    try {
      await api.delivery.createIntegration({
        channel: "email",
        provider: "ses",
        display_name: data.display_name,
        from_email: data.from_email,
        from_name: data.from_name || undefined,
        reply_to: data.reply_to || undefined,
        is_default: data.is_default,
        is_active: true,
      });
      setShowAddForm(false);
      toast.success("Integration saved");
      await load();
    } catch (err: any) {
      setError(err.message ?? "Failed to save integration");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string, data: {
    from_email: string; from_name: string; reply_to: string;
    display_name: string; is_default: boolean;
  }) => {
    setSaving(true);
    setError("");
    try {
      await api.delivery.updateIntegration(id, {
        display_name: data.display_name,
        from_email: data.from_email,
        from_name: data.from_name || undefined,
        reply_to: data.reply_to || undefined,
        is_default: data.is_default,
      });
      setEditingId(null);
      toast.success("Integration updated");
      await load();
    } catch (err: any) {
      setError(err.message ?? "Failed to update integration");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await api.delivery.deleteIntegration(id);
      toast.success("Integration removed");
      await load();
    } catch (err: any) {
      setError(err.message ?? "Failed to delete integration");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Email Delivery</h1>
        <p className="text-muted-foreground mt-1.5 text-base">
          Configure your email sender and manage delivery templates
        </p>
      </div>

      {/* Error messages */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Info banner */}
      <Alert className="border-blue-500/30 bg-blue-500/5">
        <Info className="h-4 w-4 text-blue-500" />
        <AlertDescription className="text-sm">
          Authentix uses <strong>Amazon SES</strong> to deliver certificates by email. Your sender
          email must be verified in AWS SES before sending. By default, emails are sent from
          Authentix&apos;s domain — add your own email below to send from your brand.
        </AlertDescription>
      </Alert>

      {/* Integrations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Email Integrations</CardTitle>
              <CardDescription>
                {integrations.length === 0
                  ? "Using Authentix default email. Add your own sender below."
                  : `${integrations.length} integration${integrations.length !== 1 ? "s" : ""} configured`}
              </CardDescription>
            </div>
            {!showAddForm && (
              <Button size="sm" onClick={() => setShowAddForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Integration
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading…</span>
            </div>
          ) : (
            <>
              {/* Default platform row */}
              {integrations.length === 0 && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-dashed">
                  <Mail className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Authentix Default Email</p>
                    <p className="text-xs text-muted-foreground">
                      certificates are sent from Authentix&apos;s verified domain
                    </p>
                  </div>
                  <Badge variant="secondary">Default</Badge>
                </div>
              )}

              {/* Existing integrations */}
              {integrations.map(integration => (
                <div key={integration.id}>
                  {editingId === integration.id ? (
                    <Card className="p-4">
                      <p className="text-sm font-medium mb-4">Edit Integration</p>
                      <IntegrationForm
                        initial={integration}
                        onSave={(data) => handleUpdate(integration.id, data)}
                        onCancel={() => setEditingId(null)}
                        saving={saving}
                      />
                    </Card>
                  ) : (
                    <div className="flex items-center gap-3 p-3 rounded-lg border">
                      <Mail className="w-5 h-5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{integration.display_name}</p>
                          <IntegrationStatus integration={integration} />
                          {integration.is_default && (
                            <Badge variant="outline" className="text-xs">Default</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {integration.from_name
                            ? `${integration.from_name} <${integration.from_email}>`
                            : integration.from_email}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingId(integration.id)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deletingId === integration.id}
                          onClick={() => handleDelete(integration.id)}
                        >
                          {deletingId === integration.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Trash2 className="w-4 h-4 text-destructive" />}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Add form */}
              {showAddForm && (
                <Card className="p-4">
                  <p className="text-sm font-medium mb-4">New Integration</p>
                  <IntegrationForm
                    onSave={handleCreate}
                    onCancel={() => setShowAddForm(false)}
                    saving={saving}
                  />
                </Card>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Templates shortcut */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Email Templates</CardTitle>
          <CardDescription>
            Design and manage the email templates used when sending certificates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href={orgPath("/email-templates")}>
            <Button variant="outline" className="gap-2">
              Manage Templates
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
