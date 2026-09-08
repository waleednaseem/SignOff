"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Bell, FileText, GitPullRequest, History, LogOut, UserRound, FileSignature } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type NavUser = { name?: string | null; email?: string | null; role: "ADMIN" | "CLIENT" };

const nav = [
  { href: "/agreements", label: "Agreements", short: "Home", icon: FileText },
  { href: "/history", label: "History", short: "History", icon: History },
  { href: "/change-requests", label: "Changes", short: "Changes", icon: GitPullRequest },
  { href: "/notifications", label: "Alerts", short: "Alerts", icon: Bell },
  { href: "/profile", label: "Profile", short: "You", icon: UserRound },
];

export function ClientShell({ user, children }: { user: NavUser; children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen min-w-0 max-w-full overflow-x-hidden bg-[#f4f1ea]">
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/95 pt-safe backdrop-blur">
        <div className="mx-auto flex max-w-6xl min-w-0 items-center justify-between gap-2 px-3 py-3 sm:px-4">
          <Link href="/agreements" className="flex min-w-0 items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-white">
              <FileSignature className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-none">Signoff</p>
              <p className="truncate text-xs text-slate-500">{user.name ?? "Client portal"}</p>
            </div>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm",
                    active ? "bg-teal-700 text-white" : "text-slate-600 hover:bg-stone-100",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={() => signOut({ callbackUrl: "/login" })}
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto min-w-0 max-w-6xl overflow-x-hidden px-3 pb-24 pt-5 sm:px-4 sm:py-8 md:pb-8">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 pb-safe backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-5 gap-0.5 px-1 pt-1">
          {nav.map((item) => {
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
                {item.short}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
