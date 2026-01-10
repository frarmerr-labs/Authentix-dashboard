"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, FileText, Shield, Ban, TrendingUp, TrendingDown, ArrowUpRight, Clock, Activity } from "lucide-react";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useOrg } from "@/lib/org";

export default function OrgDashboardPage() {
  const { orgPath } = useOrg();
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
    { title: "Total Certificates", value: stats.totalCertificates.toLocaleString(), icon: Award, trend: stats.totalCertificates > 0 ? { value: 12.5, direction: "up" as const } : undefined },
    { title: "Pending Jobs", value: stats.pendingJobs, icon: Clock, subtitle: stats.pendingJobs === 0 ? 'All caught up' : 'In progress' },
    { title: "Verifications Today", value: stats.verificationsToday.toLocaleString(), icon: Shield, trend: { value: 8.2, direction: "up" as const } },
    { title: "Revoked", value: stats.revokedCertificates, icon: Ban, subtitle: 'Certificates' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1.5">{hasData ? "Monitor your certificate operations" : "Get started with your first template"}</p>
        </div>
        {!hasData && <Link href={orgPath("/templates")}><Button>Create Template</Button></Link>}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => (
          <Card key={card.title} className="border bg-card/60 hover:bg-card transition-all">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-muted"><card.icon className="h-5 w-5 text-muted-foreground" /></div>
                {card.trend && (
                  <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${card.trend.direction === 'up' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                    {card.trend.direction === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    <span>{card.trend.value}%</span>
                  </div>
                )}
              </div>
              <p className="text-sm font-medium text-muted-foreground mb-1.5">{card.title}</p>
              <p className="text-3xl font-bold tracking-tight mb-1">{card.value}</p>
              {card.subtitle && <p className="text-xs text-muted-foreground">{card.subtitle}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {!hasData && (
        <Card className="border-2 border-dashed bg-card/40">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mb-6"><Award className="h-8 w-8 text-muted-foreground" /></div>
            <h3 className="text-2xl font-bold mb-2">No certificates yet</h3>
            <p className="text-muted-foreground text-center mb-8 max-w-md">Get started by creating a template, then import data to generate certificates.</p>
            <div className="flex gap-3">
              <Link href={orgPath("/templates")}><Button>Create Template</Button></Link>
              <Link href={orgPath("/imports")}><Button variant="outline">Import Data</Button></Link>
            </div>
          </CardContent>
        </Card>
      )}

      {hasData && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="border-b bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-lg">Recent Imports</CardTitle>
                </div>
                <Link href={orgPath("/imports")}><Button variant="ghost" size="sm" className="gap-1">View all<ArrowUpRight className="h-3 w-3" /></Button></Link>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {recentImports.length === 0 ? (
                <div className="text-center py-12"><p className="text-sm text-muted-foreground">No imports yet</p></div>
              ) : (
                <div className="space-y-4">
                  {recentImports.map((item, i) => (
                    <div key={item.id} className="relative flex items-start gap-4">
                      {i !== recentImports.length - 1 && <div className="absolute left-4 top-10 bottom-0 w-px bg-border" />}
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center ring-4 ring-background"><Activity className="h-4 w-4 text-muted-foreground" /></div>
                      <div className="flex-1 pt-1">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-sm font-medium truncate">{item.file_name}</p>
                          <Badge variant={item.status === 'completed' ? 'default' : item.status === 'failed' ? 'destructive' : 'secondary'}>{item.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{item.total_rows || 0} rows • {getTimeAgo(item.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-lg">Recent Verifications</CardTitle>
                </div>
                <Link href={orgPath("/verification-logs")}><Button variant="ghost" size="sm" className="gap-1">View all<ArrowUpRight className="h-3 w-3" /></Button></Link>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {recentVerifications.length === 0 ? (
                <div className="text-center py-12"><p className="text-sm text-muted-foreground">No verifications yet</p></div>
              ) : (
                <div className="space-y-4">
                  {recentVerifications.map((item, i) => (
                    <div key={item.id} className="relative flex items-start gap-4">
                      {i !== recentVerifications.length - 1 && <div className="absolute left-4 top-10 bottom-0 w-px bg-border" />}
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center ring-4 ring-background"><Shield className="h-4 w-4 text-muted-foreground" /></div>
                      <div className="flex-1 pt-1">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-sm font-medium truncate">{item.certificates?.recipient_name || 'Unknown'}</p>
                          <Badge variant={item.result === 'valid' ? 'default' : 'destructive'}>{item.result}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{item.certificates?.course_name || 'N/A'} • {getTimeAgo(item.verified_at)}</p>
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
