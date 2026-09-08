"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Bell,
  FileSignature,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
  FileText,
  GitPullRequest,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type NavUser = { name?: string | null; email?: string | null; role: "ADMIN" | "CLIENT" };

const adminNav = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/agreements", label: "Agreements", icon: FileText },
  { href: "/change-requests", label: "CRs", icon: GitPullRequest },
  { href: "/templates", label: "Templates", icon: FileSignature },
  { href: "/notifications", label: "Alerts", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ user, children }: { user: NavUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const nav = adminNav;
  const mobilePrimary = adminNav.filter((item) =>
    ["/dashboard", "/clients", "/agreements", "/change-requests", "/notifications"].includes(item.href),
  );

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-sidebar text-slate-200 lg:flex">
        <div className="flex items-center gap-2 px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500 text-white">
            <FileSignature className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-white">Signoff</p>
            <p className="text-xs text-slate-400">Project agreements</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
                  active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label === "Home" ? "Dashboard" : item.label === "CRs" ? "Change requests" : item.label === "Alerts" ? "Notifications" : item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-4">
          <p className="truncate text-sm text-white">{user.name}</p>
          <p className="truncate text-xs text-slate-400">{user.email}</p>
          <Button
            variant="ghost"
            className="mt-3 w-full justify-start text-slate-300 hover:text-white"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <div className="min-w-0 lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-border bg-white/95 px-3 py-3 pt-safe backdrop-blur lg:hidden">
          <div className="min-w-0">
            <p className="font-semibold">Signoff</p>
            <p className="truncate text-xs text-slate-500">{user.name}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Link href="/settings" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Settings">
              <Settings className="h-5 w-5" />
            </Link>
            <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/login" })} aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="min-w-0 overflow-x-hidden p-3 pb-24 sm:p-4 md:p-8 lg:pb-8">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white/95 pb-safe backdrop-blur lg:hidden">
          <div className="mx-auto grid max-w-3xl grid-cols-5 gap-0.5 px-1 pt-1">
            {mobilePrimary.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[10px] font-medium",
                    active ? "text-teal-800" : "text-slate-500",
                  )}
                >
                  <item.icon className={cn("h-5 w-5", active && "text-teal-700")} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
