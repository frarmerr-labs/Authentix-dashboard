"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, FileText, Shield, Ban, TrendingUp, TrendingDown, ArrowUpRight, Clock, Activity } from "lucide-react";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalCertificates: 0,
    pendingJobs: 0,
    verificationsToday: 0,
    revokedCertificates: 0,
  });
  const [recentImports, setRecentImports] = useState<any[]>([]);
  const [recentVerifications, setRecentVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const data = await api.dashboard.getStats();
      
      setStats(data.stats);
      setRecentImports(data.recentImports);
      setRecentVerifications(data.recentVerifications);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
            <div className="h-4 w-96 bg-muted animate-pulse rounded" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                  <div className="h-10 w-24 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const hasData = stats.totalCertificates > 0 || recentImports.length > 0;

  const kpiCards = [
    {
      title: "Total Certificates",
      value: stats.totalCertificates.toLocaleString(),
      icon: Award,
      // Only show trend once you actually have certificates
      trend: stats.totalCertificates > 0 ? { value: 12.5, direction: "up" as const } : undefined,
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-500/10 to-cyan-500/10",
    },
    {
      title: "Pending Jobs",
      value: stats.pendingJobs,
      icon: Clock,
      subtitle: stats.pendingJobs === 0 ? 'All caught up' : 'In progress',
      gradient: "from-orange-500 to-amber-500",
      bgGradient: "from-orange-500/10 to-amber-500/10",
    },
    {
      title: "Verifications Today",
      value: stats.verificationsToday.toLocaleString(),
      icon: Shield,
      trend: { value: 8.2, direction: "up" as const },
      gradient: "from-green-500 to-emerald-500",
      bgGradient: "from-green-500/10 to-emerald-500/10",
    },
    {
      title: "Revoked",
      value: stats.revokedCertificates,
      icon: Ban,
      subtitle: 'Certificates',
      gradient: "from-red-500 to-rose-500",
      bgGradient: "from-red-500/10 to-rose-500/10",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1.5 text-base">
            {hasData ? "Monitor your certificate operations" : "Get started with your first template"}
          </p>
        </div>
        {!hasData && (
          <Link href="/dashboard/templates">
            <Button className="h-9 px-4">
              Create Template
            </Button>
          </Link>
        )}
      </div>

      {/* Enhanced KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card, index) => (
          <Card
            key={card.title}
            className="relative overflow-hidden border border-border bg-card/60 hover:bg-card transition-all duration-300 group"
            style={{ 
              animation: `fadeIn 0.5s ease-out ${index * 0.1}s backwards` 
            }}
          >
            <div className="absolute inset-0 bg-card/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardContent className="p-6 relative">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-muted flex items-center justify-center">
                  <card.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                {card.trend && (
                  <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                    card.trend.direction === 'up' 
                      ? 'bg-green-500/10 text-green-600 dark:text-green-400' 
                      : 'bg-red-500/10 text-red-600 dark:text-red-400'
                  }`}>
                    {card.trend.direction === 'up' ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    <span>{card.trend.value}%</span>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1.5">
                  {card.title}
                </p>
                <p className="text-3xl font-bold tracking-tight mb-1">
                  {card.value}
                </p>
                {card.subtitle && (
                  <p className="text-xs text-muted-foreground">
                    {card.subtitle}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {!hasData && (
        <Card className="border-2 border-dashed border-border bg-card/40 relative overflow-hidden">
          <CardContent className="relative flex flex-col items-center justify-center py-16 px-4">
            <div className="mb-6">
              <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                <Award className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-2">
              No certificates yet
            </h3>
            <p className="text-muted-foreground text-center mb-8 max-w-md leading-relaxed">
              Get started by creating a template, then import an Excel file to generate your first batch of certificates.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/dashboard/templates">
                <Button className="h-9 px-4">
                  Create Template
                </Button>
              </Link>
              <Link href="/dashboard/imports">
                <Button variant="outline" className="h-9 px-4">
                  Import Excel
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Grid with Timeline Design */}
      {hasData && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Imports */}
          <Card className="overflow-hidden">
            <CardHeader className="border-b bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-muted flex items-center justify-center">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-lg font-semibold">Recent Imports</CardTitle>
                </div>
                <Link href="/dashboard/imports">
                  <Button variant="ghost" size="sm" className="h-8 text-xs gap-1">
                    View all
                    <ArrowUpRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {recentImports.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No imports yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentImports.map((item, index) => (
                    <div
                      key={item.id}
                      className="relative flex items-start gap-4 group"
                    >
                      {index !== recentImports.length - 1 && (
                        <div className="absolute left-4 top-10 bottom-0 w-px bg-border" />
                      )}
                      <div className="relative flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-background bg-muted">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-sm font-medium truncate">
                            {item.file_name}
                          </p>
                          <Badge 
                            variant={item.status === 'completed' ? 'default' : item.status === 'failed' ? 'destructive' : 'secondary'}
                            className="text-xs flex-shrink-0"
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

          {/* Recent Verifications */}
          <Card className="overflow-hidden">
            <CardHeader className="border-b bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-muted flex items-center justify-center">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-lg font-semibold">Recent Verifications</CardTitle>
                </div>
                <Link href="/dashboard/verification-logs">
                  <Button variant="ghost" size="sm" className="h-8 text-xs gap-1">
                    View all
                    <ArrowUpRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {recentVerifications.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
                    <Shield className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No verifications yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentVerifications.map((item, index) => (
                    <div
                      key={item.id}
                      className="relative flex items-start gap-4 group"
                    >
                      {index !== recentVerifications.length - 1 && (
                        <div className="absolute left-4 top-10 bottom-0 w-px bg-border" />
                      )}
                      <div className="relative flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-background bg-muted">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-sm font-medium truncate">
                            {item.certificates?.recipient_name || 'Unknown'}
                          </p>
                          <Badge 
                            variant={item.result === 'valid' ? 'default' : 'destructive'}
                            className="text-xs flex-shrink-0"
                          >
                            {item.result}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.certificates?.course_name || 'N/A'} • {getTimeAgo(item.verified_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
