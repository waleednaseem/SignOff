"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect } from "react";
import { Bell, FileText, GitPullRequest, History, LogOut, UserRound, FileSignature } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type NavUser = { name?: string | null; email?: string | null; role: "ADMIN" | "CLIENT" };

const nav = [
  { href: "/agreements", label: "My agreements", icon: FileText },
  { href: "/history", label: "History", icon: History },
  { href: "/change-requests", label: "Change requests", icon: GitPullRequest },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export function ClientShell({ user, children }: { user: NavUser; children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    // #region agent log
    fetch("http://127.0.0.1:7255/ingest/dd658d58-f456-46a2-a370-6fd4e08e4ef8", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "a2684c" },
      body: JSON.stringify({
        sessionId: "a2684c",
        runId: "post-fix",
        hypothesisId: "A",
        location: "client-shell.tsx",
        message: "client shell mounted",
        data: { pathname, role: user.role },
        timestamp: Date.now(),
      }),
    }).catch(() => undefined);
    const reportOverflow = () => {
      fetch("http://127.0.0.1:7255/ingest/dd658d58-f456-46a2-a370-6fd4e08e4ef8", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "a2684c" },
        body: JSON.stringify({
          sessionId: "a2684c",
          runId: "post-fix",
          hypothesisId: "F",
          location: "client-shell.tsx:resize",
          message: "viewport overflow",
          data: {
            vw: window.innerWidth,
            sw: document.documentElement.scrollWidth,
            overflowing: document.documentElement.scrollWidth > window.innerWidth + 1,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => undefined);
    };
    reportOverflow();
    window.addEventListener("resize", reportOverflow);
    return () => window.removeEventListener("resize", reportOverflow);
    // #endregion
  }, [pathname, user.role]);

  return (
    <div className="min-h-screen min-w-0 max-w-full overflow-x-hidden bg-[#f4f1ea]">
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl min-w-0 items-center justify-between gap-2 px-4 py-3">
          <Link href="/agreements" className="flex min-w-0 items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-700 text-white">
              <FileSignature className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-none">Signoff</p>
              <p className="text-xs text-slate-500">Client portal</p>
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
          <div className="flex min-w-0 shrink-0 items-center gap-2">
            <div className="hidden min-w-0 text-right sm:block">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
        <nav className="flex max-w-full gap-2 overflow-x-auto px-4 pb-3 md:hidden">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="whitespace-nowrap rounded-full bg-white px-3 py-1 text-xs shadow-sm">
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto min-w-0 max-w-6xl overflow-x-hidden px-4 py-8">{children}</main>
    </div>
  );
}
