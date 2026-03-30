"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key, Copy, RefreshCw, AlertTriangle, CheckCircle2, Eye, EyeOff, Shield, Terminal, Code2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  useOrganizationAPISettings,
  useRotateAPIKey,
  useBootstrapIdentity,
  useUpdateAPIEnabled,
} from "@/lib/hooks/queries/organizations";

export default function APISettingsPage() {
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [copiedAppId, setCopiedAppId] = useState(false);
  const [copiedApiKey, setCopiedApiKey] = useState(false);
  const [error, setError] = useState("");

  const { settings, loading } = useOrganizationAPISettings();
  const rotateAPIKey = useRotateAPIKey();
  const bootstrapIdentity = useBootstrapIdentity();
  const updateAPIEnabled = useUpdateAPIEnabled();

  const apiEnabled = settings?.api_enabled ?? false;
  const apiKeyExists = settings?.api_key_exists ?? false;
  const applicationId = settings?.application_id ?? "";
  const apiKeyCreatedAt = settings?.api_key_created_at ?? null;
  const apiKeyLastRotatedAt = settings?.api_key_last_rotated_at ?? null;

  const handleGenerateKey = async () => {
    setError("");
    setNewApiKey(null);

    try {
      const result = apiKeyExists
        ? await rotateAPIKey.mutateAsync()
        : await bootstrapIdentity.mutateAsync();
      setNewApiKey(result.api_key || null);
      setShowKey(true);
    } catch (err: any) {
      setError(err.message || "Failed to generate API key");
    }
  };

  const handleToggleAPI = async () => {
    try {
      await updateAPIEnabled.mutateAsync(!apiEnabled);
    } catch (err: any) {
      setError(err.message || "Failed to update API status");
    }
  };

  const generating = rotateAPIKey.isPending || bootstrapIdentity.isPending;

  const handleCopyAppId = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAppId(true);
    setTimeout(() => setCopiedAppId(false), 2000);
  };

  const handleCopyApiKey = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedApiKey(true);
    setTimeout(() => setCopiedApiKey(false), 2000);
  };

  const curlExample = [
    `curl -X POST https://api.authentix.com/v1/certificates \\`,
    `  -H "X-Application-ID: ${applicationId || "your-application-id"}" \\`,
    `  -H "Authorization: Bearer your-api-key" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d '{`,
    `    "template_id": "uuid",`,
    `    "recipient_name": "John Doe",`,
    `    "recipient_email": "john@example.com"`,
    `  }'`,
  ].join("\n");

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col justify-center items-center w-full relative">
      <div className="max-w-4xl w-full space-y-10 pb-20 pt-2 relative px-4 md:px-0">
        
        {/* ── Ambient Background glows ── */}
      <div className="absolute top-0 right-1/4 -z-10 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] opacity-60 pointer-events-none mix-blend-screen" />
      <div className="absolute top-[20%] left-0 -z-10 w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[90px] opacity-40 pointer-events-none mix-blend-screen" />

      {/* ── Header ── */}
      <div className="flex items-center justify-between relative z-10">
        <div>
          <h1 className="text-3xl md:text-[2.5rem] font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 mb-2">
            API Settings
          </h1>
          <p className="text-muted-foreground mt-1.5 text-base md:text-lg max-w-xl leading-relaxed">
            Manage your API authentication, access logs, and core webhooks integration points.
          </p>
        </div>
        <Badge
          className={`gap-1.5 px-4 py-1.5 text-sm shadow-sm backdrop-blur-md rounded-full font-medium transition-colors ${
            apiEnabled
              ? "bg-gradient-to-r from-emerald-500/10 to-green-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
              : "bg-gradient-to-r from-muted to-muted text-muted-foreground border border-border"
          }`}
        >
          <Shield className="h-4 w-4" />
          {apiEnabled ? "API Active" : "API Disabled"}
        </Badge>
      </div>

      {error && (
        <Alert className="bg-gradient-to-r from-destructive/10 to-red-500/5 border border-destructive/20 text-destructive rounded-2xl shadow-sm backdrop-blur-md">
          <AlertTriangle className="h-5 w-5" />
          <AlertDescription className="ml-2 font-medium">{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid lg:grid-cols-[1fr_380px] gap-8 items-start relative z-10">
        <div className="space-y-6">
          {/* ── Application ID ── */}
          <Card className="border-border/40 shadow-sm bg-gradient-to-br from-card to-card/50 backdrop-blur-xl rounded-[1.5rem] overflow-hidden group">
            <CardHeader className="bg-muted/10 border-b border-border/30 px-7 py-5">
              <CardTitle className="text-lg flex items-center gap-2">
                <Code2 className="h-5 w-5 text-primary" />
                Application ID
              </CardTitle>
              <CardDescription className="mt-1">
                Your unique public identifier used in API requests
              </CardDescription>
            </CardHeader>
            <CardContent className="p-7 space-y-4">
              <div className="flex gap-3">
                <Input
                  value={applicationId}
                  readOnly
                  className="font-mono bg-background/50 border-border/50 h-11 focus-visible:ring-primary/20 text-sm shadow-inner"
                />
                <Button
                  variant="outline"
                  className="h-11 w-11 shrink-0 p-0 rounded-xl hover:bg-primary/5 border-border/50 hover:text-primary transition-colors"
                  onClick={() => handleCopyAppId(applicationId)}
                  title="Copy Application ID"
                >
                  {copiedAppId ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Copy className="h-5 w-5 opacity-70" />}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/60"></span>
                Include in the <code className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-xs font-semibold mx-1">X-Application-ID</code> header
              </p>
            </CardContent>
          </Card>

          {/* ── API Key Management ── */}
          <Card className="border-border/40 shadow-sm bg-gradient-to-br from-card to-card/50 backdrop-blur-xl rounded-[1.5rem] overflow-hidden">
            <CardHeader className="bg-muted/10 border-b border-border/30 px-7 py-5">
              <CardTitle className="text-lg flex items-center gap-2">
                <Key className="h-5 w-5 text-amber-500" />
                Secret API Key
              </CardTitle>
              <CardDescription className="mt-1">
                Generate and manage your secret authentication key
              </CardDescription>
            </CardHeader>
            <CardContent className="p-7 space-y-6">
              {newApiKey ? (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 shadow-inner">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-amber-800 dark:text-amber-300">Save your new key!</h4>
                      <p className="text-sm text-amber-700/90 dark:text-amber-400/90 mt-1">
                        Please copy this key and store it securely. We will not display it again.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {newApiKey && (
                <div className="space-y-3">
                  <Label className="text-foreground/80 font-medium">Your Generated Key</Label>
                  <div className="flex gap-3">
                    <Input
                      value={newApiKey}
                      type={showKey ? "text" : "password"}
                      readOnly
                      className="font-mono bg-background/50 border-border/50 h-11 focus-visible:ring-primary/20 text-sm shadow-inner"
                    />
                    <Button
                      variant="outline"
                      className="h-11 w-11 shrink-0 p-0 rounded-xl hover:bg-muted/80 border-border/50 transition-colors"
                      onClick={() => setShowKey(!showKey)}
                      title={showKey ? "Hide key" : "Reveal key"}
                    >
                      {showKey ? <EyeOff className="h-5 w-5 opacity-70" /> : <Eye className="h-5 w-5 opacity-70" />}
                    </Button>
                    <Button
                      variant="outline"
                      className="h-11 w-11 shrink-0 p-0 rounded-xl hover:bg-primary/5 hover:border-primary/30 border-border/50 hover:text-primary transition-colors"
                      onClick={() => handleCopyApiKey(newApiKey)}
                      title="Copy API Key"
                    >
                      {copiedApiKey ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Copy className="h-5 w-5 opacity-70" />}
                    </Button>
                  </div>
                </div>
              )}

              {apiKeyExists && !newApiKey && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between p-4 bg-background/50 border border-border/50 shadow-inner rounded-xl group hover:border-border transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Key className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-base font-mono tracking-widest text-muted-foreground/80 group-hover:text-foreground transition-colors">••••••••••••••••••••</span>
                    </div>
                    <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                      Active
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-muted/20 rounded-xl border border-border/30">
                      <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider mb-1">Created on</p>
                      <p className="font-medium text-sm text-foreground/90">{formatDate(apiKeyCreatedAt)}</p>
                    </div>
                    <div className="p-3 bg-muted/20 rounded-xl border border-border/30">
                      <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider mb-1">Last Rotated</p>
                      <p className="font-medium text-sm text-foreground/90">{formatDate(apiKeyLastRotatedAt)}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-border/30 mt-6">
                {apiKeyExists ? (
                  <>
                    <Button
                      onClick={handleGenerateKey}
                      variant="outline"
                      disabled={generating}
                      className="flex-1 rounded-xl h-11 border-border/50 hover:bg-muted font-medium hover:text-foreground transition-colors"
                    >
                      {generating ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                          Rotating Key...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 opacity-70" />
                          Rotate Key
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleToggleAPI}
                      variant={apiEnabled ? "destructive" : "default"}
                      className={`flex-1 rounded-xl h-11 font-medium transition-colors ${
                        apiEnabled 
                          ? "bg-destructive/10 text-destructive hover:bg-destructive/20 border-transparent shadow-none" 
                          : "bg-foreground text-background hover:bg-foreground/90 shadow-md"
                      }`}
                    >
                      {apiEnabled ? "Disable API Access" : "Enable API Access"}
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={handleGenerateKey}
                    disabled={generating}
                    className="w-full rounded-xl h-12 bg-foreground text-background hover:bg-foreground/90 shadow-md font-semibold text-sm"
                  >
                    {generating ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        Generating Key...
                      </>
                    ) : (
                      <>
                        <Key className="h-4 w-4 mr-2" />
                        Generate API Key
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Sidebar (Documentation) ── */}
        <div className="space-y-6">
          <Card className="border-border/40 shadow-sm bg-card/60 backdrop-blur-xl rounded-[1.5rem] overflow-hidden">
            <CardHeader className="bg-primary/5 border-b border-background/20 px-6 py-5">
              <CardTitle className="text-base flex items-center gap-2">
                <Terminal className="h-5 w-5 text-primary" />
                Integration Guide
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground/90">Authentication Setup</h4>
                <div className="bg-[#1C1C1E] dark:bg-[#151516] rounded-xl overflow-hidden shadow-inner border border-[#3A3A3C] dark:border-border/10">
                  <div className="flex px-4 py-2 bg-[#2C2C2E] dark:bg-[#1E1E1E] border-b border-[#3A3A3C] dark:border-border/10 items-center justify-between">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
                    </div>
                    <span className="text-[10px] text-zinc-400 font-mono">Headers</span>
                  </div>
                  <div className="p-4 font-mono text-[11px] leading-relaxed text-[#A4A4A6] dark:text-zinc-300">
                    <div>
                      <span className="text-[#32D74B] dark:text-emerald-400">X-Application-ID:</span> <span className="text-zinc-100">{applicationId || "your-application-id"}</span>
                    </div>
                    <div>
                      <span className="text-[#32D74B] dark:text-emerald-400">Authorization:</span> <span className="text-[#FF9F0A] dark:text-amber-300">Bearer</span> <span className="text-zinc-100">your-api-key</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground/90">Example Request</h4>
                <div className="bg-[#1C1C1E] dark:bg-[#151516] rounded-xl overflow-hidden shadow-inner border border-[#3A3A3C] dark:border-border/10">
                  <div className="flex px-4 py-2 bg-[#2C2C2E] dark:bg-[#1E1E1E] border-b border-[#3A3A3C] dark:border-border/10 items-center justify-between">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                    </div>
                    <span className="text-[10px] text-zinc-400 font-mono">Terminal</span>
                  </div>
                  <div className="p-4 font-mono text-[11px] leading-relaxed text-[#A4A4A6] dark:text-zinc-300 overflow-x-auto">
                    <pre><code className="block whitespace-pre text-xs">{curlExample}</code></pre>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-red-500/5 dark:bg-red-500/10 border border-red-500/20 p-4 rounded-xl mt-4">
                <Shield className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-red-800 dark:text-red-400 leading-relaxed">
                  Never expose your API key in client-side code or public repositories.
                  Always use it server-side and inject it via environment variables.
                </p>
              </div>

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </div>
  );
}
