"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useOrganization } from "@/lib/hooks/queries/organizations";
import { useInvoice, billingKeys } from "@/lib/hooks/queries/billing";
import { useRazorpayCheckout } from "@/lib/billing-ui/hooks/use-razorpay-checkout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowLeft, CheckCircle2, Clock, AlertCircle, Ban, RotateCcw,
  FileText, CreditCard, Loader2, Printer, Building2,
} from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Invoice } from "@/lib/api/billing";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatInr(paise: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(paise / 100);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

type StatusMeta = { label: string; icon: React.ElementType; className: string };

const STATUS_MAP: Record<string, StatusMeta> = {
  pending:   { label: "Payment Pending", icon: Clock,        className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  overdue:   { label: "Overdue",         icon: AlertCircle,  className: "bg-destructive/10 text-destructive border-destructive/20" },
  paid:      { label: "Paid",            icon: CheckCircle2, className: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20" },
  draft:     { label: "Draft",           icon: FileText,     className: "bg-muted text-muted-foreground border-border" },
  cancelled: { label: "Cancelled",       icon: Ban,          className: "bg-muted text-muted-foreground border-border" },
  refunded:  { label: "Refunded",        icon: RotateCcw,    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  failed:    { label: "Failed",          icon: AlertCircle,  className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const DEFAULT_STATUS: StatusMeta = { label: "Unknown", icon: FileText, className: "bg-muted text-muted-foreground border-border" };

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_MAP[status] ?? DEFAULT_STATUS;
  const Icon = meta.icon;
  return (
    <Badge variant="outline" className={`gap-1.5 font-medium ${meta.className}`}>
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </Badge>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function InvoiceDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const invoiceId = params.id as string;

  const { organization } = useOrganization();
  const { invoice, lineItems, loading, error } = useInvoice(invoiceId);
  const queryClient = useQueryClient();

  const [paySuccess, setPaySuccess] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const { pay, loading: paying } = useRazorpayCheckout({
    orgName: organization?.name,
    billingEmail: organization?.billing_email ?? organization?.email ?? undefined,
    onSuccess: () => {
      setPaySuccess(true);
      queryClient.invalidateQueries({ queryKey: billingKeys.all });
    },
    onError: (msg) => setPayError(msg),
  });

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-12">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="max-w-3xl mx-auto pt-8">
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
            <p className="font-medium text-destructive">{error ?? "Invoice not found"}</p>
            <Link
              href={`/dashboard/org/${slug}/billing`}
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Billing
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const inv = invoice as Invoice;
  // bill_to and seller_snapshot are untyped JSONB blobs
  const billTo = inv.bill_to as Record<string, string> | null;
  const sellerSnapshot = (inv as unknown as Record<string, unknown>).seller_snapshot as Record<string, string> | null;
  const isPayable = inv.payable && !paySuccess;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12 print:pb-0">

      {/* ── Back + print ── */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          href={`/dashboard/org/${slug}/billing`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Billing
        </Link>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
          <Printer className="h-3.5 w-3.5" />
          Print
        </Button>
      </div>

      {/* ── Notifications ── */}
      {paySuccess && (
        <div className="flex items-center gap-2.5 bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 px-4 py-3 rounded-xl text-sm font-medium animate-in fade-in print:hidden">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Payment confirmed. Invoice {inv.invoice_number} has been marked as paid.
        </div>
      )}
      {payError && (
        <div className="flex items-center gap-2.5 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl text-sm font-medium animate-in fade-in print:hidden">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {payError}
        </div>
      )}

      {/* ── Invoice card ── */}
      <Card className="border-border/50 shadow-sm bg-card/60 backdrop-blur-sm overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-primary via-primary/60 to-transparent" />

        {/* Header */}
        <div className="p-8 pb-6 border-b border-border/30">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Tax Invoice</p>
              <h1 className="text-2xl font-bold">{inv.invoice_number}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Issued {formatDate(inv.issue_date)}
                {inv.due_date && <> · Due {formatDate(inv.due_date)}</>}
              </p>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-2">
              <StatusBadge status={paySuccess ? "paid" : inv.status} />
              {inv.razorpay_payment_id && (
                <span className="text-[10px] font-mono text-muted-foreground">{inv.razorpay_payment_id}</span>
              )}
            </div>
          </div>
        </div>

        <CardContent className="p-8 space-y-8">
          {/* ── From / To ── */}
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">From</p>
              <div className="text-sm space-y-0.5">
                <p className="font-semibold">{sellerSnapshot?.name ?? "Authentix"}</p>
                {sellerSnapshot?.address && <p className="text-muted-foreground">{sellerSnapshot.address}</p>}
                {sellerSnapshot?.gstin && (
                  <p className="text-muted-foreground font-mono text-xs">GSTIN: {sellerSnapshot.gstin}</p>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Bill To</p>
              {organization ? (
                <div className="text-sm space-y-0.5">
                  <p className="font-semibold">{organization.name}</p>
                  {(billTo?.address ?? organization.billing_address ?? organization.address) && (
                    <p className="text-muted-foreground">
                      {billTo?.address ?? [
                        organization.billing_address || organization.address,
                        organization.billing_city || organization.city,
                        organization.billing_state || organization.state,
                      ].filter(Boolean).join(", ")}
                    </p>
                  )}
                  {organization.gst_number && (
                    <p className="text-muted-foreground font-mono text-xs">GSTIN: {organization.gst_number}</p>
                  )}
                  {organization.billing_email && (
                    <p className="text-muted-foreground text-xs">{organization.billing_email}</p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Building2 className="h-4 w-4" />
                  Loading…
                </div>
              )}
            </div>
          </div>

          <Separator className="border-border/30" />

          {/* ── Line items ── */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Line Items</p>
            <Table>
              <TableHeader>
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableHead className="text-xs">Description</TableHead>
                  <TableHead className="text-xs text-right">Qty</TableHead>
                  <TableHead className="text-xs text-right">Unit Price</TableHead>
                  <TableHead className="text-xs text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.length > 0 ? (
                  lineItems.map((item) => (
                    <TableRow key={item.id} className="border-border/30">
                      <TableCell className="text-sm">{item.description}</TableCell>
                      <TableCell className="text-sm text-right">{item.quantity}</TableCell>
                      <TableCell className="text-sm text-right font-mono">{formatInr(item.unit_price)}</TableCell>
                      <TableCell className="text-sm text-right font-semibold font-mono">{formatInr(item.amount)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">
                      No line items
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* ── Totals ── */}
          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-mono">{formatInr(inv.subtotal_paise)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>GST</span>
                <span className="font-mono">{formatInr(inv.tax_paise)}</span>
              </div>
              <Separator className="border-border/40" />
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="font-mono text-primary">{formatInr(inv.total_paise)}</span>
              </div>
              {!paySuccess && inv.amount_due_paise > 0 && inv.status !== "paid" && (
                <div className="flex justify-between text-destructive font-medium text-xs">
                  <span>Amount Due</span>
                  <span className="font-mono">{formatInr(inv.amount_due_paise)}</span>
                </div>
              )}
              {(paySuccess || inv.status === "paid") && inv.amount_paid_paise > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400 font-medium text-xs">
                  <span>Amount Paid</span>
                  <span className="font-mono">{formatInr(inv.amount_paid_paise)}</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Pay CTA ── */}
          {isPayable && (
            <>
              <Separator className="border-border/30" />
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 print:hidden">
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {inv.status === "overdue" ? "This invoice is overdue" : "Payment required"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {inv.payable_reason ?? "Please pay to continue using Authentix."}
                  </p>
                </div>
                <Button size="sm" className="shrink-0 gap-1.5" disabled={paying} onClick={() => pay(invoiceId)}>
                  {paying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
                  Pay {formatInr(inv.amount_due_paise)} via Razorpay
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground/50 print:hidden pt-4">
        Payments powered by{" "}
        <a href="https://razorpay.com" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity inline-flex items-center ml-0.5">
          <img src="/provider-logos/razorpay.svg" alt="Razorpay" className="h-4 object-contain" />
        </a>
      </p>
    </div>
  );
}
