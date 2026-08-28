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
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/agreements", label: "Agreements", icon: FileText },
  { href: "/change-requests", label: "Change requests", icon: GitPullRequest },
  { href: "/templates", label: "Templates", icon: FileSignature },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ user, children }: { user: NavUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const nav = adminNav;

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
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-4">
          <p className="truncate text-sm text-white">{user.name}</p>
          <p className="truncate text-xs text-slate-400">{user.email}</p>
          <Button variant="ghost" className="mt-3 w-full justify-start text-slate-300 hover:text-white" onClick={() => signOut({ callbackUrl: "/login" })}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>
      <div className="min-w-0 lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <span className="font-semibold">Signoff</span>
          <span className="text-xs text-slate-500">{user.role === "ADMIN" ? "Admin" : "Client"}</span>
        </header>
        <nav className="flex gap-2 overflow-x-auto border-b border-border bg-white px-3 py-2 lg:hidden">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="whitespace-nowrap rounded-full bg-slate-100 px-3 py-1 text-xs">
              {item.label}
            </Link>
          ))}
        </nav>
        <main className="min-w-0 overflow-x-hidden p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
