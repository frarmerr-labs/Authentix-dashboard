"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Palette, Bell, Shield, Key, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useOrg } from "@/lib/org";

export default function SettingsPage() {
  const { orgPath } = useOrg();
  
  const settingsSections = [
    {
      icon: Building2,
      title: "Organization Profile",
      description: "Manage your organization information and branding",
      href: orgPath("/organization"),
      color: "text-blue-500",
      bgHover: "group-hover:bg-blue-500/10",
    },
    {
      icon: Key,
      title: "API Settings",
      description: "Generate and manage API keys for integration",
      href: orgPath("/settings/api"),
      color: "text-emerald-500",
      bgHover: "group-hover:bg-emerald-500/10",
    },
    {
      icon: Mail,
      title: "Email Delivery",
      description: "Configure email integration and manage templates for certificate delivery",
      href: orgPath("/settings/delivery"),
      color: "text-violet-500",
      bgHover: "group-hover:bg-violet-500/10",
    },
    {
      icon: Palette,
      title: "Appearance",
      description: "Customize the look and feel of your dashboard",
      href: orgPath("/settings"),
      color: "text-pink-500",
      bgHover: "group-hover:bg-pink-500/10",
    },
    {
      icon: Bell,
      title: "Notifications",
      description: "Configure email and webhook notifications",
      href: orgPath("/settings"),
      color: "text-amber-500",
      bgHover: "group-hover:bg-amber-500/10",
    },
    {
      icon: Shield,
      title: "Security",
      description: "Manage authentication and access control",
      href: orgPath("/settings"),
      color: "text-red-500",
      bgHover: "group-hover:bg-red-500/10",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-16 pt-2 md:pt-10 relative px-4 md:px-0 flex flex-col justify-center min-h-[calc(100vh-[10rem])]">
      
      {/* ── Ambient Background glows ── */}
      <div className="absolute top-0 right-1/4 -z-10 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] opacity-60 pointer-events-none mix-blend-screen" />
      <div className="absolute top-[20%] left-0 -z-10 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[90px] opacity-40 pointer-events-none mix-blend-screen" />

      {/* Header */}
      <div className="relative z-10 text-center flex flex-col items-center">
        <h1 className="text-3xl md:text-[2.25rem] font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/80 mb-3">
          Organization Settings
        </h1>
        <p className="text-muted-foreground text-sm md:text-base max-w-lg leading-relaxed">
          Manage your account preferences, integrations, and configurations from this central hub.
        </p>
      </div>

      {/* Settings List */}
      <div className="flex flex-col gap-3.5 relative z-10">
        {settingsSections.map((section) => (
          <Link key={section.title} href={section.href} className="group outline-none">
            <div className="flex items-center justify-between p-5 pr-6 bg-card/60 backdrop-blur-md border border-border/40 rounded-[1.25rem] hover:bg-muted/30 hover:shadow-sm hover:border-border/80 transition-all duration-300 relative overflow-hidden group-hover:-translate-y-0.5">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="flex items-center gap-5 relative z-10">
                <div className={`p-3 rounded-xl bg-muted/60 border border-border/50 flex flex-shrink-0 items-center justify-center transition-colors duration-300 ${section.bgHover}`}>
                  <section.icon className={`h-5 w-5 text-muted-foreground group-hover:${section.color} transition-colors duration-300`} />
                </div>
                <div>
                  <h3 className="text-[1.05rem] font-semibold text-foreground group-hover:text-primary transition-colors tracking-tight">
                    {section.title}
                  </h3>
                  <p className="text-[13px] leading-relaxed text-muted-foreground/80 group-hover:text-muted-foreground transition-colors mt-0.5">
                    {section.description}
                  </p>
                </div>
              </div>
              <div className="relative z-10 pl-4">
                <div className="h-8 w-8 rounded-full flex items-center justify-center bg-muted/50 group-hover:bg-primary/10 transition-colors">
                  <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transform group-hover:translate-x-0.5 transition-all duration-300" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
