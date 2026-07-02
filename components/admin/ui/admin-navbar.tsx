"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  LayoutDashboard,
  LogOut,
  Settings,
  TrendingUp,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { adminTokens } from "./tokens";

export const ADMIN_NAV_TABS = {
  overview: "overview",
  investments: "investments",
  users: "users",
  notifications: "notifications",
  settings: "settings",
} as const;

export type AdminNavTab = (typeof ADMIN_NAV_TABS)[keyof typeof ADMIN_NAV_TABS];

interface AdminNavbarProps {
  userName?: string;
  activeTab?: string;
  onTabNavigate?: (tab: AdminNavTab) => void;
}

const navItems = [
  { href: "/admin", label: "Painel", icon: LayoutDashboard, exact: true },
  { href: "/admin/rentabilidades", label: "Rentabilidades", icon: TrendingUp },
  {
    href: "/admin",
    label: "Operações",
    icon: BarChart3,
    tab: ADMIN_NAV_TABS.investments,
  },
  {
    href: "/admin",
    label: "Usuários",
    icon: Users,
    tab: ADMIN_NAV_TABS.users,
  },
];

export function AdminFintechNavbar({
  userName,
  activeTab,
  onTabNavigate,
}: AdminNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdminHome = pathname === "/admin";

  const isActive = (href: string, exact?: boolean, tab?: AdminNavTab) => {
    if (tab && isAdminHome) return activeTab === tab;
    if (exact) return pathname === href;
    return pathname.startsWith(href) && href !== "/admin";
  };

  const navigateToTab = (tab: AdminNavTab) => {
    if (isAdminHome && onTabNavigate) {
      onTabNavigate(tab);
      return;
    }
    router.push(`/admin#${tab}`);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  return (
    <header className={cn("sticky top-0 z-50", adminTokens.glass)}>
      <div className="mx-auto flex h-11 max-w-[1600px] items-center justify-between gap-3 px-3 sm:h-12 sm:px-5 lg:px-8">
        <div className="flex items-center gap-5">
          <Link href="/admin" className="flex shrink-0 items-center gap-2">
            <span className="text-sm font-bold tracking-tight text-[#F3F5F4]">
              Agrinvest
            </span>
            <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[#22C55E]">
              Admin
            </span>
          </Link>

          <nav className="hidden items-center gap-0.5 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href, item.exact, item.tab);

              if (item.tab) {
                return (
                  <button
                    key={`${item.href}-${item.label}`}
                    type="button"
                    onClick={() => navigateToTab(item.tab!)}
                    className={cn(
                      "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-200",
                      active
                        ? "border border-emerald-500/20 bg-emerald-500/12 text-[#22C55E] shadow-[0_0_16px_rgba(16,185,129,0.12)]"
                        : "text-[#A5B3AC] hover:bg-white/[0.04] hover:text-[#F3F5F4]",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </button>
                );
              }

              return (
                <Link
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-200",
                    active
                      ? "border border-emerald-500/20 bg-emerald-500/12 text-[#22C55E] shadow-[0_0_16px_rgba(16,185,129,0.12)]"
                      : "text-[#A5B3AC] hover:bg-white/[0.04] hover:text-[#F3F5F4]",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => navigateToTab(ADMIN_NAV_TABS.notifications)}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-white/[0.05] hover:text-[#F3F5F4]",
              isAdminHome && activeTab === ADMIN_NAV_TABS.notifications
                ? "text-[#22C55E]"
                : "text-[#6B7C74]",
            )}
            aria-label="Notificações"
          >
            <Bell className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => navigateToTab(ADMIN_NAV_TABS.settings)}
            className={cn(
              "hidden h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-white/[0.05] hover:text-[#F3F5F4] sm:flex",
              isAdminHome && activeTab === ADMIN_NAV_TABS.settings
                ? "text-[#22C55E]"
                : "text-[#6B7C74]",
            )}
            aria-label="Configurações"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>

          <div className="mx-0.5 hidden h-4 w-px bg-white/[0.08] sm:block" />

          <Link
            href="/profile"
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#161F1B]/60 py-0.5 pl-0.5 pr-2 backdrop-blur-md transition-colors hover:border-emerald-500/20 hover:bg-[#1A2520]"
            aria-label="Meu perfil"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-emerald-600 to-[#22C55E] text-[10px] font-bold text-white shadow-[0_0_12px_rgba(16,185,129,0.3)]">
              {(userName || "A").charAt(0).toUpperCase()}
            </div>
            <span className="hidden max-w-[100px] truncate text-[11px] font-medium text-[#A5B3AC] sm:block">
              {userName || "Admin"}
            </span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#6B7C74] transition-colors hover:bg-red-500/10 hover:text-red-400"
            aria-label="Sair"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
