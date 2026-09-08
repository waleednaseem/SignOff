import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { ClientShell } from "@/components/layout/client-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "CLIENT") {
    return <ClientShell user={session.user}>{children}</ClientShell>;
  }
  return <AppShell user={session.user}>{children}</AppShell>;
}
