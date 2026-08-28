import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { ClientShell } from "@/components/layout/client-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const shell = session.user.role === "CLIENT" ? "client" : "admin";
  // #region agent log
  fetch("http://127.0.0.1:7255/ingest/dd658d58-f456-46a2-a370-6fd4e08e4ef8", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "a2684c" },
    body: JSON.stringify({
      sessionId: "a2684c",
      runId: "client-portal",
      hypothesisId: "A",
      location: "app/(app)/layout.tsx",
      message: "app layout shell",
      data: { role: session.user.role, shell },
      timestamp: Date.now(),
    }),
  }).catch(() => undefined);
  // #endregion
  if (session.user.role === "CLIENT") {
    return <ClientShell user={session.user}>{children}</ClientShell>;
  }
  return <AppShell user={session.user}>{children}</AppShell>;
}
