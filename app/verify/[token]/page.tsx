'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  User,
  Building2,
  Award,
  ExternalLink,
  Download,
  Share2,
  Clock,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  Hash,
  Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────

interface VerificationResult {
  valid: boolean;
  result: 'valid' | 'expired' | 'revoked' | 'not_found';
  message: string;
  certificate?: {
    id: string;
    certificate_number: string;
    recipient_name: string;
    recipient_email: string | null;
    category_name: string;
    subcategory_name: string;
    issued_at: string;
    expires_at: string | null;
    status: string;
    revoked_at?: string | null;
    revoked_reason?: string | null;
  };
  organization?: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    website_url: string | null;
  };
  preview_url?: string | null;
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS = {
  valid: {
    Icon: ShieldCheck,
    label: 'Verified & Authentic',
    description: 'This certificate is valid and has been verified.',
    gradient: 'from-emerald-500/10 via-emerald-400/5 to-transparent',
    ring: 'ring-emerald-200 dark:ring-emerald-800',
    iconBg: 'bg-emerald-50 dark:bg-emerald-950',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-900/60',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  expired: {
    Icon: ShieldAlert,
    label: 'Expired',
    description: 'This certificate was valid but has passed its expiry date.',
    gradient: 'from-amber-500/10 via-amber-400/5 to-transparent',
    ring: 'ring-amber-200 dark:ring-amber-800',
    iconBg: 'bg-amber-50 dark:bg-amber-950',
    iconColor: 'text-amber-600 dark:text-amber-400',
    badgeBg: 'bg-amber-100 dark:bg-amber-900/60',
    badgeText: 'text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  revoked: {
    Icon: ShieldX,
    label: 'Revoked',
    description: 'This certificate has been revoked by the issuing organization.',
    gradient: 'from-red-500/10 via-red-400/5 to-transparent',
    ring: 'ring-red-200 dark:ring-red-800',
    iconBg: 'bg-red-50 dark:bg-red-950',
    iconColor: 'text-red-600 dark:text-red-400',
    badgeBg: 'bg-red-100 dark:bg-red-900/60',
    badgeText: 'text-red-700 dark:text-red-300',
    dot: 'bg-red-500',
  },
  not_found: {
    Icon: XCircle,
    label: 'Not Found',
    description: 'No certificate matching this token was found.',
    gradient: 'from-gray-500/10 via-gray-400/5 to-transparent',
    ring: 'ring-gray-200 dark:ring-gray-800',
    iconBg: 'bg-gray-50 dark:bg-gray-950',
    iconColor: 'text-gray-500 dark:text-gray-400',
    badgeBg: 'bg-gray-100 dark:bg-gray-800',
    badgeText: 'text-gray-600 dark:text-gray-300',
    dot: 'bg-gray-400',
  },
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function VerifyPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch('/api/proxy/verification/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (data.success && data.data) {
          setResult(data.data);
        } else {
          setResult({
            valid: false,
            result: 'not_found',
            message: data.error?.message ?? 'Certificate not found',
          });
        }
      } catch {
        setError('Unable to verify. Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleDownloadPdf = useCallback(async (previewUrl: string) => {
    // If it's already a PDF (PDF template), download directly
    if (previewUrl.toLowerCase().includes('.pdf') || previewUrl.toLowerCase().includes('application/pdf')) {
      const a = document.createElement('a');
      a.href = previewUrl;
      a.download = 'certificate.pdf';
      a.click();
      return;
    }
    // For PNG certificates: wrap server-side to avoid CORS on signed URL
    setDownloadingPdf(true);
    try {
      const pdfUrl = `/api/wrap-pdf?url=${encodeURIComponent(previewUrl)}`;
      const res = await fetch(pdfUrl);
      if (!res.ok) throw new Error('PDF generation failed');
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = 'certificate.pdf';
      a.click();
      URL.revokeObjectURL(href);
    } catch {
      alert('Could not generate PDF. Please download the PNG instead.');
    } finally {
      setDownloadingPdf(false);
    }
  }, []);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    if (navigator.share) {
      setSharing(true);
      try {
        await navigator.share({ title: 'Certificate Verification', url });
      } catch { /* cancelled */ }
      setSharing(false);
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  if (loading) return <LoadingPage />;
  if (error) return <ErrorPage message={error} />;
  if (!result) return null;

  const status = result.result;
  const cfg = STATUS[status];
  const cert = result.certificate;
  const org = result.organization;
  const StatusIcon = cfg.Icon;

  return (
    <div className="min-h-screen bg-[#f8f9fc] dark:bg-[#0d0d0f] flex flex-col">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 border-b border-black/5 dark:border-white/5 bg-white/80 dark:bg-[#111113]/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {org?.logo_url ? (
              <img src={org.logo_url} alt={org.name} className="h-7 w-auto object-contain" />
            ) : (
              <div className="h-7 w-7 rounded-full bg-brand-500/10 flex items-center justify-center">
                <Award className="h-3.5 w-3.5 text-brand-500" />
              </div>
            )}
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {org?.name ?? 'Certificate Verification'}
            </span>
          </div>
          <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', cfg.badgeBg, cfg.badgeText)}>
            <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
            {cfg.label}
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 space-y-6">

        {/* Status card */}
        <div className={cn('rounded-2xl bg-white dark:bg-[#111113] ring-1 overflow-hidden', cfg.ring)}>
          <div className={cn('bg-linear-to-br p-6', cfg.gradient)}>
            <div className="flex items-start gap-4">
              <div className={cn('p-3 rounded-xl ring-1', cfg.iconBg, cfg.ring)}>
                <StatusIcon className={cn('w-7 h-7', cfg.iconColor)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
                  Verification Status
                </p>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{cfg.label}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{cfg.description}</p>
              </div>
            </div>
          </div>
        </div>

        {cert && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* ── Left column: preview ─────────────────────────────────── */}
            <div className="lg:col-span-3 space-y-4">

              {result.preview_url && (
                <div className="rounded-2xl bg-white dark:bg-[#111113] ring-1 ring-black/5 dark:ring-white/5 overflow-hidden">
                  <div className="p-1.5">
                    <div className="rounded-xl overflow-hidden bg-gray-50 dark:bg-black/20">
                      {result.preview_url.toLowerCase().endsWith('.pdf') ? (
                        <iframe
                          src={`${result.preview_url}#toolbar=0&navpanes=0`}
                          className="w-full aspect-4/3"
                          title="Certificate Preview"
                        />
                      ) : (
                        <img
                          src={result.preview_url}
                          alt="Certificate Preview"
                          className="w-full h-auto object-contain"
                        />
                      )}
                    </div>
                  </div>
                  <div className="px-4 py-3 border-t border-black/5 dark:border-white/5 flex gap-2 flex-wrap">
                    <a
                      href={result.preview_url}
                      download="certificate"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition-colors min-w-35"
                    >
                      <Download className="w-4 h-4" />
                      Download PNG
                    </a>
                    <button
                      onClick={() => handleDownloadPdf(result.preview_url!)}
                      disabled={downloadingPdf}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-black/10 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 text-sm font-medium transition-colors text-gray-700 dark:text-gray-300 disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" />
                      {downloadingPdf ? 'Generating…' : 'Download PDF'}
                    </button>
                    <button
                      onClick={handleShare}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-black/10 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 text-sm font-medium transition-colors text-gray-700 dark:text-gray-300"
                    >
                      <Share2 className="w-4 h-4" />
                      {copied ? 'Copied!' : sharing ? '…' : 'Share'}
                    </button>
                  </div>
                </div>
              )}

              {/* Org card */}
              {org && (
                <div className="rounded-2xl bg-white dark:bg-[#111113] ring-1 ring-black/5 dark:ring-white/5 p-5">
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                    Issued by
                  </p>
                  <div className="flex items-center gap-3">
                    {org.logo_url ? (
                      <img
                        src={org.logo_url}
                        alt={org.name}
                        className="h-11 w-11 object-contain rounded-xl border border-black/5 dark:border-white/5 bg-white p-1"
                      />
                    ) : (
                      <div className="h-11 w-11 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{org.name}</p>
                      {org.website_url && (
                        <a
                          href={org.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1 mt-0.5"
                        >
                          Visit website <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Right column: details ────────────────────────────────── */}
            <div className="lg:col-span-2 space-y-4">

              <div className="rounded-2xl bg-white dark:bg-[#111113] ring-1 ring-black/5 dark:ring-white/5 p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4">
                  Certificate Details
                </p>
                <div className="space-y-4">
                  <Detail icon={User} label="Recipient" value={cert.recipient_name} />
                  <Detail icon={Hash} label="Certificate No." value={cert.certificate_number} mono />
                  {(cert.category_name || cert.subcategory_name) && (
                    <Detail
                      icon={Tag}
                      label="Category"
                      value={cert.subcategory_name
                        ? `${cert.category_name} › ${cert.subcategory_name}`
                        : cert.category_name}
                    />
                  )}
                  <Detail icon={Calendar} label="Issued On" value={fmt(cert.issued_at)} />
                  <Detail
                    icon={Clock}
                    label="Expires"
                    value={cert.expires_at ? fmt(cert.expires_at) : 'No expiry'}
                    muted={!cert.expires_at}
                  />
                  {cert.revoked_at && (
                    <Detail
                      icon={XCircle}
                      label="Revoked On"
                      value={fmt(cert.revoked_at)}
                      danger
                    />
                  )}
                  {cert.revoked_reason && (
                    <Detail
                      icon={AlertTriangle}
                      label="Reason"
                      value={cert.revoked_reason}
                      danger
                    />
                  )}
                </div>
              </div>

              {/* Trust indicator */}
              <div className="rounded-2xl bg-white dark:bg-[#111113] ring-1 ring-black/5 dark:ring-white/5 p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-brand-500/10">
                    <ShieldCheck className="w-5 h-5 text-brand-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      Blockchain-independent verification
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      Verified against live issuer database
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Not-found full state */}
        {status === 'not_found' && !cert && (
          <div className="rounded-2xl bg-white dark:bg-[#111113] ring-1 ring-black/5 dark:ring-white/5 p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Certificate Not Found
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              No certificate matches this verification link. The URL may be incorrect or the
              certificate may have been deleted. Contact the issuing organization for assistance.
            </p>
          </div>
        )}
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-black/5 dark:border-white/5 py-5 mt-4">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-500" />
            <span>Secured by <span className="font-semibold text-gray-600 dark:text-gray-400">Authentix</span> — Certificate Management Platform</span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Certificate ID: <span className="font-mono">{token.slice(0, 12)}…</span>
          </p>
        </div>
      </footer>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Detail({
  icon: Icon,
  label,
  value,
  mono,
  muted,
  danger,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
  muted?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 shrink-0">
        <Icon className={cn('w-4 h-4', danger ? 'text-red-400' : 'text-gray-400 dark:text-gray-500')} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
        <p className={cn(
          'text-sm font-medium break-all',
          mono && 'font-mono text-xs',
          muted && 'text-gray-400 dark:text-gray-500 font-normal',
          danger && 'text-red-600 dark:text-red-400',
          !muted && !danger && 'text-gray-900 dark:text-white',
        )}>
          {value}
        </p>
      </div>
    </div>
  );
}

function LoadingPage() {
  return (
    <div className="min-h-screen bg-[#f8f9fc] dark:bg-[#0d0d0f] flex flex-col">
      <div className="h-14 border-b border-black/5 dark:border-white/5 bg-white/80 dark:bg-[#111113]/80" />
      <div className="max-w-4xl mx-auto w-full px-4 py-8 space-y-6">
        <div className="rounded-2xl bg-white dark:bg-[#111113] ring-1 ring-black/5 dark:ring-white/5 p-6">
          <div className="flex gap-4">
            <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-3 w-28 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-full" />
              <div className="h-5 w-48 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-full" />
              <div className="h-3 w-72 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-full" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 rounded-2xl bg-white dark:bg-[#111113] ring-1 ring-black/5 dark:ring-white/5 aspect-4/3 animate-pulse" />
          <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-[#111113] ring-1 ring-black/5 dark:ring-white/5 p-5 space-y-4 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-4 h-4 bg-gray-100 dark:bg-gray-800 rounded-full mt-0.5" />
                <div className="flex-1 space-y-1">
                  <div className="h-2.5 w-16 bg-gray-100 dark:bg-gray-800 rounded-full" />
                  <div className="h-3.5 w-32 bg-gray-100 dark:bg-gray-800 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorPage({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-[#f8f9fc] dark:bg-[#0d0d0f] flex items-center justify-center p-4">
      <div className="rounded-2xl bg-white dark:bg-[#111113] ring-1 ring-black/5 dark:ring-white/5 p-10 text-center max-w-sm w-full">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-7 h-7 text-amber-500" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Verification Failed
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{message}</p>
        <button
          onClick={() => window.location.reload()}
          className="w-full py-2.5 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
