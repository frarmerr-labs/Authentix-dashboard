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
  Info, ArrowRight, Edit2, LayoutTemplate, Server, ExternalLink,
  ChevronDown, ChevronUp, Pencil, Check,
} from "lucide-react";
import { toast } from "sonner";
import { api, type DeliveryIntegration } from "@/lib/api/client";
import Link from "next/link";
import { useOrg } from "@/lib/org";

// ── Provider logos ─────────────────────────────────────────────────────────

function ProviderLogo({ provider, preset, size = 20 }: { provider: "ses" | "smtp"; preset?: string; size?: number }) {
  if (provider === "smtp") {
    if (preset === "gmail") return <img src="/provider-logos/gmail.svg" alt="Gmail" width={size} height={size} className="shrink-0" />;
    if (preset === "outlook") return <img src="/provider-logos/outlook.svg" alt="Outlook" width={size} height={size} className="shrink-0" />;
    return <img src="/provider-logos/email-generic.svg" alt="Email" width={size} height={size} className="shrink-0 opacity-60" />;
  }
  return <img src="/provider-logos/aws-ses.svg" alt="AWS SES" width={size} height={size} className="shrink-0" />;
}

// ── SMTP preset configs ────────────────────────────────────────────────────

const SMTP_PRESETS = {
  gmail:   { host: "smtp.gmail.com",        port: 587, secure: false, hint: "Use an App Password — not your regular password. Go to Google Account → Security → 2-Step Verification → App Passwords." },
  outlook: { host: "smtp-mail.outlook.com", port: 587, secure: false, hint: "Use your Outlook email and account password. For Microsoft 365 accounts, App Passwords may be required." },
  custom:  { host: "",                       port: 587, secure: false, hint: "Enter the SMTP server details from your email provider's documentation." },
};

// ── Form data interface ────────────────────────────────────────────────────

interface IntegrationFormData {
  provider: "ses" | "smtp";
  from_email: string;
  from_name: string;
  reply_to: string;
  display_name: string;
  is_default: boolean;
  smtp_host?: string;
  smtp_port?: number;
  smtp_secure?: boolean;
  smtp_user?: string;
  smtp_password?: string;
}

// ── Setup guide collapsible ────────────────────────────────────────────────

function SetupGuide({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-[#3ECF8E]/30 bg-[#3ECF8E]/5 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
      >
        <Info className="w-3.5 h-3.5 text-[#3ECF8E] shrink-0" />
        <span className="text-xs text-[#2aac76] font-medium flex-1">{title}</span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-[#3ECF8E]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#3ECF8E]" />}
      </button>
      {open && (
        <div className="px-3 pb-3 border-t border-[#3ECF8E]/20">
          {children}
        </div>
      )}
    </div>
  );
}

function SesVerificationSteps() {
  return (
    <SetupGuide title="How to verify your sender email in AWS SES">
      <ol className="space-y-1.5 text-xs text-foreground/70 mt-2.5">
        {[
          <>Sign in to the <strong>AWS Management Console</strong> and navigate to <strong>Amazon SES</strong>.</>,
          <>In the left sidebar, go to <strong>Configuration → Verified Identities</strong>.</>,
          <>Click <strong>Create Identity</strong>, choose <strong>Email address</strong>, and enter your sender email.</>,
          <>AWS will send a verification email to that address — <strong>click the link inside it</strong>.</>,
          <>Back in the AWS console, confirm the identity status shows <strong>Verified</strong>.</>,
          <>If your account is in <strong>SES Sandbox</strong>, you also need to verify recipient emails or request production access.</>,
        ].map((step, i) => (
          <li key={i} className="flex gap-2">
            <span className="font-bold shrink-0 text-[#3ECF8E] w-4">{i + 1}.</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <a
        href="https://docs.aws.amazon.com/ses/latest/dg/creating-identities.html"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-[#2aac76] font-semibold hover:text-[#1a9f6a] underline underline-offset-2 mt-2.5"
      >
        AWS Official Documentation <ExternalLink className="w-3 h-3" />
      </a>
    </SetupGuide>
  );
}

function GmailSetupSteps() {
  return (
    <SetupGuide title="How to set up Gmail SMTP with an App Password">
      <ol className="space-y-1.5 text-xs text-foreground/70 mt-2.5">
        {[
          <>Your Google account must have <strong>2-Step Verification enabled</strong>. Go to <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" className="text-[#2aac76] underline"><strong>Google Account Security</strong></a> to enable it.</>,
          <>Once 2FA is on, visit <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-[#2aac76] underline"><strong>App Passwords</strong></a> in your Google account.</>,
          <>Choose <strong>Mail</strong> as the app and <strong>Other</strong> as the device — give it a name like "Authentix".</>,
          <>Google will show a <strong>16-character App Password</strong> — copy it. This is your SMTP password.</>,
          <>In the form below: host <code className="bg-muted px-1 rounded">smtp.gmail.com</code>, port <code className="bg-muted px-1 rounded">587</code>, username = your Gmail address, password = the App Password.</>,
        ].map((step, i) => (
          <li key={i} className="flex gap-2">
            <span className="font-bold shrink-0 text-[#3ECF8E] w-4">{i + 1}.</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </SetupGuide>
  );
}

function OutlookSetupSteps() {
  return (
    <SetupGuide title="How to set up Outlook / Microsoft 365 SMTP">
      <ol className="space-y-1.5 text-xs text-foreground/70 mt-2.5">
        {[
          <>For <strong>personal Outlook.com</strong> accounts: go to <a href="https://account.live.com/proofs/manage" target="_blank" rel="noopener noreferrer" className="text-[#2aac76] underline"><strong>Microsoft Account Security</strong></a>, enable 2FA, then create an App Password under <strong>Security → Advanced security options</strong>.</>,
          <>For <strong>Microsoft 365 / work accounts</strong>: your admin must allow SMTP AUTH. Go to <strong>Microsoft 365 Admin Center → Settings → Mail flow</strong> and enable SMTP AUTH for your account.</>,
          <>Use host <code className="bg-muted px-1 rounded">smtp-mail.outlook.com</code>, port <code className="bg-muted px-1 rounded">587</code>, and STARTTLS (leave SSL/TLS off).</>,
          <>Username = your full Outlook email. Password = your App Password or account password (if SMTP AUTH is permitted without App Password).</>,
        ].map((step, i) => (
          <li key={i} className="flex gap-2">
            <span className="font-bold shrink-0 text-[#3ECF8E] w-4">{i + 1}.</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <a
        href="https://support.microsoft.com/en-us/office/pop-imap-and-smtp-settings-for-outlook-com-d088b986-291d-42b8-9564-9c414e2aa040"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-[#2aac76] font-semibold hover:text-[#1a9f6a] underline underline-offset-2 mt-2.5"
      >
        Microsoft SMTP Documentation <ExternalLink className="w-3 h-3" />
      </a>
    </SetupGuide>
  );
}

// ── Integration form ───────────────────────────────────────────────────────

interface IntegrationFormProps {
  initial?: Partial<DeliveryIntegration>;
  onSave: (data: IntegrationFormData) => Promise<void>;
  onCancel?: () => void;
  saving: boolean;
}

function IntegrationForm({ initial, onSave, onCancel, saving }: IntegrationFormProps) {
  const initialProvider = (initial?.provider === "smtp" ? "smtp" : "ses") as "ses" | "smtp";
  const [provider, setProvider] = useState<"ses" | "smtp">(initialProvider);
  const [fromEmail, setFromEmail] = useState(initial?.from_email ?? "");
  const [fromName, setFromName] = useState(initial?.from_name ?? "");
  const [replyTo, setReplyTo] = useState(initial?.reply_to ?? "");
  const [displayName, setDisplayName] = useState(initial?.display_name ?? "My Email");
  const [isDefault, setIsDefault] = useState(initial?.is_default ?? true);
  const [smtpPreset, setSmtpPreset] = useState<keyof typeof SMTP_PRESETS>("custom");
  const [smtpHost, setSmtpHost] = useState((initial as any)?.config?.smtp_host ?? "");
  const [smtpPort, setSmtpPort] = useState<number>((initial as any)?.config?.smtp_port ?? 587);
  const [smtpSecure, setSmtpSecure] = useState<boolean>((initial as any)?.config?.smtp_secure ?? false);
  const [smtpUser, setSmtpUser] = useState((initial as any)?.config?.smtp_user ?? "");
  const [smtpPassword, setSmtpPassword] = useState("");

  const applyPreset = (key: keyof typeof SMTP_PRESETS) => {
    setSmtpPreset(key);
    const p = SMTP_PRESETS[key];
    if (p.host) setSmtpHost(p.host);
    setSmtpPort(p.port);
    setSmtpSecure(p.secure);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      provider,
      from_email: fromEmail,
      from_name: fromName,
      reply_to: replyTo,
      display_name: displayName,
      is_default: isDefault,
      ...(provider === "smtp" ? {
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_secure: smtpSecure,
        smtp_user: smtpUser,
        smtp_password: smtpPassword || undefined,
      } : {}),
    });
  };

  const isSmtpValid = provider !== "smtp" || (smtpHost && smtpUser && (!!smtpPassword || !!initial?.id));

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Provider picker */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email Provider</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setProvider("ses")}
            className={`flex items-center gap-2.5 p-3 rounded-lg border-2 text-left transition-all ${provider === "ses" ? "border-[#3ECF8E] bg-[#3ECF8E]/5" : "border-border hover:border-border/80"}`}
          >
            <ProviderLogo provider="ses" size={22} />
            <div>
              <p className="text-sm font-semibold">AWS SES</p>
              <p className="text-[11px] text-muted-foreground">High volume, low cost</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setProvider("smtp")}
            className={`flex items-center gap-2.5 p-3 rounded-lg border-2 text-left transition-all ${provider === "smtp" ? "border-[#3ECF8E] bg-[#3ECF8E]/5" : "border-border hover:border-border/80"}`}
          >
            <Server className="w-5 h-5 text-blue-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Custom SMTP</p>
              <p className="text-[11px] text-muted-foreground">Gmail, Outlook, any SMTP</p>
            </div>
          </button>
        </div>

        {provider === "ses" && <SesVerificationSteps />}

        {provider === "smtp" && smtpPreset === "custom" && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-[#3ECF8E]/5 border border-[#3ECF8E]/25 text-xs text-[#2aac76]">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#3ECF8E]" />
            Enter your SMTP server details below. Works with any email provider — Zoho, SendGrid, Mailgun, and others.
          </div>
        )}
      </div>

      <Separator />

      {/* Sender identity */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Sender Identity</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="from_email">From Email <span className="text-destructive">*</span></Label>
            <Input
              id="from_email"
              type="email"
              placeholder="certificates@yourdomain.com"
              value={fromEmail}
              onChange={e => setFromEmail(e.target.value)}
              required
            />
            {provider === "ses" && <p className="text-xs text-muted-foreground">Must be verified in AWS SES</p>}
            {provider === "smtp" && <p className="text-xs text-muted-foreground">Should match your SMTP username</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="from_name">Sender Name</Label>
            <Input
              id="from_name"
              placeholder="Your Organization"
              value={fromName}
              onChange={e => setFromName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Shown as "From" in email clients</p>
          </div>
        </div>
      </div>

      {/* SMTP config */}
      {provider === "smtp" && (
        <>
          <Separator />
          <div className="space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">SMTP Configuration</p>

            {/* Preset picker with logos */}
            <div className="space-y-1.5">
              <Label className="text-xs">Quick preset</Label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(SMTP_PRESETS) as (keyof typeof SMTP_PRESETS)[]).map(k => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => applyPreset(k)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${smtpPreset === k ? "bg-[#3ECF8E]/10 text-[#3ECF8E] border-[#3ECF8E]" : "border-border text-muted-foreground hover:border-[#3ECF8E]/40 hover:text-foreground"}`}
                  >
                    {k === "gmail" && <img src="/provider-logos/gmail.svg" alt="" width={14} height={14} />}
                    {k === "outlook" && <img src="/provider-logos/outlook.svg" alt="" width={14} height={14} />}
                    {k === "custom" && <img src="/provider-logos/email-generic.svg" alt="" width={14} height={14} className="opacity-60" />}
                    <span className="capitalize">{k}</span>
                  </button>
                ))}
              </div>
              {smtpPreset === "gmail" && <GmailSetupSteps />}
              {smtpPreset === "outlook" && <OutlookSetupSteps />}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="smtp_host">SMTP Host <span className="text-destructive">*</span></Label>
                <Input id="smtp_host" placeholder="smtp.gmail.com" value={smtpHost} onChange={e => setSmtpHost(e.target.value)} required={provider === "smtp"} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="smtp_port">Port</Label>
                <Input id="smtp_port" type="number" placeholder="587" value={smtpPort} onChange={e => setSmtpPort(Number(e.target.value))} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="smtp_user">Username / Email <span className="text-destructive">*</span></Label>
                <Input id="smtp_user" type="email" placeholder="you@gmail.com" value={smtpUser} onChange={e => setSmtpUser(e.target.value)} required={provider === "smtp"} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="smtp_password">{initial?.id ? "New Password (leave blank to keep)" : "Password / App Password"} <span className="text-destructive">{!initial?.id && "*"}</span></Label>
                <Input id="smtp_password" type="password" placeholder={initial?.id ? "●●●●●●●●" : "App password"} value={smtpPassword} onChange={e => setSmtpPassword(e.target.value)} required={provider === "smtp" && !initial?.id} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch id="smtp_secure" checked={smtpSecure} onCheckedChange={setSmtpSecure} />
              <Label htmlFor="smtp_secure" className="text-sm cursor-pointer">Use SSL/TLS (port 465)</Label>
            </div>
          </div>
        </>
      )}

      <Separator />

      {/* Display settings */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="reply_to">Reply-To Email</Label>
          <Input id="reply_to" type="email" placeholder="support@yourdomain.com" value={replyTo} onChange={e => setReplyTo(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="display_name">Display Name</Label>
          <Input id="display_name" placeholder="My Email" value={displayName} onChange={e => setDisplayName(e.target.value)} />
          <p className="text-xs text-muted-foreground">Internal label for this integration</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Switch id="is_default" checked={isDefault} onCheckedChange={setIsDefault} />
        <Label htmlFor="is_default" className="cursor-pointer">Set as default integration</Label>
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={saving || !fromEmail || !isSmtpValid} className="bg-[#3ECF8E] hover:bg-[#34b87a] text-white">
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : "Save Integration"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        )}
      </div>
    </form>
  );
}

// ── Provider icon for integration card ────────────────────────────────────

function IntegrationProviderIcon({ integration }: { integration: DeliveryIntegration }) {
  if (integration.provider === "smtp") {
    const config = (integration as any).config ?? {};
    const host: string = config.smtp_host ?? "";
    if (host.includes("gmail")) return <img src="/provider-logos/gmail.svg" alt="Gmail" width={18} height={18} />;
    if (host.includes("outlook") || host.includes("microsoft")) return <img src="/provider-logos/outlook.svg" alt="Outlook" width={18} height={18} />;
    return <img src="/provider-logos/email-generic.svg" alt="SMTP" width={18} height={18} className="opacity-60" />;
  }
  return <ProviderLogo provider="ses" size={18} />;
}

// ── Main page ──────────────────────────────────────────────────────────────

const PLATFORM_DEFAULT_EMAIL = "info@xencus.com";
const PLATFORM_DEFAULT_NAME_KEY = "authentix_default_sender_name";

export default function EmailDeliverySettingsPage() {
  const { orgPath } = useOrg();
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<DeliveryIntegration[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Authentix default: editable sender name stored in localStorage
  const [defaultSenderName, setDefaultSenderName] = useState("Authentix");
  const [editingDefaultName, setEditingDefaultName] = useState(false);
  const [defaultNameDraft, setDefaultNameDraft] = useState("Authentix");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(PLATFORM_DEFAULT_NAME_KEY) : null;
    if (stored) { setDefaultSenderName(stored); setDefaultNameDraft(stored); }
    load();
  }, []);

  const saveDefaultName = () => {
    const v = defaultNameDraft.trim() || "Authentix";
    setDefaultSenderName(v);
    localStorage.setItem(PLATFORM_DEFAULT_NAME_KEY, v);
    setEditingDefaultName(false);
    toast.success("Sender name saved");
  };

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

  const handleCreate = async (data: IntegrationFormData) => {
    setSaving(true);
    setError("");
    try {
      await api.delivery.createIntegration({
        channel: "email",
        provider: data.provider,
        display_name: data.display_name,
        from_email: data.from_email,
        from_name: data.from_name || undefined,
        reply_to: data.reply_to || undefined,
        is_default: data.is_default,
        is_active: true,
        ...(data.provider === "smtp" ? {
          smtp_host: data.smtp_host,
          smtp_port: data.smtp_port,
          smtp_secure: data.smtp_secure,
          smtp_user: data.smtp_user,
          smtp_password: data.smtp_password,
        } : {}),
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

  const handleUpdate = async (id: string, data: IntegrationFormData) => {
    setSaving(true);
    setError("");
    try {
      await api.delivery.updateIntegration(id, {
        display_name: data.display_name,
        from_email: data.from_email,
        from_name: data.from_name || undefined,
        reply_to: data.reply_to || undefined,
        is_default: data.is_default,
        ...(data.provider === "smtp" ? {
          smtp_host: data.smtp_host,
          smtp_port: data.smtp_port,
          smtp_secure: data.smtp_secure,
          smtp_user: data.smtp_user,
          smtp_password: data.smtp_password || undefined,
        } : {}),
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

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    setTogglingId(id);
    try {
      await api.delivery.updateIntegration(id, { is_active: !currentActive });
      setIntegrations(prev => prev.map(i => i.id === id ? { ...i, is_active: !currentActive } : i));
      toast.success(currentActive ? "Integration disabled" : "Integration enabled");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update");
    } finally {
      setTogglingId(null);
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

  const activeDefault = integrations.find(i => i.is_default && i.is_active) ?? integrations.find(i => i.is_active);
  const usingPlatformDefault = integrations.filter(i => i.is_active).length === 0;

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Email Delivery</h1>
        <p className="text-muted-foreground mt-1.5 text-base">
          Configure your email sender and manage delivery settings
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ── Authentix Default section ─────────────────────────────────────── */}
      <Card className={usingPlatformDefault ? "border-[#3ECF8E]/40 shadow-sm" : ""}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg shrink-0 ${usingPlatformDefault ? "bg-[#3ECF8E]/10" : "bg-muted"}`}>
              <Mail className={`w-4 h-4 ${usingPlatformDefault ? "text-[#3ECF8E]" : "text-muted-foreground"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base">Authentix Default Email</CardTitle>
                {usingPlatformDefault && (
                  <Badge className="bg-[#3ECF8E]/10 text-[#3ECF8E] border-[#3ECF8E]/30 hover:bg-[#3ECF8E]/10 text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Currently In Use
                  </Badge>
                )}
              </div>
              <CardDescription className="mt-0.5 text-xs">
                When no custom integration is active, certificates are sent from Authentix&apos;s verified sender.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Sender details */}
          <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Sender Email</p>
                <p className="text-sm font-mono font-medium">{PLATFORM_DEFAULT_EMAIL}</p>
              </div>
              <Badge variant="outline" className="text-xs">Managed by Authentix</Badge>
            </div>
            <Separator />
            {/* Editable sender name */}
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Sender Name</p>
              {editingDefaultName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={defaultNameDraft}
                    onChange={e => setDefaultNameDraft(e.target.value)}
                    className="h-8 text-sm flex-1"
                    placeholder="Authentix"
                    autoFocus
                    onKeyDown={e => { if (e.key === "Enter") saveDefaultName(); if (e.key === "Escape") setEditingDefaultName(false); }}
                  />
                  <Button size="sm" className="h-8 gap-1 bg-[#3ECF8E] hover:bg-[#34b87a] text-white shrink-0" onClick={saveDefaultName}>
                    <Check className="w-3 h-3" /> Save
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingDefaultName(false)}>✕</Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium flex-1">{defaultSenderName}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => { setDefaultNameDraft(defaultSenderName); setEditingDefaultName(true); }}
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </Button>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">Recipients will see this as the "From" name in their inbox.</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Add your own integration below to send from your domain instead.
          </p>
        </CardContent>
      </Card>

      {/* ── Custom integrations ────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Your Email Integrations</CardTitle>
              <CardDescription className="mt-0.5">
                {integrations.length === 0
                  ? "No custom integrations yet — using Authentix default above."
                  : `${integrations.length} integration${integrations.length !== 1 ? "s" : ""} · ${activeDefault ? `Sending from ${activeDefault.from_email}` : "None active"}`}
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant={showAddForm ? "outline" : "default"}
              onClick={() => { setShowAddForm(v => !v); setEditingId(null); }}
              className={`gap-1.5 ${showAddForm ? "" : "bg-[#3ECF8E] hover:bg-[#34b87a] text-white"}`}
            >
              {showAddForm ? (
                <><ChevronUp className="w-4 h-4" /> Collapse</>
              ) : (
                <><Plus className="w-4 h-4" /> Add Integration</>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading…</span>
            </div>
          ) : (
            <>
              {/* Existing integrations */}
              {integrations.map(integration => (
                <div key={integration.id}>
                  {editingId === integration.id ? (
                    <Card className="p-5 border-[#3ECF8E]/30">
                      <p className="text-sm font-semibold mb-4">Edit Integration</p>
                      <IntegrationForm
                        initial={integration}
                        onSave={(data) => handleUpdate(integration.id, data)}
                        onCancel={() => setEditingId(null)}
                        saving={saving}
                      />
                    </Card>
                  ) : (
                    <div className={`rounded-lg border transition-colors ${integration.is_active ? "hover:bg-muted/10" : "bg-muted/20 opacity-70"}`}>
                      <div className="flex items-center gap-3 p-3.5">
                        {/* Provider icon */}
                        <div className="p-2 rounded-full bg-background border shrink-0 flex items-center justify-center w-9 h-9">
                          <IntegrationProviderIcon integration={integration} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold truncate">{integration.display_name}</p>
                            <Badge variant="secondary" className="text-[10px] uppercase tracking-wide shrink-0">
                              {integration.provider === "smtp" ? "SMTP" : "SES"}
                            </Badge>
                            {integration.is_default && integration.is_active && (
                              <Badge className="text-xs bg-[#3ECF8E]/10 border-[#3ECF8E]/30 text-[#3ECF8E] hover:bg-[#3ECF8E]/10 shrink-0">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                In Use
                              </Badge>
                            )}
                            {!integration.is_active && (
                              <Badge variant="secondary" className="text-xs shrink-0">Disabled</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {integration.from_name
                              ? `${integration.from_name} ‹${integration.from_email}›`
                              : integration.from_email}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Enable / Disable toggle */}
                          <div className="flex items-center gap-1.5 mr-1">
                            <Switch
                              checked={integration.is_active}
                              disabled={togglingId === integration.id}
                              onCheckedChange={() => handleToggleActive(integration.id, integration.is_active)}
                              className="data-[state=checked]:bg-[#3ECF8E]"
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 text-xs"
                            onClick={() => { setEditingId(integration.id); setShowAddForm(false); }}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
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
                    </div>
                  )}
                </div>
              ))}

              {integrations.length === 0 && !showAddForm && (
                <div className="text-center py-8 text-muted-foreground">
                  <Server className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No integrations yet.</p>
                  <p className="text-xs mt-0.5">Click "Add Integration" to connect Gmail, Outlook, or AWS SES.</p>
                </div>
              )}

              {/* Add form — collapsible */}
              {showAddForm && (
                <Card className="p-5 border-[#3ECF8E]/30 mt-2">
                  <p className="text-sm font-semibold mb-4">New Integration</p>
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
      <Card className="overflow-hidden">
        <div className="h-0.5 w-full bg-gradient-to-r from-[#3ECF8E] to-[#4f46e5]" />
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#3ECF8E]/10 shrink-0">
              <LayoutTemplate className="w-4 h-4 text-[#3ECF8E]" />
            </div>
            <div>
              <CardTitle className="text-lg">Email Templates</CardTitle>
              <CardDescription className="mt-0.5">
                Design the email sent to recipients when their certificate is issued.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Link href={orgPath("/email-templates")}>
            <Button className="gap-2 bg-[#3ECF8E] hover:bg-[#34b87a] text-white">
              Manage Templates
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
