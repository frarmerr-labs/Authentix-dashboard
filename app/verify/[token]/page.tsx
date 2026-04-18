'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  User,
  Building2,
  Award,
  ExternalLink,
  FileText,
  Clock,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

const statusConfig = {
  valid: {
    icon: ShieldCheck,
    label: 'Verified',
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-950',
    borderColor: 'border-green-200 dark:border-green-800',
    badgeVariant: 'default' as const,
    badgeClass: 'bg-green-600 hover:bg-green-600',
  },
  expired: {
    icon: ShieldAlert,
    label: 'Expired',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    badgeVariant: 'secondary' as const,
    badgeClass: 'bg-yellow-600 hover:bg-yellow-600 text-white',
  },
  revoked: {
    icon: ShieldX,
    label: 'Revoked',
    color: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-950',
    borderColor: 'border-red-200 dark:border-red-800',
    badgeVariant: 'destructive' as const,
    badgeClass: '',
  },
  not_found: {
    icon: XCircle,
    label: 'Not Found',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50 dark:bg-gray-950',
    borderColor: 'border-gray-200 dark:border-gray-800',
    badgeVariant: 'outline' as const,
    badgeClass: '',
  },
};

export default function VerificationPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        setLoading(true);
        setError(null);

        // Call backend verification API directly (public endpoint)
        const response = await fetch('/api/proxy/verification/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (data.success && data.data) {
          setResult(data.data);
        } else {
          setResult({
            valid: false,
            result: 'not_found',
            message: data.error?.message || 'Certificate not found',
          });
        }
      } catch (err) {
        console.error('Verification error:', err);
        setError('Failed to verify certificate. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      verifyToken();
    }
  }, [token]);

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const status = result?.result || 'not_found';
  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div className="min-h-screen bg-linear-to-b from-muted/30 to-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {result?.organization?.logo_url ? (
              <img
                src={result.organization.logo_url}
                alt={result.organization.name}
                className="h-8 w-auto object-contain"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Award className="h-4 w-4 text-primary" />
              </div>
            )}
            <div>
              <h1 className="font-semibold text-sm">Certificate Verification</h1>
              {result?.organization?.name && (
                <p className="text-xs text-muted-foreground">{result.organization.name}</p>
              )}
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            <ShieldCheck className="w-3 h-3 mr-1" />
            Powered by Authentix
          </Badge>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <ErrorState message={error} />
        ) : result ? (
          <div className="space-y-6">
            {/* Status Banner */}
            <Card className={cn('p-6', config.bgColor, config.borderColor)}>
              <div className="flex items-center gap-4">
                <div className={cn('p-3 rounded-full', config.bgColor)}>
                  <StatusIcon className={cn('w-8 h-8', config.color)} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge className={config.badgeClass} variant={config.badgeVariant}>
                      {config.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{result.message}</p>
                </div>
              </div>
            </Card>

            {result.certificate && (
              <>
                {/* Certificate Preview */}
                {result.preview_url && (
                  <Card className="overflow-hidden">
                    <div className="aspect-[4/3] bg-muted flex items-center justify-center">
                      {result.preview_url.toLowerCase().endsWith('.pdf') ? (
                        <iframe
                          src={`${result.preview_url}#toolbar=0&navpanes=0`}
                          className="w-full h-full"
                          title="Certificate Preview"
                        />
                      ) : (
                        <img
                          src={result.preview_url}
                          alt="Certificate Preview"
                          className="w-full h-full object-contain"
                        />
                      )}
                    </div>
                  </Card>
                )}

                {/* Certificate Details */}
                <Card className="p-6">
                  <h2 className="font-semibold mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Certificate Details
                  </h2>
                  <div className="grid gap-4">
                    <DetailRow
                      icon={User}
                      label="Recipient"
                      value={result.certificate.recipient_name}
                    />
                    <DetailRow
                      icon={Award}
                      label="Certificate Number"
                      value={result.certificate.certificate_number}
                      mono
                    />
                    <DetailRow
                      icon={FileText}
                      label="Category"
                      value={
                        result.certificate.subcategory_name
                          ? `${result.certificate.category_name} - ${result.certificate.subcategory_name}`
                          : result.certificate.category_name
                      }
                    />
                    <DetailRow
                      icon={Calendar}
                      label="Issued On"
                      value={formatDate(result.certificate.issued_at)}
                    />
                    <DetailRow
                      icon={Clock}
                      label="Expires On"
                      value={
                        result.certificate.expires_at
                          ? formatDate(result.certificate.expires_at)
                          : 'Never'
                      }
                    />
                    {result.certificate.revoked_at && (
                      <DetailRow
                        icon={XCircle}
                        label="Revoked On"
                        value={formatDate(result.certificate.revoked_at)}
                        className="text-red-600"
                      />
                    )}
                    {result.certificate.revoked_reason && (
                      <DetailRow
                        icon={AlertTriangle}
                        label="Revocation Reason"
                        value={result.certificate.revoked_reason}
                        className="text-red-600"
                      />
                    )}
                  </div>
                </Card>

                {/* Issuer Details */}
                {result.organization && (
                  <Card className="p-6">
                    <h2 className="font-semibold mb-4 flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Issued By
                    </h2>
                    <div className="flex items-center gap-4">
                      {result.organization.logo_url ? (
                        <img
                          src={result.organization.logo_url}
                          alt={result.organization.name}
                          className="h-12 w-12 object-contain rounded-lg border bg-white p-1"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                          <Building2 className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{result.organization.name}</p>
                        {result.organization.website_url && (
                          <a
                            href={result.organization.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            Visit Website
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </Card>
                )}
              </>
            )}

            {/* Not Found State */}
            {status === 'not_found' && (
              <Card className="p-8 text-center">
                <XCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Certificate Not Found</h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  The certificate you are looking for could not be found. Please check the URL
                  or contact the issuing organization for assistance.
                </p>
              </Card>
            )}
          </div>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground">
            This verification page is powered by{' '}
            <a
              href="https://authentix.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Authentix
            </a>
            {' '}- Secure Certificate Management Platform
          </p>
        </div>
      </footer>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  mono,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn('text-sm font-medium', mono && 'font-mono', className)}>{value}</p>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-muted animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-24 bg-muted animate-pulse rounded" />
            <div className="h-4 w-48 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </Card>
      <Card className="p-6">
        <div className="h-6 w-40 mb-4 bg-muted animate-pulse rounded" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="h-4 w-4 bg-muted animate-pulse rounded" />
              <div className="space-y-1 flex-1">
                <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                <div className="h-4 w-48 bg-muted animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <Card className="p-8 text-center">
      <AlertTriangle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
      <h3 className="font-semibold text-lg mb-2">Verification Failed</h3>
      <p className="text-muted-foreground text-sm mb-4">{message}</p>
      <Button onClick={() => window.location.reload()}>Try Again</Button>
    </Card>
  );
}
