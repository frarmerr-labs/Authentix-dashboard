"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
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
import Image from "next/image";
import { api } from "@/lib/api/client";
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
import { OrgProvider } from "@/lib/org";

// ============================================================================
// Types
// ============================================================================

interface UserData {
  id: string;
  email: string;
  full_name: string | null;
}

interface OrganizationData {
  name: string;
  logo: string | null;
}

interface DashboardShellProps {
  children: React.ReactNode;
  orgId: string;
  initialUser: UserData | null;
  initialCompany: OrganizationData | null;
}

interface NavItem {
  readonly name: string;
  readonly href: string;
  readonly icon: React.ComponentType<{ className?: string }>;
}

type Theme = "light" | "dark" | "system";

// ============================================================================
// Constants
// ============================================================================

const NAVIGATION_ITEMS: readonly NavItem[] = [
  { name: "Analytics", href: "", icon: LayoutDashboard },
  { name: "Templates", href: "/templates", icon: FileText },
  { name: "Generate", href: "/generate-certificate", icon: Sparkles },
  { name: "Imports", href: "/imports", icon: Upload },
  { name: "Certificates", href: "/certificates", icon: FileCheck },
  { name: "Verification", href: "/verification-logs", icon: Shield },
  { name: "Billing", href: "/billing", icon: CreditCard },
  { name: "Users", href: "/users", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
] as const;

const THEME_CYCLE: Record<Theme, Theme> = {
  light: "dark",
  dark: "system",
  system: "light",
} as const;

// ============================================================================
// Sub-components
// ============================================================================

interface SidebarNavProps {
  readonly orgId: string;
  readonly pathname: string;
  readonly expanded: boolean;
}

function SidebarNav({ orgId, pathname, expanded }: SidebarNavProps) {
  const basePath = `/dashboard/org/${orgId}`;

  return (
    <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
      {NAVIGATION_ITEMS.map((item) => {
        const fullHref = item.href ? `${basePath}${item.href}` : basePath;
        const isActive =
          item.href === ""
            ? pathname === basePath
            : pathname.startsWith(fullHref);
        const Icon = item.icon;

        return (
          <Link
            key={item.name}
            href={fullHref}
            className={cn(
              "flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-all",
              expanded ? "px-3" : "justify-center",
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-primary"
            )}
            title={!expanded ? item.name : undefined}
          >
            <Icon className="h-[18px] w-[18px] flex-shrink-0" />
            {expanded && <span className="whitespace-nowrap">{item.name}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

interface ThemeButtonProps {
  readonly theme: Theme;
  readonly onCycle: () => void;
  readonly expanded: boolean;
}

function ThemeButton({ theme, onCycle, expanded }: ThemeButtonProps) {
  const Icon = theme === "dark" ? Sun : theme === "light" ? Moon : Monitor;
  const label =
    theme === "system" ? "System" : theme === "dark" ? "Dark" : "Light";

  return (
    <button
      onClick={onCycle}
      className={cn(
        "flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium w-full",
        expanded ? "px-3" : "justify-center",
        "text-muted-foreground hover:text-primary"
      )}
      aria-label={`Switch theme (currently ${label})`}
    >
      <Icon className="h-[18px] w-[18px]" />
      {expanded && <span>{label}</span>}
    </button>
  );
}

interface UserMenuProps {
  readonly user: UserData | null;
  readonly profileName: string;
  readonly organizationName: string;
  readonly organizationLogo: string | null;
  readonly orgId: string;
  readonly onLogout: () => void;
  readonly mounted: boolean;
}

function UserMenu({
  user,
  profileName,
  organizationName,
  organizationLogo,
  orgId,
  onLogout,
  mounted,
}: UserMenuProps) {
  if (!mounted) {
    return (
      <div className="flex items-center gap-3 pl-3 border-l">
        <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-3 pl-3 border-l hover:opacity-80"
          aria-label="User menu"
        >
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium">{profileName || "User"}</p>
            <p className="text-xs text-muted-foreground">
              {organizationName || "Organization"}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold overflow-hidden">
            {organizationLogo ? (
              <img
                src={organizationLogo}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              (profileName || "U").charAt(0).toUpperCase()
            )}
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
          <Link href={`/dashboard/org/${orgId}/organization`}>
            <Building2 className="mr-2 h-4 w-4" />
            Organization
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout} className="text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function DashboardShell({
  children,
  orgId,
  initialUser,
  initialCompany,
}: DashboardShellProps) {
  // State
  const [mounted, setMounted] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [theme, setTheme] = useState<Theme>("system");

  const pathname = usePathname();
  const router = useRouter();

  // Derived values
  const profileName =
    initialUser?.full_name ?? initialUser?.email?.split("@")[0] ?? "User";
  const organizationName = initialCompany?.name ?? "Organization";
  const organizationLogo = initialCompany?.logo ?? null;

  // Mounted effect for hydration safety
  useEffect(() => {
    setMounted(true);
  }, []);

  // Theme initialization (client-only)
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    const currentTheme = savedTheme ?? "system";

    setTheme(currentTheme);
    document.documentElement.classList.toggle(
      "dark",
      currentTheme === "dark" || (currentTheme === "system" && prefersDark)
    );
  }, []);

  // Callbacks
  const handleSetTheme = useCallback((value: Theme) => {
    setTheme(value);
    localStorage.setItem("theme", value);
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    document.documentElement.classList.toggle(
      "dark",
      value === "dark" || (value === "system" && prefersDark)
    );
  }, []);

  const handleCycleTheme = useCallback(() => {
    handleSetTheme(THEME_CYCLE[theme]);
  }, [theme, handleSetTheme]);

  const handleLogout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch {
      // Continue with logout even if API fails
    }
    router.push("/login");
    router.refresh();
  }, [router]);

  return (
    <OrgProvider orgId={orgId}>
      <div className="min-h-screen bg-background">
        <OnboardingModal />

        {/* Sidebar */}
        <aside
          className={cn(
            "fixed top-0 left-0 z-40 h-screen bg-card border-r transition-all duration-300",
            sidebarExpanded ? "w-52" : "w-14"
          )}
          onMouseEnter={() => setSidebarExpanded(true)}
          onMouseLeave={() => setSidebarExpanded(false)}
        >
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="h-16 flex items-center justify-center border-b px-2">
              <Link
                href={`/dashboard/org/${orgId}`}
                className="flex items-center gap-2"
              >
                <div className="w-8 h-8 rounded-lg bg-card border flex items-center justify-center shrink-0">
                  <Image
                    src="/brand/authentix-24-24.svg"
                    width={18}
                    height={18}
                    alt="Authentix"
                    priority
                  />
                </div>
                {sidebarExpanded && (
                  <span className="font-bold text-base whitespace-nowrap">
                    Authentix
                  </span>
                )}
              </Link>
            </div>

            {/* Navigation */}
            <SidebarNav
              orgId={orgId}
              pathname={pathname}
              expanded={sidebarExpanded}
            />

            {/* Bottom actions */}
            <div className="p-2 border-t space-y-1">
              <ThemeButton
                theme={theme}
                onCycle={handleCycleTheme}
                expanded={sidebarExpanded}
              />
              <button
                onClick={handleLogout}
                className={cn(
                  "flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium w-full",
                  sidebarExpanded ? "px-3" : "justify-center",
                  "text-muted-foreground hover:text-destructive"
                )}
              >
                <LogOut className="h-[18px] w-[18px]" />
                {sidebarExpanded && <span>Logout</span>}
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="pl-14">
          <header className="h-16 bg-card border-b sticky top-0 z-30">
            <div className="h-full px-6 flex items-center justify-between">
              <div
                id="header-left-portal"
                className="flex-1 flex items-center min-w-0"
              />
              <div
                id="header-portal"
                className="flex justify-center min-w-0 px-4"
              />
              <div className="flex-1 flex items-center justify-end gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
                </Button>
                <UserMenu
                  user={initialUser}
                  profileName={profileName}
                  organizationName={organizationName}
                  organizationLogo={organizationLogo}
                  orgId={orgId}
                  onLogout={handleLogout}
                  mounted={mounted}
                />
              </div>
            </div>
          </header>
          <main className="p-6">
            <div className="max-w-[1400px] mx-auto">{children}</div>
          </main>
        </div>
      </div>
    </OrgProvider>
  );
}
