"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Award,
  LayoutDashboard,
  FileText,
  Upload,
  FileCheck,
  Shield,
  Settings,
  Users,
  LogOut,
  Moon,
  Sun,
  Monitor,
  Bell,
  Building2,
  Sparkles,
  CreditCard,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { clearLegacyTokens } from "@/lib/auth/storage";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";

interface UserSession {
  id: string;
  email: string;
  full_name: string | null;
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Certificate Templates", href: "/dashboard/templates", icon: FileText },
  { name: "Generate", href: "/dashboard/generate-certificate", icon: Sparkles },
  { name: "Imports", href: "/dashboard/imports", icon: Upload },
  { name: "Certificates", href: "/dashboard/certificates", icon: FileCheck },
  { name: "Verification", href: "/dashboard/verification-logs", icon: Shield },
  { name: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { name: "Users", href: "/dashboard/users", icon: Users },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [user, setUser] = useState<UserSession | null>(null);
  const [profileName, setProfileName] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");
  const [companyLogo, setCompanyLogo] = useState<string>("");
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const savedTheme =
      typeof window !== "undefined"
        ? (localStorage.getItem("theme") as "light" | "dark" | "system" | null)
        : null;

    const prefersDark =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    const currentTheme = savedTheme ?? "system";
    setTheme(currentTheme);

    const shouldDark =
      currentTheme === "dark" || (currentTheme === "system" && prefersDark);

    setDarkMode(shouldDark);
    if (shouldDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    const loadUser = async () => {
      try {
        const session = await api.auth.getSession();

        if (!session.valid || !session.user) {
          router.push("/login");
          return;
        }

        setUser(session.user);
        setProfileName(
          session.user.full_name ?? session.user.email?.split("@")[0] ?? "User"
        );

        // Get company info from profile
        try {
          const profile = await api.users.getProfile();

          if (profile.company) {
            if (profile.company.name) {
              setCompanyName(profile.company.name);
            }
            if (profile.company.logo) {
              setCompanyLogo(profile.company.logo);
            }
          }
        } catch {
          // Company info not available
        }
      } catch {
        router.push("/login");
      }
    };

    loadUser();
  }, [router]);

  const setThemePreference = (value: "light" | "dark" | "system") => {
    setTheme(value);
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", value);
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const shouldDark = value === "dark" || (value === "system" && prefersDark);
      setDarkMode(shouldDark);
      if (shouldDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  };

  const cycleTheme = () => {
    const next: "light" | "dark" | "system" =
      theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setThemePreference(next);
  };

  const handleLogout = async () => {
    try {
      await api.auth.logout();
    } catch {
      // Ignore logout errors
    } finally {
      // Clear any legacy localStorage tokens
      clearLegacyTokens();
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Onboarding Modal */}
      <OnboardingModal />

      {/* Sidebar - Collapsed by default, expands on hover */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen bg-card border-r transition-all duration-300 ease-in-out",
          sidebarExpanded ? "w-52" : "w-14"
        )}
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-center border-b px-2">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                <Award className="h-4 w-4 text-primary-foreground" />
              </div>
              {sidebarExpanded && (
                <span className="font-bold text-base whitespace-nowrap">
                  MineCert
                </span>
              )}
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                    sidebarExpanded ? "px-3" : "justify-center",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-primary"
                  )}
                  title={!sidebarExpanded ? item.name : undefined}
                >
                  <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
                  {sidebarExpanded && (
                    <span className="whitespace-nowrap">{item.name}</span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Bottom Section */}
          <div className="p-2 border-t space-y-1">
            <button
              onClick={cycleTheme}
              className={cn(
                "flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-all w-full group",
                sidebarExpanded ? "px-3" : "justify-center",
                "text-muted-foreground hover:text-primary"
              )}
              title={
                !sidebarExpanded
                  ? theme === "system"
                    ? "Theme: System"
                    : theme === "dark"
                    ? "Theme: Dark"
                    : "Theme: Light"
                  : undefined
              }
            >
              {theme === "dark" ? (
                <Sun className="h-[18px] w-[18px] flex-shrink-0" />
              ) : theme === "light" ? (
                <Moon className="h-[18px] w-[18px] flex-shrink-0" />
              ) : (
                <Monitor className="h-[18px] w-[18px] flex-shrink-0" />
              )}
              {sidebarExpanded && (
                <span className="whitespace-nowrap">
                  {theme === "system"
                    ? "Theme: System"
                    : theme === "dark"
                    ? "Theme: Dark"
                    : "Theme: Light"}
                </span>
              )}
            </button>
            <button
              onClick={handleLogout}
              className={cn(
                "flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-all w-full group",
                sidebarExpanded ? "px-3" : "justify-center",
                "text-muted-foreground hover:text-destructive"
              )}
              title={!sidebarExpanded ? "Logout" : undefined}
            >
              <LogOut className="h-[18px] w-[18px] flex-shrink-0" />
              {sidebarExpanded && (
                <span className="whitespace-nowrap">Logout</span>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="pl-14">
        {/* Top bar */}
        <header className="h-16 bg-card border-b sticky top-0 z-30">
          <div className="h-full px-6 flex items-center justify-between">
            {/* Left section spacer / Portal Target */}
            <div
              id="header-left-portal"
              className="flex-1 flex items-center min-w-0"
            />

            {/* Center Portal Target */}
            <div id="header-portal" className="flex justify-center min-w-0 px-4" />

            {/* Right section */}
            <div className="flex-1 flex items-center justify-end gap-3">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full"></span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 pl-3 border-l hover:opacity-80 transition-opacity">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-medium">{profileName || "User"}</p>
                      <p className="text-xs text-muted-foreground">
                        {companyName || "Company"}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold cursor-pointer overflow-hidden">
                      {companyLogo ? (
                        <img
                          src={companyLogo}
                          alt={companyName || "Company logo"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        (profileName || companyName || "U").charAt(0).toUpperCase()
                      )}
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{profileName || "User"}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                      {companyName && (
                        <p className="text-xs text-muted-foreground">
                          {companyName}
                        </p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link
                      href="/dashboard/company"
                      className="cursor-pointer flex items-center"
                    >
                      <Building2 className="mr-2 h-4 w-4" />
                      <span>Company Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Theme</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => setThemePreference("light")}
                    className="cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <Sun className="mr-2 h-4 w-4" />
                      <span>Light</span>
                    </div>
                    {theme === "light" && (
                      <span className="text-xs text-primary">●</span>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setThemePreference("dark")}
                    className="cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <Moon className="mr-2 h-4 w-4" />
                      <span>Dark</span>
                    </div>
                    {theme === "dark" && (
                      <span className="text-xs text-primary">●</span>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setThemePreference("system")}
                    className="cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <Monitor className="mr-2 h-4 w-4" />
                      <span>System</span>
                    </div>
                    {theme === "system" && (
                      <span className="text-xs text-primary">●</span>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          <div className="max-w-[1400px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
