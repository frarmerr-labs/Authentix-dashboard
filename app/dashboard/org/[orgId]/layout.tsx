"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Award, LayoutDashboard, FileText, Upload, FileCheck, Shield,
  Settings, Users, LogOut, Moon, Sun, Monitor, Bell, Building2, Sparkles, CreditCard,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { clearLegacyTokens } from "@/lib/auth/storage";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { OrgProvider } from "@/lib/org";

interface UserSession {
  id: string;
  email: string;
  full_name: string | null;
}

const getNavigation = (orgId: string) => [
  { name: "Dashboard", href: `/dashboard/org/${orgId}`, icon: LayoutDashboard },
  { name: "Templates", href: `/dashboard/org/${orgId}/templates`, icon: FileText },
  { name: "Generate", href: `/dashboard/org/${orgId}/generate-certificate`, icon: Sparkles },
  { name: "Imports", href: `/dashboard/org/${orgId}/imports`, icon: Upload },
  { name: "Certificates", href: `/dashboard/org/${orgId}/certificates`, icon: FileCheck },
  { name: "Verification", href: `/dashboard/org/${orgId}/verification-logs`, icon: Shield },
  { name: "Billing", href: `/dashboard/org/${orgId}/billing`, icon: CreditCard },
  { name: "Users", href: `/dashboard/org/${orgId}/users`, icon: Users },
  { name: "Settings", href: `/dashboard/org/${orgId}/settings`, icon: Settings },
];

interface OrgLayoutProps {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}

export default function OrgDashboardLayout({ children, params }: OrgLayoutProps) {
  const { orgId } = use(params);
  
  const [mounted, setMounted] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [user, setUser] = useState<UserSession | null>(null);
  const [profileName, setProfileName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyLogo, setCompanyLogo] = useState("");
  const [orgValidated, setOrgValidated] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const navigation = getNavigation(orgId);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const savedTheme = typeof window !== "undefined"
      ? (localStorage.getItem("theme") as "light" | "dark" | "system" | null) : null;
    const prefersDark = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const currentTheme = savedTheme ?? "system";
    setTheme(currentTheme);
    const shouldDark = currentTheme === "dark" || (currentTheme === "system" && prefersDark);
    document.documentElement.classList.toggle("dark", shouldDark);

    const loadUser = async () => {
      try {
        const session = await api.auth.getSession();
        if (!session.valid || !session.user) {
          router.push("/login");
          return;
        }
        setUser(session.user);
        setProfileName(session.user.full_name ?? session.user.email?.split("@")[0] ?? "User");

        const profile = await api.users.getProfile();
        if (profile.company_id !== orgId) {
          router.replace(`/dashboard/org/${profile.company_id}`);
          return;
        }
        setOrgValidated(true);
        if (profile.company?.name) setCompanyName(profile.company.name);
        if (profile.company?.logo) setCompanyLogo(profile.company.logo);
      } catch {
        router.push("/login");
      }
    };
    loadUser();
  }, [router, orgId]);

  const setThemePreference = (value: "light" | "dark" | "system") => {
    setTheme(value);
    localStorage.setItem("theme", value);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", value === "dark" || (value === "system" && prefersDark));
  };

  const cycleTheme = () => {
    setThemePreference(theme === "light" ? "dark" : theme === "dark" ? "system" : "light");
  };

  const handleLogout = async () => {
    try { await api.auth.logout(); } catch {}
    clearLegacyTokens();
    router.push("/login");
    router.refresh();
  };

  if (!orgValidated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <OrgProvider orgId={orgId}>
      <div className="min-h-screen bg-background">
        <OnboardingModal />
        <aside
          className={cn("fixed top-0 left-0 z-40 h-screen bg-card border-r transition-all duration-300", sidebarExpanded ? "w-52" : "w-14")}
          onMouseEnter={() => setSidebarExpanded(true)}
          onMouseLeave={() => setSidebarExpanded(false)}
        >
          <div className="flex flex-col h-full">
            <div className="h-16 flex items-center justify-center border-b px-2">
              <Link href={`/dashboard/org/${orgId}`} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                  <Award className="h-4 w-4 text-primary-foreground" />
                </div>
                {sidebarExpanded && <span className="font-bold text-base whitespace-nowrap">MineCert</span>}
              </Link>
            </div>
            <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
              {navigation.map((item) => {
                const isActive = item.href === `/dashboard/org/${orgId}` ? pathname === item.href : pathname.startsWith(item.href);
                return (
                  <Link key={item.name} href={item.href}
                    className={cn("flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                      sidebarExpanded ? "px-3" : "justify-center",
                      isActive ? "text-primary" : "text-muted-foreground hover:text-primary")}
                    title={!sidebarExpanded ? item.name : undefined}
                  >
                    <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
                    {sidebarExpanded && <span className="whitespace-nowrap">{item.name}</span>}
                  </Link>
                );
              })}
            </nav>
            <div className="p-2 border-t space-y-1">
              <button onClick={cycleTheme}
                className={cn("flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium w-full",
                  sidebarExpanded ? "px-3" : "justify-center", "text-muted-foreground hover:text-primary")}
              >
                {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : theme === "light" ? <Moon className="h-[18px] w-[18px]" /> : <Monitor className="h-[18px] w-[18px]" />}
                {sidebarExpanded && <span>{theme === "system" ? "System" : theme === "dark" ? "Dark" : "Light"}</span>}
              </button>
              <button onClick={handleLogout}
                className={cn("flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium w-full",
                  sidebarExpanded ? "px-3" : "justify-center", "text-muted-foreground hover:text-destructive")}
              >
                <LogOut className="h-[18px] w-[18px]" />
                {sidebarExpanded && <span>Logout</span>}
              </button>
            </div>
          </div>
        </aside>
        <div className="pl-14">
          <header className="h-16 bg-card border-b sticky top-0 z-30">
            <div className="h-full px-6 flex items-center justify-between">
              <div id="header-left-portal" className="flex-1 flex items-center min-w-0" />
              <div id="header-portal" className="flex justify-center min-w-0 px-4" />
              <div className="flex-1 flex items-center justify-end gap-3">
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
                </Button>
                {mounted ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-3 pl-3 border-l hover:opacity-80">
                        <div className="text-right hidden sm:block">
                          <p className="text-sm font-medium">{profileName || "User"}</p>
                          <p className="text-xs text-muted-foreground">{companyName || "Company"}</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold overflow-hidden">
                          {companyLogo ? <img src={companyLogo} alt="" className="w-full h-full object-cover" /> : (profileName || "U").charAt(0).toUpperCase()}
                        </div>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>
                        <p className="text-sm font-medium">{profileName}</p>
                        <p className="text-xs text-muted-foreground">{user?.email}</p>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/org/${orgId}/company`}><Building2 className="mr-2 h-4 w-4" />Company</Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                        <LogOut className="mr-2 h-4 w-4" />Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <div className="flex items-center gap-3 pl-3 border-l">
                    <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                  </div>
                )}
              </div>
            </div>
          </header>
          <main className="p-6"><div className="max-w-[1400px] mx-auto">{children}</div></main>
        </div>
      </div>
    </OrgProvider>
  );
}
