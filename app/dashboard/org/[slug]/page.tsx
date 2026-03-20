/**
 * ORGANIZATION DASHBOARD PAGE (Server Component)
 *
 * Fetches dashboard stats on the server for fast initial load and delegates
 * all interactive analytics UI (charts + date filtering) to a client component.
 */

import { serverApiRequest } from "@/lib/api/server";
import { AnalyticsDashboardClient } from "@/components/dashboard/analytics/AnalyticsDashboardClient";

interface DashboardStats {
  totalCertificates?: number | null;
  pendingJobs?: number | null;
  verificationsToday?: number | null;
  revokedCertificates?: number | null;
  verificationEventsTotal?: number | null;
}

interface ImportItem {
  id: string;
  file_name?: string | null;
  files?: {
    original_name?: string | null;
  } | null;
  status: string;
  total_rows: number | null;
  created_at: string;
}

interface VerificationItem {
  id: string;
  result?: string | null;
  verified_at: string;
  certificate?: {
    recipient_name?: string | null;
    course_name?: string | null;
    [key: string]: unknown;
  } | null;
}

interface CertificateDailyPoint {
  date: string;
  issued: number;
  revoked: number;
  verificationScans?: number | null;
}

interface CertificateCategoryMixRow {
  categoryId: string | null;
  subcategoryId: string | null;
  categoryName: string;
  subcategoryName: string;
  count: number;
}

interface DashboardData {
  stats: DashboardStats;
  recentImports: ImportItem[];
  recentVerifications: VerificationItem[];
  certificatesDaily?: CertificateDailyPoint[];
  certificateCategoryMix?: CertificateCategoryMixRow[];
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getDashboardData(): Promise<DashboardData | null> {
  try {
    const response = await serverApiRequest<DashboardData>("/dashboard/stats");
    return response.data ?? null;
  } catch {
    return null;
  }
}

export default async function OrgDashboardPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getDashboardData();

  if (!data) {
    return <AnalyticsDashboardClient slug={slug} initialData={null} />;
  }

  const rawStats = data.stats ?? {};

  const initialData = {
    stats: {
      totalCertificates: rawStats.totalCertificates ?? 0,
      pendingJobs: rawStats.pendingJobs ?? 0,
      verificationsToday: rawStats.verificationsToday ?? 0,
      revokedCertificates: rawStats.revokedCertificates ?? 0,
      verificationEventsTotal: rawStats.verificationEventsTotal ?? 0,
    },
    recentImports: (data.recentImports ?? []).map((i) => ({
      id: i.id,
      file_name: i.file_name ?? i.files?.original_name ?? null,
      status: i.status,
      total_rows: i.total_rows ?? null,
      created_at: i.created_at,
    })),
    recentVerifications: data.recentVerifications ?? [],
    certificatesDaily: (data.certificatesDaily ?? []).map((d) => ({
      date: d.date,
      issued: d.issued,
      revoked: d.revoked,
      verificationScans: d.verificationScans ?? 0,
    })),
    certificateCategoryMix: data.certificateCategoryMix ?? [],
  };

  return <AnalyticsDashboardClient slug={slug} initialData={initialData} />;
}

