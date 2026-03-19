"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Palette, Bell, Shield, Key } from "lucide-react";
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
    },
      {
      icon: Key,
      title: "API Settings",
      description: "Generate and manage API keys for integration",
      href: orgPath("/settings/api"),
    },
      {
      icon: Palette,
      title: "Appearance",
      description: "Customize the look and feel of your dashboard",
      href: orgPath("/settings"),
    },
    {
      icon: Bell,
      title: "Notifications",
      description: "Configure email and webhook notifications",
      href: orgPath("/settings"),
    },
    {
      icon: Shield,
      title: "Security",
      description: "Manage authentication and access control",
      href: orgPath("/settings"),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1.5 text-base">
          Manage your account and organization preferences
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {settingsSections.map((section) => (
          <Link key={section.title} href={section.href}>
            <Card 
              className="group hover:shadow-md transition-all duration-300 cursor-pointer border border-border bg-card/60 overflow-hidden h-full"
            >
              <CardHeader className="relative">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-muted flex items-center justify-center">
                    <section.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1">{section.title}</CardTitle>
                    <CardDescription className="text-sm leading-relaxed">
                      {section.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative">
                <Button variant="outline" size="sm" className="w-full">
                  Configure
                </Button>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
