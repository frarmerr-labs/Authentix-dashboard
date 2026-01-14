/**
 * ORGANIZATION DASHBOARD PAGE (Server Component)
 *
 * Fetches dashboard stats on the server for fast initial load.
 * Uses Suspense boundary (loading.tsx) for streaming.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Award,
  FileText,
  Shield,
  Ban,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Clock,
  Activity,
} from "lucide-react";
import { serverApiRequest } from "@/lib/api/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

// ============================================================================
// Types
// ============================================================================

interface DashboardStats {
  totalCertificates?: number | null;
  pendingJobs?: number | null;
  verificationsToday?: number | null;
  revokedCertificates?: number | null;
}

interface ImportItem {
  id: string;
  // Backend may return file_name (derived) or use files.original_name
  file_name?: string | null;
  // Fallback: files.original_name from related files table
  files?: {
    original_name?: string | null;
  } | null;
  status: "completed" | "failed" | "processing";
  total_rows: number | null;
  created_at: string;
}

interface VerificationItem {
  id: string;
  // Backend returns data from certificate_verification_events table
  result?: string | null;
  verified_at: string;
  // Certificate data from certificate_verification_events
  certificate?: {
    recipient_name?: string | null;
    course_name?: string | null;
    // Additional fields that may come from certificate_verification_events
    [key: string]: unknown;
  } | null;
}

interface DashboardData {
  stats: DashboardStats;
  recentImports: ImportItem[];
  recentVerifications: VerificationItem[];
}

interface PageProps {
  params: Promise<{ orgId: string }>;
}

// ============================================================================
// Data Fetching
// ============================================================================

async function getDashboardData(): Promise<DashboardData | null> {
  try {
    const response = await serverApiRequest<DashboardData>("/dashboard/stats");
    return response.data ?? null;
  } catch {
    return null;
  }
}

// ============================================================================
// Helpers
// ============================================================================

function getTimeAgo(date: string): string {
  const seconds = Math.floor(
    (new Date().getTime() - new Date(date).getTime()) / 1000
  );
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function orgPath(orgId: string, path: string): string {
  return `/dashboard/org/${orgId}${path}`;
}

// ============================================================================
// Sub-components
// ============================================================================

interface KpiCardProps {
  readonly title: string;
  readonly value: string | number;
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly trend?: { value: number; direction: "up" | "down" };
  readonly subtitle?: string;
}

function KpiCard({ title, value, icon: Icon, trend, subtitle }: KpiCardProps) {
  return (
    <Card className="border bg-card/60 hover:bg-card transition-all">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-xl bg-muted">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
          {trend && (
            <div
              className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                trend.direction === "up"
                  ? "bg-green-500/10 text-green-600"
                  : "bg-red-500/10 text-red-600"
              }`}
            >
              {trend.direction === "up" ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>{trend.value}%</span>
            </div>
          )}
        </div>
        <p className="text-sm font-medium text-muted-foreground mb-1.5">
          {title}
        </p>
        <p className="text-3xl font-bold tracking-tight mb-1">{value}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

interface EmptyStateProps {
  readonly orgId: string;
}

function EmptyState({ orgId }: EmptyStateProps) {
  return (
    <Card className="border-2 border-dashed bg-card/40">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mb-6">
          <Award className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-2xl font-bold mb-2">No certificates yet</h3>
        <p className="text-muted-foreground text-center mb-8 max-w-md">
          Get started by creating a template, then import data to generate
          certificates.
        </p>
        <div className="flex gap-3">
          <Link href={orgPath(orgId, "/templates")}>
            <Button>Create Template</Button>
          </Link>
          <Link href={orgPath(orgId, "/imports")}>
            <Button variant="outline">Import Data</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

interface RecentImportsCardProps {
  readonly orgId: string;
  readonly imports: ImportItem[];
}

function RecentImportsCard({ orgId, imports }: RecentImportsCardProps) {
  return (
    <Card>
      <CardHeader className="border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-lg">Recent Imports</CardTitle>
          </div>
          <Link href={orgPath(orgId, "/imports")}>
            <Button variant="ghost" size="sm" className="gap-1">
              View all
              <ArrowUpRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {imports.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">No imports yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {imports.map((item, i) => (
              <div key={item.id} className="relative flex items-start gap-4">
                {i !== imports.length - 1 && (
                  <div className="absolute left-4 top-10 bottom-0 w-px bg-border" />
                )}
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center ring-4 ring-background">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 pt-1">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-sm font-medium truncate">
                      {/* Use file_name if backend returns it, otherwise fallback to files.original_name */}
                      {item.file_name || item.files?.original_name || "Unknown file"}
                    </p>
                    <Badge
                      variant={
                        item.status === "completed"
                          ? "default"
                          : item.status === "failed"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {item.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.total_rows || 0} rows • {getTimeAgo(item.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface RecentVerificationsCardProps {
  readonly orgId: string;
  readonly verifications: VerificationItem[];
}

function RecentVerificationsCard({
  orgId,
  verifications,
}: RecentVerificationsCardProps) {
  return (
    <Card>
      <CardHeader className="border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-lg">Recent Verifications</CardTitle>
          </div>
          <Link href={orgPath(orgId, "/verification-logs")}>
            <Button variant="ghost" size="sm" className="gap-1">
              View all
              <ArrowUpRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {verifications.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">
              No verification activity yet
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {verifications.map((item, i) => (
              <div key={item.id} className="relative flex items-start gap-4">
                {i !== verifications.length - 1 && (
                  <div className="absolute left-4 top-10 bottom-0 w-px bg-border" />
                )}
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center ring-4 ring-background">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 pt-1">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-sm font-medium truncate">
                      {item.certificate?.recipient_name || "Unknown"}
                    </p>
                    <Badge
                      variant={item.result === "valid" ? "default" : "destructive"}
                    >
                      {item.result || "unknown"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.certificate?.course_name || "N/A"} •{" "}
                    {getTimeAgo(item.verified_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default async function OrgDashboardPage({ params }: PageProps) {
  const { orgId } = await params;
  const data = await getDashboardData();

  // Default data if fetch failed or is partial
  const rawStats = data?.stats ?? {};
  const stats = {
    totalCertificates: rawStats.totalCertificates ?? 0,
    pendingJobs: rawStats.pendingJobs ?? 0,
    verificationsToday: rawStats.verificationsToday ?? 0,
    revokedCertificates: rawStats.revokedCertificates ?? 0,
  };
  const recentImports = data?.recentImports ?? [];
  const recentVerifications = data?.recentVerifications ?? [];

  const hasData = stats.totalCertificates > 0 || recentImports.length > 0;

  const kpiCards: KpiCardProps[] = [
    {
      title: "Total Certificates",
      value: stats.totalCertificates.toLocaleString(),
      icon: Award,
      trend:
        stats.totalCertificates > 0
          ? { value: 12.5, direction: "up" }
          : undefined,
    },
    {
      title: "Pending Jobs",
      value: stats.pendingJobs,
      icon: Clock,
      subtitle: stats.pendingJobs === 0 ? "All caught up" : "In progress",
    },
    {
      title: "Verifications Today",
      value: stats.verificationsToday.toLocaleString(),
      icon: Shield,
      trend: { value: 8.2, direction: "up" },
    },
    {
      title: "Revoked",
      value: stats.revokedCertificates,
      icon: Ban,
      subtitle: "Certificates",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1.5">
            {hasData
              ? "Monitor your certificate operations"
              : "Get started with your first template"}
          </p>
        </div>
        {!hasData && (
          <Link href={orgPath(orgId, "/templates")}>
            <Button>Create Template</Button>
          </Link>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => (
          <KpiCard key={card.title} {...card} />
        ))}
      </div>

      {/* Empty State */}
      {!hasData && <EmptyState orgId={orgId} />}

      {/* Activity Grid */}
      {hasData && (
        <div className="grid gap-6 lg:grid-cols-2">
          <RecentImportsCard orgId={orgId} imports={recentImports} />
          <RecentVerificationsCard
            orgId={orgId}
            verifications={recentVerifications}
          />
        </div>
      )}
    </div>
  );
}
