"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  differenceInCalendarDays,
  endOfDay,
  format,
  isWithinInterval,
  startOfDay,
  subDays,
} from "date-fns"
import type { DateRange } from "react-day-picker"
import {
  RadialBar,
  RadialBarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  RadarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
  Bar,
  BarChart,
} from "recharts"
import {
  Award,
  FileText,
  Shield,
  ArrowUpRight,
  Activity,
  TrendingUp,
  Layers,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { cn } from "@/lib/utils"

type DashboardStats = {
  totalCertificates: number
  pendingJobs: number
  verificationsToday: number
  revokedCertificates: number
  /** All-time public verification scans */
  verificationEventsTotal: number
}

type RecentImport = {
  id: string
  file_name?: string | null
  status: string
  total_rows: number | null
  created_at: string
}

type RecentVerification = {
  id: string
  result?: string | null
  verified_at: string
  certificate?: {
    recipient_name?: string | null
    course_name?: string | null
    [key: string]: unknown
  } | null
}

type CertificateDailyPoint = {
  date: string
  issued: number
  revoked: number
  verificationScans: number
}

type CertificateCategoryMixRow = {
  categoryId: string | null
  subcategoryId: string | null
  categoryName: string
  subcategoryName: string
  count: number
}

type DashboardData = {
  stats: DashboardStats
  recentImports: RecentImport[]
  recentVerifications: RecentVerification[]
  certificatesDaily: CertificateDailyPoint[]
  certificateCategoryMix: CertificateCategoryMixRow[]
}

export interface AnalyticsDashboardClientProps {
  slug: string
  initialData: DashboardData | null
}

type RangePreset = "today" | "week" | "month" | "custom"

function getTimeAgo(date: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(date).getTime()) / 1000
  )
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

function orgPath(slug: string, path: string): string {
  return `/dashboard/org/${slug}${path}`
}

function formatRangeLabel(preset: RangePreset, custom?: DateRange): string {
  if (preset === "today") return "Today"
  if (preset === "week") return "Last 7 days"
  if (preset === "month") return "Last 30 days"
  if (preset === "custom" && custom?.from && custom?.to) {
    return `${format(custom.from, "MMM d, yyyy")} - ${format(custom.to, "MMM d, yyyy")}`
  }
  if (preset === "custom" && custom?.from && !custom?.to) {
    return `${format(custom.from, "MMM d, yyyy")} - …`
  }
  return "Custom range"
}

function toInterval(preset: RangePreset, custom?: DateRange): {
  start: Date
  end: Date
} {
  const today = new Date()
  const end = endOfDay(today)

  if (preset === "today") {
    return { start: startOfDay(today), end }
  }
  if (preset === "week") {
    const from = startOfDay(subDays(today, 6))
    return { start: from, end }
  }
  if (preset === "month") {
    const from = startOfDay(subDays(today, 29))
    return { start: from, end }
  }
  if (custom?.from) {
    return {
      start: startOfDay(custom.from),
      end: custom.to ? endOfDay(custom.to) : end,
    }
  }

  // Fallback
  return { start: startOfDay(subDays(today, 6)), end }
}

function normalizeImportStatus(status: string): "completed" | "failed" | "in_progress" {
  if (status === "completed") return "completed"
  if (status === "failed") return "failed"
  return "in_progress"
}

/**
 * Scales preview/fallback chart values by filter: day < week < month < custom span.
 */
function chartFallbackMultiplier(
  preset: RangePreset,
  customRange: DateRange | undefined
): number {
  switch (preset) {
    case "today":
      return 1
    case "week":
      return 2.2
    case "month":
      return 4.2
    case "custom": {
      if (customRange?.from && customRange?.to) {
        const days =
          differenceInCalendarDays(
            endOfDay(customRange.to),
            startOfDay(customRange.from)
          ) + 1
        return Math.min(8, Math.max(1, days / 4))
      }
      return 2
    }
    default:
      return 1
  }
}

/** When all KPIs are zero, show visible preview rings scaled by range. */
function buildRadialChartRows(
  stats: DashboardStats,
  m: number
): {
  rows: { browser: string; visitors: number; fill: string }[]
  isPreview: boolean
} {
  const total =
    stats.totalCertificates +
    stats.pendingJobs +
    stats.verificationsToday +
    stats.revokedCertificates

  const template = [
    { browser: "chrome", fill: "var(--color-chrome)" },
    { browser: "safari", fill: "var(--color-safari)" },
    { browser: "firefox", fill: "var(--color-firefox)" },
    { browser: "edge", fill: "var(--color-edge)" },
  ] as const

  if (total === 0) {
    const preview = [
      Math.round(42 * m),
      Math.round(6 * m),
      Math.round(28 * m),
      Math.round(4 * m),
    ]
    return {
      isPreview: true,
      rows: template.map((t, i) => ({
        ...t,
        visitors: Math.max(1, preview[i]!),
      })),
    }
  }

  return {
    isPreview: false,
    rows: [
      {
        browser: "chrome",
        visitors: Math.max(0, stats.totalCertificates),
        fill: "var(--color-chrome)",
      },
      {
        browser: "safari",
        visitors: Math.max(0, stats.pendingJobs),
        fill: "var(--color-safari)",
      },
      {
        browser: "firefox",
        visitors: Math.max(0, stats.verificationsToday),
        fill: "var(--color-firefox)",
      },
      {
        browser: "edge",
        visitors: Math.max(0, stats.revokedCertificates),
        fill: "var(--color-edge)",
      },
    ],
  }
}

/** When filtered activity sum is zero, show visible radar shape scaled by range. */
function buildRadarDotsRows(
  importCompleted: number,
  importFailed: number,
  importInProgress: number,
  verificationValid: number,
  verificationInvalid: number,
  m: number
): { month: string; desktop: number }[] {
  const real = [
    { month: "Imp. done", desktop: importCompleted },
    { month: "Imp. fail", desktop: importFailed },
    { month: "Imp. queue", desktop: importInProgress },
    { month: "Verify OK", desktop: verificationValid },
    { month: "Verify no", desktop: verificationInvalid },
  ]
  const sum = real.reduce((a, d) => a + d.desktop, 0)
  if (sum > 0) return real

  const preview = [12, 4, 7, 18, 3].map((v) => Math.max(1, Math.round(v * m)))
  return real.map((d, i) => ({ ...d, desktop: preview[i]! }))
}

/** When bucket totals are zero, add range-scaled preview so both lines are visible. */
function mergeLineBucketsWithFallback(
  buckets: { month: string; desktop: number; mobile: number }[],
  m: number
): { month: string; desktop: number; mobile: number }[] {
  const importSum = buckets.reduce((a, b) => a + b.desktop, 0)
  const verifySum = buckets.reduce((a, b) => a + b.mobile, 0)
  if (importSum + verifySum > 0) return buckets

  return buckets.map((b, i) => ({
    ...b,
    desktop: Math.max(1, Math.round((6 + i * 2) * m)),
    mobile: Math.max(1, Math.round((10 - i) * m)),
  }))
}

/** Buckets selected range into 6 segments for radar “lines only” (Imports vs Verifications). */
function buildImportVerificationBuckets(
  interval: { start: Date; end: Date },
  imports: RecentImport[],
  verifications: RecentVerification[]
): { month: string; desktop: number; mobile: number }[] {
  const start = interval.start.getTime()
  const end = interval.end.getTime()
  const span = Math.max(end - start, 1)
  const bucketMs = span / 6
  const buckets = Array.from({ length: 6 }, (_, i) => {
    const mid = start + bucketMs * (i + 0.5)
    return {
      month: format(new Date(mid), "MMM d"),
      desktop: 0,
      mobile: 0,
    }
  })

  for (const imp of imports) {
    const t = new Date(imp.created_at).getTime()
    if (t < start || t > end) continue
    const idx = Math.min(5, Math.floor((t - start) / bucketMs))
    const b = buckets[idx]
    if (b) b.desktop += 1
  }
  for (const v of verifications) {
    const t = new Date(v.verified_at).getTime()
    if (t < start || t > end) continue
    const idx = Math.min(5, Math.floor((t - start) / bucketMs))
    const b = buckets[idx]
    if (b) b.mobile += 1
  }
  return buckets
}

/** Backend sends last 90 UTC days; slice to the analytics date filter (UTC day `yyyy-MM-dd`). */
function filterCertificatesDailyByInterval(
  series: CertificateDailyPoint[],
  interval: { start: Date; end: Date }
): CertificateDailyPoint[] {
  // Use UTC date boundaries so the filter matches the backend's UTC `YYYY-MM-DD` strings.
  const fromStr = interval.start.toISOString().slice(0, 10)
  const toStr = interval.end.toISOString().slice(0, 10)
  return series.filter((r) => r.date >= fromStr && r.date <= toStr)
}

function RecentImportsCard({
  slug,
  imports,
}: {
  slug: string
  imports: RecentImport[]
}) {
  return (
    <Card>
      <CardHeader className="border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-lg">Recent Imports</CardTitle>
          </div>
          <Link href={orgPath(slug, "/imports")}>
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
            <p className="text-sm text-muted-foreground">No imports in this range</p>
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
                      {item.file_name || "Unknown file"}
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
                    {item.total_rows ?? 0} rows • {getTimeAgo(item.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function RecentVerificationsCard({
  slug,
  verifications,
}: {
  slug: string
  verifications: RecentVerification[]
}) {
  return (
    <Card>
      <CardHeader className="border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-lg">Recent Verifications</CardTitle>
          </div>
          <Link href={orgPath(slug, "/verification-logs")}>
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
              No verifications in this range
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
  )
}

function EmptyState({ slug }: { slug: string }) {
  return (
    <Card className="border-2 border-dashed bg-card/40">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mb-6">
          <Award className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-2xl font-bold mb-2">No certificates yet</h3>
        <p className="text-muted-foreground text-center mb-8 max-w-md">
          Get started by creating a template, then import data to generate certificates.
        </p>
        <div className="flex gap-3">
          <Link href={orgPath(slug, "/templates")}>
            <Button>Create Template</Button>
          </Link>
          <Link href={orgPath(slug, "/imports")}>
            <Button variant="outline">Import Data</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

function ChartRadialGridKpis({
  stats,
  preset,
  customRange,
}: {
  stats: DashboardStats
  preset: RangePreset
  customRange: DateRange | undefined
}) {
  const m = chartFallbackMultiplier(preset, customRange)
  const { rows: chartData, isPreview } = buildRadialChartRows(stats, m)

  const chartConfig = {
    visitors: {
      label: "Count",
    },
    chrome: {
      label: "Total certificates",
      color: "var(--chart-1)",
    },
    safari: {
      label: "Pending jobs",
      color: "var(--chart-2)",
    },
    firefox: {
      label: "Verifications today",
      color: "var(--chart-3)",
    },
    edge: {
      label: "Revoked",
      color: "var(--chart-4)",
    },
  } satisfies ChartConfig

  const totalReal =
    stats.totalCertificates +
    stats.pendingJobs +
    stats.verificationsToday +
    stats.revokedCertificates

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle className="text-lg">Key metrics</CardTitle>
        <CardDescription>
          Certificates, pending jobs, verifications today, and revoked — scaled
          preview when there is no live data yet
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto w-full max-w-[320px]"
        >
          <RadialBarChart data={chartData} innerRadius={30} outerRadius={100}>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel nameKey="browser" />}
            />
            <PolarGrid gridType="circle" />
            <RadialBar dataKey="visitors" />
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 leading-none font-medium">
          {isPreview ? (
            <>
              Preview for {preset === "custom" ? "custom range" : preset} filter
              <TrendingUp className="h-4 w-4" />
            </>
          ) : (
            <>
              {totalReal.toLocaleString()} total across segments{" "}
              <TrendingUp className="h-4 w-4" />
            </>
          )}
        </div>
        <div className="leading-none text-muted-foreground">
          {isPreview
            ? "Sample distribution so charts stay visible — real totals replace this when you have data."
            : "Live totals from your workspace API."}
        </div>
      </CardFooter>
    </Card>
  )
}

function ChartRadarDotsActivity({
  imports,
  verifications,
  rangeLabel,
  preset,
  customRange,
}: {
  imports: RecentImport[]
  verifications: RecentVerification[]
  rangeLabel: string
  preset: RangePreset
  customRange: DateRange | undefined
}) {
  const m = chartFallbackMultiplier(preset, customRange)
  const importCompleted = imports.filter((i) => normalizeImportStatus(i.status) === "completed").length
  const importFailed = imports.filter((i) => normalizeImportStatus(i.status) === "failed").length
  const importInProgress = imports.filter((i) => normalizeImportStatus(i.status) === "in_progress").length
  const verificationValid = verifications.filter((v) => v.result === "valid").length
  const verificationInvalid = verifications.length - verificationValid

  const rawSum =
    importCompleted +
    importFailed +
    importInProgress +
    verificationValid +
    verificationInvalid
  const chartData = buildRadarDotsRows(
    importCompleted,
    importFailed,
    importInProgress,
    verificationValid,
    verificationInvalid,
    m
  )
  const isPreview = rawSum === 0

  const chartConfig = {
    desktop: {
      label: "Count",
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig

  const sum = chartData.reduce((a, d) => a + d.desktop, 0)

  return (
    <Card>
      <CardHeader className="items-center">
        <CardTitle className="text-lg">Activity mix</CardTitle>
        <CardDescription>
          Import and verification counts for {rangeLabel}
          {isPreview ? " (preview curve when no events in range)" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto w-full max-w-[320px]"
        >
          <RadarChart data={chartData}>
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <PolarAngleAxis dataKey="month" />
            <PolarGrid />
            <Radar
              dataKey="desktop"
              fill="var(--color-desktop)"
              fillOpacity={0.6}
              dot={{
                r: 4,
                fillOpacity: 1,
              }}
            />
          </RadarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 leading-none font-medium">
          {isPreview ? (
            <>
              Range-scaled preview ({sum} display units){" "}
              <TrendingUp className="h-4 w-4" />
            </>
          ) : (
            <>
              {sum} events in range <TrendingUp className="h-4 w-4" />
            </>
          )}
        </div>
        <div className="flex items-center gap-2 leading-none text-muted-foreground">
          {isPreview
            ? "Shows a visible shape until imports/verifications appear for this filter."
            : "From recent import and verification rows in your selected period."}
        </div>
      </CardFooter>
    </Card>
  )
}

function ChartRadarLinesImportsVsVerifications({
  interval,
  imports,
  verifications,
  rangeLabel,
  preset,
  customRange,
}: {
  interval: { start: Date; end: Date }
  imports: RecentImport[]
  verifications: RecentVerification[]
  rangeLabel: string
  preset: RangePreset
  customRange: DateRange | undefined
}) {
  const m = chartFallbackMultiplier(preset, customRange)
  const buckets = buildImportVerificationBuckets(interval, imports, verifications)
  const importSumBefore = buckets.reduce((a, b) => a + b.desktop, 0)
  const verifySumBefore = buckets.reduce((a, b) => a + b.mobile, 0)
  const hadActivity = importSumBefore + verifySumBefore > 0
  const chartData = mergeLineBucketsWithFallback(buckets, m)

  const chartConfig = {
    desktop: {
      label: "Imports",
      color: "var(--chart-1)",
    },
    mobile: {
      label: "Verifications",
      color: "var(--chart-2)",
    },
  } satisfies ChartConfig

  return (
    <Card>
      <CardHeader className="items-center pb-4">
        <CardTitle className="text-lg">Imports vs verifications</CardTitle>
        <CardDescription>
          Six time slices over {rangeLabel}
          {!hadActivity ? " — preview trend until events land in range" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto w-full max-w-[320px]"
        >
          <RadarChart data={chartData}>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <PolarAngleAxis dataKey="month" />
            <PolarGrid radialLines={false} />
            <Radar
              dataKey="desktop"
              fill="var(--color-desktop)"
              fillOpacity={0}
              stroke="var(--color-desktop)"
              strokeWidth={2}
            />
            <Radar
              dataKey="mobile"
              fill="var(--color-mobile)"
              fillOpacity={0}
              stroke="var(--color-mobile)"
              strokeWidth={2}
            />
          </RadarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 leading-none font-medium">
          {hadActivity ? (
            <>
              {importSumBefore} imports · {verifySumBefore} verifications{" "}
              <TrendingUp className="h-4 w-4" />
            </>
          ) : (
            <>
              Preview imports vs verifications (range-scaled){" "}
              <TrendingUp className="h-4 w-4" />
            </>
          )}
        </div>
        <div className="flex items-center gap-2 leading-none text-muted-foreground">
          Equal-width buckets across your filter window
        </div>
      </CardFooter>
    </Card>
  )
}

type CertLineMetric = "issued" | "verificationScans"

function ChartCertificatesDailyInteractive({
  series,
  rangeLabel,
}: {
  series: CertificateDailyPoint[]
  rangeLabel: string
}) {
  const [activeChart, setActiveChart] = React.useState<CertLineMetric>("issued")

  const chartConfig = {
    certificates: {
      label: "Certificates",
    },
    issued: {
      label: "Generated",
      color: "var(--chart-1)",
    },
    verificationScans: {
      label: "Verification scans",
      color: "var(--chart-3)",
    },
  } satisfies ChartConfig

  const total = React.useMemo(
    () => ({
      issued: series.reduce((acc, curr) => acc + curr.issued, 0),
      verificationScans: series.reduce((acc, curr) => acc + curr.verificationScans, 0),
    }),
    [series]
  )

  const hasActivity = total.issued + total.verificationScans > 0

  return (
    <Card className="py-4 sm:py-0">
      <CardHeader className="flex flex-col items-stretch border-b p-0! sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 pb-3 sm:pb-0">
          <CardTitle className="text-lg">Certificates: generated vs verification</CardTitle>
          <CardDescription>
            Daily counts for {rangeLabel}. “Generated” uses `certificates.created_at`;
            “Verification scans” uses `certificate_verification_events.scanned_at`.
          </CardDescription>
        </div>
        <div className="flex">
          {(["issued", "verificationScans"] as const).map((key) => {
            const chart = key
            return (
              <button
                key={chart}
                type="button"
                data-active={activeChart === chart}
                className="flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
                onClick={() => setActiveChart(chart)}
              >
                <span className="text-xs text-muted-foreground">
                  {chartConfig[chart].label}
                </span>
                <span className="text-lg leading-none font-bold sm:text-3xl">
                  {total[chart].toLocaleString()}
                </span>
              </button>
            )
          })}
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        {series.length === 0 ? (
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            No days in this range overlap the loaded history (last 90 days).
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[280px] w-full sm:h-[300px]"
          >
            <LineChart
              accessibilityLayer
              data={series}
              margin={{
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(String(value))
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(value: unknown) => {
                      return new Date(String(value)).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }
                      )
                    }}
                  />
                }
              />
              <Line
                dataKey={activeChart}
                type="monotone"
                stroke={`var(--color-${activeChart})`}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
      {!hasActivity && series.length > 0 && (
        <CardFooter className="text-xs text-muted-foreground">
          Flat line at zero — no certificate generated or verification scans in this range yet.
        </CardFooter>
      )}
    </Card>
  )
}

function ChartCertificateCategoryMixTop({
  mix,
}: {
  mix: CertificateCategoryMixRow[]
}) {
  const chartConfig = {
    count: {
      label: "Certificates",
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig

  const chartData = React.useMemo(() => {
    return mix.map((row) => ({
      label: `${row.categoryName} / ${row.subcategoryName}`,
      count: row.count,
    }))
  }, [mix])

  return (
    <Card className="py-4 sm:py-0">
      <CardHeader className="items-start pb-4">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <div className="space-y-1">
            <CardTitle className="text-lg">Top category + subcategory</CardTitle>
            <CardDescription>
              Which category/subcategory your certificates are generated from
              most (all-time).
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-0">
        {chartData.length === 0 ? (
          <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
            No certificates available to build a category breakdown yet.
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="h-[360px] w-full sm:h-[420px]"
          >
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{
                left: 8,
                right: 8,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <YAxis
                dataKey="label"
                type="category"
                width={220}
                tickLine={false}
                axisLine={false}
              />
              <XAxis
                dataKey="count"
                type="number"
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => Number(value).toLocaleString()}
              />
              <ChartTooltip
                content={<ChartTooltipContent nameKey="label" />}
              />
              <Bar
                dataKey="count"
                fill="var(--color-count)"
                radius={[6, 6, 6, 6]}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>

      <CardFooter className="text-xs text-muted-foreground">
        Date filters apply to the line chart only (category breakdown is
        lifetime totals).
      </CardFooter>
    </Card>
  )
}

export function AnalyticsDashboardClient({
  slug,
  initialData,
}: AnalyticsDashboardClientProps) {
  const router = useRouter()

  const [preset, setPreset] = React.useState<RangePreset>("week")
  const [customRange, setCustomRange] = React.useState<DateRange | undefined>(() => undefined)

  const stats = initialData?.stats ?? {
    totalCertificates: 0,
    pendingJobs: 0,
    verificationsToday: 0,
    revokedCertificates: 0,
    verificationEventsTotal: 0,
  }

  const rangeLabel = formatRangeLabel(preset, customRange)
  const interval = React.useMemo(() => toInterval(preset, customRange), [preset, customRange])

  const allImports = React.useMemo(
    () => initialData?.recentImports ?? [],
    [initialData]
  )
  const allVerifications = React.useMemo(
    () => initialData?.recentVerifications ?? [],
    [initialData]
  )

  const allCertificatesDaily = React.useMemo(
    () => initialData?.certificatesDaily ?? [],
    [initialData]
  )

  const allCertificateCategoryMix = React.useMemo(
    () => initialData?.certificateCategoryMix ?? [],
    [initialData]
  )

  const filteredCertificatesDaily = React.useMemo(
    () => filterCertificatesDailyByInterval(allCertificatesDaily, interval),
    [allCertificatesDaily, interval]
  )

  const filteredImports = React.useMemo(
    () =>
      allImports.filter((i) => {
        const dt = new Date(i.created_at)
        return isWithinInterval(dt, interval)
      }),
    [allImports, interval]
  )

  const filteredVerifications = React.useMemo(
    () =>
      allVerifications.filter((v) => {
        const dt = new Date(v.verified_at)
        return isWithinInterval(dt, interval)
      }),
    [allVerifications, interval]
  )

  const hasAnyKpi =
    stats.totalCertificates > 0 ||
    stats.pendingJobs > 0 ||
    stats.verificationsToday > 0 ||
    stats.revokedCertificates > 0

  const hasAnyActivity = filteredImports.length > 0 || filteredVerifications.length > 0

  if (!initialData) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Failed to load analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Please refresh the page to retry.
            </p>
            <Button className="mt-4" onClick={() => router.refresh()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            {hasAnyKpi || hasAnyActivity
              ? "Monitor your certificate operations with charts and filtered activity."
              : "Get started with your first template to unlock analytics."}
          </p>
        </div>

        <div className="w-full lg:max-w-[420px]">
          <Tabs value={preset} onValueChange={(v) => setPreset(v as RangePreset)}>
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="custom">Custom</TabsTrigger>
            </TabsList>

            <TabsContent value="custom">
              <div className="mt-3">
                <DatePickerWithRange
                  date={customRange}
                  onDateChange={setCustomRange}
                  className="w-full max-w-60"
                />
              </div>
            </TabsContent>
          </Tabs>
          <div className="mt-3 text-sm text-muted-foreground">
            Filtering recent activity by: <span className={cn("font-medium text-foreground")}>{rangeLabel}</span>
          </div>
        </div>
      </div>

      {/* Charts — radial + radar (with range-scaled preview when empty) */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <ChartRadialGridKpis
            stats={stats}
            preset={preset}
            customRange={customRange}
          />
        </div>
        <div className="lg:col-span-2">
          <ChartCertificatesDailyInteractive
            series={filteredCertificatesDaily}
            rangeLabel={rangeLabel}
          />
        </div>
        <ChartRadarDotsActivity
          imports={filteredImports}
          verifications={filteredVerifications}
          rangeLabel={rangeLabel}
          preset={preset}
          customRange={customRange}
        />
        <ChartRadarLinesImportsVsVerifications
          interval={interval}
          imports={filteredImports}
          verifications={filteredVerifications}
          rangeLabel={rangeLabel}
          preset={preset}
          customRange={customRange}
        />
        <div className="lg:col-span-2">
          <ChartCertificateCategoryMixTop mix={allCertificateCategoryMix} />
        </div>
      </div>

      {/* Empty State */}
      {!hasAnyKpi && !hasAnyActivity && <EmptyState slug={slug} />}

      {/* Activity */}
      {(hasAnyKpi || hasAnyActivity) && (
        <div className="grid gap-6 lg:grid-cols-2">
          <RecentImportsCard slug={slug} imports={filteredImports} />
          <RecentVerificationsCard
            slug={slug}
            verifications={filteredVerifications}
          />
        </div>
      )}
    </div>
  )
}

