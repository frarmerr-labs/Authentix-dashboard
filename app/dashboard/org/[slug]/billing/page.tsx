"use client";

import { useOrganization } from "@/lib/hooks/queries/organizations";
import {
  useBillingOverview,
  useInvoiceList,
  usePaymentMethods,
  useDeletePaymentMethod,
  useSetAutopay,
  useGenerateInvoice,
  billingKeys,
} from "@/lib/hooks/queries/billing";
import { useRazorpayCheckout } from "@/lib/billing-ui/hooks/use-razorpay-checkout";
import { useRazorpaySaveMethod } from "@/lib/billing-ui/hooks/use-razorpay-save-method";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Receipt, TrendingUp, AlertCircle, CheckCircle2, Clock, Ban,
  CreditCard, Loader2, ExternalLink, RotateCcw, FileText, IndianRupee, Zap,
  Smartphone, ShieldCheck, Trash2, Star, Plus, FilePlus, ChevronRight, Activity, CalendarDays
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import type { Invoice, PaymentMethod } from "@/lib/api/billing";
import { useQueryClient } from "@tanstack/react-query";

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatInr(paise: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(paise / 100);
}

function formatRupees(rupees: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, minimumFractionDigits: 2 }).format(rupees);
}

function getBillingPeriod(): string {
  return new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function cardLabel(m: PaymentMethod): string {
  if (m.method_type === "card") {
    const network = m.card_network ?? "Card";
    const last4 = m.card_last4 ? ` ••••${m.card_last4}` : "";
    const expiry =
      m.card_expiry_month && m.card_expiry_year
        ? ` exp ${String(m.card_expiry_month).padStart(2, "0")}/${String(m.card_expiry_year).slice(-2)}`
        : "";
    return `${network}${last4}${expiry}`;
  }
  if (m.method_type === "upi") return m.upi_vpa ?? "UPI";
  return "Bank account";
}

// ── Status badge ─────────────────────────────────────────────────────────────

type StatusMeta = { label: string; icon: React.ElementType; className: string };

const STATUS_MAP: Record<string, StatusMeta> = {
  pending:   { label: "Pending",   icon: Clock,        className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  overdue:   { label: "Overdue",   icon: AlertCircle,  className: "bg-destructive/10 text-destructive border-destructive/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]" },
  paid:      { label: "Paid",      icon: CheckCircle2, className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  draft:     { label: "Draft",     icon: FileText,     className: "bg-muted text-muted-foreground border-border/50" },
  cancelled: { label: "Cancelled", icon: Ban,          className: "bg-muted text-muted-foreground border-border/50" },
  refunded:  { label: "Refunded",  icon: RotateCcw,    className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30" },
  failed:    { label: "Failed",    icon: AlertCircle,  className: "bg-destructive/10 text-destructive border-destructive/30" },
};

const DEFAULT_STATUS: StatusMeta = { label: "Unknown", icon: FileText, className: "bg-muted text-muted-foreground border-border/50" };

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_MAP[status] ?? DEFAULT_STATUS;
  const Icon = meta.icon;
  return (
    <Badge variant="outline" className={`gap-1.5 font-medium px-2.5 py-1 text-xs rounded-full ${meta.className}`}>
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </Badge>
  );
}

// ── Skeletons ────────────────────────────────────────────────────────────────

function OverviewSkeleton() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {[0, 1, 2, 3].map((i) => (
        <Card key={i} className="border-border/40 bg-card/40 rounded-[1.5rem] shadow-sm">
          <CardContent className="p-6">
            <Skeleton className="h-4 w-24 mb-4" />
            <Skeleton className="h-10 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function InvoiceSkeleton() {
  return (
    <div className="space-y-3 p-5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-4 py-4 border-b border-border/40 last:border-0">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-24 ml-auto" />
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
      ))}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { organization } = useOrganization();
  const { priceBook, usage, totalOutstandingPaise, loading: overviewLoading } = useBillingOverview();
  const { invoices, loading: invoicesLoading } = useInvoiceList({ limit: 20, sort_order: "desc" });
  const { methods, autopayEnabled, loading: methodsLoading, refresh: refreshMethods } = usePaymentMethods();
  const deleteMethod = useDeletePaymentMethod();
  const setAutopay = useSetAutopay();
  const generateInvoice = useGenerateInvoice();
  const queryClient = useQueryClient();

  const [payingId, setPayingId] = useState<string | null>(null);
  const [paySuccess, setPaySuccess] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [methodError, setMethodError] = useState<string | null>(null);
  const [methodSuccess, setMethodSuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);

  const { pay, loading: paying } = useRazorpayCheckout({
    orgName: organization?.name,
    billingEmail: organization?.billing_email ?? organization?.email ?? undefined,
    onSuccess: (invoice) => {
      setPayingId(null);
      setPaySuccess(`Invoice ${invoice.invoice_number} paid successfully.`);
      setTimeout(() => setPaySuccess(null), 5000);
      queryClient.invalidateQueries({ queryKey: billingKeys.all });
    },
    onError: (msg) => {
      setPayingId(null);
      setPayError(msg);
      setTimeout(() => setPayError(null), 5000);
    },
    onDismiss: () => setPayingId(null),
  });

  const { saveMethod, loading: savingMethod } = useRazorpaySaveMethod({
    orgName: organization?.name,
    billingEmail: organization?.billing_email ?? organization?.email ?? undefined,
    onSuccess: () => {
      setMethodSuccess("Payment method saved successfully.");
      setTimeout(() => setMethodSuccess(null), 4000);
      refreshMethods();
    },
    onError: (msg) => {
      setMethodError(msg);
      setTimeout(() => setMethodError(null), 5000);
    },
  });

  const handlePay = async (invoice: Invoice) => {
    setPayingId(invoice.id);
    setPayError(null);
    await pay(invoice.id);
  };

  const handleDeleteMethod = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteMethod.mutateAsync(id);
    } finally {
      setDeletingId(null);
    }
  };

  const handleAutopayToggle = async (enabled: boolean) => {
    try {
      await setAutopay.mutateAsync(enabled);
    } catch {
      // error shown via query state
    }
  };

  const handleGenerateInvoice = async () => {
    setGeneratingInvoice(true);
    try {
      const result = await generateInvoice.mutateAsync();
      setPaySuccess(`Invoice ${result.invoice.invoice_number} generated successfully.`);
      setTimeout(() => setPaySuccess(null), 5000);
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Failed to generate invoice");
      setTimeout(() => setPayError(null), 5000);
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const typedInvoices = invoices as Invoice[];
  const outstandingInvoices = typedInvoices.filter(
    (inv) => inv.status === "pending" || inv.status === "overdue"
  );
  const firstOutstanding = outstandingInvoices[0];

  return (
    <div className="max-w-[72rem] mx-auto space-y-10 pb-20 pt-2 md:pt-6 relative px-4 md:px-0">
      
      {/* ── Ambient Background glows ── */}
      <div className="absolute top-0 right-1/4 -z-10 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] opacity-60 pointer-events-none mix-blend-screen" />
      <div className="absolute top-[20%] left-0 -z-10 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[90px] opacity-40 pointer-events-none mix-blend-screen" />

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 relative z-10">
        <div>
          <h1 className="text-3xl md:text-[2.5rem] font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 mb-2">
            Billing & Usage
          </h1>
          <p className="text-muted-foreground text-sm md:text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4 opacity-70" /> 
            Overview and invoices for <strong className="font-medium text-foreground">{getBillingPeriod()}</strong>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {totalOutstandingPaise > 0 && (
            <div className="animate-in fade-in zoom-in duration-500">
              <Badge className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 gap-1.5 px-4 py-2 text-sm shadow-sm backdrop-blur-md rounded-full font-medium hover:bg-amber-500/20 transition-colors">
                <AlertCircle className="h-4 w-4 animate-pulse" />
                {formatInr(totalOutstandingPaise)} Due
              </Badge>
            </div>
          )}
          <Button
            className="gap-2 bg-foreground hover:bg-foreground/90 text-background shadow-lg hover:shadow-xl transition-all duration-300 rounded-full px-6 h-11 border border-transparent hover:scale-[1.02]"
            onClick={handleGenerateInvoice}
            disabled={generatingInvoice}
          >
            {generatingInvoice ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FilePlus className="h-4 w-4" />
            )}
            <span className="font-medium">Generate Invoice</span>
          </Button>
        </div>
      </div>

      {/* ── Notifications ── */}
      <div className="space-y-3 relative z-10">
        {paySuccess && (
          <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-500/10 to-green-500/5 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-5 py-4 rounded-2xl text-sm font-medium animate-in fade-in slide-in-from-top-4 shadow-sm backdrop-blur-md">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            {paySuccess}
          </div>
        )}
        {payError && (
          <div className="flex items-center gap-3 bg-gradient-to-r from-destructive/10 to-red-500/5 border border-destructive/20 text-destructive px-5 py-4 rounded-2xl text-sm font-medium animate-in fade-in slide-in-from-top-4 shadow-sm backdrop-blur-md">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {payError}
          </div>
        )}
        {methodSuccess && (
          <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-500/10 to-green-500/5 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-5 py-4 rounded-2xl text-sm font-medium animate-in fade-in slide-in-from-top-4 shadow-sm backdrop-blur-md">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            {methodSuccess}
          </div>
        )}
        {methodError && (
          <div className="flex items-center gap-3 bg-gradient-to-r from-destructive/10 to-red-500/5 border border-destructive/20 text-destructive px-5 py-4 rounded-2xl text-sm font-medium animate-in fade-in slide-in-from-top-4 shadow-sm backdrop-blur-md">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {methodError}
          </div>
        )}
      </div>

      {/* ── Usage stats ── */}
      <div className="relative z-10">
        {overviewLoading ? (
          <OverviewSkeleton />
        ) : usage && priceBook ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Card className="border-border/40 shadow-sm bg-gradient-to-br from-card to-card/50 backdrop-blur-xl rounded-[1.5rem] hover:shadow-md hover:-translate-y-1 transition-all duration-300 overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardContent className="p-6 relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Activity className="h-4 w-4 text-blue-500" />
                    Certificates
                  </div>
                </div>
                <div className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">{usage.certificate_count.toLocaleString("en-IN")}</div>
                <div className="text-sm text-muted-foreground mt-2 font-medium">
                  {formatRupees(priceBook.per_certificate_fee, priceBook.currency)} <span className="text-xs font-normal opacity-70">each</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/40 shadow-sm bg-gradient-to-br from-card to-card/50 backdrop-blur-xl rounded-[1.5rem] hover:shadow-md hover:-translate-y-1 transition-all duration-300 overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardContent className="p-6 relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <TrendingUp className="h-4 w-4 text-purple-500" />
                    Usage cost
                  </div>
                </div>
                <div className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">{formatRupees(usage.usage_cost, usage.currency)}</div>
                <div className="text-sm text-muted-foreground mt-2 font-medium">
                  {usage.platform_fee > 0
                    ? `+${formatRupees(usage.platform_fee, usage.currency)} platform fee`
                    : "No platform fee (no certs)"}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/40 shadow-sm bg-gradient-to-br from-card to-card/50 backdrop-blur-xl rounded-[1.5rem] hover:shadow-md hover:-translate-y-1 transition-all duration-300 overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardContent className="p-6 relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <IndianRupee className="h-4 w-4 text-emerald-500" />
                    GST ({usage.gst_rate}%)
                  </div>
                </div>
                <div className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">{formatRupees(usage.gst_amount, usage.currency)}</div>
                <div className="text-sm text-muted-foreground mt-2 font-medium flex items-center gap-1.5">
                  Subtotal <span className="opacity-70">{formatRupees(usage.subtotal, usage.currency)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20 shadow-md bg-gradient-to-br from-primary/5 to-primary/10 backdrop-blur-xl rounded-[1.5rem] hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2 group-hover:opacity-70 transition-opacity" />
              <CardContent className="p-6 relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <Receipt className="h-4 w-4" />
                    Estimated total
                  </div>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/50 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                  </span>
                </div>
                <div className="text-3xl md:text-4xl font-bold tracking-tight text-primary drop-shadow-sm">
                  {formatRupees(usage.estimated_total, usage.currency)}
                </div>
                <div className="text-sm text-primary/80 mt-2 font-medium opacity-90">
                  Live real-time estimate
                </div>
              </CardContent>
            </Card>
          </div>
        ) : !overviewLoading ? (
          <Card className="border-border/40 bg-card/60 rounded-[1.5rem] shadow-sm">
            <CardContent className="p-8 flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                <Receipt className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="text-foreground font-medium">No active price plan found.</p>
              <p className="text-sm text-muted-foreground mt-1">Please contact support to setup your billing context.</p>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* ── Pricing info strip ── */}
      {priceBook && (
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm px-6 py-4 rounded-2xl bg-muted/30 border border-border/40 backdrop-blur-md">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="h-6 w-6 rounded-md bg-background border border-border/50 flex items-center justify-center shadow-sm">
              <Zap className="h-3 w-3 text-foreground" />
            </div>
            <span className="font-medium text-foreground">{formatRupees(priceBook.per_certificate_fee, priceBook.currency)}</span> / certificate
          </div>
          <Separator orientation="vertical" className="h-4 hidden sm:block bg-border/60" />
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="h-6 w-6 rounded-md bg-background border border-border/50 flex items-center justify-center shadow-sm">
              <Activity className="h-3 w-3 text-foreground" />
            </div>
            <span className="font-medium text-foreground">{formatRupees(priceBook.platform_fee_monthly, priceBook.currency)}</span>{" "}
            platform fee / mo
            <span className="text-[10px] bg-muted/50 px-2 py-0.5 rounded-full ml-1 font-medium">Auto-waived if 0 certs</span>
          </div>
          <Separator orientation="vertical" className="h-4 hidden sm:block bg-border/60" />
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="h-6 w-6 rounded-md bg-background border border-border/50 flex items-center justify-center shadow-sm">
              <IndianRupee className="h-3 w-3 text-foreground" />
            </div>
            GST <span className="font-medium text-foreground">{priceBook.gst_rate_percent}%</span>
          </div>
        </div>
      )}

      {/* ── Outstanding banner ── */}
      {!overviewLoading && firstOutstanding && (
        <div className="relative overflow-hidden rounded-[1.5rem] border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent shadow-[0_4px_20px_-10px_rgba(245,158,11,0.2)]">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
          <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 shadow-inner">
                <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {outstandingInvoices.length === 1 ? "1 invoice requires payment" : `${outstandingInvoices.length} invoices require payment`}
                </h3>
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                  Total outstanding balance over due: <span className="font-bold text-amber-600 dark:text-amber-400">{formatInr(totalOutstandingPaise)}</span>
                </p>
              </div>
            </div>
            <Button
              className="shrink-0 rounded-full bg-amber-600 hover:bg-amber-700 text-white shadow-md hover:shadow-lg transition-all border-none font-medium px-6 h-11"
              onClick={() => handlePay(firstOutstanding)}
              disabled={paying}
            >
              {paying && payingId === firstOutstanding.id ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CreditCard className="h-4 w-4 mr-2" />
              )}
              Pay Oldest Invoice
            </Button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_380px] gap-8 items-start relative z-10">
        {/* ── Invoice history ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-xl font-bold tracking-tight">Invoice History</h2>
            </div>
            <Badge variant="secondary" className="bg-muted/50 rounded-full font-medium text-xs">
              {typedInvoices?.length || 0} Invoices
            </Badge>
          </div>

          <Card className="border-border/40 shadow-sm bg-card/60 backdrop-blur-xl rounded-[1.5rem] overflow-hidden">
            {invoicesLoading ? (
              <InvoiceSkeleton />
            ) : typedInvoices.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center px-4">
                <div className="h-20 w-20 rounded-full bg-muted/40 flex items-center justify-center mb-5 ring-8 ring-muted/20">
                  <Receipt className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <h3 className="text-lg font-semibold">No invoices generated</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                  Once your billing cycle concludes or an invoice is generated manually, it will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/40 hover:bg-transparent text-muted-foreground/80 text-xs uppercase tracking-wider bg-muted/20">
                      <TableHead className="font-semibold h-12 pl-6">Invoice details</TableHead>
                      <TableHead className="font-semibold h-12">Date</TableHead>
                      <TableHead className="font-semibold h-12">Status</TableHead>
                      <TableHead className="font-semibold h-12 text-right">Amount</TableHead>
                      <TableHead className="font-semibold h-12 text-right pr-6">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {typedInvoices.map((invoice) => (
                      <TableRow key={invoice.id} className="border-border/30 hover:bg-muted/10 group transition-colors">
                        <TableCell className="pl-6 py-4">
                          <Link href={`/dashboard/org/${slug}/billing/invoices/${invoice.id}`} className="block">
                            <div className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{invoice.invoice_number}</div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-1">
                              {invoice.razorpay_payment_id ? invoice.razorpay_payment_id : "No transaction ID"}
                            </div>
                          </Link>
                        </TableCell>

                        <TableCell className="py-4">
                          <div className="font-medium text-sm">
                            {invoice.issue_date
                              ? new Date(invoice.issue_date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })
                              : "—"}
                          </div>
                          {invoice.due_date && (
                            <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                              Due: {new Date(invoice.due_date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="py-4">
                          <StatusBadge status={invoice.status} />
                        </TableCell>

                        <TableCell className="text-right py-4">
                          <div className="text-sm font-bold text-foreground">{formatInr(invoice.total_paise)}</div>
                          {invoice.amount_due_paise > 0 && invoice.status !== "paid" && (
                            <div className="text-[11px] text-destructive bg-destructive/10 inline-block px-1.5 py-0.5 rounded mt-1 font-medium">
                              Due: {formatInr(invoice.amount_due_paise)}
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="text-right pr-6 py-4">
                          <div className="flex items-center justify-end gap-2.5">
                            {invoice.payable ? (
                              <Button
                                size="sm"
                                variant="default"
                                className="h-8 rounded-full px-4 text-xs font-semibold shadow-sm"
                                disabled={paying && payingId === invoice.id}
                                onClick={() => handlePay(invoice)}
                              >
                                {paying && payingId === invoice.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                ) : (
                                  <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                                )}
                                Pay Now
                              </Button>
                            ) : (
                              <Link
                                href={`/dashboard/org/${slug}/billing/invoices/${invoice.id}`}
                                className="inline-flex items-center justify-center h-8 px-3 rounded-full bg-muted/50 hover:bg-muted text-xs font-medium text-foreground transition-colors group/btn"
                              >
                                View
                                <ChevronRight className="h-3.5 w-3.5 ml-1 opacity-50 group-hover/btn:opacity-100 group-hover/btn:translate-x-0.5 transition-all" />
                              </Link>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </div>

        {/* ── Sidebar (Payment Methods & Details) ── */}
        <div className="space-y-6">
          <Card className="border-border/40 shadow-sm bg-card/60 backdrop-blur-xl rounded-[1.5rem] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-border/30 bg-muted/10 relative">
              <div className="absolute top-0 right-0 p-6 pointer-events-none">
                <CreditCard className="h-24 w-24 text-primary/5 -rotate-12 translate-x-4 -translate-y-4" />
              </div>
              <div className="relative z-10 flex items-center justify-between">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Payment Methods
                </h3>
              </div>
              <p className="text-sm text-muted-foreground mt-2 relative z-10 max-w-[90%]">
                Manage your saved cards and UPI accounts for seamless payments.
              </p>
            </div>
            
            <div className="p-6 flex-1 space-y-5">
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/40 hover:bg-muted/60 transition-colors">
                <div className="flex flex-col gap-0.5">
                  <Label htmlFor="autopay-toggle" className="text-sm font-semibold cursor-pointer">
                    Auto-Pay
                  </Label>
                  <span className="text-[11px] text-muted-foreground/80">
                    Automatically pay invoices when due
                  </span>
                </div>
                <Switch
                  id="autopay-toggle"
                  checked={autopayEnabled}
                  onCheckedChange={handleAutopayToggle}
                  disabled={setAutopay.isPending || methods.length === 0}
                />
              </div>

              {autopayEnabled && methods.length > 0 && (
                <div className="flex items-start gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                  <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                  Auto-pay is active. Your default payment method will be charged automatically.
                </div>
              )}

              <Separator className="border-border/40" />

              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Saved Methods</h4>
                {methodsLoading ? (
                  <div className="space-y-3">
                    {[0, 1].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
                  </div>
                ) : methods.length > 0 ? (
                  <div className="space-y-3">
                    {methods.map((method) => (
                      <div
                        key={method.id}
                        className="flex items-center gap-4 p-4 rounded-xl border border-border/40 bg-card hover:border-border transition-colors group relative overflow-hidden shadow-sm"
                      >
                        <div className="absolute inset-y-0 left-0 w-1 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          {method.method_type === "upi" ? (
                            <Smartphone className="h-5 w-5 text-primary" />
                          ) : (
                            <CreditCard className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate text-foreground">{cardLabel(method)}</p>
                          {method.card_name && (
                            <p className="text-xs text-muted-foreground truncate">{method.card_name}</p>
                          )}
                          {!method.card_name && method.method_type === "card" && (
                            <p className="text-xs text-muted-foreground">Secure Card</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {method.is_default && (
                            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[10px] px-1.5 py-0 h-4 rounded">
                              DEFAULT
                            </Badge>
                          )}
                          <button
                            onClick={() => handleDeleteMethod(method.id)}
                            disabled={deletingId === method.id}
                            className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 mt-1"
                            title="Remove payment method"
                          >
                            {deletingId === method.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 px-4 text-center bg-muted/20 rounded-xl border border-dashed border-border/60">
                    <CreditCard className="h-8 w-8 text-muted-foreground/40 mb-3" />
                    <p className="text-sm font-medium text-foreground">No payment methods</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                      Add a card or UPI securely to streamline future invoices.
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  variant="outline"
                  className="rounded-full shadow-sm bg-background hover:bg-muted font-medium text-xs h-10 border-border/60"
                  disabled={savingMethod}
                  onClick={() => saveMethod("card")}
                >
                  {savingMethod ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Add Card
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full shadow-sm bg-background hover:bg-muted font-medium text-xs h-10 border-border/60"
                  disabled={savingMethod}
                  onClick={() => saveMethod("upi")}
                >
                  {savingMethod ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Add UPI
                </Button>
              </div>

              <div className="flex items-start gap-2.5 text-[11px] text-muted-foreground/60 leading-tight pt-4 mt-2 border-t border-border/40">
                <ShieldCheck className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                <p>
                  100% Secure. Cards and UPI are tokenized and stored securely via Razorpay (RBI-compliant). Authentix never stores payment credentials.
                </p>
              </div>
            </div>
          </Card>

          {organization && (organization.billing_email || organization.gst_number) && (
            <Card className="border-border/40 shadow-sm bg-card/60 backdrop-blur-xl rounded-[1.5rem] overflow-hidden">
              <div className="p-5 border-b border-border/30 flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                  Billing Details
                </h3>
                <Link
                  href={`/dashboard/org/${slug}/organization`}
                  className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1 group"
                >
                  Edit
                  <ExternalLink className="h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </Link>
              </div>
              <CardContent className="p-5">
                <div className="space-y-4 text-sm">
                  {organization.billing_email && (
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Billing Email</span>
                      <span className="font-semibold">{organization.billing_email}</span>
                    </div>
                  )}
                  {organization.gst_number && (
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">GSTIN</span>
                      <span className="font-mono bg-muted px-2 py-0.5 rounded text-sm w-fit group cursor-default border border-border/50">
                        {organization.gst_number}
                      </span>
                    </div>
                  )}
                  {organization.cin_number && (
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">CIN</span>
                      <span className="font-mono bg-muted px-2 py-0.5 rounded text-sm w-fit group cursor-default border border-border/50">
                        {organization.cin_number}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="text-center text-xs text-muted-foreground/40 mt-6 flex items-center justify-center gap-1.5 pb-2">
             Payments powered by{" "}
             <a href="https://razorpay.com" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity inline-flex items-center ml-0.5">
               <img src="/provider-logos/razorpay.svg" alt="Razorpay" className="h-4 object-contain" />
             </a>
          </div>
        </div>
      </div>
    </div>
  );
}
